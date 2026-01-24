import { api } from './client';
import { handleApiError } from '../utils/api-error-handler';

import type { TransactionListResponse } from '@/interfaces';

export async function fetchTransactions(params?: {
    page?: number;
    limit?: number;
}): Promise<TransactionListResponse> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        return await api.get<TransactionListResponse>(`/v1/transactions?${queryParams.toString()}`);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch transactions',
        });
    }
}
