import { RPC_ENDPOINTS, EXPLORER_ENDPOINTS } from '../constants/rpc';

import type { Chain } from 'viem';

export const CHAIN_IDS = {
    ETHEREUM: 1,
    SEPOLIA: 11155111,
    BSC_MAINNET: 56,
    BSC_TESTNET: 97,
    POLYGON: 137,
    ARBITRUM: 42161,
    OPTIMISM: 10,
} as const;

export type ChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];
export type PlatformChainId = typeof CHAIN_IDS.SEPOLIA;

export const DEFAULT_CHAIN_ID: PlatformChainId = CHAIN_IDS.SEPOLIA;

export const getChainName = (chainId: number): string => {
    const chainName = Object.entries(CHAIN_IDS).find(([_, value]) => value === chainId);
    return chainName ? chainName[0] : `Unknown (${chainId})`;
};

export type ChainConfig = Chain & {
    network?: string;
    contracts?: {
        [key: string]: {
            address: string;
        };
    };
};

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
    [CHAIN_IDS.ETHEREUM]: {
        id: CHAIN_IDS.ETHEREUM,
        name: 'Ethereum',
        network: 'homestead',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.ETHEREUM]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.ETHEREUM]] },
        },
        blockExplorers: {
            default: { name: 'Etherscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.ETHEREUM] },
        },
    },
    [CHAIN_IDS.SEPOLIA]: {
        id: CHAIN_IDS.SEPOLIA,
        name: 'Sepolia',
        network: 'sepolia',
        nativeCurrency: {
            name: 'Sepolia Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.SEPOLIA]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.SEPOLIA]] },
        },
        blockExplorers: {
            default: { name: 'Etherscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.SEPOLIA] },
        },
    },
    [CHAIN_IDS.BSC_MAINNET]: {
        id: CHAIN_IDS.BSC_MAINNET,
        name: 'BNB Smart Chain',
        network: 'bsc',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.BSC_MAINNET]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.BSC_MAINNET]] },
        },
        blockExplorers: {
            default: { name: 'BscScan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.BSC_MAINNET] },
        },
    },
    [CHAIN_IDS.BSC_TESTNET]: {
        id: CHAIN_IDS.BSC_TESTNET,
        name: 'BNB Smart Chain Testnet',
        network: 'bsc-testnet',
        nativeCurrency: {
            name: 'tBNB',
            symbol: 'tBNB',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.BSC_TESTNET]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.BSC_TESTNET]] },
        },
        blockExplorers: {
            default: { name: 'BscScan Testnet', url: EXPLORER_ENDPOINTS[CHAIN_IDS.BSC_TESTNET] },
        },
    },
    [CHAIN_IDS.POLYGON]: {
        id: CHAIN_IDS.POLYGON,
        name: 'Polygon',
        network: 'matic',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.POLYGON]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.POLYGON]] },
        },
        blockExplorers: {
            default: { name: 'PolygonScan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.POLYGON] },
        },
    },
    [CHAIN_IDS.ARBITRUM]: {
        id: CHAIN_IDS.ARBITRUM,
        name: 'Arbitrum One',
        network: 'arbitrum',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.ARBITRUM]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.ARBITRUM]] },
        },
        blockExplorers: {
            default: { name: 'Arbiscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.ARBITRUM] },
        },
    },
    [CHAIN_IDS.OPTIMISM]: {
        id: CHAIN_IDS.OPTIMISM,
        name: 'Optimism',
        network: 'optimism',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
        },
        rpcUrls: {
            default: { http: [RPC_ENDPOINTS[CHAIN_IDS.OPTIMISM]] },
            public: { http: [RPC_ENDPOINTS[CHAIN_IDS.OPTIMISM]] },
        },
        blockExplorers: {
            default: { name: 'Optimistic Etherscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.OPTIMISM] },
        },
    },
} as const;

export const getChainConfig = (chainId: number): ChainConfig => {
    const config = CHAIN_CONFIGS[chainId];
    if (!config) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return config;
};

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS);
