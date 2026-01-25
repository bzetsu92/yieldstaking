import { yieldStakingAbi, aureusAbi, mockUsdtAbi } from '../constants/abis';
import { DEFAULT_CHAIN_ID } from '../config/chains';
import { getContractAddress, CONTRACT_NAMES } from '../config/contracts';

import type { Address } from 'viem';

export const getYieldStakingAddress = (chainId = DEFAULT_CHAIN_ID): Address => getContractAddress(chainId, CONTRACT_NAMES.YIELD_STAKING);
export const getAureusAddress = (chainId = DEFAULT_CHAIN_ID): Address => getContractAddress(chainId, CONTRACT_NAMES.AUREUS);
export const getMockUsdtAddress = (chainId = DEFAULT_CHAIN_ID): Address => getContractAddress(chainId, CONTRACT_NAMES.MOCK_USDT);

export const YIELD_STAKING_ABI = yieldStakingAbi;
export const AUREUS_ABI = aureusAbi;
export const MOCK_USDT_ABI = mockUsdtAbi;

export const getYieldStakingContractConfig = (chainId = DEFAULT_CHAIN_ID) => ({
    address: getYieldStakingAddress(chainId),
    abi: YIELD_STAKING_ABI,
});

export const getAureusContractConfig = (chainId = DEFAULT_CHAIN_ID) => ({
    address: getAureusAddress(chainId),
    abi: AUREUS_ABI,
});

export const getMockUsdtContractConfig = (chainId = DEFAULT_CHAIN_ID) => ({
    address: getMockUsdtAddress(chainId),
    abi: MOCK_USDT_ABI,
});
