import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { GetStakePositionsDto } from "./dto";
import { ERR_MESSAGES } from "../../constants/messages.constant";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class StakingService {
    private readonly logger = new Logger(StakingService.name);

    constructor(private prisma: PrismaService) {}

    async getUserPrimaryWallet(userId: number) {
        return this.prisma.userWallet.findFirst({
            where: { userId, isPrimary: true },
        });
    }

    async getContracts(chainId?: number) {
        return this.prisma.stakingContract.findMany({
            where: chainId ? { chainId } : undefined,
            include: {
                chain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        explorerUrl: true,
                    },
                },
                packages: {
                    where: { isEnabled: true },
                    orderBy: { packageId: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async getContractById(id: number) {
        const contract = await this.prisma.stakingContract.findUnique({
            where: { id },
            include: {
                chain: true,
                packages: {
                    orderBy: { packageId: "asc" },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException(
                ERR_MESSAGES.STAKING.CONTRACT_NOT_FOUND,
            );
        }

        return contract;
    }

    async getContractByAddress(address: string) {
        const contract = await this.prisma.stakingContract.findUnique({
            where: { address: address.toLowerCase() },
            include: {
                chain: true,
                packages: {
                    orderBy: { packageId: "asc" },
                },
            },
        });

        if (!contract) {
            throw new NotFoundException(
                ERR_MESSAGES.STAKING.CONTRACT_NOT_FOUND,
            );
        }

        return contract;
    }

    async getPackages(contractId?: number) {
        return this.prisma.stakingPackage.findMany({
            where: contractId ? { contractId } : undefined,
            include: {
                contract: {
                    select: {
                        id: true,
                        address: true,
                        chainId: true,
                        stakeTokenSymbol: true,
                        rewardTokenSymbol: true,
                    },
                },
            },
            orderBy: [{ contractId: "asc" }, { packageId: "asc" }],
        });
    }

    async getPackageById(id: number) {
        const pkg = await this.prisma.stakingPackage.findUnique({
            where: { id },
            include: {
                contract: true,
            },
        });

        if (!pkg) {
            throw new NotFoundException(ERR_MESSAGES.STAKING.PACKAGE_NOT_FOUND);
        }

        return pkg;
    }

    async getPackageByContractAndId(contractId: number, packageId: number) {
        const pkg = await this.prisma.stakingPackage.findUnique({
            where: {
                contractId_packageId: {
                    contractId,
                    packageId,
                },
            },
            include: {
                contract: true,
            },
        });

        if (!pkg) {
            throw new NotFoundException(ERR_MESSAGES.STAKING.PACKAGE_NOT_FOUND);
        }

        return pkg;
    }

    async getStakePositions(
        walletAddress: string,
        query: GetStakePositionsDto,
    ) {
        const { page = 1, limit = 10, isWithdrawn, packageId } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.StakePositionWhereInput = {
            wallet: {
                walletAddress: walletAddress.toLowerCase(),
            },
            ...(isWithdrawn !== undefined && { isWithdrawn }),
            ...(packageId !== undefined && { packageId }),
        };

        const [positions, total] = await Promise.all([
            this.prisma.stakePosition.findMany({
                where,
                include: {
                    package: {
                        select: {
                            packageId: true,
                            lockPeriod: true,
                            apy: true,
                        },
                    },
                    contract: {
                        select: {
                            address: true,
                            stakeTokenSymbol: true,
                            rewardTokenSymbol: true,
                            stakeTokenDecimals: true,
                            rewardTokenDecimals: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.stakePosition.count({ where }),
        ]);

        const now = new Date();
        const positionsWithClaimable = positions.map((pos) => {
            const claimableReward = this.calculateClaimableReward(
                pos.principal,
                pos.rewardTotal,
                pos.rewardClaimed,
                pos.startTimestamp,
                pos.unlockTimestamp,
                now,
            );

            return {
                ...pos,
                claimableReward,
                isUnlocked: now >= pos.unlockTimestamp,
                lockPeriodDays: Math.floor(pos.lockPeriod / 86400),
            };
        });

        return {
            positions: positionsWithClaimable,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getStakePositionById(id: number) {
        const position = await this.prisma.stakePosition.findUnique({
            where: { id },
            include: {
                wallet: {
                    select: {
                        walletAddress: true,
                        userId: true,
                    },
                },
                package: true,
                contract: true,
            },
        });

        if (!position) {
            throw new NotFoundException(
                ERR_MESSAGES.STAKING.POSITION_NOT_FOUND,
            );
        }

        const now = new Date();
        const claimableReward = this.calculateClaimableReward(
            position.principal,
            position.rewardTotal,
            position.rewardClaimed,
            position.startTimestamp,
            position.unlockTimestamp,
            now,
        );

        return {
            ...position,
            claimableReward,
            isUnlocked: now >= position.unlockTimestamp,
            lockPeriodDays: Math.floor(position.lockPeriod / 86400),
        };
    }

    async getStakePositionsSummary(walletAddress: string) {
        const positions = await this.prisma.stakePosition.findMany({
            where: {
                wallet: {
                    walletAddress: walletAddress.toLowerCase(),
                },
                isWithdrawn: false,
            },
            orderBy: { unlockTimestamp: "asc" },
        });

        const now = new Date();
        let totalPrincipalStaked = BigInt(0);
        let totalRewardEarned = BigInt(0);
        let totalRewardClaimed = BigInt(0);
        let totalPendingReward = BigInt(0);

        const upcomingUnlocks: {
            positionId: number;
            unlockTimestamp: Date;
            principal: string;
            reward: string;
        }[] = [];

        for (const pos of positions) {
            totalPrincipalStaked += BigInt(pos.principal);
            totalRewardEarned += BigInt(pos.rewardTotal);
            totalRewardClaimed += BigInt(pos.rewardClaimed);

            const claimable = this.calculateClaimableReward(
                pos.principal,
                pos.rewardTotal,
                pos.rewardClaimed,
                pos.startTimestamp,
                pos.unlockTimestamp,
                now,
            );
            totalPendingReward += BigInt(claimable);

            if (pos.unlockTimestamp > now) {
                upcomingUnlocks.push({
                    positionId: pos.id,
                    unlockTimestamp: pos.unlockTimestamp,
                    principal: pos.principal,
                    reward: (
                        BigInt(pos.rewardTotal) - BigInt(pos.rewardClaimed)
                    ).toString(),
                });
            }
        }

        return {
            totalActiveStakes: positions.length,
            totalPrincipalStaked: totalPrincipalStaked.toString(),
            totalRewardEarned: totalRewardEarned.toString(),
            totalRewardClaimed: totalRewardClaimed.toString(),
            totalPendingReward: totalPendingReward.toString(),
            upcomingUnlocks: upcomingUnlocks.slice(0, 5),
        };
    }

    private calculateClaimableReward(
        principal: string,
        rewardTotal: string,
        rewardClaimed: string,
        startTimestamp: Date,
        unlockTimestamp: Date,
        now: Date,
    ): string {
        const totalReward = BigInt(rewardTotal);
        const claimedReward = BigInt(rewardClaimed);
        const lockPeriod = unlockTimestamp.getTime() - startTimestamp.getTime();

        if (lockPeriod <= 0) {
            return "0";
        }

        const elapsed = Math.min(
            now.getTime() - startTimestamp.getTime(),
            lockPeriod,
        );

        if (elapsed <= 0) {
            return "0";
        }

        const earnedReward =
            (totalReward * BigInt(elapsed)) / BigInt(lockPeriod);
        const claimable =
            earnedReward > claimedReward
                ? earnedReward - claimedReward
                : BigInt(0);

        return claimable.toString();
    }

    async getGlobalStatistics() {
        const [contracts, totalPositions, activePositions] = await Promise.all([
            this.prisma.stakingContract.findMany({
                select: {
                    totalLocked: true,
                    totalRewardDebt: true,
                },
            }),
            this.prisma.stakePosition.count(),
            this.prisma.stakePosition.count({
                where: { isWithdrawn: false },
            }),
        ]);

        let totalLocked = BigInt(0);
        let totalRewardDebt = BigInt(0);

        for (const contract of contracts) {
            totalLocked += BigInt(contract.totalLocked);
            totalRewardDebt += BigInt(contract.totalRewardDebt);
        }

        const uniqueStakers = await this.prisma.stakePosition.groupBy({
            by: ["walletId"],
            where: { isWithdrawn: false },
        });

        return {
            totalLocked: totalLocked.toString(),
            totalRewardDebt: totalRewardDebt.toString(),
            totalPositions,
            activePositions,
            uniqueStakers: uniqueStakers.length,
            contractsCount: contracts.length,
        };
    }

    async getLeaderboard(limit: number = 10) {
        const leaderboard = await this.prisma.stakePosition.groupBy({
            by: ["walletId"],
            where: { isWithdrawn: false },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: "desc",
                },
            },
            take: limit,
        });

        const walletIds = leaderboard.map((entry) => entry.walletId);
        const wallets = await this.prisma.userWallet.findMany({
            where: { id: { in: walletIds } },
            select: {
                id: true,
                walletAddress: true,
            },
        });

        const positions = await this.prisma.stakePosition.findMany({
            where: {
                walletId: { in: walletIds },
                isWithdrawn: false,
            },
            select: {
                walletId: true,
                principal: true,
            },
        });

        const stakedByWallet = new Map<number, bigint>();
        for (const pos of positions) {
            const current = stakedByWallet.get(pos.walletId) || BigInt(0);
            stakedByWallet.set(pos.walletId, current + BigInt(pos.principal));
        }

        const walletMap = new Map(wallets.map((w) => [w.id, w.walletAddress]));

        const result = leaderboard.map((entry) => ({
            walletAddress: walletMap.get(entry.walletId) || "Unknown",
            totalStaked: (
                stakedByWallet.get(entry.walletId) || BigInt(0)
            ).toString(),
            stakesCount: entry._count.id,
        }));

        result.sort((a, b) => {
            const aStaked = BigInt(a.totalStaked);
            const bStaked = BigInt(b.totalStaked);
            if (bStaked > aStaked) return 1;
            if (bStaked < aStaked) return -1;
            return 0;
        });

        return result.map((entry, index) => ({
            rank: index + 1,
            ...entry,
        }));
    }
}
