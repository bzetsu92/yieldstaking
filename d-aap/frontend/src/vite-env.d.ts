/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_SITE_NAME?: string;
    readonly VITE_SITE_URL?: string;
    readonly VITE_SITE_DESCRIPTION?: string;
    readonly VITE_OG_IMAGE?: string;
    readonly VITE_THEME_COLOR_LIGHT?: string;
    readonly VITE_THEME_COLOR_DARK?: string;
    readonly VITE_DEBUG_MODE?: string;
    readonly VITE_ENABLE_ANALYTICS?: string;
    readonly VITE_ENABLE_SOCIAL_LOGIN?: string;
    readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
    readonly VITE_APP_ENV?: string;
    readonly VITE_LOTTERY_CONTRACT_ADDRESS?: string;
    readonly VITE_USDT_CONTRACT_ADDRESS?: string;
    readonly VITE_ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
