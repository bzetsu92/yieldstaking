import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WalletDisplay } from '@/components/wallet';
import { LeaderboardTable } from '@/components/tables';
import { useYieldStaking } from '@/hooks/use-yield-staking';
import { useLeaderboard } from '@/hooks/use-staking';

function formatLockPeriod(seconds: bigint): string {
    const days = Number(seconds) / 86400;
    if (days >= 365) return `${Math.floor(days / 365)} Year`;
    if (days >= 30) return `${Math.floor(days / 30)} Months`;
    return `${Math.floor(days)} Days`;
}

export default function StakePage() {
    const { isConnected } = useAccount();
    const [searchParams] = useSearchParams();
    const defaultPackage = parseInt(searchParams.get('package') || '0');

    const [amount, setAmount] = useState('');
    const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
    const [step, setStep] = useState<'input' | 'approve' | 'stake'>('input');
    const [countdown, setCountdown] = useState({ days: 7, hours: 15, minutes: 37, seconds: 42 });

    const { data: leaderboardData } = useLeaderboard(20);

    const leaderboardItems = useMemo(() => {
        if (!leaderboardData) return [];
        return leaderboardData.map((item) => ({
            rank: item.rank,
            address: `${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(-4)}`,
            staked: Number(item.totalStaked) / 1e6,
            rewards: (Number(item.totalStaked) / 1e6) * 0.017,
        }));
    }, [leaderboardData]);

    const {
        packages,
        tokenBalance,
        tokenBalanceRaw,
        tokenAllowance,
        tokenDecimals,
        tokenSymbol,
        minStakeAmount,
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

    const DEFAULT_PACKAGES = [
        { id: 0, lockPeriod: BigInt(90 * 86400), apy: 20, enabled: true },
        { id: 1, lockPeriod: BigInt(180 * 86400), apy: 25, enabled: true },
        { id: 2, lockPeriod: BigInt(270 * 86400), apy: 35, enabled: true },
        { id: 3, lockPeriod: BigInt(360 * 86400), apy: 50, enabled: true },
    ];

    const displayPackages = packages.length > 0 ? packages : DEFAULT_PACKAGES;

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                let { days, hours, minutes, seconds } = prev;
                seconds--;
                if (seconds < 0) { seconds = 59; minutes--; }
                if (minutes < 0) { minutes = 59; hours--; }
                if (hours < 0) { hours = 23; days--; }
                if (days < 0) { days = 0; hours = 0; minutes = 0; seconds = 0; }
                return { days, hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const selectedPkg = useMemo(() => 
        displayPackages.find(p => p.id === selectedPackage) || displayPackages[0],
        [displayPackages, selectedPackage]
    );

    const amountWei = useMemo(() => {
        if (!amount || isNaN(parseFloat(amount))) return BigInt(0);
        try {
            return parseUnits(amount, tokenDecimals);
        } catch {
            return BigInt(0);
        }
    }, [amount, tokenDecimals]);

    const needsApproval = useMemo(() => 
        amountWei > BigInt(0) && tokenAllowance < amountWei,
        [amountWei, tokenAllowance]
    );

    const estimatedReward = useMemo(() => {
        if (!amount || !selectedPkg) return '0';
        const principal = parseFloat(amount);
        const apy = selectedPkg.apy / 100;
        const lockDays = Number(selectedPkg.lockPeriod) / 86400;
        const reward = principal * apy * (lockDays / 365);
        return reward.toFixed(2);
    }, [amount, selectedPkg]);

    const canStake = useMemo(() => {
        if (!amount || parseFloat(amount) <= 0) return false;
        if (amountWei > tokenBalanceRaw) return false;
        if (parseFloat(amount) < parseFloat(minStakeAmount)) return false;
        return true;
    }, [amount, amountWei, tokenBalanceRaw, minStakeAmount]);

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

    const handleApprove = () => {
        setStep('approve');
        approve();
    };

    const handleStake = () => {
        if (!selectedPkg) return;
        setStep('stake');
        stake(amount, selectedPkg.id);
    };

    const handleAction = () => {
        if (needsApproval) {
            handleApprove();
        } else {
            handleStake();
        }
    };

    const isProcessing = isWritePending || isConfirming;

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
            <div className="grid gap-6 lg:grid-cols-10">
                <div className="lg:col-span-6 space-y-6">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h2 className="text-lg font-bold text-white">Aureus Staking Program - Earn Up to 50% APY</h2>
                                        <Badge className="bg-green-500 text-white">Active</Badge>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-3">
                                        The <span className="font-semibold text-white">Aureus Staking Program</span> introduces a rewarding opportunity for AUR holders. 
                                        Stake your tokens and earn competitive yields based on your lock period.
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Current staking rewards are available through the end of Q1. <Link to="/app/yield-staking" className="text-primary hover:underline">Check details here</Link>.
                                    </p>
                                </div>
                                <div className="text-right bg-slate-800/50 rounded-lg p-4 min-w-[140px]">
                                    <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
                                        Total Locked
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {parseFloat(totalLocked).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-xs text-slate-400">AUR</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="inline-flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-300">Season 1 Countdown:</span>
                                    <span className="text-sm font-bold text-white">
                                        {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                    POWERED BY <span className="font-bold text-white">AUREUS</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-bold">PNL Leaderboard</h3>
                        </div>
                        <LeaderboardTable data={leaderboardItems} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-12 px-4 pr-28 rounded-lg border-2 border-primary/50 bg-muted/30 text-lg font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <button 
                                        className="px-2 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                        onClick={() => setAmount(tokenBalance)}
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
                                <div className="flex gap-2">
                                    {displayPackages.map((pkg) => (
                                        <button
                                            key={pkg.id}
                                            onClick={() => setSelectedPackage(pkg.id)}
                                            className={`flex-1 px-2 py-2 rounded-lg border text-center transition-all text-xs ${
                                                selectedPackage === pkg.id
                                                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                    : 'border-border hover:border-primary/50 bg-muted/20 text-muted-foreground'
                                            }`}
                                        >
                                            {formatLockPeriod(pkg.lockPeriod)}
                                        </button>
                                    ))}
                                </div>
                                {selectedPkg && (
                                    <div className="text-xs text-green-500 font-medium">
                                        APY: {selectedPkg.apy}%
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

                                    {parseFloat(amount) > 0 && !canStake && (
                                <div className="text-center text-xs text-destructive">
                                    {amountWei > tokenBalanceRaw ? 'Insufficient balance' : `Minimum stake: ${minStakeAmount} ${tokenSymbol}`}
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">You will receive</span>
                                    <span className="font-medium">
                                        {amount && parseFloat(amount) > 0 
                                            ? (parseFloat(amount) + parseFloat(estimatedReward)).toFixed(2) 
                                            : '0.0'} {tokenSymbol}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Exchange rate</span>
                                    <span className="font-medium">1 {tokenSymbol} = 1 {tokenSymbol}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Max transaction cost</span>
                                    <span className="font-medium">~$0.02</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        Reward fee
                                        <span className="text-xs text-muted-foreground/70 cursor-help" title="Fee deducted from rewards">(?)</span>
                                    </span>
                                    <span className="font-medium">10%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
