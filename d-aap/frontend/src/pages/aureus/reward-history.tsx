import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

import { WalletDisplay } from '@/components/wallet';
import { RewardHistoryTable, type RewardHistoryItem } from '@/components/tables';
import { useYieldStaking, useUserStakes } from '@/hooks/use-yield-staking';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';

function formatDate(timestamp: bigint): string {
    if (timestamp === BigInt(0)) return '-';
    return new Date(Number(timestamp) * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatLockPeriod(seconds: bigint): string {
    const days = Number(seconds) / 86400;
    if (days >= 365) return `${Math.floor(days / 365)} Year`;
    if (days >= 30) return `${Math.floor(days / 30)} Months`;
    return `${Math.floor(days)} Days`;
}

function isUnlocked(unlockTimestamp: bigint): boolean {
    return Date.now() / 1000 >= Number(unlockTimestamp);
}

export default function RewardHistoryPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;

    const { packages, tokenDecimals, stakingAddress } = useYieldStaking();

    const stakesData = packages.map(pkg => {
        const { stakes } = useUserStakes(pkg.id);
        return { packageId: pkg.id, stakes };
    });

    const allStakes = useMemo(() =>
        stakesData.flatMap(data =>
            data.stakes.map(stake => ({
                ...stake,
                package: packages.find(p => p.id === data.packageId),
            }))
        ),
        [stakesData, packages]
    );

    const tableData: RewardHistoryItem[] = useMemo(() =>
        allStakes.map(stake => ({
            id: `${stake.packageId}-${stake.stakeId}`,
            packageId: stake.packageId,
            stakeId: stake.stakeId,
            lockPeriod: formatLockPeriod(stake.lockPeriod),
            apy: stake.package?.apy || 0,
            stakedAmount: parseFloat(formatUnits(stake.balance, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            totalRewards: parseFloat(formatUnits(stake.rewardTotal, tokenDecimals)).toFixed(4),
            claimed: parseFloat(formatUnits(stake.rewardClaimed, tokenDecimals)).toFixed(4),
            pending: parseFloat(formatUnits(stake.claimable, tokenDecimals)).toFixed(4),
            lastClaim: formatDate(stake.lastClaimTimestamp),
            status: isUnlocked(stake.unlockTimestamp) ? 'unlocked' : 'active',
        })),
        [allStakes, tokenDecimals]
    );

    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

    if (!isConnected) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Connect Wallet</h1>
                    <p className="text-muted-foreground">Please connect your wallet to view reward history</p>
                    <WalletDisplay />
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
            <RewardHistoryTable 
                data={tableData} 
                explorerUrl={explorerUrl}
                contractAddress={stakingAddress}
            />
        </div>
    );
}
