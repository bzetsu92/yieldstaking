import { api } from './client';
import { handleApiError } from '../utils/api-error-handler';
import { normalizeWalletAddress } from '../utils/wallet-address';

import type { StakingTransactionListResponse, TransactionSummary, RewardSummary, StakingTransaction, RewardHistoryResponse } from '@/interfaces';

export async function fetchTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
    walletAddress?: string;
}): Promise<StakingTransactionListResponse> {
    try {
        const normalizedWalletAddress = normalizeWalletAddress(params?.walletAddress);
        const nextParams = {
            ...params,
            walletAddress: normalizedWalletAddress,
        };

        return await api.get<StakingTransactionListResponse>('/v1/transactions', { params: nextParams });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transactions',
        });
    }
}

export async function fetchTransactionByHash(txHash: string): Promise<StakingTransaction> {
    try {
        return await api.get<StakingTransaction>(`/v1/transactions/hash/${txHash}`);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transaction',
        });
    }
}

export async function fetchTransactionSummary(walletAddress?: string): Promise<TransactionSummary> {
    try {
        const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
        const params = normalizedWalletAddress ? { walletAddress: normalizedWalletAddress } : undefined;
        return await api.get<TransactionSummary>('/v1/transactions/summary', { params });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transaction summary',
        });
    }
}

export async function fetchRewardHistory(params?: {
    page?: number;
    limit?: number;
    walletAddress?: string;
}): Promise<RewardHistoryResponse> {
    try {
        const normalizedWalletAddress = normalizeWalletAddress(params?.walletAddress);
        const nextParams = {
            ...params,
            walletAddress: normalizedWalletAddress,
        };

        return await api.get<RewardHistoryResponse>('/v1/transactions/rewards', { params: nextParams });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch reward history',
        });
    }
}

export async function fetchRewardSummary(walletAddress?: string): Promise<RewardSummary> {
    try {
        const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
        const params = normalizedWalletAddress ? { walletAddress: normalizedWalletAddress } : undefined;
        return await api.get<RewardSummary>('/v1/transactions/rewards/summary', { params });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch reward summary',
        });
    }
}
