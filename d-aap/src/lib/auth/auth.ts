import { type Address, isAddress, getAddress } from 'viem';

import { SUPPORTED_CHAINS } from '../config/chains';
import { walletService } from '../wallet/wallet.service';
import { ApiErrorHandler } from '../utils/api-error-handler';

export interface AuthSession {
    address: Address;
    chainId: number;
    signature: string;
    nonce: string;
    expiresAt: number;
}

const SESSION_STORAGE_KEY = 'auth_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000;

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

            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

            if (typeof document !== 'undefined') {
                document.dispatchEvent(
                    new CustomEvent('auth:session-updated', { detail: session }),
                );
            }

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

            const session: AuthSession = JSON.parse(sessionData);

            if (Date.now() >= session.expiresAt) {
                localStorage.removeItem(SESSION_STORAGE_KEY);
                return null;
            }

            return session;
        } catch {
            return null;
        }
    };

    const clearSession = (): void => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            document.dispatchEvent(new CustomEvent('auth:session-cleared'));
        }
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
    if (typeof window === 'undefined') return;

    // Remove all auth-related localStorage items
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_session');

    if (typeof document !== 'undefined') {
        document.cookie = 'auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'auth_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
        
        document.dispatchEvent(new CustomEvent('auth:session-cleared'));
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'access_token',
            newValue: null,
            storageArea: localStorage,
        }));
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'refresh_token',
            newValue: null,
            storageArea: localStorage,
        }));
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'auth_session',
            newValue: null,
            storageArea: localStorage,
        }));
    }
}

export function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

export function hasAccountAuth(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
}

export function isAuthenticated(): boolean {
    const token = getAccessToken();
    const session = localStorage.getItem('auth_session');
    return !!(token || session);
}
