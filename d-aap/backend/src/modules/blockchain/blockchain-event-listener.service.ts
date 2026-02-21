import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SyncStatus } from "@prisma/client";
import { ethers } from "ethers";

import { CircuitBreaker } from "./utils/circuit-breaker.util";
import { serializeEventData, normalizeAddress } from "./utils/event-data.util";
import { retryWithBackoff } from "./utils/retry.util";
import { PrismaService } from "../../prisma/prisma.service";

const YIELD_STAKING_ABI = [
    "event Staked(address indexed user, uint8 indexed packageId, uint32 stakeId, uint256 amount, uint256 rewardTotal)",
    "event Claimed(address indexed user, uint8 indexed packageId, uint32 stakeId, uint256 amount)",
    "event Withdrawn(address indexed user, uint8 indexed packageId, uint32 stakeId, uint256 principal, uint256 reward)",
    "event EmergencyWithdrawn(address indexed user, uint8 indexed packageId, uint32 stakeId, uint256 principal, uint256 lostReward)",
    "event PackageUpdated(uint8 indexed id, uint64 lockPeriod, uint32 apy, bool enabled)",
    "event ExcessRewardWithdrawn(address indexed admin, uint256 amount)",
    "event Paused(address account)",
    "event Unpaused(address account)",
];

@Injectable()
export class BlockchainEventListenerService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(BlockchainEventListenerService.name);
    private providers: Map<number, ethers.Provider> = new Map();
    private circuitBreakers: Map<number, CircuitBreaker> = new Map();
    private isRunning = false;
    private processingBlocks: Set<string> = new Set();
    private blockIntervals: Map<number, NodeJS.Timeout> = new Map();
    private readonly yieldStakingInterface: ethers.Interface;
    private readonly config: {
        circuitBreakerThreshold: number;
        circuitBreakerTimeout: number;
        blockScanInterval: number;
        maxRetries: number;
        retryDelayMs: number;
    };

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        const blockchainConfig = this.configService.get("blockchain");
        this.config = {
            circuitBreakerThreshold:
                blockchainConfig?.circuitBreakerThreshold || 5,
            circuitBreakerTimeout:
                blockchainConfig?.circuitBreakerTimeout || 60000,
            blockScanInterval: blockchainConfig?.blockScanInterval || 3000,
            maxRetries: blockchainConfig?.maxRetries || 3,
            retryDelayMs: blockchainConfig?.retryDelayMs || 1000,
        };

        this.yieldStakingInterface = new ethers.Interface(YIELD_STAKING_ABI);
    }

    async onModuleInit() {
        await this.initializeProviders();
        this.startListeningToAllContracts().catch((error) => {
            this.logger.error("Failed to start blockchain listeners:", error);
        });
    }

    async onModuleDestroy() {
        this.stopAllListeners();
    }

    private async initializeProviders() {
        const chains = await this.prisma.chain.findMany({
            where: { isActive: true },
        });

        for (const chain of chains) {
            if (chain.rpcUrl) {
                try {
                    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
                    this.providers.set(chain.id, provider);
                    this.circuitBreakers.set(
                        chain.id,
                        new CircuitBreaker(
                            this.config.circuitBreakerThreshold,
                            this.config.circuitBreakerTimeout,
                        ),
                    );
                    this.logger.log(
                        `Initialized provider for chain ${chain.name} (${chain.id})`,
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to initialize provider for chain ${chain.id}:`,
                        error,
                    );
                }
            }
        }
    }

    private async startListeningToAllContracts() {
        const contracts = await this.prisma.stakingContract.findMany({
            where: {
                chain: { isActive: true },
            },
            include: {
                chain: true,
            },
        });

        for (const contract of contracts) {
            try {
                const addr = (contract.address || "").trim();
                if (!ethers.isAddress(addr)) {
                    this.logger.error(
                        `Invalid contract address "${contract.address}" for chain ${contract.chainId}, skipping`,
                    );
                    continue;
                }
                await this.startListening(contract.chainId, addr);
            } catch (error) {
                this.logger.error(
                    `Failed to start listening for contract ${contract.address}:`,
                    error,
                );
            }
        }
    }

    async startListening(chainId: number, contractAddress: string) {
        const provider = this.providers.get(chainId);
        if (!provider) {
            throw new Error(`Provider not found for chain ${chainId}`);
        }

        const normalizedAddress = normalizeAddress(contractAddress);
        const addr = (normalizedAddress || "").trim();
        if (!ethers.isAddress(addr)) {
            throw new Error(`Invalid contract address "${contractAddress}"`);
        }

        // Get or create sync record
        let sync = await this.prisma.blockchainSync.findUnique({
            where: {
                chainId_contractAddress: {
                    chainId,
                    contractAddress: normalizedAddress,
                },
            },
        });

        if (!sync) {
            const currentBlock = await this.getCurrentBlockWithRetry(chainId);
            sync = await this.prisma.blockchainSync.create({
                data: {
                    chainId,
                    contractAddress: normalizedAddress,
                    lastProcessedBlock: BigInt(currentBlock),
                    status: SyncStatus.PENDING,
                    lastSyncAt: new Date(),
                },
            });
        }

        await this.prisma.blockchainSync.update({
            where: {
                chainId_contractAddress: {
                    chainId,
                    contractAddress: normalizedAddress,
                },
            },
            data: {
                status: SyncStatus.PROCESSING,
                lastSyncAt: new Date(),
            },
        });

        const currentBlock = await this.getCurrentBlockWithRetry(chainId);

        this.logger.log(
            `Starting to listen for YieldStaking events on chain ${chainId}, contract ${normalizedAddress} from block ${currentBlock}`,
        );

        let lastBlockProcessed = currentBlock;
        const blockInterval = setInterval(async () => {
            try {
                const latestBlock =
                    await this.getCurrentBlockWithRetry(chainId);
                if (latestBlock > lastBlockProcessed) {
                    for (
                        let block = lastBlockProcessed + 1;
                        block <= latestBlock;
                        block++
                    ) {
                        await this.processNewBlock(chainId, addr, block);
                    }
                    lastBlockProcessed = latestBlock;
                }
            } catch (error) {
                this.logger.error(
                    `Error in block listener for chain ${chainId}:`,
                    error,
                );
            }
        }, this.config.blockScanInterval);

        this.blockIntervals.set(chainId, blockInterval);
        this.isRunning = true;

        await this.prisma.blockchainSync.update({
            where: {
                chainId_contractAddress: {
                    chainId,
                    contractAddress: normalizedAddress,
                },
            },
            data: {
                status: SyncStatus.COMPLETED,
                lastSyncAt: new Date(),
            },
        });
    }

    private async getCurrentBlockWithRetry(chainId: number): Promise<number> {
        const provider = this.providers.get(chainId);
        const circuitBreaker = this.circuitBreakers.get(chainId);

        if (!provider || !circuitBreaker) {
            throw new Error(
                `Provider or circuit breaker not found for chain ${chainId}`,
            );
        }

        return circuitBreaker.execute(() =>
            retryWithBackoff(
                () => provider.getBlockNumber(),
                this.config.maxRetries,
                this.config.retryDelayMs,
            ),
        );
    }

    private async processNewBlock(
        chainId: number,
        contractAddress: string,
        blockNumber: number,
    ) {
        const blockKey = `${chainId}-${contractAddress}-${blockNumber}`;

        if (this.processingBlocks.has(blockKey)) {
            return;
        }

        this.processingBlocks.add(blockKey);

        try {
            await this.scanBlockForEvents(
                chainId,
                contractAddress,
                blockNumber,
            );
            await this.updateLastProcessedBlock(
                chainId,
                contractAddress,
                BigInt(blockNumber),
            );
        } catch (error) {
            this.logger.error(
                `Error processing block ${blockNumber} on chain ${chainId}:`,
                error,
            );
        } finally {
            this.processingBlocks.delete(blockKey);
        }
    }

    private async scanBlockForEvents(
        chainId: number,
        contractAddress: string,
        blockNumber: number,
    ) {
        await this.scanBlockRangeForEvents(
            chainId,
            contractAddress,
            blockNumber,
            blockNumber,
        );
    }

    private async scanBlockRangeForEvents(
        chainId: number,
        contractAddress: string,
        fromBlock: number,
        toBlock: number,
    ) {
        const provider = this.providers.get(chainId);
        const circuitBreaker = this.circuitBreakers.get(chainId);
        if (!provider || !circuitBreaker) return;

        const addr = (contractAddress || "").trim();
        if (!ethers.isAddress(addr)) {
            this.logger.error(
                `Invalid contract address "${contractAddress}" provided to scanner, skipping logs for blocks ${fromBlock}-${toBlock}`,
            );
            return;
        }

        try {
            const logs = await circuitBreaker.execute(() =>
                retryWithBackoff(
                    () =>
                        provider.getLogs({
                            address: addr,
                            fromBlock,
                            toBlock,
                        }),
                    this.config.maxRetries,
                    this.config.retryDelayMs,
                ),
            );

            if (logs.length > 0) {
                await this.batchSaveEvents(chainId, contractAddress, logs);
            }
        } catch (error) {
            this.logger.error(
                `Error scanning events for ${contractAddress} blocks ${fromBlock}-${toBlock}:`,
                error,
            );
            throw error;
        }
    }

    private async batchSaveEvents(
        chainId: number,
        contractAddress: string,
        logs: ethers.Log[],
    ) {
        interface ParsedEvent {
            name: string;
            log: ethers.Log;
            args: Record<string, unknown>;
        }

        const eventsToSave: ParsedEvent[] = [];

        for (const log of logs) {
            try {
                const parsed = this.yieldStakingInterface.parseLog({
                    topics: log.topics as string[],
                    data: log.data || "0x",
                });
                if (parsed) {
                    eventsToSave.push({
                        name: parsed.name,
                        log,
                        args: Object.fromEntries(
                            Object.entries(parsed.args).filter(([key]) =>
                                isNaN(Number(key)),
                            ),
                        ),
                    });
                }
            } catch {
                // Ignore parsing errors for individual logs
            }
        }

        if (eventsToSave.length === 0) {
            return;
        }

        const normalizedAddress = normalizeAddress(contractAddress);

        // Check for existing events to avoid duplicates
        const eventKeys = eventsToSave.map((e) => ({
            txHash: e.log.transactionHash,
            logIndex: e.log.index || 0,
        }));

        const existing = await this.prisma.blockchainEvent.findMany({
            where: {
                chainId,
                contractAddress: normalizedAddress,
                OR: eventKeys.map((key) => ({
                    txHash: key.txHash,
                    logIndex: key.logIndex,
                })),
            },
            select: { txHash: true, logIndex: true },
        });

        const existingSet = new Set(
            existing.map((e) => `${e.txHash}-${e.logIndex}`),
        );

        const newEvents = eventsToSave.filter(
            (e) =>
                !existingSet.has(
                    `${e.log.transactionHash}-${e.log.index || 0}`,
                ),
        );

        if (newEvents.length === 0) {
            return;
        }

        const eventsToCreate = newEvents.map(({ name, log, args }) => ({
            chainId,
            eventName: name,
            contractAddress: normalizedAddress,
            txHash: log.transactionHash,
            blockNumber: BigInt(log.blockNumber),
            logIndex: log.index || 0,
            eventData: serializeEventData(args || {}) as object,
            processed: false,
            processedAt: null as Date | null,
        }));

        await this.prisma.blockchainEvent.createMany({
            data: eventsToCreate,
            skipDuplicates: true,
        });

        this.logger.log(
            `Saved ${newEvents.length} YieldStaking events from ${contractAddress}`,
        );
    }

    private async updateLastProcessedBlock(
        chainId: number,
        contractAddress: string,
        blockNumber: bigint,
    ) {
        try {
            await this.prisma.blockchainSync.update({
                where: {
                    chainId_contractAddress: {
                        chainId,
                        contractAddress: normalizeAddress(contractAddress),
                    },
                },
                data: {
                    lastProcessedBlock: blockNumber,
                    currentBlock: blockNumber,
                    lastSyncAt: new Date(),
                },
            });
        } catch (error) {
            this.logger.error(
                `Error updating last processed block for chain ${chainId}:`,
                error,
            );
        }
    }

    private stopAllListeners() {
        for (const [_, interval] of this.blockIntervals.entries()) {
            clearInterval(interval);
        }
        this.blockIntervals.clear();

        for (const [_, provider] of this.providers.entries()) {
            void provider.removeAllListeners();
        }

        this.isRunning = false;
        this.processingBlocks.clear();
        this.logger.log("Stopped all blockchain event listeners");
    }

    getHealthStatus(): {
        isRunning: boolean;
        providers: Record<number, { connected: boolean }>;
        circuitBreakers: Record<number, { state: string }>;
    } {
        const status = {
            isRunning: this.isRunning,
            providers: {} as Record<number, { connected: boolean }>,
            circuitBreakers: {} as Record<number, { state: string }>,
        };

        for (const [chainId, provider] of this.providers.entries()) {
            status.providers[chainId] = {
                connected: provider !== null,
            };
        }

        for (const [chainId, breaker] of this.circuitBreakers.entries()) {
            status.circuitBreakers[chainId] = {
                state: breaker.getState(),
            };
        }

        return status;
    }
}
