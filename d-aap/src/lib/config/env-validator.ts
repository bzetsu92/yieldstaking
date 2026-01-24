interface EnvConfig {
    API_URL: string;
    WALLETCONNECT_PROJECT_ID: string;
    APP_ENV: 'development' | 'production' | 'test';
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

const requiredEnvVars = {
    production: ['VITE_API_URL', 'VITE_WALLETCONNECT_PROJECT_ID'],
    development: ['VITE_API_URL'],
    test: ['VITE_API_URL'],
} as const;

const validateUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

const validateWalletConnectProjectId = (projectId: string): boolean => {
    return /^[a-zA-Z0-9-]{20,}$/.test(projectId);
};

export function validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const env = (import.meta.env.VITE_APP_ENV || 'development') as EnvConfig['APP_ENV'];

    const required = requiredEnvVars[env] || requiredEnvVars.development;
    for (const varName of required) {
        const value = import.meta.env[varName];
        if (!value || value.trim() === '') {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && !validateUrl(apiUrl)) {
        errors.push(`Invalid VITE_API_URL format: ${apiUrl}. Must be a valid HTTP/HTTPS URL.`);
    }

    if (env === 'production') {
        const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
        if (projectId && !validateWalletConnectProjectId(projectId)) {
            warnings.push(
                `VITE_WALLETCONNECT_PROJECT_ID may be invalid. Expected format: alphanumeric string with at least 20 characters.`,
            );
        }
    }

    if (env === 'production') {
        if (apiUrl === 'http://localhost:3000') {
            warnings.push(
                'Using default localhost API URL in production. This is likely incorrect.',
            );
        }
        if (import.meta.env.VITE_DEBUG_MODE === 'true') {
            warnings.push('Debug mode is enabled in production. Consider disabling for security.');
        }
    }

    if (!import.meta.env.VITE_SITE_URL && env === 'production') {
        warnings.push('VITE_SITE_URL is not set. This may affect SEO and social sharing.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

export function getValidatedEnv(): EnvConfig {
    const validation = validateEnvironment();

    if (!validation.valid) {
        const errorMessage = `Environment validation failed:\n${validation.errors.join('\n')}`;
        if (import.meta.env.PROD) {
            console.error(errorMessage);
            throw new Error(errorMessage);
        } else {
            console.warn(errorMessage);
        }
    }

    if (validation.warnings.length > 0) {
        console.warn('Environment warnings:\n' + validation.warnings.join('\n'));
    }

    return {
        API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
        WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
        APP_ENV: (import.meta.env.VITE_APP_ENV || 'development') as EnvConfig['APP_ENV'],
    };
}

if (import.meta.env.PROD) {
    validateEnvironment();
}
