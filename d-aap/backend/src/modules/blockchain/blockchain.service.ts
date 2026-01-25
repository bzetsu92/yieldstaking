import { Injectable } from "@nestjs/common";
import { SyncStatus } from "@prisma/client";

import { BlockchainEventListenerService } from "./blockchain-event-listener.service";
import { BlockchainEventProcessorService } from "./blockchain-event-processor.service";
import { normalizeAddress } from "./utils/event-data.util";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BlockchainService {
    constructor(
        private prisma: PrismaService,
        private eventListener: BlockchainEventListenerService,
        private eventProcessor: BlockchainEventProcessorService,
    ) {}

    async syncContract(chainId: number, contractAddress: string) {
        const normalizedAddress = normalizeAddress(contractAddress);

        const sync = await this.prisma.blockchainSync.upsert({
            where: {
                chainId_contractAddress: {
                    chainId,
                    contractAddress: normalizedAddress,
                },
            },
            update: {
                status: SyncStatus.PROCESSING,
                lastSyncAt: new Date(),
            },
            create: {
                chainId,
                contractAddress: normalizedAddress,
                lastProcessedBlock: BigInt(0),
                status: SyncStatus.PROCESSING,
                lastSyncAt: new Date(),
            },
        });

        await this.eventListener.startListening(chainId, normalizedAddress);
        await this.eventProcessor.processUnprocessedEvents(100);

        return sync;
    }

    async getSyncStatus(chainId: number, contractAddress?: string) {
        if (contractAddress) {
            return this.prisma.blockchainSync.findUnique({
                where: {
                    chainId_contractAddress: {
                        chainId,
                        contractAddress: normalizeAddress(contractAddress),
                    },
                },
                include: {
                    chain: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            });
        }

        return this.prisma.blockchainSync.findMany({
            where: { chainId },
            include: {
                chain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
    }

    async getAllSyncStatuses() {
        return this.prisma.blockchainSync.findMany({
            include: {
                chain: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: [{ chainId: "asc" }, { contractAddress: "asc" }],
        });
    }

    async processBlockchainEvent(eventId: number) {
        return this.eventProcessor.processEvent(eventId);
    }

    async processUnprocessedEvents(limit = 100) {
        return this.eventProcessor.processUnprocessedEvents(limit);
    }

    async getUnprocessedEventCount() {
        return this.prisma.blockchainEvent.count({
            where: {
                processed: false,
                errorMessage: null,
            },
        });
    }

    async getRecentEvents(limit = 20) {
        return this.prisma.blockchainEvent.findMany({
            include: {
                chain: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }

    async getEventsByContract(contractAddress: string, limit = 50) {
        return this.prisma.blockchainEvent.findMany({
            where: {
                contractAddress: normalizeAddress(contractAddress),
            },
            include: {
                chain: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { blockNumber: "desc" },
            take: limit,
        });
    }

    getHealthStatus() {
        return this.eventListener.getHealthStatus();
    }
}
