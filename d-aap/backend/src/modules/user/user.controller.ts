import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    Request,
    UseGuards,
    Param,
    ParseIntPipe,
} from "@nestjs/common";
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
} from "@nestjs/swagger";

import { LinkWalletDto } from "./dto/link-wallet.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../../auth/guard/roles.guard";
import { AuthenticatedRequest } from "../../auth/interface/authenticated-request.interface";

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth("access-token")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get("profile")
    @ApiOperation({ summary: "Get user profile with staking statistics" })
    @ApiResponse({ status: 200, description: "Profile retrieved successfully" })
    async getProfile(@Request() req: AuthenticatedRequest) {
        return this.userService.getProfileWithStats(req.user.id);
    }

    @Put("profile")
    @ApiOperation({ summary: "Update user profile" })
    @ApiResponse({ status: 200, description: "Profile updated successfully" })
    async updateProfile(
        @Request() req: AuthenticatedRequest,
        @Body() updateDto: UpdateProfileDto,
    ) {
        return this.userService.updateProfile(req.user.id, updateDto);
    }

    @Get("statistics")
    @ApiOperation({ summary: "Get user staking statistics" })
    @ApiResponse({
        status: 200,
        description: "Statistics retrieved successfully",
    })
    async getStatistics(@Request() req: AuthenticatedRequest) {
        return this.userService.getUserStatistics(req.user.id);
    }

    @Post("link-wallet")
    @ApiOperation({ summary: "Link a wallet to user account" })
    @ApiResponse({ status: 200, description: "Wallet linked successfully" })
    async linkWallet(
        @Request() req: AuthenticatedRequest,
        @Body() linkDto: LinkWalletDto,
    ) {
        return this.userService.linkWallet(
            req.user.id,
            linkDto.walletAddress,
            linkDto.signature,
            linkDto.message,
        );
    }

    @Get("wallets")
    @ApiOperation({ summary: "Get all wallets linked to user account" })
    @ApiResponse({ status: 200, description: "Wallets retrieved successfully" })
    async getWallets(@Request() req: AuthenticatedRequest) {
        return this.userService.getWallets(req.user.id);
    }

    @Post("wallets/:walletId/set-primary")
    @ApiOperation({ summary: "Set a wallet as primary" })
    @ApiResponse({ status: 200, description: "Primary wallet updated" })
    async setPrimaryWallet(
        @Request() req: AuthenticatedRequest,
        @Param("walletId", ParseIntPipe) walletId: number,
    ) {
        return this.userService.setPrimaryWallet(req.user.id, walletId);
    }
}
