import * as crypto from "crypto";

import {
    Injectable,
    Logger,
    BadRequestException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ethers } from "ethers";

import { ERR_MESSAGES } from "../constants/messages.constant";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetaMaskAuthService {
    private readonly logger = new Logger(MetaMaskAuthService.name);
    private nonceStore: Map<string, { nonce: string; expiresAt: Date }> =
        new Map();
    private readonly jwtConfig: {
        expiresIn: string;
        refreshExpiresIn: string;
    };

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
        setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000);
    }

    async generateNonce(walletAddress: string): Promise<string> {
        const normalizedAddress = walletAddress.toLowerCase();
        const nonce = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        this.nonceStore.set(normalizedAddress, { nonce, expiresAt });

        return nonce;
    }

    async verifySignature(data: {
        walletAddress: string;
        signature: string;
        message: string;
    }): Promise<{ access_token: string; refresh_token: string; user: any }> {
        const normalizedAddress = data.walletAddress.toLowerCase();

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

    private cleanupExpiredNonces() {
        const now = new Date();
        for (const [address, data] of this.nonceStore.entries()) {
            if (data.expiresAt < now) {
                this.nonceStore.delete(address);
            }
        }
    }
}
