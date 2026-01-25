import { validateEnvironment } from './env-validator';

if (import.meta.env.PROD) {
    const validation = validateEnvironment();
    if (!validation.valid) {
        console.error('Environment validation failed:', validation.errors);
    }
    if (validation.warnings.length > 0) {
        console.warn('Environment warnings:', validation.warnings);
    }
}

export const publicEnv = {
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    SITE_NAME: import.meta.env.VITE_SITE_NAME || 'Yield Staking',
    DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
    CHAIN_ID: parseInt(import.meta.env.VITE_CHAIN_ID || '11155111', 10),
    WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '',
} as const;
