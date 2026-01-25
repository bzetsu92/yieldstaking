import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isAddress, getAddress } from 'viem';
import { useAccount, useDisconnect } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

import { createAuth, isAuthenticated as checkIsAuthenticated, logout as clearLocalAuth, hasAccountAuth } from '@/lib/auth';
import { logout as apiLogout } from '@/lib/api/auth';
import { logger } from '@/lib/utils/logger';

export type AuthenticationStatus = 'loading' | 'authenticated' | 'unauthenticated';

const COOKIE_NAME = 'auth_session';
const DEBOUNCE_DELAY = 50;

export function useAuthentication() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { getSession, clearSession } = createAuth();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<AuthenticationStatus>('loading');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const normalizedAddress = useMemo(() => {
        if (!address || !isAddress(address)) return null;
        try {
            return getAddress(address);
        } catch {
            return null;
        }
    }, [address]);

    useEffect(() => {
        const checkAuthentication = () => {
            const hasToken = checkIsAuthenticated();
            const session = getSession();

            let hasValidWallet = false;
            if (isConnected && normalizedAddress && session) {
                try {
                    hasValidWallet = session.address.toLowerCase() === normalizedAddress.toLowerCase();
                } catch {
                    hasValidWallet = false;
                }
            }

            if (session && typeof document !== 'undefined') {
                const existingCookie = document.cookie
                    .split('; ')
                    .find((row) => row.startsWith(`${COOKIE_NAME}=`));

                if (!existingCookie && session.expiresAt > Date.now()) {
                    const expires = new Date(session.expiresAt);
                    const isProduction = import.meta.env.PROD;
                    const cookieValue = encodeURIComponent(JSON.stringify(session));
                    const cookieOptions = [
                        `${COOKIE_NAME}=${cookieValue}`,
                        `expires=${expires.toUTCString()}`,
                        'path=/',
                        isProduction ? 'Secure' : '',
                        isProduction ? 'SameSite=Strict' : 'SameSite=Lax',
                    ]
                        .filter(Boolean)
                        .join('; ');
                    document.cookie = cookieOptions;
                }
            }

            setStatus(hasToken || session || hasValidWallet ? 'authenticated' : 'unauthenticated');
        };

        checkAuthentication();

        const handleAuthUpdate = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(checkAuthentication, DEBOUNCE_DELAY);
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('auth:session-updated', handleAuthUpdate);
            document.addEventListener('auth:session-cleared', handleAuthUpdate);
            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                document.removeEventListener('auth:session-updated', handleAuthUpdate);
                document.removeEventListener('auth:session-cleared', handleAuthUpdate);
            };
        }
    }, [isConnected, normalizedAddress, getSession]);

    const signOut = useCallback(async () => {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

        clearSession();
        
        if (refreshToken) {
            try {
                await apiLogout(refreshToken);
            } catch (error) {
                logger.warn('Logout API call failed', { error });
            }
        } else {
            clearLocalAuth();
        }

        if (typeof document !== 'undefined') {
            const pastDate = new Date(0).toUTCString();
            document.cookie = `${COOKIE_NAME}=; expires=${pastDate}; path=/;`;
            document.cookie = `${COOKIE_NAME}=; expires=${pastDate}; path=/; domain=${window.location.hostname};`;
        }

        if (!hasAccountAuth()) {
            disconnect();
        }

        setStatus('unauthenticated');
        queryClient.clear();

        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('auth:session-cleared'));
        }
    }, [clearSession, disconnect, queryClient]);

    return {
        status,
        signOut,
        isAuthenticated: status === 'authenticated',
        isLoading: status === 'loading',
    };
}
