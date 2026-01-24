import { api } from './client';
import { handleApiError } from '../utils/api-error-handler';

import type { UserProfileWithStatsResponse, UpdateProfileData } from '@/interfaces';

export async function fetchUserProfile(): Promise<unknown> {
    try {
        return await api.get<unknown>('/v1/users/profile');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch user profile',
        });
    }
}

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

export async function updateUserProfile(data: UpdateProfileData): Promise<any> {
    try {
        return await api.put<any>('/v1/users/profile', data);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to update user profile',
            showToast: false,
        });
    }
}

export async function fetchUserStatistics(): Promise<any> {
    try {
        return await api.get<any>('/v1/users/statistics');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to fetch user statistics',
            showToast: false,
        });
    }
}

export async function requestOrganizerUpgrade(message?: string): Promise<{
    success: boolean;
    message: string;
    user: {
        id: number;
        email: string;
        name: string;
        role: string;
    };
}> {
    try {
        return await api.post<{
            success: boolean;
            message: string;
            user: {
                id: number;
                email: string;
                name: string;
                role: string;
            };
        }>('/v1/users/upgrade-to-organizer', { message });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to request organizer upgrade',
            showToast: false,
        });
    }
}

export async function linkWallet(walletAddress: string, signature: string, message: string): Promise<{
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
        return await api.post<{
            success: boolean;
            message: string;
            wallet: {
                id: number;
                walletAddress: string;
                isPrimary: boolean;
                isVerified: boolean;
            };
        }>('/v1/users/link-wallet', { walletAddress, signature, message });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to link wallet',
            showToast: false,
        });
    }
}
