import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { UserRole, UserStatus, TransactionType } from "@prisma/client";

import { ERR_MESSAGES } from "../../constants/messages.constant";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private prisma: PrismaService) {}

    async getPlatformStatistics() {
        const [
            totalUsers,
            totalWallets,
            totalContracts,
            totalPackages,
            totalPositions,
            activePositions,
            totalTransactions,
            contracts,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.userWallet.count(),
            this.prisma.stakingContract.count(),
            this.prisma.stakingPackage.count(),
            this.prisma.stakePosition.count(),
            this.prisma.stakePosition.count({ where: { isWithdrawn: false } }),
            this.prisma.transaction.count(),
            this.prisma.stakingContract.findMany({
                select: { totalLocked: true, totalRewardDebt: true },
            }),
        ]);

        const totalLocked = contracts.reduce(
            (sum, c) => sum + BigInt(c.totalLocked || "0"),
            BigInt(0),
        );
        const totalRewardDebt = contracts.reduce(
            (sum, c) => sum + BigInt(c.totalRewardDebt || "0"),
            BigInt(0),
        );

        const uniqueStakers = await this.prisma.stakePosition.groupBy({
            by: ["walletId"],
            where: { isWithdrawn: false },
        });

        return {
            users: {
                total: totalUsers,
                withWallets: totalWallets,
            },
            staking: {
                contracts: totalContracts,
                packages: totalPackages,
                positions: {
                    total: totalPositions,
                    active: activePositions,
                },
                totalLocked: totalLocked.toString(),
                totalRewardDebt: totalRewardDebt.toString(),
                uniqueStakers: uniqueStakers.length,
            },
            transactions: {
                total: totalTransactions,
            },
        };
    }

    async getContracts(chainId?: number) {
        return this.prisma.stakingContract.findMany({
            where: chainId ? { chainId } : undefined,
            include: {
                chain: {
                    select: { name: true, slug: true },
                },
                packages: {
                    select: {
                        id: true,
                        packageId: true,
                        apy: true,
                        lockPeriod: true,
                        isEnabled: true,
                        totalStaked: true,
                        stakersCount: true,
                    },
                },
                _count: {
                    select: { stakePositions: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async getPackages(contractId?: number) {
        return this.prisma.stakingPackage.findMany({
            where: contractId ? { contractId } : undefined,
            include: {
                contract: {
                    select: {
                        address: true,
                        chain: { select: { name: true } },
                    },
                },
                _count: {
                    select: { stakePositions: true },
                },
            },
            orderBy: [{ contractId: "asc" }, { packageId: "asc" }],
        });
    }

    async getPositions(
        page: number = 1,
        limit: number = 20,
        walletAddress?: string,
        isWithdrawn?: boolean,
        userId?: number,
        search?: string,
    ) {
        const skip = (page - 1) * limit;

        const where: {
            wallet?: {
                walletAddress?: { equals: string; mode: "insensitive" };
                userId?: number;
                OR?: Array<{
                    walletAddress?: { contains: string; mode: "insensitive" };
                    user?: {
                        OR: Array<{
                            name?: { contains: string; mode: "insensitive" };
                            email?: { contains: string; mode: "insensitive" };
                        }>;
                    };
                }>;
            };
            isWithdrawn?: boolean;
        } = {};

        if (walletAddress) {
            where.wallet = {
                walletAddress: {
                    equals: walletAddress.toLowerCase(),
                    mode: "insensitive",
                },
            };
        }

        if (isWithdrawn !== undefined) {
            where.isWithdrawn = isWithdrawn;
        }

        if (userId) {
            where.wallet = { ...where.wallet, userId };
        }

        if (search) {
            where.wallet = {
                ...where.wallet,
                OR: [
                    {
                        walletAddress: {
                            contains: search.toLowerCase(),
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            OR: [
                                {
                                    name: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    email: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                ],
            };
        }

        const [positions, total] = await Promise.all([
            this.prisma.stakePosition.findMany({
                where,
                include: {
                    wallet: {
                        select: {
                            walletAddress: true,
                            user: {
                                select: { id: true, name: true, email: true },
                            },
                        },
                    },
                    contract: {
                        select: {
                            address: true,
                            stakeTokenSymbol: true,
                            rewardTokenSymbol: true,
                        },
                    },
                    package: {
                        select: {
                            packageId: true,
                            apy: true,
                            lockPeriod: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.stakePosition.count({ where }),
        ]);

        return {
            positions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getTransactions(
        page: number = 1,
        limit: number = 20,
        type?: string,
        userId?: number,
        search?: string,
        positionId?: number,
    ) {
        const skip = (page - 1) * limit;

        const where: {
            type?: TransactionType;
            stakePositionId?: number;
            wallet?: {
                userId?: number;
                OR?: Array<{
                    walletAddress?: { contains: string; mode: "insensitive" };
                    user?: {
                        OR: Array<{
                            name?: { contains: string; mode: "insensitive" };
                            email?: { contains: string; mode: "insensitive" };
                        }>;
                    };
                }>;
            };
        } = {};

        if (type) {
            where.type = type as TransactionType;
        }

        if (positionId) {
            where.stakePositionId = positionId;
        }

        if (userId) {
            where.wallet = { userId };
        }

        if (search) {
            where.wallet = {
                ...where.wallet,
                OR: [
                    {
                        walletAddress: {
                            contains: search.toLowerCase(),
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            OR: [
                                {
                                    name: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    email: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                ],
            };
        }

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                include: {
                    wallet: {
                        select: {
                            walletAddress: true,
                            user: {
                                select: { id: true, name: true, email: true },
                            },
                        },
                    },
                    chain: {
                        select: { name: true, explorerUrl: true },
                    },
                    stakePosition: {
                        select: {
                            onChainStakeId: true,
                            onChainPackageId: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            transactions: transactions.map((tx) => ({
                ...tx,
                explorerUrl:
                    tx.txHash && tx.chain.explorerUrl
                        ? `${tx.chain.explorerUrl}/tx/${tx.txHash}`
                        : null,
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUsers(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    status: true,
                    authMethod: true,
                    createdAt: true,
                    wallets: {
                        select: {
                            walletAddress: true,
                            isPrimary: true,
                        },
                    },
                    _count: {
                        select: { sessions: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.user.count(),
        ]);

        return {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateUserRole(userId: number, role: UserRole) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });
    }

    async updateUserStatus(userId: number, status: UserStatus) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(ERR_MESSAGES.USER.NOT_FOUND);
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { status },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
            },
        });
    }
}
