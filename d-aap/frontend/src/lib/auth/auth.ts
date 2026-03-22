import { type Address, isAddress, getAddress } from 'viem';

import { SUPPORTED_CHAINS } from '../config/chains';
import { walletService } from '../wallet/wallet.service';
import { ApiErrorHandler } from '../utils/api-error-handler';
import type { LoginResponse } from '@/interfaces';

export interface AuthSession {
    address: Address;
    chainId: number;
    signature: string;
    nonce: string;
    expiresAt: number;
}

export const TOKEN_STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    AUTH_SESSION: 'auth_session',
} as const;

const SESSION_STORAGE_KEY = TOKEN_STORAGE_KEYS.AUTH_SESSION;
const SESSION_DURATION = 24 * 60 * 60 * 1000;

const dispatchAuthEvent = (eventName: 'auth:session-updated' | 'auth:session-cleared', detail?: unknown) => {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent(eventName, { detail }));
};

const emitStorageLikeEvent = (key: string, newValue: string | null) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new StorageEvent('storage', {
            key,
            newValue,
            storageArea: localStorage,
        }),
    );
};

const isValidSession = (value: unknown): value is AuthSession => {
    if (!value || typeof value !== 'object') return false;

    const session = value as Partial<AuthSession>;

    return (
        typeof session.address === 'string' &&
        isAddress(session.address) &&
        typeof session.chainId === 'number' &&
        Number.isInteger(session.chainId) &&
        session.chainId > 0 &&
        typeof session.signature === 'string' &&
        session.signature.length > 0 &&
        typeof session.nonce === 'string' &&
        session.nonce.length > 0 &&
        typeof session.expiresAt === 'number' &&
        Number.isFinite(session.expiresAt)
    );
};

export function storeAuthTokens(tokens: Pick<LoginResponse, 'access_token' | 'refresh_token'>): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);

    emitStorageLikeEvent(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    emitStorageLikeEvent(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    dispatchAuthEvent('auth:session-updated');
}

export function storeWalletSession(session: AuthSession): void {
    if (typeof window === 'undefined') return;

    const normalizedSession: AuthSession = {
        ...session,
        address: getAddress(session.address),
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
    emitStorageLikeEvent(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
    dispatchAuthEvent('auth:session-updated', normalizedSession);
}

export function clearAuthStorage(): void {
    if (typeof window === 'undefined') return;

    Object.values(TOKEN_STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
        emitStorageLikeEvent(key, null);
    });

    if (typeof document !== 'undefined') {
        const pastDate = new Date(0).toUTCString();
        document.cookie = `${TOKEN_STORAGE_KEYS.AUTH_SESSION}=; expires=${pastDate}; path=/;`;
        document.cookie = `${TOKEN_STORAGE_KEYS.AUTH_SESSION}=; expires=${pastDate}; path=/; domain=${window.location.hostname};`;
    }

    dispatchAuthEvent('auth:session-cleared');
}

export function createAuth() {
    const signMessage = async (address: Address, chainId?: number): Promise<string> => {
        if (!isAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        const normalizedAddress = getAddress(address);

        let targetChainId = chainId;
        if (!targetChainId) {
            targetChainId = await walletService.getCurrentChainId();
        }

        const isSupportedChain = SUPPORTED_CHAINS.some((chain) => chain.id === targetChainId);
        if (!isSupportedChain) {
            throw new Error(`Unsupported chain ID: ${targetChainId}`);
        }

        try {
            const signature = await walletService.signAuthMessage(normalizedAddress, targetChainId);

            const nonce = walletService.generateNonce();
            const session: AuthSession = {
                address: normalizedAddress,
                chainId: targetChainId,
                signature,
                nonce,
                expiresAt: Date.now() + SESSION_DURATION,
            };

            storeWalletSession(session);

            return signature;
        } catch (error: unknown) {
            ApiErrorHandler.handle(error, 'sign-message');
            throw error;
        }
    };

    const getSession = (): AuthSession | null => {
        if (typeof window === 'undefined') return null;

        try {
            const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!sessionData) return null;

            const session: unknown = JSON.parse(sessionData);

            if (!isValidSession(session)) {
                localStorage.removeItem(SESSION_STORAGE_KEY);
                return null;
            }

            const normalizedSession: AuthSession = {
                ...session,
                address: getAddress(session.address),
            };

            if (Date.now() >= normalizedSession.expiresAt) {
                localStorage.removeItem(SESSION_STORAGE_KEY);
                return null;
            }

            return normalizedSession;
        } catch {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }
    };

    const clearSession = (): void => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(SESSION_STORAGE_KEY);
        emitStorageLikeEvent(SESSION_STORAGE_KEY, null);
        dispatchAuthEvent('auth:session-cleared');
    };

    const isSessionValid = (): boolean => {
        const session = getSession();
        return session !== null && Date.now() < session.expiresAt;
    };

    return {
        signMessage,
        getSession,
        clearSession,
        isSessionValid,
    };
}

export function logout() {
    clearAuthStorage();
}

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
}

export function hasAccountAuth(): boolean {
    return !!getAccessToken();
}

export function isAuthenticated(): boolean {
    return hasAccountAuth();
}
