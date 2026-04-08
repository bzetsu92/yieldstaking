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
                wallet: {
                    select: {
                        walletAddress: true,
                    },
                },
            },
        });

        if (!user) {
            return null;
        }

        return {
            ...user,
            walletAddress: user.wallet?.walletAddress,
        };
    }

    async findById(id: number) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            include: {
                wallet: true,
                statistics: true,
            },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return user;
    }

    async getAuthPrincipal(userId: number) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                wallet: {
                    select: {
                        walletAddress: true,
                    },
                },
            },
        });

        if (!user) {
            return null;
        }

        return {
            ...user,
            walletAddress: user.wallet?.walletAddress,
        };
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
                wallet: {
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
            walletAddress: user.wallet?.walletAddress,
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
        await this.findById(userId);

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

        const [activeStakesCount, stakePositions] = await Promise.all([
            this.prisma.stakePosition.count({
                where: {
                    wallet: { userId },
                    isWithdrawn: false,
                },
            }),
            this.prisma.stakePosition.findMany({
                where: {
                    wallet: { userId },
                    isWithdrawn: false,
                },
                select: {
                    principal: true,
                    rewardTotal: true,
                    rewardClaimed: true,
                },
            }),
        ]);

        const totalActiveStaked = stakePositions.reduce(
            (sum, pos) => sum + BigInt(pos.principal || "0"),
            BigInt(0),
        );

        const totalPendingRewards = stakePositions.reduce(
            (sum, pos) =>
                sum + (BigInt(pos.rewardTotal || "0") - BigInt(pos.rewardClaimed || "0")),
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
                activeStakes: activeStakesCount,
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

        const walletCountForUser = await this.prisma.userWallet.count({
            where: { userId },
        });
        if (walletCountForUser > 0) {
            throw new BadRequestException(
                ERR_MESSAGES.USER.ACCOUNT_ALREADY_HAS_WALLET,
            );
        }

        try {
            const recoveredAddress = ethers.verifyMessage(message, signature);
            if (recoveredAddress.toLowerCase() !== normalizedAddress) {
                throw new UnauthorizedException(
                    ERR_MESSAGES.AUTH.SIGNATURE_INVALID,
                );
            }
        } catch (error) {
            if (
                error instanceof BadRequestException ||
                error instanceof UnauthorizedException
            ) {
                throw error;
            }
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
                "This wallet is already linked to another account.",
            );
        }

        const chain = await this.prisma.chain.findFirst({
            where: { isActive: true },
        });

        if (!chain) {
            throw new BadRequestException(ERR_MESSAGES.AUTH.NO_ACTIVE_CHAIN);
        }

        return await this.prisma.$transaction(async (tx) => {
            const newWallet = await tx.userWallet.create({
                data: {
                    userId,
                    chainId: chain.id,
                    walletAddress: normalizedAddress,
                    isPrimary: true,
                    isVerified: true,
                    verifiedAt: new Date(),
                },
            });

            return {
                success: true,
                message: "Wallet linked successfully",
                wallet: newWallet,
            };
        });
    }

    async getWallet(userId: number) {
        const wallet = await this.prisma.userWallet.findFirst({
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
        });

        return wallet;
    }
}
