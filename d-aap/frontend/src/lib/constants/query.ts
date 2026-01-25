import { PRODUCTION_CONFIG } from './production';
import { ERROR_CODES } from './wallet';

export const QUERY_CLIENT_CONFIG = {
    defaultOptions: {
        queries: {
            staleTime: import.meta.env.PROD ? 2 * 60 * 1000 : 60 * 1000,
            gcTime: import.meta.env.PROD ? 5 * 60 * 1000 : 2 * 60 * 1000,
            refetchOnWindowFocus: import.meta.env.PROD,
            refetchOnReconnect: true,
            refetchOnMount: true,
            retry: (failureCount: number, error: unknown) => {
                const err = error as { code?: number | string };

                if (err?.code === ERROR_CODES.USER_REJECTED) return false;
                if (err?.code === ERROR_CODES.INTERNAL_ERROR) {
                    return failureCount < (import.meta.env.PROD ? 2 : 1);
                }
                if (err?.code === ERROR_CODES.NETWORK_ERROR) {
                    return failureCount < PRODUCTION_CONFIG.maxRetries;
                }
                return failureCount < PRODUCTION_CONFIG.maxRetries;
            },
            retryDelay: (attemptIndex: number) => {
                const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
                const jitter = Math.random() * 1000;
                return baseDelay + jitter;
            },
            networkMode: 'online' as const,
            meta: {
                persist: import.meta.env.PROD,
            },
        },
        mutations: {
            retry: (failureCount: number, error: unknown) => {
                const err = error as { code?: number | string };
                if (err?.code === ERROR_CODES.USER_REJECTED) return false;
                return failureCount < (import.meta.env.PROD ? 2 : 1);
            },
            networkMode: 'online' as const,
        },
    },
} as const;

export const RAINBOW_KIT_THEME_CONFIG = {
    accentColor: '#3b82f6',
    accentColorForeground: 'white',
    borderRadius: 'medium' as const,
    fontStack: 'system' as const,
    overlayBlur: 'small' as const,
} as const;
