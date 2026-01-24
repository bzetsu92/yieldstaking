import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, createStorage, cookieStorage } from 'wagmi';

import { CHAIN_IDS } from '../config/chains';
import { RPC_ENDPOINTS, EXPLORER_ENDPOINTS } from '../constants/rpc';

import type { Chain } from '@rainbow-me/rainbowkit';

const projectId =
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd9';

const sepoliaChain = {
    id: CHAIN_IDS.SEPOLIA,
    name: 'Sepolia',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/info/logo.png',
    iconBackground: '#3C3C3D',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.SEPOLIA]] },
    },
    blockExplorers: {
        default: { name: 'Etherscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.SEPOLIA] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 3250000,
        },
    },
} as const satisfies Chain;

const bscMainnet = {
    id: CHAIN_IDS.BSC_MAINNET,
    name: 'Binance Smart Chain',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/smartchain/info/logo.png',
    iconBackground: '#F3BA2F',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.BSC_MAINNET]] },
    },
    blockExplorers: {
        default: { name: 'BscScan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.BSC_MAINNET] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 15921452,
        },
    },
} as const satisfies Chain;

const bscTestnetChain = {
    id: CHAIN_IDS.BSC_TESTNET,
    name: 'BSC Testnet',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/smartchain/info/logo.png',
    iconBackground: '#F3BA2F',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.BSC_TESTNET]] },
    },
    blockExplorers: {
        default: { name: 'BscScan Testnet', url: EXPLORER_ENDPOINTS[CHAIN_IDS.BSC_TESTNET] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 17422483,
        },
    },
} as const satisfies Chain;

const ethereum = {
    id: CHAIN_IDS.ETHEREUM,
    name: 'Ethereum',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/info/logo.png',
    iconBackground: '#3C3C3D',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.ETHEREUM]] },
    },
    blockExplorers: {
        default: { name: 'Etherscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.ETHEREUM] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 14353601,
        },
    },
} as const satisfies Chain;

const polygon = {
    id: CHAIN_IDS.POLYGON,
    name: 'Polygon',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/polygon/info/logo.png',
    iconBackground: '#8247E5',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.POLYGON]] },
    },
    blockExplorers: {
        default: { name: 'PolygonScan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.POLYGON] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 25770160,
        },
    },
} as const satisfies Chain;

const arbitrum = {
    id: CHAIN_IDS.ARBITRUM,
    name: 'Arbitrum One',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/arbitrum/info/logo.png',
    iconBackground: '#28A0F0',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.ARBITRUM]] },
    },
    blockExplorers: {
        default: { name: 'Arbiscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.ARBITRUM] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 7654707,
        },
    },
} as const satisfies Chain;

const optimism = {
    id: CHAIN_IDS.OPTIMISM,
    name: 'Optimism',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/optimism/info/logo.png',
    iconBackground: '#FF0420',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_ENDPOINTS[CHAIN_IDS.OPTIMISM]] },
    },
    blockExplorers: {
        default: { name: 'Optimistic Etherscan', url: EXPLORER_ENDPOINTS[CHAIN_IDS.OPTIMISM] },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 4286263,
        },
    },
} as const satisfies Chain;

const SUPPORTED_CHAINS = [
    sepoliaChain,
    ethereum,
    bscMainnet,
    bscTestnetChain,
    polygon,
    arbitrum,
    optimism,
] as const satisfies readonly Chain[];

export const config = getDefaultConfig({
    appName: 'NFT Events Platform',
    projectId,
    chains: SUPPORTED_CHAINS as readonly [Chain, ...Chain[]],
    ssr: false,
    storage: createStorage({
        storage: cookieStorage,
    }),
    transports: SUPPORTED_CHAINS.reduce(
        (obj, chain) => ({
            ...obj,
            [chain.id]: http(chain.rpcUrls.default.http[0]),
        }),
        {} as Record<number, ReturnType<typeof http>>,
    ),
});

if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const originalError = console.error;
    const originalWarn = console.warn;

    const isAnalyticsError = (message: string, ...restArgs: unknown[]): boolean => {
        const analyticsPatterns = [
            'pulse.walletconnect.org',
            'api.web3modal.org',
            'cca-lite.coinbase.com',
            'Analytics SDK',
            'Failed to fetch remote project configuration',
            'Reown Config',
            'Lit is in dev mode',
        ];

        if (analyticsPatterns.some((pattern) => message.includes(pattern))) {
            return true;
        }

        if (message.includes('ERR_BLOCKED_BY_CLIENT')) {
            const fullMessage = [...restArgs].join(' ').toLowerCase();
            if (
                fullMessage.includes('analytics') ||
                fullMessage.includes('telemetry') ||
                fullMessage.includes('coinbase') ||
                fullMessage.includes('walletconnect') ||
                fullMessage.includes('web3modal')
            ) {
                return true;
            }
        }

        if (message.includes('403') || message.includes('Forbidden')) {
            const fullMessage = [...restArgs].join(' ').toLowerCase();
            if (
                fullMessage.includes('pulse.walletconnect.org') ||
                fullMessage.includes('api.web3modal.org') ||
                fullMessage.includes('cca-lite.coinbase.com')
            ) {
                return true;
            }
        }

        if (message.includes('Origin') && message.includes('not found on Allowlist')) {
            return true;
        }

        return false;
    };

    const isNetworkError = (...restArgs: unknown[]): boolean => {
        const urlPatterns = [
            'pulse.walletconnect.org',
            'api.web3modal.org',
            'cca-lite.coinbase.com',
        ];

        const fullMessage = [...restArgs].join(' ');
        return urlPatterns.some((pattern) => fullMessage.includes(pattern));
    };

    console.error = (...args: unknown[]) => {
        const message = args[0]?.toString() || '';
        if (isAnalyticsError(message, ...args.slice(1)) || isNetworkError(...args.slice(1))) {
            return;
        }
        originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
        const message = args[0]?.toString() || '';
        if (isAnalyticsError(message, ...args.slice(1)) || isNetworkError(...args.slice(1))) {
            return;
        }
        originalWarn.apply(console, args);
    };
}

export const wagmiConfig = config;
