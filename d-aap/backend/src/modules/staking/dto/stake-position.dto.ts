import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEthereumAddress, IsInt, IsOptional, Min } from "class-validator";

function transformBoolean({ value }: { value: unknown }) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") {
            return true;
        }
        if (normalized === "false") {
            return false;
        }
    }

    return value;
}

export class GetStakePositionsDto {
    @ApiPropertyOptional({ description: "Page number", default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: "Items per page", default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: "Filter by withdrawn status" })
    @IsOptional()
    @Transform(transformBoolean)
    @IsBoolean()
    isWithdrawn?: boolean;

    @ApiPropertyOptional({ description: "Filter by package ID" })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    packageId?: number;

    @ApiPropertyOptional({ description: "Filter by wallet address" })
    @IsOptional()
    @IsEthereumAddress()
    walletAddress?: string;
}

export class StakePositionResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    walletAddress: string;

    @ApiProperty()
    contractId: number;

    @ApiProperty()
    packageId: number;

    @ApiProperty()
    onChainStakeId: number;

    @ApiProperty()
    onChainPackageId: number;

    @ApiProperty()
    principal: string;

    @ApiProperty()
    rewardTotal: string;

    @ApiProperty()
    rewardClaimed: string;

    @ApiProperty()
    claimableReward: string;

    @ApiProperty()
    lockPeriod: number;

    @ApiProperty()
    lockPeriodDays: number;

    @ApiProperty()
    startTimestamp: Date;

    @ApiProperty()
    unlockTimestamp: Date;

    @ApiProperty()
    isUnlocked: boolean;

    @ApiProperty()
    isWithdrawn: boolean;

    @ApiProperty()
    isEmergencyWithdrawn: boolean;

    @ApiProperty()
    stakeTxHash: string | null;

    @ApiProperty()
    withdrawTxHash: string | null;

    @ApiProperty()
    package: {
        packageId: number;
        lockPeriod: number;
        apy: number;
    };

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class StakePositionSummaryDto {
    @ApiProperty()
    totalActiveStakes: number;

    @ApiProperty()
    totalPrincipalStaked: string;

    @ApiProperty()
    totalRewardEarned: string;

    @ApiProperty()
    totalRewardClaimed: string;

    @ApiProperty()
    totalPendingReward: string;

    @ApiProperty()
    upcomingUnlocks: {
        positionId: number;
        unlockTimestamp: Date;
        principal: string;
        reward: string;
    }[];
}
