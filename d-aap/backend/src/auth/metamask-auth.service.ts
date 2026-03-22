import * as crypto from "crypto";

import {
    Injectable,
    Logger,
    BadRequestException,
    UnauthorizedException,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ethers } from "ethers";

import { ERR_MESSAGES } from "../constants/messages.constant";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetaMaskAuthService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MetaMaskAuthService.name);
    private readonly jwtConfig: {
        expiresIn: string;
        refreshExpiresIn: string;
    };
    private readonly nonceTtlMs = parseInt(
        process.env.METAMASK_NONCE_TTL_MS || String(15 * 60 * 1000),
        10,
    );
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        const jwtConfiguration = this.configService.get("jwt");
        this.jwtConfig = {
            expiresIn: jwtConfiguration?.expiresIn || "1h",
            refreshExpiresIn: jwtConfiguration?.refreshExpiresIn || "7d",
        };
    }

    onModuleInit() {
        const enabledRaw = process.env.METAMASK_NONCE_CLEANUP_ENABLED ?? "true";
        const enabled = enabledRaw.toLowerCase() !== "false";
        if (!enabled) {
            this.logger.warn(
                `Nonce cleanup disabled via METAMASK_NONCE_CLEANUP_ENABLED=${enabledRaw}`,
            );
            return;
        }

        // Delay the first run to avoid racing Prisma engine startup.
        const initialDelayMs = parseInt(
            process.env.METAMASK_NONCE_CLEANUP_INITIAL_DELAY_MS || "15000",
            10,
        );

        const run = () => void this.cleanupExpiredNonces();
        setTimeout(run, Math.max(0, initialDelayMs));

        // Run periodically, but never crash the process if Prisma is disconnecting.
        this.cleanupTimer = setInterval(run, 5 * 60 * 1000);
    }

    onModuleDestroy() {
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
    }

    async generateNonce(walletAddress?: string): Promise<string> {
        const nonce = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + this.nonceTtlMs);
        const normalizedAddress = walletAddress
            ? walletAddress.toLowerCase()
            : null;
        const nonceHash = crypto
            .createHash("sha256")
            .update(nonce)
            .digest("hex");

        await this.prisma.walletNonce.create({
            data: {
                walletAddress: normalizedAddress,
                nonceHash,
                expiresAt,
            },
        });

        return nonce;
    }

    async verifySignature(data: {
        walletAddress: string;
        signature: string;
        message: string;
    }): Promise<{ access_token: string; refresh_token: string; user: any }> {
        const normalizedAddress = data.walletAddress.toLowerCase();

        // Step 1: Extract the nonce embedded in the signed message
        const nonceMatch = data.message.match(/Nonce:\s*(\S+)/);
        if (!nonceMatch) {
            throw new UnauthorizedException(ERR_MESSAGES.AUTH.NONCE_INVALID);
        }
        const messageNonce = nonceMatch[1].trim();

        const messageNonceHash = crypto
            .createHash("sha256")
            .update(messageNonce)
            .digest("hex");

        // Step 2: Validate nonce exists in DB, hasn't expired, and hasn't been used.
        // Supports wallet-bound nonce (recommended) and legacy/unbound nonce rows.
        await this.prisma.$transaction(async (tx) => {
            const nonceRow = await tx.walletNonce.findFirst({
                where: {
                    nonceHash: messageNonceHash,
                    usedAt: null,
                    expiresAt: { gt: new Date() },
                    OR: [
                        { walletAddress: null },
                        { walletAddress: normalizedAddress },
                    ],
                },
                select: { id: true, walletAddress: true },
            });

            if (!nonceRow) {
                throw new UnauthorizedException(ERR_MESSAGES.AUTH.NONCE_INVALID);
            }

            // Step 3: Invalidate nonce immediately to prevent replay attacks
            await tx.walletNonce.update({
                where: { id: nonceRow.id },
                data: {
                    usedAt: new Date(),
                    walletAddress: nonceRow.walletAddress ?? normalizedAddress,
                },
            });
        });

        // Step 3: Verify cryptographic signature
        try {
            const recoveredAddress = ethers.verifyMessage(
                data.message,
                data.signature,
            );
            if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                throw new UnauthorizedException(
                    ERR_MESSAGES.AUTH.SIGNATURE_INVALID,
                );
            }
        } catch (error) {
            this.logger.error("Signature verification failed:", error);
            throw new UnauthorizedException(
                ERR_MESSAGES.AUTH.SIGNATURE_INVALID,
            );
        }

        // Find user by wallet address (any wallet, not just primary)
        let user = await this.prisma.user.findFirst({
            where: {
                wallets: {
                    some: {
                        walletAddress: normalizedAddress,
                    },
                },
                deletedAt: null,
            },
            include: {
                wallets: true, // Include all wallets to check if wallet exists
            },
        });

        if (!user) {
            // User not found, create new user with this wallet
            const chain = await this.prisma.chain.findFirst({
                where: { isActive: true },
            });

            if (!chain) {
                throw new BadRequestException(
                    ERR_MESSAGES.AUTH.NO_ACTIVE_CHAIN,
                );
            }

            user = await this.prisma.user.create({
                data: {
                    name: `User_${normalizedAddress.slice(0, 8)}`,
                    email: null,
                    authMethod: "WALLET",
                    role: "USER",
                    status: "ACTIVE",
                    wallets: {
                        create: {
                            chainId: chain.id,
                            walletAddress: normalizedAddress,
                            isPrimary: true,
                            isVerified: true,
                            verifiedAt: new Date(),
                        },
                    },
                },
                include: {
                    wallets: {
                        where: { walletAddress: normalizedAddress },
                        take: 1,
                    },
                },
            });

            this.logger.log(
                `Created new user ${user.id} with wallet ${normalizedAddress}`,
            );
        } else {
            const existingWallet = user.wallets.find(
                (w) => w.walletAddress.toLowerCase() === normalizedAddress,
            );

            if (existingWallet) {
                // Wallet exists, update verification if needed
                if (!existingWallet.isVerified) {
                    await this.prisma.userWallet.update({
                        where: { id: existingWallet.id },
                        data: {
                            isVerified: true,
                            verifiedAt: new Date(),
                        },
                    });
                }
                this.logger.log(
                    `User ${user.id} signed in with existing wallet ${normalizedAddress}`,
                );
            } else {
                const chain = await this.prisma.chain.findFirst({
                    where: { isActive: true },
                });

                if (!chain) {
                    throw new BadRequestException(
                        ERR_MESSAGES.AUTH.NO_ACTIVE_CHAIN,
                    );
                }

                const hasPrimaryWallet = user.wallets.some((w) => w.isPrimary);

                await this.prisma.userWallet.create({
                    data: {
                        userId: user.id,
                        chainId: chain.id,
                        walletAddress: normalizedAddress,
                        isPrimary: !hasPrimaryWallet,
                        isVerified: true,
                        verifiedAt: new Date(),
                    },
                });

                this.logger.log(
                    `Linked wallet ${normalizedAddress} to user ${user.id}`,
                );
            }

            const reloadedUser = await this.prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    wallets: {
                        where: { walletAddress: normalizedAddress },
                        take: 1,
                    },
                },
            });

            if (reloadedUser) {
                user = reloadedUser;
            }
        }

        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.jwtConfig.expiresIn,
        });

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.jwtConfig.refreshExpiresIn,
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                walletAddress: normalizedAddress,
            },
        };
    }

    private async cleanupExpiredNonces() {
        const now = new Date();
        const usedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

        try {
            await this.prisma.walletNonce.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: now } },
                        { usedAt: { lt: usedCutoff } },
                    ],
                },
            });
        } catch (error: unknown) {
            // This can happen during startup/shutdown while Prisma engine isn't connected yet.
            // Never let it crash the process.
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.debug(`Nonce cleanup skipped: ${msg}`);
        }
    }
}
