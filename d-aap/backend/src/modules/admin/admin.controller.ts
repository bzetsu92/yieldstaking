import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
    ApiBody,
} from "@nestjs/swagger";
import { UserRole, UserStatus } from "@prisma/client";

import { AdminService } from "./admin.service";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth("access-token")
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get("statistics")
    @ApiOperation({ summary: "Get platform statistics" })
    @ApiResponse({
        status: 200,
        description: "Statistics retrieved successfully",
    })
    async getPlatformStatistics() {
        return this.adminService.getPlatformStatistics();
    }

    @Get("contracts")
    @ApiOperation({
        summary: "Get all staking contracts with details (admin view)",
    })
    @ApiQuery({ name: "chainId", required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: "Contracts retrieved successfully",
    })
    async getContracts(@Query("chainId") chainId?: number) {
        return this.adminService.getContracts(chainId);
    }

    @Get("packages")
    @ApiOperation({
        summary: "Get all staking packages with details (admin view)",
    })
    @ApiQuery({ name: "contractId", required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: "Packages retrieved successfully",
    })
    async getPackages(@Query("contractId") contractId?: number) {
        return this.adminService.getPackages(contractId);
    }

    @Get("positions")
    @ApiOperation({ summary: "Get all stake positions (admin view)" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "walletAddress", required: false, type: String })
    @ApiQuery({ name: "isWithdrawn", required: false, type: Boolean })
    @ApiQuery({ name: "userId", required: false, type: Number })
    @ApiQuery({ name: "search", required: false, type: String })
    @ApiResponse({
        status: 200,
        description: "Positions retrieved successfully",
    })
    async getPositions(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("walletAddress") walletAddress?: string,
        @Query("isWithdrawn") isWithdrawn?: boolean,
        @Query("userId") userId?: number,
        @Query("search") search?: string,
    ) {
        return this.adminService.getPositions(
            page || 1,
            limit || 20,
            walletAddress,
            isWithdrawn,
            userId,
            search,
        );
    }

    @Get("transactions")
    @ApiOperation({ summary: "Get all transactions (admin view)" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "type", required: false, type: String })
    @ApiQuery({ name: "userId", required: false, type: Number })
    @ApiQuery({ name: "search", required: false, type: String })
    @ApiQuery({ name: "positionId", required: false, type: Number })
    @ApiResponse({
        status: 200,
        description: "Transactions retrieved successfully",
    })
    async getTransactions(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("type") type?: string,
        @Query("userId") userId?: number,
        @Query("search") search?: string,
        @Query("positionId") positionId?: number,
    ) {
        return this.adminService.getTransactions(
            page || 1,
            limit || 20,
            type,
            userId,
            search,
            positionId,
        );
    }

    @Get("users")
    @ApiOperation({ summary: "Get all users" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiResponse({ status: 200, description: "Users retrieved successfully" })
    async getUsers(
        @Query("page") page?: number,
        @Query("limit") limit?: number,
    ) {
        return this.adminService.getUsers(page || 1, limit || 20);
    }

    @Put("users/:id/role")
    @ApiOperation({ summary: "Update user role" })
    @ApiBody({ schema: { properties: { role: { enum: ["USER", "ADMIN"] } } } })
    @ApiResponse({ status: 200, description: "User role updated successfully" })
    async updateUserRole(
        @Param("id", ParseIntPipe) id: number,
        @Body("role") role: UserRole,
    ) {
        return this.adminService.updateUserRole(id, role);
    }

    @Put("users/:id/status")
    @ApiOperation({ summary: "Update user status" })
    @ApiBody({
        schema: {
            properties: {
                status: { enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: "User status updated successfully",
    })
    async updateUserStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body("status") status: UserStatus,
    ) {
        return this.adminService.updateUserStatus(id, status);
    }
}
