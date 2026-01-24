import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';

import { getChainConfig, type PlatformChainId } from '../config/chains';
import { RPC_ENDPOINTS } from '../constants/rpc';

/**
 * Creates a public client for reading blockchain data
 */
export function createPublicClientForChain(chainId: PlatformChainId) {
    const chainConfig = getChainConfig(chainId);
    const rpcUrl = RPC_ENDPOINTS[chainId] || chainConfig.rpcUrls.default.http[0];
    return createPublicClient({
        chain: chainConfig,
        transport: http(rpcUrl),
    });
}

/**
 * Creates a wallet client for signing transactions
 */
export function createWalletClientForChain(chainId: PlatformChainId, account?: Address) {
    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Web3 wallet not available. Please install MetaMask or a compatible wallet.');
    }
    const chainConfig = getChainConfig(chainId);
    return createWalletClient({
        account: account,
        chain: chainConfig,
        transport: custom(window.ethereum),
    });
}

