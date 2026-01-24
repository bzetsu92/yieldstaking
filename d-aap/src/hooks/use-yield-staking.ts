import { useCallback, useMemo } from 'react';
import { useAccount, useChainId, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, type Address, maxUint256 } from 'viem';

import { getYieldStakingContractConfig, getMockUsdtContractConfig, getYieldStakingAddress } from '@/lib/blockchain/contracts';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';

export interface StakePackage {
    id: number;
    lockPeriod: bigint;
    apy: number;
    enabled: boolean;
}

export interface UserStake {
    packageId: number;
    stakeId: number;
    balance: bigint;
    rewardTotal: bigint;
    rewardClaimed: bigint;
    lockPeriod: bigint;
    unlockTimestamp: bigint;
    lastClaimTimestamp: bigint;
}

export function useYieldStaking() {
    const { address } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;

    const stakingConfig = useMemo(() => getYieldStakingContractConfig(chainId), [chainId]);
    const tokenConfig = useMemo(() => getMockUsdtContractConfig(chainId), [chainId]);
    const stakingAddress = useMemo(() => getYieldStakingAddress(chainId), [chainId]);

    const { data: totalLocked, refetch: refetchTotalLocked } = useReadContract({
        ...stakingConfig,
        functionName: 'totalLocked',
    });

    const { data: minStakeAmount } = useReadContract({
        ...stakingConfig,
        functionName: 'minStakeAmount',
    });

    const { data: maxStakePerUser } = useReadContract({
        ...stakingConfig,
        functionName: 'maxStakePerUser',
    });

    const { data: isPaused } = useReadContract({
        ...stakingConfig,
        functionName: 'paused',
    });

    const { data: userTotalStakes, refetch: refetchUserTotalStakes } = useReadContract({
        ...stakingConfig,
        functionName: 'userTotalStakes',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
        ...tokenConfig,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
        ...tokenConfig,
        functionName: 'allowance',
        args: address ? [address, stakingAddress] : undefined,
        query: { enabled: !!address },
    });

    const { data: tokenDecimals } = useReadContract({
        ...tokenConfig,
        functionName: 'decimals',
    });

    const { data: tokenSymbol } = useReadContract({
        ...tokenConfig,
        functionName: 'symbol',
    });

    const packageResults = useReadContracts({
        contracts: [0, 1, 2, 3].map((id) => ({
            ...stakingConfig,
            functionName: 'packages',
            args: [id],
        })),
    });

    const packages = useMemo<StakePackage[]>(() => {
        if (!packageResults.data) return [];
        return packageResults.data
            .map((result, index) => {
                if (result.status !== 'success' || !result.result) return null;
                const [lockPeriod, apy, enabled] = result.result as [bigint, number, boolean];
                return {
                    id: index,
                    lockPeriod,
                    apy: Number(apy) / 100,
                    enabled,
                };
            })
            .filter((pkg): pkg is StakePackage => pkg !== null && pkg.enabled);
    }, [packageResults.data]);

    const { writeContract, data: txHash, isPending: isWritePending, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    const approve = useCallback(
        async (amount?: bigint) => {
            const approveAmount = amount || maxUint256;
            writeContract({
                ...tokenConfig,
                functionName: 'approve',
                args: [stakingAddress, approveAmount],
            });
        },
        [writeContract, tokenConfig, stakingAddress]
    );

    const stake = useCallback(
        async (amount: string, packageId: number) => {
            const decimals = tokenDecimals || 6;
            const amountWei = parseUnits(amount, decimals);
            writeContract({
                ...stakingConfig,
                functionName: 'stake',
                args: [amountWei, packageId],
            });
        },
        [writeContract, stakingConfig, tokenDecimals]
    );

    const claim = useCallback(
        async (packageId: number, stakeId: number) => {
            writeContract({
                ...stakingConfig,
                functionName: 'claim',
                args: [packageId, stakeId],
            });
        },
        [writeContract, stakingConfig]
    );

    const withdraw = useCallback(
        async (packageId: number, stakeId: number) => {
            writeContract({
                ...stakingConfig,
                functionName: 'withdraw',
                args: [packageId, stakeId],
            });
        },
        [writeContract, stakingConfig]
    );

    const refetchAll = useCallback(() => {
        refetchTotalLocked();
        refetchUserTotalStakes();
        refetchTokenBalance();
        refetchAllowance();
    }, [refetchTotalLocked, refetchUserTotalStakes, refetchTokenBalance, refetchAllowance]);

    const decimals = tokenDecimals || 6;

    return {
        totalLocked: totalLocked ? formatUnits(totalLocked, decimals) : '0',
        totalLockedRaw: totalLocked || BigInt(0),
        minStakeAmount: minStakeAmount ? formatUnits(minStakeAmount, decimals) : '0',
        maxStakePerUser: maxStakePerUser ? formatUnits(maxStakePerUser, decimals) : '0',
        userTotalStakes: userTotalStakes ? formatUnits(userTotalStakes, decimals) : '0',
        userTotalStakesRaw: userTotalStakes || BigInt(0),
        tokenBalance: tokenBalance ? formatUnits(tokenBalance, decimals) : '0',
        tokenBalanceRaw: tokenBalance || BigInt(0),
        tokenAllowance: tokenAllowance || BigInt(0),
        tokenSymbol: tokenSymbol || 'USDT',
        tokenDecimals: decimals,
        isPaused: isPaused || false,
        packages,
        stakingAddress,
        approve,
        stake,
        claim,
        withdraw,
        txHash,
        isWritePending,
        isConfirming,
        isConfirmed,
        reset,
        refetchAll,
    };
}

export function useUserStakes(packageId: number) {
    const { address } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const stakingConfig = useMemo(() => getYieldStakingContractConfig(chainId), [chainId]);

    const { data: stakeCount, refetch: refetchCount } = useReadContract({
        ...stakingConfig,
        functionName: 'getStakeCount',
        args: address ? [address, packageId] : undefined,
        query: { enabled: !!address },
    });

    const stakeIds = useMemo(() => {
        if (!stakeCount) return [];
        return Array.from({ length: Number(stakeCount) }, (_, i) => i);
    }, [stakeCount]);

    const { data: stakesData, refetch: refetchStakes } = useReadContracts({
        contracts: stakeIds.map((stakeId) => ({
            ...stakingConfig,
            functionName: 'userStakeHistory',
            args: address ? [address, packageId, stakeId] : undefined,
        })),
        query: { enabled: !!address && stakeIds.length > 0 },
    });

    const { data: claimableData, refetch: refetchClaimable } = useReadContracts({
        contracts: stakeIds.map((stakeId) => ({
            ...stakingConfig,
            functionName: 'getClaimableRewardsForStake',
            args: address ? [address, packageId, stakeId] : undefined,
        })),
        query: { enabled: !!address && stakeIds.length > 0 },
    });

    const stakes = useMemo<(UserStake & { claimable: bigint })[]>(() => {
        if (!stakesData) return [];
        return stakesData
            .map((result, index) => {
                if (result.status !== 'success' || !result.result) return null;
                const [balance, rewardTotal, rewardClaimed, lockPeriod, unlockTimestamp, lastClaimTimestamp] = 
                    result.result as [bigint, bigint, bigint, bigint, bigint, bigint];
                
                if (balance === BigInt(0)) return null;

                const claimable = claimableData?.[index]?.status === 'success' 
                    ? (claimableData[index].result as bigint) 
                    : BigInt(0);

                return {
                    packageId,
                    stakeId: index,
                    balance,
                    rewardTotal,
                    rewardClaimed,
                    lockPeriod,
                    unlockTimestamp,
                    lastClaimTimestamp,
                    claimable,
                };
            })
            .filter((stake): stake is UserStake & { claimable: bigint } => stake !== null);
    }, [stakesData, claimableData, packageId]);

    const refetch = useCallback(() => {
        refetchCount();
        refetchStakes();
        refetchClaimable();
    }, [refetchCount, refetchStakes, refetchClaimable]);

    return { stakes, stakeCount: stakeCount || 0, refetch };
}
