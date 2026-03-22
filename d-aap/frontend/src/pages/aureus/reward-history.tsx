import { useMemo } from 'react';
import { useChainId } from 'wagmi';

import { RewardHistoryTable, type RewardHistoryItem } from '@/components/tables';
import { useStakingPositionsView } from '@/hooks';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { hasAccountAuth } from '@/lib/auth/auth';

export default function RewardHistoryPage() {
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const isAuthenticated = hasAccountAuth();
    const { positions, isLoading, isError, metadata } = useStakingPositionsView({
        page: 1,
        limit: 200,
    });

    const tableData: RewardHistoryItem[] = useMemo(
        () =>
            positions.map((position) => ({
                id: position.id,
                packageId: position.packageId,
                stakeId: position.stakeId,
                lockPeriod: position.lockPeriodLabel,
                apy: position.apy,
                stakedAmount: position.principalRaw.toString(),
                totalRewards: position.rewardTotalRaw.toString(),
                claimed: position.rewardClaimedRaw.toString(),
                pending: position.claimableRewardRaw.toString(),
                lastClaim: position.lastClaimLabel,
                status: position.status,
            })),
        [positions],
    );

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Sign in required</h1>
                    <p className="text-muted-foreground">
                        Please sign in to view your reward history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Reward History</h1>
                <p className="text-muted-foreground">Track your staking rewards and earnings</p>
            </div>
            {isLoading && <div className="text-muted-foreground">Loading...</div>}
            {isError && <div className="text-destructive">Failed to load reward history</div>}
            <RewardHistoryTable
                data={tableData}
                explorerUrl={explorerUrl}
                contractAddress={metadata.contractAddress}
                stakeSymbol={metadata.stakeSymbol}
                rewardSymbol={metadata.rewardSymbol}
            />
        </div>
    );
}
