import { useState, useEffect, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ArrowDownToLine, Clock, Loader2, Unlock, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WalletDisplay } from '@/components/wallet';
import { StakedPackagesTable, type StakedPackageItem } from '@/components/tables';
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

function getTimeRemaining(unlockTimestamp: bigint): string {
    const now = Date.now() / 1000;
    const remaining = Number(unlockTimestamp) - now;
    if (remaining <= 0) return 'Ready';
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
}

export default function WithdrawalsPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const [selectedStake, setSelectedStake] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'claim' | 'withdraw' | null>(null);

    const {
        packages,
        tokenDecimals,
        tokenSymbol,
        rewardTokenDecimals,
        rewardSymbol,
        stakingAddress,
        claim,
        withdraw,
        isWritePending,
        isConfirming,
        isConfirmed,
        reset,
        refetchAll,
    } = useYieldStaking();

    const stakesData = packages.map(pkg => {
        const { stakes, refetch } = useUserStakes(pkg.id);
        return { packageId: pkg.id, stakes, refetch };
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

    const tableData: StakedPackageItem[] = useMemo(() =>
        allStakes.map(stake => ({
            id: `${stake.packageId}-${stake.stakeId}`,
            packageId: stake.packageId,
            stakeId: stake.stakeId,
            lockPeriod: formatLockPeriod(stake.lockPeriod),
            apy: stake.package?.apy || 0,
            stakedAmount: parseFloat(formatUnits(stake.balance, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            claimable: parseFloat(formatUnits(stake.claimable, rewardTokenDecimals)).toFixed(4),
            unlockDate: formatDate(stake.unlockTimestamp),
            timeRemaining: getTimeRemaining(stake.unlockTimestamp),
            isUnlocked: isUnlocked(stake.unlockTimestamp),
        })),
        [allStakes, tokenDecimals, rewardTokenDecimals]
    );

    const selected = useMemo(() => {
        if (!selectedStake) return allStakes[0] || null;
        return allStakes.find(s => `${s.packageId}-${s.stakeId}` === selectedStake) || null;
    }, [selectedStake, allStakes]);

    useEffect(() => {
        if (isConfirmed) {
            toast.success(actionType === 'claim' ? 'Rewards claimed!' : 'Withdrawal successful!');
            setProcessingId(null);
            setActionType(null);
            reset();
            refetchAll();
            stakesData.forEach(d => d.refetch());
        }
    }, [isConfirmed, actionType, reset, refetchAll]);

    const handleClaim = () => {
        if (!selected) return;
        setProcessingId(`${selected.packageId}-${selected.stakeId}-claim`);
        setActionType('claim');
        claim(selected.packageId, selected.stakeId);
    };

    const handleWithdraw = () => {
        if (!selected) return;
        setProcessingId(`${selected.packageId}-${selected.stakeId}-withdraw`);
        setActionType('withdraw');
        withdraw(selected.packageId, selected.stakeId);
    };

    const isProcessing = isWritePending || isConfirming;
    const unlocked = selected ? isUnlocked(selected.unlockTimestamp) : false;
    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

    if (!isConnected) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Connect Wallet</h1>
                    <p className="text-muted-foreground">Please connect your wallet to manage your stakes</p>
                    <WalletDisplay />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Withdraw & Claim</h1>
                <p className="text-muted-foreground">Manage your staked positions and claim rewards</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-10">
                <div className="lg:col-span-6">
                    <StakedPackagesTable 
                        data={tableData}
                        selectedId={selectedStake || (allStakes[0] ? `${allStakes[0].packageId}-${allStakes[0].stakeId}` : null)}
                        onSelect={setSelectedStake}
                        explorerUrl={explorerUrl}
                        contractAddress={stakingAddress}
                        stakeSymbol={tokenSymbol}
                        rewardSymbol={rewardSymbol}
                    />
                </div>
                <div className="lg:col-span-4">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            {selected ? (
                                <>
                                    <div className="rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-sm">
                                                    AUR
                                                </div>
                                                <div>
                                                    <div className="font-semibold">
                                                        {formatLockPeriod(selected.lockPeriod)} Package
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        APY: <span className="text-primary font-semibold">{selected.package?.apy}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {unlocked ? (
                                                    <span className="inline-flex items-center gap-1 text-green-500 text-sm font-medium">
                                                        <Unlock className="h-4 w-4" />
                                                        Unlocked
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        {getTimeRemaining(selected.unlockTimestamp)} remaining
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Staked Amount</span>
                                                <span className="font-semibold">
                                                    {parseFloat(formatUnits(selected.balance, tokenDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} {tokenSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Total Rewards</span>
                                                <span className="font-semibold">
                                                    {parseFloat(formatUnits(selected.rewardTotal, rewardTokenDecimals)).toFixed(4)} {rewardSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Claimed</span>
                                                <span className="font-semibold">
                                                    {parseFloat(formatUnits(selected.rewardClaimed, rewardTokenDecimals)).toFixed(4)} {rewardSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Claimable Now</span>
                                                <span className="font-semibold text-green-500">
                                                    +{parseFloat(formatUnits(selected.claimable, rewardTokenDecimals)).toFixed(4)} {rewardSymbol}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Unlock Date</span>
                                                <span className="font-semibold">{formatDate(selected.unlockTimestamp)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="h-12"
                                            onClick={handleClaim}
                                            disabled={selected.claimable === BigInt(0) || isProcessing}
                                        >
                                            {processingId?.endsWith('-claim') && isProcessing ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <Gift className="mr-2 h-5 w-5" />
                                            )}
                                            Claim Rewards
                                        </Button>
                                        <Button
                                            className="h-12 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white"
                                            onClick={handleWithdraw}
                                            disabled={!unlocked || isProcessing}
                                        >
                                            {processingId?.endsWith('-withdraw') && isProcessing ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <ArrowDownToLine className="mr-2 h-5 w-5" />
                                            )}
                                            Withdraw All
                                        </Button>
                                    </div>

                                    {!unlocked && (
                                        <div className="text-center text-sm text-muted-foreground">
                                            Withdrawal available after unlock date. You can claim rewards anytime.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center text-muted-foreground">
                                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No active stakes found</p>
                                    <p className="text-sm mt-1">Start staking to see your positions here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
