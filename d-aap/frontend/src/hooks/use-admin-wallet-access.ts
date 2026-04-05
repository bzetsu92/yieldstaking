import { useMemo } from 'react';
import { keccak256, toBytes, zeroHash } from 'viem';
import { useAccount, useChainId, useReadContract } from 'wagmi';

import { getYieldStakingContractConfig } from '@/lib/blockchain/contracts';
import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';

const ADMIN_ROLE_HASH = keccak256(toBytes('ADMIN_ROLE'));

export function useAdminWalletAccess() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId() || DEFAULT_CHAIN_ID;
    const isSupportedChain = chainId === DEFAULT_CHAIN_ID;
    const stakingConfig = useMemo(() => getYieldStakingContractConfig(chainId), [chainId]);
    const shouldCheckRole = Boolean(address && isConnected && isSupportedChain);

    const { data: hasAdminRole, isLoading: isAdminRoleLoading } = useReadContract({
        ...stakingConfig,
        functionName: 'hasRole',
        args: address ? [ADMIN_ROLE_HASH, address] : undefined,
        query: { enabled: shouldCheckRole },
    });

    const { data: hasDefaultAdminRole, isLoading: isDefaultAdminRoleLoading } = useReadContract({
        ...stakingConfig,
        functionName: 'hasRole',
        args: address ? [zeroHash, address] : undefined,
        query: { enabled: shouldCheckRole },
    });

    const isChecking = shouldCheckRole && (isAdminRoleLoading || isDefaultAdminRoleLoading);
    const isAdminWallet = Boolean(hasAdminRole || hasDefaultAdminRole);

    return {
        address,
        chainId,
        isConnected,
        isSupportedChain,
        isChecking,
        isAdminWallet,
    };
}
