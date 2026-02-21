import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, type Address, maxUint256, BaseError, ContractFunctionRevertedError } from 'viem';
import { createPublicClientForChain } from '@/lib/blockchain/client';

import { 
    getYieldStakingContractConfig, 
    getYieldStakingAddress, 
    getAureusAddress, 
    getMockUsdtAddress, 
    AUREUS_ABI, 
    MOCK_USDT_ABI 
} from '@/lib/blockchain/contracts';
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
    const stakingAddress = useMemo(() => getYieldStakingAddress(chainId), [chainId]);

    const { data: stakeTokenAddress } = useReadContract({
        ...stakingConfig,
        functionName: 'stakeToken',
    });

    const tokenConfig = useMemo(() => {
        const aureusAddr = getAureusAddress(chainId);
        const usdtAddr = getMockUsdtAddress(chainId);
        const address = (stakeTokenAddress as Address | undefined) || usdtAddr;
        const abi = address === aureusAddr ? AUREUS_ABI : MOCK_USDT_ABI;
        return { address, abi };
    }, [stakeTokenAddress, chainId]);

    const { data: rewardTokenAddress } = useReadContract({
        ...stakingConfig,
        functionName: 'rewardToken',
    });

    const rewardTokenConfig = useMemo(() => {
        const aureusAddr = getAureusAddress(chainId);
        const address = (rewardTokenAddress as Address | undefined) || aureusAddr;
        const abi = address === aureusAddr ? AUREUS_ABI : MOCK_USDT_ABI;
        return { address, abi };
    }, [rewardTokenAddress, chainId]);

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

    const { data: rewardTokenDecimals } = useReadContract({
        ...rewardTokenConfig,
        functionName: 'decimals',
    });

    const { data: rewardSymbol } = useReadContract({
        ...rewardTokenConfig,
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
                const [lockPeriod, apy, enabled] = result.result as unknown as [bigint, number, boolean];
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
            const publicClient = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
            const simulation = await publicClient.simulateContract({
                ...tokenConfig,
                functionName: 'approve',
                args: [stakingAddress, approveAmount],
                account: address as Address,
            });
            const gas = simulation.request.gas && simulation.request.gas > 1_000_000n ? 1_000_000n : simulation.request.gas || 500_000n;
            writeContract({
                ...tokenConfig,
                functionName: 'approve',
                args: [stakingAddress, approveAmount],
                gas,
            });
        },
        [writeContract, tokenConfig, stakingAddress, chainId, address]
    );

    const stake = useCallback(
        async (amount: string, packageId: number) => {
            if (tokenDecimals === undefined) return;
            const decimals = tokenDecimals;
            const amountWei = parseUnits(amount, decimals);
            if (isPaused) {
                throw new Error('Contract is paused');
            }
            if (minStakeAmount !== undefined && amountWei < (minStakeAmount as bigint)) {
                throw new Error('Amount below minimum stake');
            }
            if (
                maxStakePerUser !== undefined &&
                userTotalStakes !== undefined &&
                (userTotalStakes as bigint) + amountWei > (maxStakePerUser as bigint)
            ) {
                throw new Error('Exceeds maximum stake per user');
            }
            if (tokenAllowance !== undefined && (tokenAllowance as bigint) < amountWei) {
                throw new Error('Insufficient allowance. Please approve first');
            }
            const publicClient = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
            try {
                const simulation = await publicClient.simulateContract({
                    ...stakingConfig,
                    functionName: 'stake',
                    args: [amountWei, packageId],
                    account: address as Address,
                });
                const gas = simulation.request.gas && simulation.request.gas > 1_000_000n ? 1_000_000n : simulation.request.gas || 700_000n;
                writeContract({
                    ...stakingConfig,
                    functionName: 'stake',
                    args: [amountWei, packageId],
                    gas,
                });
            } catch (err) {
                if (err instanceof BaseError) {
                    const revertError = err.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | undefined;
                    const reason = revertError?.data?.errorName || revertError?.shortMessage || 'Transaction reverted';
                    throw new Error(reason);
                }
                throw err as Error;
            }
        },
        [writeContract, stakingConfig, tokenDecimals, chainId, address, isPaused, minStakeAmount, maxStakePerUser, userTotalStakes, tokenAllowance]
    );

    const claim = useCallback(
        async (packageId: number, stakeId: number) => {
            const publicClient = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
            try {
                const simulation = await publicClient.simulateContract({
                    ...stakingConfig,
                    functionName: 'claim',
                    args: [packageId, stakeId],
                    account: address as Address,
                });
                const gas = simulation.request.gas && simulation.request.gas > 900_000n ? 900_000n : simulation.request.gas || 600_000n;
                writeContract({
                    ...stakingConfig,
                    functionName: 'claim',
                    args: [packageId, stakeId],
                    gas,
                });
            } catch (err) {
                if (err instanceof BaseError) {
                    const revertError = err.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | undefined;
                    const reason = revertError?.data?.errorName || revertError?.shortMessage || 'Transaction reverted';
                    throw new Error(reason);
                }
                throw err as Error;
            }
        },
        [writeContract, stakingConfig, chainId, address]
    );

    const withdraw = useCallback(
        async (packageId: number, stakeId: number) => {
            const publicClient = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
            try {
                const simulation = await publicClient.simulateContract({
                    ...stakingConfig,
                    functionName: 'withdraw',
                    args: [packageId, stakeId],
                    account: address as Address,
                });
                const gas = simulation.request.gas && simulation.request.gas > 1_000_000n ? 1_000_000n : simulation.request.gas || 800_000n;
                writeContract({
                    ...stakingConfig,
                    functionName: 'withdraw',
                    args: [packageId, stakeId],
                    gas,
                });
            } catch (err) {
                if (err instanceof BaseError) {
                    const revertError = err.walk(e => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | undefined;
                    const reason = revertError?.data?.errorName || revertError?.shortMessage || 'Transaction reverted';
                    throw new Error(reason);
                }
                throw err as Error;
            }
        },
        [writeContract, stakingConfig, chainId, address]
    );

    const refetchAll = useCallback(() => {
        refetchTotalLocked();
        refetchUserTotalStakes();
        refetchTokenBalance();
        refetchAllowance();
    }, [refetchTotalLocked, refetchUserTotalStakes, refetchTokenBalance, refetchAllowance]);

    const decimals = tokenDecimals || 6;

    return {
        isTokenReady: tokenDecimals !== undefined,
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
        rewardTokenDecimals: rewardTokenDecimals || 18,
        rewardSymbol: rewardSymbol || 'AUR',
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

    const {
        data: fetched,
        refetch: refetchContractsData,
    } = useQuery({
        queryKey: ['user-stakes', address, chainId, packageId, stakeIds],
        enabled: !!address && stakeIds.length > 0,
        staleTime: 15_000,
        queryFn: async () => {
            const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
            const stakesData = await Promise.all(
                stakeIds.map(async (stakeId) => {
                    try {
                        return await client.readContract({
                            ...stakingConfig,
                            functionName: 'userStakeHistory',
                            args: [address as Address, packageId, stakeId],
                        });
                    } catch {
                        return null;
                    }
                }),
            );
            const claimableData = await Promise.all(
                stakeIds.map(async (stakeId) => {
                    try {
                        return await client.readContract({
                            ...stakingConfig,
                            functionName: 'getClaimableRewardsForStake',
                            args: [address as Address, packageId, stakeId],
                        });
                    } catch {
                        return BigInt(0);
                    }
                }),
            );
            return { stakesData, claimableData };
        },
    });

    const stakes = useMemo<(UserStake & { claimable: bigint })[]>(() => {
        if (!fetched?.stakesData) return [];
        return fetched.stakesData
            .map((result, index) => {
                if (!result) return null;
                const [balance, rewardTotal, rewardClaimed, lockPeriod, unlockTimestamp, lastClaimTimestamp] = 
                    result as unknown as [bigint, bigint, bigint, bigint, bigint, bigint];
                
                if (balance === BigInt(0)) return null;

                const claimable = fetched?.claimableData?.[index] ?? BigInt(0);

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
    }, [fetched, packageId]);

    const refetch = useCallback(() => {
        refetchCount();
        refetchContractsData();
    }, [refetchCount, refetchContractsData]);

    return { stakes, stakeCount: stakeCount || 0, refetch };
}
