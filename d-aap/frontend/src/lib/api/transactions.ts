import { api } from './client';
import { handleApiError } from '../utils/api-error-handler';

import type { TransactionListResponse, TransactionSummary, RewardSummary, Transaction } from '@/interfaces';

export async function fetchTransactions(params?: {
    page?: number;
    limit?: number;
    type?: string;
}): Promise<TransactionListResponse> {
    try {
        return await api.get<TransactionListResponse>('/v1/transactions', { params });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transactions',
        });
    }
}

export async function fetchTransactionByHash(txHash: string): Promise<Transaction> {
    try {
        return await api.get<Transaction>(`/v1/transactions/hash/${txHash}`);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transaction',
        });
    }
}

export async function fetchTransactionSummary(): Promise<TransactionSummary> {
    try {
        return await api.get<TransactionSummary>('/v1/transactions/summary');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transaction summary',
        });
    }
}

export async function fetchRewardSummary(): Promise<RewardSummary> {
    try {
        return await api.get<RewardSummary>('/v1/transactions/rewards');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch reward summary',
        });
    }
}
