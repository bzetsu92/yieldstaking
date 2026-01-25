interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

const validateUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};

export function validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const isProd = import.meta.env.PROD;

    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
        if (isProd) {
            errors.push('Missing required environment variable: VITE_API_URL');
        }
    } else if (!validateUrl(apiUrl)) {
        errors.push(`Invalid VITE_API_URL format: ${apiUrl}. Must be a valid HTTP/HTTPS URL.`);
    }

    if (isProd) {
        const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;
        if (!projectId) {
            warnings.push('VITE_WALLET_CONNECT_PROJECT_ID is not set. WalletConnect may not work.');
        }

        if (apiUrl === 'http://localhost:3000') {
            warnings.push('Using default localhost API URL in production.');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
