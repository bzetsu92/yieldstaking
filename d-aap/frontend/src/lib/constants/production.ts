const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true';

export const PRODUCTION_CONFIG = {
    enableLogging: isDevelopment || debugMode,
    enableErrorReporting: isProduction,
    enablePerformanceMonitoring: isProduction,
    sessionDuration: 24 * 60 * 60 * 1000,
    maxRetries: isProduction ? 3 : 2,
    requestTimeout: isProduction ? 30000 : 15000,
    balanceRefreshInterval: isProduction ? 60_000 : 30_000,
    chainSwitchTimeout: 30_000,
    walletConnectionTimeout: 10_000,
} as const;

export const SECURITY_CONFIG = {
    allowedOrigins: (import.meta.env.VITE_ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    csrfTokenHeader: 'X-CSRF-Token',
    sessionCookieName: 'auth_session',
    secureCookie: isProduction,
    enableCSP: isProduction,
    enableHSTS: isProduction,
} as const;

export const PERFORMANCE_CONFIG = {
    enableCodeSplitting: isProduction,
    enableLazyLoading: isProduction,
    enableMemoization: true,
    enableVirtualization: isProduction,
    debounceDelay: 300,
    throttleDelay: 1000,
} as const;
