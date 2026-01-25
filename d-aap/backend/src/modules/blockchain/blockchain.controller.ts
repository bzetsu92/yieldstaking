import { Controller, Get, Post, Query, Body, UseGuards } from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

import { BlockchainService } from "./blockchain.service";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";

interface SyncContractDto {
    chainId: number;
    contractAddress: string;
}

@ApiTags("Blockchain")
@Controller("blockchain")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth("access-token")
export class BlockchainController {
    constructor(private readonly blockchainService: BlockchainService) {}

    @Get("sync")
    @ApiOperation({ summary: "Get all blockchain sync statuses" })
    @ApiResponse({
        status: 200,
        description: "Sync statuses retrieved successfully",
    })
    async getAllSyncStatuses() {
        return this.blockchainService.getAllSyncStatuses();
    }

    @Get("events/unprocessed/count")
    @ApiOperation({ summary: "Get count of unprocessed events" })
    @ApiResponse({ status: 200, description: "Count retrieved successfully" })
    async getUnprocessedEventCount() {
        const count = await this.blockchainService.getUnprocessedEventCount();
        return { count };
    }

    @Get("events/recent")
    @ApiOperation({ summary: "Get recent blockchain events" })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiResponse({ status: 200, description: "Events retrieved successfully" })
    async getRecentEvents(@Query("limit") limit?: number) {
        return this.blockchainService.getRecentEvents(limit || 20);
    }

    @Get("health")
    @ApiOperation({ summary: "Get blockchain service health status" })
    @ApiResponse({
        status: 200,
        description: "Health status retrieved successfully",
    })
    async getHealth() {
        return this.blockchainService.getHealthStatus();
    }

    @Post("sync")
    @ApiOperation({ summary: "Start syncing a staking contract" })
    @ApiResponse({ status: 200, description: "Sync started successfully" })
    async syncContract(@Body() syncDto: SyncContractDto) {
        return this.blockchainService.syncContract(
            syncDto.chainId,
            syncDto.contractAddress,
        );
    }

    @Post("process-events")
    @ApiOperation({ summary: "Process unprocessed blockchain events" })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiResponse({ status: 200, description: "Events processed successfully" })
    async processEvents(@Query("limit") limit?: number) {
        return this.blockchainService.processUnprocessedEvents(limit || 100);
    }
}
