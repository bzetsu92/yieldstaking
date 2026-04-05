import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { parseUnits, formatUnits } from 'viem';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WalletDisplay } from '@/components/wallet';
import { LeaderboardTable } from '@/components/tables';
import { useYieldStaking } from '@/hooks/use-yield-staking';
import { useLeaderboard } from '@/hooks/use-staking';

function formatLockPeriod(seconds: bigint): string {
    const days = Number(seconds) / 86400;
    if (days >= 365) {
        const years = Math.floor(days / 365);
        return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    }
    if (days >= 30) {
        const months = Math.floor(days / 30);
        return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
    const wholeDays = Math.floor(days);
    return `${wholeDays} ${wholeDays === 1 ? 'Day' : 'Days'}`;
}

export default function StakePage() {
    const { isConnected } = useAccount();
    const [searchParams] = useSearchParams();
    const defaultPackage = parseInt(searchParams.get('package') || '0');

    const [amount, setAmount] = useState('');
    const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
    const [step, setStep] = useState<'input' | 'approve' | 'stake'>('input');

    const {
        isTokenReady,
        packages,
        tokenBalance,
        tokenBalanceRaw,
        tokenAllowance,
        tokenDecimals,
        tokenSymbol,
        rewardSymbol,
        minStakeAmount,
        maxStakePerUser,
        userTotalStakesRaw,
        totalLocked,
        isPaused,
        approve,
        stake,
        isWritePending,
        isConfirming,
        isConfirmed,
        reset,
        refetchAll,
    } = useYieldStaking();
    const { data: leaderboardData } = useLeaderboard(20);

    const leaderboardItems = useMemo(() => {
        if (!leaderboardData) return [];
        return leaderboardData.map((item) => ({
            rank: item.rank,
            address: `${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(-4)}`,
            fullAddress: item.walletAddress,
            staked: Number(formatUnits(BigInt(item.totalStaked), tokenDecimals)).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
            activeStakes: item.activeStakes,
        }));
    }, [leaderboardData, tokenDecimals]);

    const displayPackages = packages;
    const selectedPkg = useMemo(() => {
        if (!displayPackages.length) return null;
        return displayPackages.find((p) => p.id === selectedPackage) || displayPackages[0];
    }, [displayPackages, selectedPackage]);

    const amountWei = useMemo(() => {
        if (!amount || isNaN(parseFloat(amount))) return 0n;
        try {
            return parseUnits(amount, tokenDecimals);
        } catch {
            return 0n;
        }
    }, [amount, tokenDecimals]);

    const needsApproval = useMemo(() =>
        amountWei > 0n && tokenAllowance < amountWei,
        [amountWei, tokenAllowance]
    );

    const estimatedReward = useMemo(() => {
        if (!amount || !selectedPkg) return '0.00';
        const principal = parseFloat(amount);
        const apy = selectedPkg.apy / 100;
        const lockDays = Number(selectedPkg.lockPeriod) / 86400;
        return (principal * apy * (lockDays / 365)).toFixed(2);
    }, [amount, selectedPkg]);

    const principalDisplay = useMemo(() => {
        const principal = parseFloat(amount);
        if (!amount || !Number.isFinite(principal) || principal <= 0) {
            return '0';
        }

        return principal.toLocaleString(undefined, {
            maximumFractionDigits: 4,
        });
    }, [amount]);

    const availableBalanceDisplay = useMemo(() => {
        const balance = parseFloat(tokenBalance);
        if (!Number.isFinite(balance)) {
            return '0';
        }

        return balance.toLocaleString(undefined, {
            maximumFractionDigits: 4,
        });
    }, [tokenBalance]);

    const stakeError = useMemo<string | null>(() => {
        if (!isTokenReady || !amount || parseFloat(amount) <= 0) return null;
        if (amountWei > tokenBalanceRaw) return 'Insufficient balance';
        if (amountWei > 0n && amountWei < parseUnits(minStakeAmount, tokenDecimals)) {
            return `Minimum stake: ${minStakeAmount} ${tokenSymbol}`;
        }
        const maxPerUser = parseUnits(maxStakePerUser, tokenDecimals);
        if (maxPerUser > 0n && userTotalStakesRaw + amountWei > maxPerUser) {
            const remaining = maxPerUser - userTotalStakesRaw;
            return `Exceeds limit. Can stake up to ${formatUnits(remaining, tokenDecimals)} more ${tokenSymbol}`;
        }
        return null;
    }, [isTokenReady, amount, amountWei, tokenBalanceRaw, minStakeAmount, maxStakePerUser, userTotalStakesRaw, tokenDecimals, tokenSymbol]);

    const canStake = useMemo(
        () =>
            displayPackages.length > 0 &&
            selectedPkg !== null &&
            isTokenReady &&
            !!amount &&
            parseFloat(amount) > 0 &&
            stakeError === null,
        [displayPackages.length, selectedPkg, isTokenReady, amount, stakeError],
    );

    useEffect(() => {
        if (isConfirmed) {
            if (step === 'approve') {
                toast.success('Approval successful!');
                setStep('stake');
                reset();
                refetchAll();
            } else if (step === 'stake') {
                toast.success('Staking successful!');
                setAmount('');
                setStep('input');
                reset();
                refetchAll();
            }
        }
    }, [isConfirmed, step, reset, refetchAll]);

    const handleApprove = async () => {
        setStep('approve');
        try {
            await approve();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Approval failed');
            reset();
            setStep('input');
        }
    };

    const handleStake = async () => {
        if (!selectedPkg) return;
        setStep('stake');
        try {
            await stake(amount, selectedPkg.id);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Stake failed');
            reset();
            setStep('input');
        }
    };

    const handleAction = () => {
        if (!displayPackages.length) {
            toast.error('Staking packages are not available', {
                description: 'Please refresh the page or try again later.',
            });
            return;
        }
        if (needsApproval) {
            handleApprove();
        } else {
            handleStake();
        }
    };

    const isProcessing = isWritePending || isConfirming;
    const packagesReady = displayPackages.length > 0;

    if (!isConnected) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-lg rounded-2xl bg-card border p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold">Connect Wallet</h1>
                    <p className="text-muted-foreground">Please connect your wallet to stake {tokenSymbol}</p>
                    <WalletDisplay />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col py-6 px-4 lg:px-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
                <div className="order-2 space-y-6 xl:order-1">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h2 className="text-lg font-bold text-white">Aureus Staking Program - Earn Up to 50% APY</h2>
                                        <Badge className={isPaused ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'}>
                                            {isPaused ? 'Paused' : 'Active'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-3">
                                        Stake <span className="font-semibold text-white">{tokenSymbol}</span> and accrue
                                        rewards in <span className="font-semibold text-white">{rewardSymbol}</span> based
                                        on your selected lock period.
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Package availability follows the live staking contract configuration.
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[260px] xl:grid-cols-1">
                                    <div className="rounded-lg bg-slate-800/50 p-4 text-right">
                                        <div className="text-xs text-slate-400">Total Locked</div>
                                        <div className="text-2xl font-bold text-white">
                                            {parseFloat(totalLocked).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </div>
                                        <div className="text-xs text-slate-400">{tokenSymbol}</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-800/50 p-4 text-right">
                                        <div className="text-xs text-slate-400">Reward Token</div>
                                        <div className="text-xl font-bold text-white">{rewardSymbol}</div>
                                        <div className="text-xs text-slate-400">Claimed separately from principal</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-800/50 p-4 text-right">
                                        <div className="text-xs text-slate-400">Claim Policy</div>
                                        <div className="text-xl font-bold text-white">Anytime</div>
                                        <div className="text-xs text-slate-400">Rewards accrue linearly after staking</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-800 px-4 py-2">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-300">Staking Status:</span>
                                    <span className={`text-sm font-bold ${isPaused ? 'text-amber-300' : 'text-emerald-300'}`}>
                                        {isPaused ? 'Paused on contract' : 'Active on contract'}
                                    </span>
                                </div>
                                <div className="max-w-[320px] text-xs text-slate-400 sm:text-right">
                                    Rewards start accruing from stake time and remain claimable throughout the lock period.
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div>
                        <div className="mb-4 flex items-end justify-between gap-3">
                            <div>
                                <h3 className="font-bold">Top Active Wallets</h3>
                                <p className="text-sm text-muted-foreground">
                                    Ranked by currently staked balance, not by estimated rewards.
                                </p>
                            </div>
                        </div>
                        <LeaderboardTable data={leaderboardItems} stakeSymbol={tokenSymbol} />
                    </div>
                </div>

                <div className="order-1 space-y-6 xl:order-2 xl:sticky xl:top-6 xl:self-start">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            {!packagesReady && (
                                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                                    Staking packages are not available right now. This usually means the app
                                    cannot load data from the staking contract on the current network.
                                </div>
                            )}
                            {isPaused && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                                    Staking is currently paused on the contract. You can still review package details, but new deposits are blocked until the admin unpauses the contract.
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">Stake Amount</span>
                                    <span className="text-muted-foreground">
                                        Available: {availableBalanceDisplay} {tokenSymbol}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Enter the amount of {tokenSymbol} you want to lock.
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-12 px-4 pr-28 rounded-lg border-2 border-primary/50 bg-muted/30 text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                                    disabled={!packagesReady || isProcessing}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <button
                                        className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        onClick={() => setAmount(tokenBalance)}
                                        disabled={!packagesReady || isProcessing}
                                    >
                                        MAX
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-[8px]">
                                            A
                                        </div>
                                        <span className="text-sm font-medium">{tokenSymbol}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Min: {parseFloat(minStakeAmount).toLocaleString()} {tokenSymbol}
                            </div>

                            <div className="space-y-2">
                                <span className="text-sm text-muted-foreground">Lock period</span>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {displayPackages.map((pkg) => (
                                        <button
                                            key={pkg.id}
                                            onClick={() => setSelectedPackage(pkg.id)}
                                            className={`rounded-lg border px-3 py-3 text-left transition-all ${
                                                selectedPackage === pkg.id
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/50'
                                            }`}
                                        >
                                            <div className="text-sm font-semibold">{formatLockPeriod(pkg.lockPeriod)}</div>
                                            <div className="text-xs opacity-80">{pkg.apy}% APY</div>
                                        </button>
                                    ))}
                                </div>
                                {selectedPkg && (
                                    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Selected package</span>
                                            <span className="font-medium">{formatLockPeriod(selectedPkg.lockPeriod)}</span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Estimated reward</span>
                                            <span className="font-medium text-green-600 dark:text-green-400">
                                                {estimatedReward} {rewardSymbol}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full h-11 font-bold bg-amber-400 hover:bg-amber-500 text-black"
                                onClick={handleAction}
                                disabled={!canStake || isProcessing || isPaused}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {step === 'approve' ? 'Approving...' : 'Staking...'}
                                    </>
                                ) : needsApproval ? (
                                    `Approve ${tokenSymbol}`
                                ) : (
                                    'STAKE'
                                )}
                            </Button>

                            {stakeError && parseFloat(amount || '0') > 0 && (
                                <div className="text-center text-xs text-destructive">
                                    {stakeError}
                                </div>
                            )}

                            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Principal at unlock</span>
                                    <span className="font-medium">
                                        {principalDisplay} {tokenSymbol}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Estimated reward</span>
                                    <span className="font-medium">{estimatedReward} {rewardSymbol}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Reward token</span>
                                    <span className="font-medium">{rewardSymbol}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Claim schedule</span>
                                    <span className="font-medium">Accrues immediately, claim anytime</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
