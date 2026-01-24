const getRpcEndpoint = (chainId: number, defaultUrl: string): string => {
    const envKey = `VITE_RPC_ENDPOINT_${chainId}`;
    const envValue = (import.meta.env as any)[envKey];

    if (envValue && typeof envValue === 'string' && envValue.trim()) {
        return envValue.trim();
    }

    return defaultUrl;
};

export const RPC_ENDPOINTS: Record<number, string> = {
    1: getRpcEndpoint(1, 'https://eth.llamarpc.com'),
    11155111: getRpcEndpoint(
        11155111,
        'https://blockchain.googleapis.com/v1/projects/twoex-473709/locations/us-central1/endpoints/ethereum-sepolia/rpc?key=AIzaSyDgFa1ts-6RMZUXURQqlLp9nxNpwjRkqB8',
    ),
    56: getRpcEndpoint(56, 'https://bsc-dataseed1.binance.org'),
    97: getRpcEndpoint(97, 'https://data-seed-prebsc-1-s1.binance.org:8545'),
    137: getRpcEndpoint(137, 'https://polygon-rpc.com'),
    42161: getRpcEndpoint(42161, 'https://arb1.arbitrum.io/rpc'),
    10: getRpcEndpoint(10, 'https://mainnet.optimism.io'),
} as const;

export const EXPLORER_ENDPOINTS: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    56: 'https://bscscan.com',
    97: 'https://testnet.bscscan.com',
    137: 'https://polygonscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
} as const;

export const RPC_FALLBACK_ENDPOINTS: Record<number, string[]> = {
    1: ['https://rpc.ankr.com/eth', 'https://eth.llamarpc.com', 'https://ethereum.publicnode.com'],
    11155111: [
        'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        'https://rpc.sepolia.org',
        'https://sepolia.gateway.tenderly.co',
    ],
    56: [
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
        'https://bsc-dataseed4.binance.org',
    ],
    97: [
        'https://data-seed-prebsc-2-s1.binance.org:8545',
        'https://data-seed-prebsc-1-s2.binance.org:8545',
    ],
    137: ['https://polygon-rpc.publicnode.com', 'https://rpc.ankr.com/polygon'],
    42161: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.publicnode.com'],
    10: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
} as const;
