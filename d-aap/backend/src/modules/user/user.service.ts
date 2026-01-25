import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    UnauthorizedException,
} from "@nestjs/common";
import { ethers } from "ethers";

import { ERR_MESSAGES } from "../../constants/messages.constant";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(private prisma: PrismaService) {}

    async findUserForAuth(where: { email?: string; id?: number }) {
        const user = await this.prisma.user.findFirst({
            where: {
                ...where,
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true,
                status: true,
                wallets: {
                    where: { isPrimary: true },
                    select: {
                        walletAddress: true,
                    },
                    take: 1,
                },
            },
        });

        if (!user) {
            return null;
        }

        return {
            ...user,
            walletAddress: user.wallets[0]?.walletAddress,
        };
    }

    async findById(id: number) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            include: {
                wallets: {
                    where: { isPrimary: true },
                    take: 1,
                },
                statistics: true,
            },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return user;
    }

    async getProfile(userId: number) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                role: true,
                status: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                wallets: {
                    where: { isPrimary: true },
                    take: 1,
                    select: {
                        walletAddress: true,
                        chain: {
                            select: {
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
                statistics: true,
            },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return {
            ...user,
            walletAddress: user.wallets[0]?.walletAddress,
        };
    }

    async updateProfile(
        userId: number,
        data: { name?: string; avatar?: string; bio?: string },
    ) {
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
                bio: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async getUserStatistics(userId: number) {
        const user = await this.findById(userId);

        let stats = await this.prisma.userStatistics.findUnique({
            where: { userId },
        });

        if (!stats) {
            stats = await this.prisma.userStatistics.create({
                data: {
                    userId,
                    totalStaked: "0",
                    totalClaimed: "0",
                    totalWithdrawn: "0",
                    activeStakes: 0,
                    completedStakes: 0,
                    pendingRewards: "0",
                },
            });
        }

        return stats;
    }

    async getProfileWithStats(userId: number) {
        const [user, stats] = await Promise.all([
            this.getProfile(userId),
            this.getUserStatistics(userId),
        ]);

        // Get active stake positions for this user
        const activeStakes = await this.prisma.stakePosition.count({
            where: {
                wallet: { userId },
                isWithdrawn: false,
            },
        });

        // Get total staked across all positions
        const stakePositions = await this.prisma.stakePosition.findMany({
            where: {
                wallet: { userId },
                isWithdrawn: false,
            },
            select: {
                principal: true,
                rewardTotal: true,
                rewardClaimed: true,
            },
        });

        const totalActiveStaked = stakePositions.reduce(
            (sum, pos) => sum + BigInt(pos.principal),
            BigInt(0),
        );

        const totalPendingRewards = stakePositions.reduce(
            (sum, pos) =>
                sum + (BigInt(pos.rewardTotal) - BigInt(pos.rewardClaimed)),
            BigInt(0),
        );

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                bio: user.bio,
                role: user.role,
                walletAddress: user.walletAddress,
                createdAt: user.createdAt,
            },
            stats: {
                totalStaked: stats.totalStaked,
                totalClaimed: stats.totalClaimed,
                totalWithdrawn: stats.totalWithdrawn,
                activeStakes,
                completedStakes: stats.completedStakes,
                pendingRewards: totalPendingRewards.toString(),
                currentActiveStaked: totalActiveStaked.toString(),
            },
        };
    }

    async linkWallet(
        userId: number,
        walletAddress: string,
        signature: string,
        message: string,
    ) {
        const normalizedAddress = walletAddress.toLowerCase();

        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
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

        const existingWallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: normalizedAddress },
            include: { user: true },
        });

        if (existingWallet && existingWallet.userId !== userId) {
            throw new BadRequestException(
                ERR_MESSAGES.USER.WALLET_ALREADY_LINKED,
            );
        }

        const user = await this.findById(userId);

        if (existingWallet && existingWallet.userId === userId) {
            return {
                success: true,
                message: "Wallet is already linked to your account",
                wallet: existingWallet,
            };
        }

        const chain = await this.prisma.chain.findFirst({
            where: { isActive: true },
        });

        if (!chain) {
            throw new BadRequestException(ERR_MESSAGES.AUTH.NO_ACTIVE_CHAIN);
        }

        const wallet = await this.prisma.userWallet.create({
            data: {
                userId: user.id,
                chainId: chain.id,
                walletAddress: normalizedAddress,
                isPrimary: !user.wallets || user.wallets.length === 0,
                isVerified: true,
                verifiedAt: new Date(),
            },
        });

        this.logger.log(`Wallet ${normalizedAddress} linked to user ${userId}`);

        return {
            success: true,
            message: "Wallet linked successfully",
            wallet,
        };
    }

    async getWallets(userId: number) {
        const wallets = await this.prisma.userWallet.findMany({
            where: { userId },
            include: {
                chain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        explorerUrl: true,
                    },
                },
            },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        });

        return wallets;
    }

    async setPrimaryWallet(userId: number, walletId: number) {
        const wallet = await this.prisma.userWallet.findFirst({
            where: { id: walletId, userId },
        });

        if (!wallet) {
            throw new NotFoundException("Wallet not found");
        }

        // Unset all other primary wallets
        await this.prisma.userWallet.updateMany({
            where: { userId, isPrimary: true },
            data: { isPrimary: false },
        });

        // Set this wallet as primary
        await this.prisma.userWallet.update({
            where: { id: walletId },
            data: { isPrimary: true },
        });

        return { success: true, message: "Primary wallet updated" };
    }
}
