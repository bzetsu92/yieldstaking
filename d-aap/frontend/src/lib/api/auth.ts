import { type Address, isAddress, getAddress } from 'viem';

import { api } from './client';
import { publicEnv } from '../config/env';
import { handleApiError } from '../utils/api-error-handler';

import type { LoginRequest, LoginResponse, MetaMaskAuthResponse } from '@/interfaces';

const TOKEN_STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    AUTH_SESSION: 'auth_session',
} as const;

export async function loginWithEmailPassword(data: LoginRequest): Promise<LoginResponse> {
    if (!data?.email || !data?.password) {
        throw new Error('Email and password are required');
    }

    try {
        const result = await api.post<LoginResponse>('/v1/auth/login', data);

        if (result?.access_token) {
            localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, result.access_token);
            if (result.refresh_token) {
                localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, result.refresh_token);
            }
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

export async function getMetaMaskNonce(walletAddress: Address): Promise<string> {
    if (!walletAddress || !isAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
    }

    try {
        const normalizedAddress = getAddress(walletAddress);
        const result = await api.post<{ nonce: string }>('/v1/auth/metamask/nonce', {
            walletAddress: normalizedAddress,
        });
        
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

        if (result?.access_token) {
            localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, result.access_token);
            if (result.refresh_token) {
                localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, result.refresh_token);
            }
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

        if (result?.access_token) {
            localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, result.access_token);
            if (result.refresh_token) {
                localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, result.refresh_token);
            }
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
        if (typeof window !== 'undefined') {
            Object.values(TOKEN_STORAGE_KEYS).forEach((key) => {
                localStorage.removeItem(key);
            });

            if (typeof document !== 'undefined') {
                const pastDate = new Date(0).toUTCString();
                document.cookie = `${TOKEN_STORAGE_KEYS.AUTH_SESSION}=; expires=${pastDate}; path=/;`;
                document.cookie = `${TOKEN_STORAGE_KEYS.AUTH_SESSION}=; expires=${pastDate}; path=/; domain=${window.location.hostname};`;
            }
        }
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
