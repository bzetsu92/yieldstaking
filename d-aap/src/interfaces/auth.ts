export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user?: {
        id: number;
        email: string;
        name: string;
        role: string;
        walletAddress?: string;
    };
}

export interface MetaMaskAuthResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: number;
        email: string | null;
        name: string;
        role: string;
        walletAddress?: string;
    };
}
