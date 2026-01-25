export type TransactionType = 'STAKE' | 'CLAIM' | 'WITHDRAW' | 'EMERGENCY_WITHDRAW';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface Transaction {
    id: number;
    type: TransactionType;
    status: TransactionStatus;
    amount: string;
    txHash: string | null;
    blockNumber: string | null;
    createdAt: string;
    confirmedAt: string | null;
    explorerUrl: string | null;
    stakePosition: {
        id: number;
        onChainStakeId: number;
        onChainPackageId: number;
    } | null;
    chain: {
        id: number;
        name: string;
        slug: string;
        explorerUrl: string;
    };
}

export interface TransactionListResponse {
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface TransactionSummary {
    totalStaked: string;
    totalClaimed: string;
    totalWithdrawn: string;
    stakeCount: number;
    claimCount: number;
    withdrawCount: number;
}

export interface RewardSummary {
    totalRewardEarned: string;
    totalRewardClaimed: string;
    pendingRewards: string;
}
