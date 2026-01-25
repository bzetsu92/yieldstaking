import { ApiProperty } from "@nestjs/swagger";

export class StakingPackageResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    contractId: number;

    @ApiProperty()
    packageId: number;

    @ApiProperty({ description: "Lock period in seconds" })
    lockPeriod: number;

    @ApiProperty({ description: "Lock period in days" })
    lockPeriodDays: number;

    @ApiProperty({ description: "APY in basis points" })
    apy: number;

    @ApiProperty({ description: "APY as percentage string" })
    apyPercentage: string;

    @ApiProperty()
    isEnabled: boolean;

    @ApiProperty()
    totalStaked: string;

    @ApiProperty()
    maxTotalStaked: string;

    @ApiProperty()
    stakersCount: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class StakingContractResponseDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    chainId: number;

    @ApiProperty()
    address: string;

    @ApiProperty()
    stakeTokenAddress: string;

    @ApiProperty()
    rewardTokenAddress: string;

    @ApiProperty()
    stakeTokenSymbol: string;

    @ApiProperty()
    rewardTokenSymbol: string;

    @ApiProperty()
    stakeTokenDecimals: number;

    @ApiProperty()
    rewardTokenDecimals: number;

    @ApiProperty()
    minStakeAmount: string;

    @ApiProperty()
    maxStakePerUser: string;

    @ApiProperty()
    totalLocked: string;

    @ApiProperty()
    totalRewardDebt: string;

    @ApiProperty()
    isPaused: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty({ type: [StakingPackageResponseDto] })
    packages?: StakingPackageResponseDto[];
}
