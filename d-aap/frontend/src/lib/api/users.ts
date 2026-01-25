import { api } from './client';
import { handleApiError } from '../utils/api-error-handler';

import type { UserProfileWithStatsResponse, UpdateProfileData, UserStatistics } from '@/interfaces';

export async function fetchUserProfileWithStats(): Promise<UserProfileWithStatsResponse> {
    try {
        return await api.get<UserProfileWithStatsResponse>('/v1/users/profile');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch user profile',
            showToast: false,
        });
    }
}

export async function updateUserProfile(data: UpdateProfileData): Promise<UserProfileWithStatsResponse> {
    try {
        return await api.put<UserProfileWithStatsResponse>('/v1/users/profile', data);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to update user profile',
            showToast: false,
        });
    }
}

export async function fetchUserStatistics(): Promise<UserStatistics> {
    try {
        return await api.get<UserStatistics>('/v1/users/statistics');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch user statistics',
            showToast: false,
        });
    }
}

export async function fetchUserWallets(): Promise<{
    walletAddress: string;
    isPrimary: boolean;
    isVerified: boolean;
    chain: { name: string; slug: string };
}[]> {
    try {
        return await api.get('/v1/users/wallets');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch wallets',
            showToast: false,
        });
    }
}

export async function linkWallet(
    walletAddress: string, 
    signature: string, 
    message: string
): Promise<{
    success: boolean;
    message: string;
    wallet: {
        id: number;
        walletAddress: string;
        isPrimary: boolean;
        isVerified: boolean;
    };
}> {
    try {
        return await api.post('/v1/users/link-wallet', { walletAddress, signature, message });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to link wallet',
            showToast: false,
        });
    }
}

export async function setPrimaryWallet(walletId: number): Promise<{ success: boolean }> {
    try {
        return await api.post(`/v1/users/wallets/${walletId}/set-primary`);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to set primary wallet',
            showToast: false,
        });
    }
}
