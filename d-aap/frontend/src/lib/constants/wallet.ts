import { PRODUCTION_CONFIG } from './production';

export const WALLET_BALANCE_CONFIG = {
    staleTime: import.meta.env.PROD ? 60_000 : 30_000,
    gcTime: import.meta.env.PROD ? 10 * 60_000 : 5 * 60_000,
    cacheTimeout: 60_000,
    staleThreshold: 30_000,
    retryCount: import.meta.env.PROD ? 3 : 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    requestTimeout: PRODUCTION_CONFIG.requestTimeout,
} as const;

export const QUERY_CONFIG = {
    staleTime: import.meta.env.PROD ? 2 * 60 * 1000 : 60 * 1000,
    gcTime: import.meta.env.PROD ? 5 * 60 * 1000 : 2 * 60 * 1000,
    retryCount: PRODUCTION_CONFIG.maxRetries,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

export const ERROR_CODES = {
    USER_REJECTED: 4001,
    UNAUTHORIZED: 4100,
    INTERNAL_ERROR: -32603,
    NETWORK_ERROR: -32000,
    TIMEOUT: -32002,
} as const;

export const WALLET_TIMEOUTS = {
    SIGN_MESSAGE: 30_000,
    GET_BALANCE: 10_000,
    SWITCH_CHAIN: 30_000,
    VERIFY_CONNECTION: 5_000,
} as const;
