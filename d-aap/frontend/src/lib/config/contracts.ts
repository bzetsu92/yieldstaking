import { CHAIN_IDS } from './chains';
import sepoliaDeployment from './deployments/sepolia.json';

import type { Address } from 'viem';

export type ContractAddresses = Record<string, Address>;

export const CONTRACT_NAMES = {
    YIELD_STAKING: 'YIELD_STAKING',
    AUREUS: 'AUREUS',
    MOCK_USDT: 'MOCK_USDT',
} as const;

const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
    [CHAIN_IDS.SEPOLIA]: {
        [CONTRACT_NAMES.YIELD_STAKING]: sepoliaDeployment.yieldStaking as Address,
        [CONTRACT_NAMES.AUREUS]: sepoliaDeployment.aureus as Address,
        [CONTRACT_NAMES.MOCK_USDT]: sepoliaDeployment.mockUsdt as Address,
    },
};

const DEFAULT_CHAIN_ADDRESSES = CONTRACT_ADDRESSES[CHAIN_IDS.SEPOLIA];

export const getAddressForChain = (chainId?: number): ContractAddresses => {
    if (!chainId) {
        return DEFAULT_CHAIN_ADDRESSES;
    }
    return CONTRACT_ADDRESSES[chainId] || DEFAULT_CHAIN_ADDRESSES;
};

export const getContractAddress = (chainId: number, contractName: string): Address => {
    const addresses = getAddressForChain(chainId);
    const address = addresses[contractName];
    if (!address) {
        throw new Error(`No address found for ${contractName} on chain ${chainId}`);
    }
    return address;
};
