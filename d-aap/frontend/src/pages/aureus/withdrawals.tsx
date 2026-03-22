import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { ArrowDownToLine, Clock, Gift, Loader2, Unlock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StakedPackagesTable, type StakedPackageItem } from '@/components/tables';
import { WalletDisplay } from '@/components/wallet';
import { useStakingPositionsView } from '@/hooks';
import { useStakeWriter } from '@/hooks/use-yield-staking';
import { formatTokenAmount } from '@/lib/utils/format';
import { hasAccountAuth } from '@/lib/auth/auth';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';

export default function WithdrawalsPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const [selectedStake, setSelectedStake] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'claim' | 'withdraw' | null>(null);
    const isAuthenticated = hasAccountAuth();
    const queryClient = useQueryClient();

    const { claim, withdraw, isWritePending, isConfirming, isConfirmed, reset } = useStakeWriter();
    const { activePositions, metadata } = useStakingPositionsView({
        page: 1,
        limit: 200,
    });

    const tableData: StakedPackageItem[] = useMemo(
        () =>
            activePositions.map((position) => ({
                id: position.id,
                packageId: position.packageId,
                stakeId: position.stakeId,
                lockPeriod: position.lockPeriodLabel,
                apy: position.apy,
                stakedAmount: position.principalRaw.toString(),
                claimable: position.claimableRewardRaw.toString(),
                unlockDate: position.unlockDateLabel,
                timeRemaining: position.timeRemaining,
                isUnlocked: position.unlocked,
            })),
        [activePositions],
    );

    const selected = useMemo(() => {
        if (!selectedStake) {
            return activePositions[0] || null;
        }

        return activePositions.find((position) => position.id === selectedStake) || null;
    }, [activePositions, selectedStake]);

    useEffect(() => {
        if (isConfirmed) {
            toast.success(actionType === 'claim' ? 'Rewards claimed!' : 'Withdrawal successful!');
            setProcessingId(null);
            setActionType(null);
            reset();
            void queryClient.invalidateQueries({ queryKey: ['staking', 'positions', 'my'] });
        }
    }, [actionType, isConfirmed, queryClient, reset]);

    const handleClaim = async () => {
        if (!selected) return;

        setProcessingId(`${selected.id}-claim`);
        setActionType('claim');

        try {
            await claim(selected.packageId, selected.stakeId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Claim failed');
            setProcessingId(null);
            setActionType(null);
        }
    };

    const handleWithdraw = async () => {
        if (!selected) return;

        setProcessingId(`${selected.id}-withdraw`);
        setActionType('withdraw');

        try {
            await withdraw(selected.packageId, selected.stakeId);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Withdraw failed');
            setProcessingId(null);
            setActionType(null);
        }
    };

    const isProcessing = isWritePending || isConfirming;
    const explorerUrl = EXPLORER_ENDPOINTS[chainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];
    const stakeSymbol = selected?.stakeSymbol ?? metadata.stakeSymbol;
    const rewardSymbol = selected?.rewardSymbol ?? metadata.rewardSymbol;

    if (!isAuthenticated) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Sign in required</h1>
                    <p className="text-muted-foreground">
                        Please sign in to view and manage your stake positions.
                    </p>
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
            {!isConnected && (
                <div className="mb-6 rounded-2xl bg-card border p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="text-lg font-semibold">Wallet not connected</div>
                            <div className="text-sm text-muted-foreground">
                                You can view your positions from backend history, but claiming and
                                withdrawing require a connected wallet for transaction signing.
                            </div>
                        </div>
                        <div className="max-w-xs">
                            <WalletDisplay />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-10">
                <div className="lg:col-span-6">
                    <StakedPackagesTable
                        data={tableData}
                        selectedId={selectedStake || activePositions[0]?.id || null}
                        onSelect={setSelectedStake}
                        explorerUrl={explorerUrl}
                        contractAddress={metadata.contractAddress}
                        stakeSymbol={stakeSymbol}
                        rewardSymbol={rewardSymbol}
                    />
                </div>
                <div className="lg:col-span-4">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            {selected ? (
                                <>
                                    <div className="rounded-xl p-4">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-sm font-bold text-white">
                                                    AUR
                                                </div>
                                                <div>
                                                    <div className="font-semibold">
                                                        {selected.lockPeriodLabel} Package
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        APY:{' '}
                                                        <span className="text-primary font-semibold">
                                                            {selected.apy}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {selected.unlocked ? (
                                                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-500">
                                                        <Unlock className="h-4 w-4" />
                                                        Unlocked
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        {selected.timeRemaining} remaining
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Staked Amount</span>
                                                <span className="font-semibold">
                                                    {formatTokenAmount(selected.principalRaw, 18, 2)} AUR
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Total Rewards</span>
                                                <span className="font-semibold">
                                                    {formatTokenAmount(selected.rewardTotalRaw, 18, 4)} USDT
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Claimed</span>
                                                <span className="font-semibold">
                                                    {formatTokenAmount(selected.rewardClaimedRaw, 18, 4)} USDT
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Claimable Now</span>
                                                <span className="font-semibold text-green-500">
                                                    +{formatTokenAmount(selected.claimableRewardRaw, 18, 4)} USDT
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Unlock Date</span>
                                                <span className="font-semibold">
                                                    {selected.unlockDateLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="outline"
                                            className="h-12"
                                            onClick={() => void handleClaim()}
                                            disabled={
                                                !isConnected ||
                                                selected.claimableRewardRaw === 0n ||
                                                isProcessing
                                            }
                                        >
                                            {processingId?.endsWith('-claim') && isProcessing ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <Gift className="mr-2 h-5 w-5" />
                                            )}
                                            Claim Rewards
                                        </Button>
                                        <Button
                                            className="h-12 bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700"
                                            onClick={() => void handleWithdraw()}
                                            disabled={!isConnected || !selected.unlocked || isProcessing}
                                        >
                                            {processingId?.endsWith('-withdraw') && isProcessing ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <ArrowDownToLine className="mr-2 h-5 w-5" />
                                            )}
                                            Withdraw All
                                        </Button>
                                    </div>

                                    {!selected.unlocked && (
                                        <div className="text-center text-sm text-muted-foreground">
                                            Withdrawal is available after the unlock date. Reward
                                            claims remain available anytime.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center text-muted-foreground">
                                    <Clock className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                    <p>No active stakes found</p>
                                    <p className="mt-1 text-sm">
                                        Start staking to see your positions here
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
