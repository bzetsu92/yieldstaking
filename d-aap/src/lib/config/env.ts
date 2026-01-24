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
    SITE_NAME: import.meta.env.VITE_SITE_NAME || 'CloverB',
    SITE_URL: import.meta.env.VITE_SITE_URL || '',
    SITE_DESCRIPTION: import.meta.env.VITE_SITE_DESCRIPTION || '',
    OG_IMAGE: import.meta.env.VITE_OG_IMAGE || '',
    THEME_COLOR_LIGHT: import.meta.env.VITE_THEME_COLOR_LIGHT || '#ffffff',
    THEME_COLOR_DARK: import.meta.env.VITE_THEME_COLOR_DARK || '#000000',
    DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
    ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    ENABLE_SOCIAL_LOGIN: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',
    FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || '',
} as const;
