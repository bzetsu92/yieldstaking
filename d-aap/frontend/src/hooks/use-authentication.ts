import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { isAddress, getAddress } from 'viem';
import { useAccount, useDisconnect } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

import { createAuth, getAccessToken, logout as clearLocalAuth } from '@/lib/auth';
import { logout as apiLogout } from '@/lib/api/auth';
import { logger } from '@/lib/utils/logger';

export type AuthenticationStatus = 'loading' | 'authenticated' | 'unauthenticated';

const DEBOUNCE_DELAY = 50;

export function useAuthentication() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { getSession, clearSession } = createAuth();
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<AuthenticationStatus>(() =>
        getAccessToken() ? 'authenticated' : 'unauthenticated',
    );
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
            const hasToken = !!getAccessToken();
            const session = getSession();

            let hasValidWalletSession = false;
            if (isConnected && normalizedAddress && session) {
                try {
                    hasValidWalletSession =
                        session.address.toLowerCase() === normalizedAddress.toLowerCase();
                } catch {
                    hasValidWalletSession = false;
                }
            }

            if (session && isConnected && normalizedAddress && !hasValidWalletSession) {
                clearSession();
            }

            setStatus(hasToken ? 'authenticated' : 'unauthenticated');
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
            window.addEventListener('storage', handleAuthUpdate);
            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                document.removeEventListener('auth:session-updated', handleAuthUpdate);
                document.removeEventListener('auth:session-cleared', handleAuthUpdate);
                window.removeEventListener('storage', handleAuthUpdate);
            };
        }
    }, [isConnected, normalizedAddress, getSession, clearSession]);

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

        disconnect();

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
