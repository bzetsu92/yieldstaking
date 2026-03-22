import { type Address, isAddress, getAddress } from 'viem';

import { api } from './client';
import { publicEnv } from '../config/env';
import { handleApiError } from '../utils/api-error-handler';
import { clearAuthStorage, storeAuthTokens } from '../auth/auth';

import type {
    LoginRequest,
    LoginResponse,
    MetaMaskAuthResponse,
    RegisterRequest,
    RegisterResponse,
} from '@/interfaces';

export async function loginWithEmailPassword(data: LoginRequest): Promise<LoginResponse> {
    if (!data?.email || !data?.password) {
        throw new Error('Email and password are required');
    }

    try {
        const result = await api.post<LoginResponse>('/v1/auth/login', data);

        if (result?.access_token && result?.refresh_token) {
            storeAuthTokens(result);
        }

        return result;
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to login',
            showToast: false,
        });
    }
}

export async function registerWithEmailPassword(
    data: RegisterRequest,
): Promise<RegisterResponse> {
    if (!data?.name?.trim()) {
        throw new Error('Name is required');
    }

    if (!data?.email) {
        throw new Error('Email is required');
    }

    if (!data?.password || data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }

    try {
        return await api.post<RegisterResponse>('/v1/auth/email/register', {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password,
        });
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to register',
            showToast: false,
        });
    }
}

export async function getMetaMaskNonce(): Promise<string> {
    try {
        const result = await api.post<{ nonce: string }>('/v1/auth/metamask/nonce', {});
        
        if (!result?.nonce) {
            throw new Error('Invalid nonce response');
        }
        
        return result.nonce;
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to get MetaMask nonce',
            showToast: false,
        });
    }
}

export async function signInWithMetaMask(data: {
    walletAddress: Address;
    signature: string;
    message: string;
}): Promise<MetaMaskAuthResponse> {
    if (!data.walletAddress || !isAddress(data.walletAddress)) {
        throw new Error('Invalid wallet address');
    }

    if (!data.signature || !/^0x[a-fA-F0-9]{130}$/.test(data.signature)) {
        throw new Error('Invalid signature format');
    }

    if (!data.message || typeof data.message !== 'string' || data.message.length > 10000) {
        throw new Error('Invalid message');
    }

    try {
        const normalizedAddress = getAddress(data.walletAddress);
        const result = await api.post<MetaMaskAuthResponse>('/v1/auth/metamask/signin', {
            walletAddress: normalizedAddress,
            signature: data.signature,
            message: data.message,
        });

        if (result?.access_token && result?.refresh_token) {
            storeAuthTokens(result);
        }

        return result;
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to sign in with MetaMask',
            showToast: false,
        });
    }
}

export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
    if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error('Refresh token is required');
    }

    try {
        const result = await api.post<LoginResponse>('/v1/auth/refresh', {
            refreshToken,
        });

        if (result?.access_token && result?.refresh_token) {
            storeAuthTokens(result);
        }

        return result;
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to refresh token',
            showToast: false,
        });
    }
}

export async function logout(refreshToken: string | null): Promise<void> {
    if (refreshToken && typeof refreshToken !== 'string') {
        throw new Error('Invalid refresh token');
    }

    try {
        if (refreshToken) {
            await api.post<{ message: string }>('/v1/auth/logout', {
                refreshToken,
            });
        }
    } catch (error: unknown) {
        handleApiError({
            error,
            context: 'Failed to logout',
            showToast: false,
        });
    } finally {
        clearAuthStorage();
    }
}

export async function requestPasswordReset(
    email: string,
): Promise<{ message: string; token?: string }> {
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Valid email is required');
    }

    try {
        return await api.post<{ message: string; token?: string }>(
            '/v1/auth/request-password-reset',
            { email: email.toLowerCase().trim() },
        );
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to request password reset',
            showToast: false,
        });
    }
}

export async function resetPassword(data: {
    token: string;
    newPassword: string;
}): Promise<{ message: string }> {
    if (!data.token || typeof data.token !== 'string') {
        throw new Error('Reset token is required');
    }

    if (!data.newPassword || typeof data.newPassword !== 'string' || data.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }

    try {
        return await api.post<{ message: string }>('/v1/auth/reset-password', data);
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to reset password',
            showToast: false,
        });
    }
}

export async function getAuthProfile(): Promise<{
    id: number;
    email?: string;
    name: string;
    role: 'USER' | 'ADMIN';
    walletAddress?: string;
}> {
    try {
        return await api.get('/v1/auth/profile');
    } catch (error: unknown) {
        throw handleApiError({
            error,
            context: 'Failed to get auth profile',
            showToast: false,
        });
    }
}

export function getGoogleAuthUrl(): string {
    const apiUrl = publicEnv.API_URL;
    if (!apiUrl || typeof apiUrl !== 'string') {
        throw new Error('API URL is not configured');
    }
    return `${apiUrl}/v1/auth/google`;
}
