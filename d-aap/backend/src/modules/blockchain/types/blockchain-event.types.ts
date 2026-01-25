export interface StakedEventData {
    user: string;
    packageId: number;
    stakeId: number;
    amount: string;
    rewardTotal: string;
}

export interface ClaimedEventData {
    user: string;
    packageId: number;
    stakeId: number;
    amount: string;
}

export interface WithdrawnEventData {
    user: string;
    packageId: number;
    stakeId: number;
    principal: string;
    reward: string;
}

export interface EmergencyWithdrawnEventData {
    user: string;
    packageId: number;
    stakeId: number;
    principal: string;
    lostReward: string;
}

export interface PackageUpdatedEventData {
    id: number;
    lockPeriod: number;
    apy: number;
    enabled: boolean;
}

export interface ExcessRewardWithdrawnEventData {
    admin: string;
    amount: string;
}

export type YieldStakingEventData =
    | StakedEventData
    | ClaimedEventData
    | WithdrawnEventData
    | EmergencyWithdrawnEventData
    | PackageUpdatedEventData
    | ExcessRewardWithdrawnEventData;

export enum YieldStakingEventName {
    STAKED = "Staked",
    CLAIMED = "Claimed",
    WITHDRAWN = "Withdrawn",
    EMERGENCY_WITHDRAWN = "EmergencyWithdrawn",
    PACKAGE_UPDATED = "PackageUpdated",
    EXCESS_REWARD_WITHDRAWN = "ExcessRewardWithdrawn",
    PAUSED = "Paused",
    UNPAUSED = "Unpaused",
}
