import { Injectable, Logger } from "@nestjs/common";
import { TransactionType, TransactionStatus } from "@prisma/client";

import { YieldStakingEventName } from "./types/blockchain-event.types";
import { normalizeAddress } from "./utils/event-data.util";
import { PrismaService } from "../../prisma/prisma.service";

interface StakedEventData {
    user: string;
    packageId: number;
    stakeId: number;
    amount: string;
    rewardTotal: string;
}

interface ClaimedEventData {
    user: string;
    packageId: number;
    stakeId: number;
    amount: string;
}

interface WithdrawnEventData {
    user: string;
    packageId: number;
    stakeId: number;
    principal: string;
    reward: string;
}

interface EmergencyWithdrawnEventData {
    user: string;
    packageId: number;
    stakeId: number;
    principal: string;
    lostReward: string;
}

interface PackageUpdatedEventData {
    id: number;
    lockPeriod: string | number;
    apy: number;
    enabled: boolean;
}

@Injectable()
export class BlockchainEventProcessorService {
    private readonly logger = new Logger(BlockchainEventProcessorService.name);

    constructor(private prisma: PrismaService) {}

    async processEvent(eventId: number) {
        const event = await this.prisma.blockchainEvent.findUnique({
            where: { id: eventId },
            include: {
                chain: true,
            },
        });

        if (!event) {
            this.logger.warn(`Event ${eventId} not found`);
            return null;
        }

        if (event.processed) {
            this.logger.debug(`Event ${eventId} already processed`);
            return event;
        }

        try {
            const eventData = event.eventData as Record<string, any>;

            switch (event.eventName) {
                case YieldStakingEventName.STAKED:
                    await this.processStakedEvent(
                        event.chainId,
                        event.contractAddress,
                        event.txHash,
                        eventData as StakedEventData,
                    );
                    break;

                case YieldStakingEventName.CLAIMED:
                    await this.processClaimedEvent(
                        event.chainId,
                        event.contractAddress,
                        event.txHash,
                        eventData as ClaimedEventData,
                    );
                    break;

                case YieldStakingEventName.WITHDRAWN:
                    await this.processWithdrawnEvent(
                        event.chainId,
                        event.contractAddress,
                        event.txHash,
                        eventData as WithdrawnEventData,
                    );
                    break;

                case YieldStakingEventName.EMERGENCY_WITHDRAWN:
                    await this.processEmergencyWithdrawnEvent(
                        event.chainId,
                        event.contractAddress,
                        event.txHash,
                        eventData as EmergencyWithdrawnEventData,
                    );
                    break;

                case YieldStakingEventName.PACKAGE_UPDATED:
                    await this.processPackageUpdatedEvent(
                        event.contractAddress,
                        eventData as PackageUpdatedEventData,
                    );
                    break;

                case YieldStakingEventName.PAUSED:
                    await this.processContractPausedEvent(
                        event.contractAddress,
                        true,
                    );
                    break;

                case YieldStakingEventName.UNPAUSED:
                    await this.processContractPausedEvent(
                        event.contractAddress,
                        false,
                    );
                    break;

                default:
                    this.logger.debug(`Unknown event type: ${event.eventName}`);
            }

            // Mark event as processed
            return this.prisma.blockchainEvent.update({
                where: { id: eventId },
                data: {
                    processed: true,
                    processedAt: new Date(),
                },
            });
        } catch (error) {
            this.logger.error(`Error processing event ${eventId}:`, error);

            await this.prisma.blockchainEvent.update({
                where: { id: eventId },
                data: {
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                },
            });

            throw error;
        }
    }

    async processUnprocessedEvents(limit = 100) {
        const events = await this.prisma.blockchainEvent.findMany({
            where: {
                processed: false,
                errorMessage: null,
            },
            orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
            take: limit,
        });

        this.logger.log(`Processing ${events.length} unprocessed events`);

        const results = {
            processed: 0,
            failed: 0,
            errors: [] as string[],
        };

        for (const event of events) {
            try {
                await this.processEvent(event.id);
                results.processed++;
            } catch (error) {
                results.failed++;
                results.errors.push(
                    `Event ${event.id}: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        }

        return results;
    }

    private async processStakedEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: StakedEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        // Get or create wallet
        const wallet = await this.getOrCreateWallet(chainId, userAddress);

        // Get contract and package
        const contract = await this.prisma.stakingContract.findUnique({
            where: { address: normalizedContract },
        });

        if (!contract) {
            throw new Error(`Contract ${normalizedContract} not found`);
        }

        const pkg = await this.prisma.stakingPackage.findUnique({
            where: {
                contractId_packageId: {
                    contractId: contract.id,
                    packageId: Number(data.packageId),
                },
            },
        });

        if (!pkg) {
            throw new Error(
                `Package ${data.packageId} not found for contract ${normalizedContract}`,
            );
        }

        const now = new Date();
        const unlockTimestamp = new Date(now.getTime() + pkg.lockPeriod * 1000);

        // Create stake position
        const stakePosition = await this.prisma.stakePosition.upsert({
            where: {
                walletId_contractId_onChainPackageId_onChainStakeId: {
                    walletId: wallet.id,
                    contractId: contract.id,
                    onChainPackageId: Number(data.packageId),
                    onChainStakeId: Number(data.stakeId),
                },
            },
            update: {
                principal: data.amount.toString(),
                rewardTotal: data.rewardTotal.toString(),
            },
            create: {
                walletId: wallet.id,
                contractId: contract.id,
                packageId: pkg.id,
                onChainStakeId: Number(data.stakeId),
                onChainPackageId: Number(data.packageId),
                principal: data.amount.toString(),
                rewardTotal: data.rewardTotal.toString(),
                rewardClaimed: "0",
                lockPeriod: pkg.lockPeriod,
                startTimestamp: now,
                unlockTimestamp,
                stakeTxHash: txHash,
            },
        });

        // Create transaction record
        await this.prisma.transaction.upsert({
            where: { txHash },
            update: {
                status: TransactionStatus.CONFIRMED,
                confirmedAt: new Date(),
            },
            create: {
                walletId: wallet.id,
                chainId,
                stakePositionId: stakePosition.id,
                type: TransactionType.STAKE,
                status: TransactionStatus.CONFIRMED,
                amount: data.amount.toString(),
                txHash,
                confirmedAt: new Date(),
            },
        });

        // Update package statistics
        await this.prisma.stakingPackage.update({
            where: { id: pkg.id },
            data: {
                totalStaked: {
                    set: (
                        BigInt(pkg.totalStaked) + BigInt(data.amount)
                    ).toString(),
                },
                stakersCount: { increment: 1 },
            },
        });

        // Update contract statistics
        await this.prisma.stakingContract.update({
            where: { id: contract.id },
            data: {
                totalLocked: {
                    set: (
                        BigInt(contract.totalLocked) + BigInt(data.amount)
                    ).toString(),
                },
                totalRewardDebt: {
                    set: (
                        BigInt(contract.totalRewardDebt) +
                        BigInt(data.rewardTotal)
                    ).toString(),
                },
            },
        });

        // Update user statistics
        await this.updateUserStatistics(
            wallet.userId,
            "stake",
            data.amount.toString(),
        );

        this.logger.log(
            `Processed Staked event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, amount=${data.amount}`,
        );
    }

    private async processClaimedEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: ClaimedEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        const wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: userAddress },
        });

        if (!wallet) {
            this.logger.warn(
                `Wallet ${userAddress} not found for Claimed event`,
            );
            return;
        }

        const contract = await this.prisma.stakingContract.findUnique({
            where: { address: normalizedContract },
        });

        if (!contract) {
            throw new Error(`Contract ${normalizedContract} not found`);
        }

        // Update stake position
        const stakePosition = await this.prisma.stakePosition.findUnique({
            where: {
                walletId_contractId_onChainPackageId_onChainStakeId: {
                    walletId: wallet.id,
                    contractId: contract.id,
                    onChainPackageId: Number(data.packageId),
                    onChainStakeId: Number(data.stakeId),
                },
            },
        });

        if (stakePosition) {
            await this.prisma.stakePosition.update({
                where: { id: stakePosition.id },
                data: {
                    rewardClaimed: {
                        set: (
                            BigInt(stakePosition.rewardClaimed) +
                            BigInt(data.amount)
                        ).toString(),
                    },
                    lastClaimTimestamp: new Date(),
                },
            });

            // Create transaction record
            await this.prisma.transaction.upsert({
                where: { txHash },
                update: {
                    status: TransactionStatus.CONFIRMED,
                    confirmedAt: new Date(),
                },
                create: {
                    walletId: wallet.id,
                    chainId,
                    stakePositionId: stakePosition.id,
                    type: TransactionType.CLAIM,
                    status: TransactionStatus.CONFIRMED,
                    amount: data.amount.toString(),
                    txHash,
                    confirmedAt: new Date(),
                },
            });

            // Update user statistics
            await this.updateUserStatistics(
                wallet.userId,
                "claim",
                data.amount.toString(),
            );
        }

        this.logger.log(
            `Processed Claimed event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, amount=${data.amount}`,
        );
    }

    private async processWithdrawnEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: WithdrawnEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        const wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: userAddress },
        });

        if (!wallet) {
            this.logger.warn(
                `Wallet ${userAddress} not found for Withdrawn event`,
            );
            return;
        }

        const contract = await this.prisma.stakingContract.findUnique({
            where: { address: normalizedContract },
        });

        if (!contract) {
            throw new Error(`Contract ${normalizedContract} not found`);
        }

        // Update stake position
        const stakePosition = await this.prisma.stakePosition.findUnique({
            where: {
                walletId_contractId_onChainPackageId_onChainStakeId: {
                    walletId: wallet.id,
                    contractId: contract.id,
                    onChainPackageId: Number(data.packageId),
                    onChainStakeId: Number(data.stakeId),
                },
            },
        });

        if (stakePosition) {
            await this.prisma.stakePosition.update({
                where: { id: stakePosition.id },
                data: {
                    isWithdrawn: true,
                    withdrawTxHash: txHash,
                    rewardClaimed: {
                        set: (
                            BigInt(stakePosition.rewardClaimed) +
                            BigInt(data.reward)
                        ).toString(),
                    },
                },
            });

            // Create transaction record
            const totalAmount = BigInt(data.principal) + BigInt(data.reward);
            await this.prisma.transaction.upsert({
                where: { txHash },
                update: {
                    status: TransactionStatus.CONFIRMED,
                    confirmedAt: new Date(),
                },
                create: {
                    walletId: wallet.id,
                    chainId,
                    stakePositionId: stakePosition.id,
                    type: TransactionType.WITHDRAW,
                    status: TransactionStatus.CONFIRMED,
                    amount: totalAmount.toString(),
                    txHash,
                    confirmedAt: new Date(),
                    metadata: {
                        principal: data.principal.toString(),
                        reward: data.reward.toString(),
                    },
                },
            });

            // Update package statistics
            const pkg = await this.prisma.stakingPackage.findUnique({
                where: { id: stakePosition.packageId },
            });

            if (pkg) {
                await this.prisma.stakingPackage.update({
                    where: { id: pkg.id },
                    data: {
                        totalStaked: {
                            set: (
                                BigInt(pkg.totalStaked) - BigInt(data.principal)
                            ).toString(),
                        },
                    },
                });
            }

            // Update contract statistics
            await this.prisma.stakingContract.update({
                where: { id: contract.id },
                data: {
                    totalLocked: {
                        set: (
                            BigInt(contract.totalLocked) -
                            BigInt(data.principal)
                        ).toString(),
                    },
                },
            });

            // Update user statistics
            await this.updateUserStatistics(
                wallet.userId,
                "withdraw",
                data.principal.toString(),
            );
            await this.updateUserStatistics(
                wallet.userId,
                "claim",
                data.reward.toString(),
            );
        }

        this.logger.log(
            `Processed Withdrawn event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, principal=${data.principal}, reward=${data.reward}`,
        );
    }

    private async processEmergencyWithdrawnEvent(
        chainId: number,
        contractAddress: string,
        txHash: string,
        data: EmergencyWithdrawnEventData,
    ) {
        const userAddress = normalizeAddress(data.user);
        const normalizedContract = normalizeAddress(contractAddress);

        const wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress: userAddress },
        });

        if (!wallet) {
            this.logger.warn(
                `Wallet ${userAddress} not found for EmergencyWithdrawn event`,
            );
            return;
        }

        const contract = await this.prisma.stakingContract.findUnique({
            where: { address: normalizedContract },
        });

        if (!contract) {
            throw new Error(`Contract ${normalizedContract} not found`);
        }

        // Update stake position
        const stakePosition = await this.prisma.stakePosition.findUnique({
            where: {
                walletId_contractId_onChainPackageId_onChainStakeId: {
                    walletId: wallet.id,
                    contractId: contract.id,
                    onChainPackageId: Number(data.packageId),
                    onChainStakeId: Number(data.stakeId),
                },
            },
        });

        if (stakePosition) {
            await this.prisma.stakePosition.update({
                where: { id: stakePosition.id },
                data: {
                    isWithdrawn: true,
                    isEmergencyWithdrawn: true,
                    withdrawTxHash: txHash,
                },
            });

            // Create transaction record
            await this.prisma.transaction.upsert({
                where: { txHash },
                update: {
                    status: TransactionStatus.CONFIRMED,
                    confirmedAt: new Date(),
                },
                create: {
                    walletId: wallet.id,
                    chainId,
                    stakePositionId: stakePosition.id,
                    type: TransactionType.EMERGENCY_WITHDRAW,
                    status: TransactionStatus.CONFIRMED,
                    amount: data.principal.toString(),
                    txHash,
                    confirmedAt: new Date(),
                    metadata: {
                        principal: data.principal.toString(),
                        lostReward: data.lostReward.toString(),
                    },
                },
            });

            // Update contract statistics
            await this.prisma.stakingContract.update({
                where: { id: contract.id },
                data: {
                    totalLocked: {
                        set: (
                            BigInt(contract.totalLocked) -
                            BigInt(data.principal)
                        ).toString(),
                    },
                    totalRewardDebt: {
                        set: (
                            BigInt(contract.totalRewardDebt) -
                            BigInt(data.lostReward)
                        ).toString(),
                    },
                },
            });

            // Update user statistics
            await this.updateUserStatistics(
                wallet.userId,
                "withdraw",
                data.principal.toString(),
            );
        }

        this.logger.log(
            `Processed EmergencyWithdrawn event: user=${userAddress}, package=${data.packageId}, stakeId=${data.stakeId}, principal=${data.principal}, lostReward=${data.lostReward}`,
        );
    }

    private async processPackageUpdatedEvent(
        contractAddress: string,
        data: PackageUpdatedEventData,
    ) {
        const normalizedContract = normalizeAddress(contractAddress);

        const contract = await this.prisma.stakingContract.findUnique({
            where: { address: normalizedContract },
        });

        if (!contract) {
            throw new Error(`Contract ${normalizedContract} not found`);
        }

        await this.prisma.stakingPackage.upsert({
            where: {
                contractId_packageId: {
                    contractId: contract.id,
                    packageId: Number(data.id),
                },
            },
            update: {
                lockPeriod: Number(data.lockPeriod),
                apy: Number(data.apy),
                isEnabled: data.enabled,
            },
            create: {
                contractId: contract.id,
                packageId: Number(data.id),
                lockPeriod: Number(data.lockPeriod),
                apy: Number(data.apy),
                isEnabled: data.enabled,
            },
        });

        this.logger.log(
            `Processed PackageUpdated event: id=${data.id}, lockPeriod=${data.lockPeriod}, apy=${data.apy}, enabled=${data.enabled}`,
        );
    }

    private async processContractPausedEvent(
        contractAddress: string,
        isPaused: boolean,
    ) {
        const normalizedContract = normalizeAddress(contractAddress);

        await this.prisma.stakingContract.update({
            where: { address: normalizedContract },
            data: { isPaused },
        });

        this.logger.log(
            `Processed ${isPaused ? "Paused" : "Unpaused"} event for contract ${normalizedContract}`,
        );
    }

    private async getOrCreateWallet(chainId: number, walletAddress: string) {
        let wallet = await this.prisma.userWallet.findUnique({
            where: { walletAddress },
        });

        if (!wallet) {
            // Create a new user and wallet
            const user = await this.prisma.user.create({
                data: {
                    name: `User_${walletAddress.slice(0, 8)}`,
                    authMethod: "WALLET",
                    role: "USER",
                    status: "ACTIVE",
                },
            });

            wallet = await this.prisma.userWallet.create({
                data: {
                    userId: user.id,
                    chainId,
                    walletAddress,
                    isPrimary: true,
                    isVerified: true,
                    verifiedAt: new Date(),
                },
            });
        }

        return wallet;
    }

    private async updateUserStatistics(
        userId: number,
        action: "stake" | "claim" | "withdraw",
        amount: string,
    ) {
        const stats = await this.prisma.userStatistics.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                totalStaked: "0",
                totalClaimed: "0",
                totalWithdrawn: "0",
                activeStakes: 0,
                completedStakes: 0,
                pendingRewards: "0",
            },
        });

        const amountBigInt = BigInt(amount);

        switch (action) {
            case "stake":
                await this.prisma.userStatistics.update({
                    where: { userId },
                    data: {
                        totalStaked: (
                            BigInt(stats.totalStaked) + amountBigInt
                        ).toString(),
                        activeStakes: { increment: 1 },
                    },
                });
                break;

            case "claim":
                await this.prisma.userStatistics.update({
                    where: { userId },
                    data: {
                        totalClaimed: (
                            BigInt(stats.totalClaimed) + amountBigInt
                        ).toString(),
                    },
                });
                break;

            case "withdraw":
                await this.prisma.userStatistics.update({
                    where: { userId },
                    data: {
                        totalWithdrawn: (
                            BigInt(stats.totalWithdrawn) + amountBigInt
                        ).toString(),
                        activeStakes: { decrement: 1 },
                        completedStakes: { increment: 1 },
                    },
                });
                break;
        }
    }
}
