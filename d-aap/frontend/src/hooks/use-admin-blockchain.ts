import { useCallback, useMemo } from 'react';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import { createPublicClientForChain } from '@/lib/blockchain/client';

import { 
    getYieldStakingContractConfig, 
} from '@/lib/blockchain/contracts';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { getChainConfig } from '@/lib/config/chains';

export function useAdminBlockchainActions() {
    const { address } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const stakingConfig = useMemo(() => getYieldStakingContractConfig(chainId), [chainId]);

    const { writeContract, data: txHash, isPending: isWritePending, reset } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    const ensureReadyToWrite = useCallback((): Address => {
        if (!address) {
            throw new Error('Please connect your admin wallet');
        }
        if (chainId !== DEFAULT_CHAIN_ID) {
            throw new Error('Please switch to Sepolia network');
        }
        getChainConfig(chainId);
        return address;
    }, [address, chainId]);

    const pause = useCallback(async () => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'pause',
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'pause',
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    const unpause = useCallback(async () => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'unpause',
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'unpause',
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    const setPackage = useCallback(async (id: number, lockPeriod: bigint, apy: number, enabled: boolean) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'setPackage',
            args: [id, lockPeriod, apy, enabled],
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'setPackage',
            args: [id, lockPeriod, apy, enabled],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    const setMinStakeAmount = useCallback(async (newAmount: bigint) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'setMinStakeAmount',
            args: [newAmount],
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'setMinStakeAmount',
            args: [newAmount],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    const setMaxStakePerUser = useCallback(async (newMax: bigint) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'setMaxStakePerUser',
            args: [newMax],
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'setMaxStakePerUser',
            args: [newMax],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    const setMaxTotalStakedPerPackage = useCallback(async (newMax: bigint) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'setMaxTotalStakedPerPackage',
            args: [newMax],
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'setMaxTotalStakedPerPackage',
            args: [newMax],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    const withdrawExcessReward = useCallback(async (amount: bigint) => {
        const account = ensureReadyToWrite();
        const client = createPublicClientForChain(chainId as typeof DEFAULT_CHAIN_ID);
        const simulation = await client.simulateContract({
            ...stakingConfig,
            functionName: 'withdrawExcessReward',
            args: [amount],
            account,
        });
        writeContract({
            ...stakingConfig,
            functionName: 'withdrawExcessReward',
            args: [amount],
            gas: simulation.request.gas,
        });
    }, [chainId, ensureReadyToWrite, stakingConfig, writeContract]);

    return {
        pause,
        unpause,
        setPackage,
        setMinStakeAmount,
        setMaxStakePerUser,
        setMaxTotalStakedPerPackage,
        withdrawExcessReward,
        isWritePending,
        isConfirming,
        isConfirmed,
        txHash,
        reset
    };
}
