import { createWalletClient, custom, type Address, isAddress, getAddress } from 'viem';

import { getChainConfig, SUPPORTED_CHAINS, DEFAULT_CHAIN_ID } from '../config/chains';
import { PRODUCTION_CONFIG } from '../constants/production';
import { RPC_ENDPOINTS, RPC_FALLBACK_ENDPOINTS } from '../constants/rpc';
import { WALLET_TIMEOUTS } from '../constants/wallet';
import { BlockchainErrorHandler } from '../utils/blockchain-error-handler';
import { logger } from '../utils/logger';

export interface SignMessageData {
    eventId?: number;
    name?: string;
    imageUrl?: string;
    quantity?: number;
    totalAmount?: number;
    currency?: string;
    walletAddress: string;
    nonce?: string;
    timestamp?: number;
}

export interface TransactionSignature {
    signature: string;
    message: string;
    nonce: string;
}

function createTimeoutPromise<T>(timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(errorMessage));
        }, timeoutMs);
    });
}

async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
): Promise<T> {
    return Promise.race([promise, createTimeoutPromise<T>(timeoutMs, errorMessage)]);
}

export class WalletService {
    private static instance: WalletService;

    private constructor() {}

    static getInstance(): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }

    isWalletAvailable(): boolean {
        return typeof window !== 'undefined' && !!window.ethereum;
    }

    generateNonce(): string {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            return `${Date.now()}-${array[0].toString(36)}`;
        }
        return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    }

    createTransactionMessage(data: SignMessageData): string {
        const messageData = {
            ...data,
            nonce: data.nonce || this.generateNonce(),
            timestamp: data.timestamp || Date.now(),
        };
        return JSON.stringify(messageData);
    }

    async signMessage(address: Address, message: string, chainId?: number): Promise<string> {
        if (!this.isWalletAvailable()) {
            throw new Error('Wallet not found. Please install MetaMask');
        }

        if (!address || !isAddress(address)) {
            throw new Error('Invalid wallet address');
        }

        if (!message || typeof message !== 'string' || message.length === 0) {
            throw new Error('Message is required');
        }

        if (message.length > 10000) {
            throw new Error('Message is too long');
        }

        try {
            let targetChainId = chainId;
            if (!targetChainId && window.ethereum) {
                try {
                    const chainIdPromise = window.ethereum.request({ method: 'eth_chainId' });
                    const chainIdHex = await withTimeout(
                        chainIdPromise,
                        WALLET_TIMEOUTS.VERIFY_CONNECTION,
                        'Timeout getting chain ID',
                    );
                    targetChainId = parseInt(chainIdHex as string, 16);
                } catch (error) {
                    logger.warn('Failed to get chain ID, using default', { error });
                    targetChainId = DEFAULT_CHAIN_ID;
                }
            }

            if (!targetChainId) {
                targetChainId = DEFAULT_CHAIN_ID;
            }

            const chainConfig = getChainConfig(targetChainId);
            const normalizedAddress = getAddress(address);

            const client = createWalletClient({
                transport: custom(window.ethereum),
                chain: chainConfig,
                account: normalizedAddress,
            });
            
            const signPromise = client.signMessage({
                message,
                account: normalizedAddress,
            });

            const signature = await withTimeout(
                signPromise,
                WALLET_TIMEOUTS.SIGN_MESSAGE,
                'Signature request timed out',
            );

            return signature;
        } catch (error: unknown) {
            if (BlockchainErrorHandler.isTransactionRejected(error)) {
                throw new Error('User rejected the signature request');
            }

            const appError = BlockchainErrorHandler.handle(error, 'sign-message');
            throw appError;
        }
    }

    async signTransaction(
        address: Address,
        data: SignMessageData,
        chainId?: number,
    ): Promise<TransactionSignature> {
        const nonce = this.generateNonce();
        const message = this.createTransactionMessage({
            ...data,
            nonce,
            walletAddress: address,
        });

        try {
            const signature = await this.signMessage(address, message, chainId);

            return {
                signature,
                message,
                nonce,
            };
        } catch (error: unknown) {
            if (error instanceof Error && error.message.includes('User rejected')) {
                throw error;
            }
            throw new Error(BlockchainErrorHandler.getBlockchainErrorMessage(error, 'Failed to sign transaction'));
        }
    }

    async signPurchaseTicket(
        address: Address,
        eventId: number,
        quantity: number,
        totalAmount: number,
        currency: string,
        chainId?: number,
    ): Promise<TransactionSignature> {
        return this.signTransaction(
            address,
            {
                eventId,
                quantity,
                totalAmount,
                currency,
                walletAddress: address,
            },
            chainId,
        );
    }

    async signMintNFT(
        address: Address,
        name: string,
        imageUrl: string,
        quantity: number,
        chainId?: number,
    ): Promise<TransactionSignature> {
        return this.signTransaction(
            address,
            {
                name,
                imageUrl,
                quantity,
                walletAddress: address,
            },
            chainId,
        );
    }

    async verifyConnection(address: Address): Promise<boolean> {
        if (!this.isWalletAvailable()) {
            return false;
        }

        try {
            const accountsPromise = window.ethereum.request({
                method: 'eth_accounts',
            });

            const accounts = await withTimeout(
                accountsPromise,
                WALLET_TIMEOUTS.VERIFY_CONNECTION,
                'Connection verification timed out',
            );

            return Boolean(
                accounts &&
                    Array.isArray(accounts) &&
                    accounts.length > 0 &&
                    accounts[0].toLowerCase() === address.toLowerCase(),
            );
        } catch (error) {
            logger.warn('Failed to verify connection', { error });
            return false;
        }
    }

    createAuthMessage(address: Address, chainId: number, nonce: string): string {
        if (!isAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        if (!nonce || typeof nonce !== 'string' || nonce.length === 0) {
            throw new Error('Nonce is required');
        }

        if (!chainId || typeof chainId !== 'number' || chainId <= 0) {
            throw new Error('Invalid chain ID');
        }

        const normalizedAddress = getAddress(address);
        const chainConfig = getChainConfig(chainId);

        return `Welcome to AUR!

            Please sign this message to verify your wallet ownership.
            This signature will not trigger any blockchain transaction or cost any gas fees.

            Wallet: ${normalizedAddress}
            Network: ${chainConfig.name} (Chain ID: ${chainId})
            Nonce: ${nonce}

            This signature is valid for 24 hours.
        `;
    }

    async signAuthMessage(address: Address, chainId?: number): Promise<string> {
        if (!isAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        const normalizedAddress = getAddress(address);
        const targetChainId = chainId || DEFAULT_CHAIN_ID;

        if (!targetChainId || typeof targetChainId !== 'number' || targetChainId <= 0) {
            throw new Error('Invalid chain ID');
        }

        const isSupportedChain = SUPPORTED_CHAINS.some((chain) => chain.id === targetChainId);
        if (!isSupportedChain) {
            throw new Error(`Unsupported chain ID: ${targetChainId}`);
        }

        if (!this.isWalletAvailable()) {
            throw new Error('Wallet not found. Please install a Web3 wallet like MetaMask.');
        }

        const nonce = this.generateNonce();
        if (!nonce || nonce.length === 0) {
            throw new Error('Failed to generate nonce');
        }

        const message = this.createAuthMessage(normalizedAddress, targetChainId, nonce);

        try {
            const signature = await this.signMessage(normalizedAddress, message, targetChainId);
            if (!signature || !/^0x[a-fA-F0-9]{130}$/.test(signature)) {
                throw new Error('Invalid signature received');
            }
            return signature;
        } catch (error: unknown) {
            const appError = BlockchainErrorHandler.handle(error, 'sign-auth-message');
            throw appError;
        }
    }

    async getCurrentChainId(): Promise<number> {
        if (!this.isWalletAvailable()) {
            return DEFAULT_CHAIN_ID;
        }

        try {
            const chainIdPromise = window.ethereum.request({ method: 'eth_chainId' });
            const chainIdHex = await withTimeout(
                chainIdPromise,
                WALLET_TIMEOUTS.VERIFY_CONNECTION,
                'Timeout getting chain ID',
            );
            const chainId = parseInt(chainIdHex as string, 16);

            const isSupportedChain = SUPPORTED_CHAINS.some((chain) => chain.id === chainId);
            if (!isSupportedChain) {
                logger.warn('Unsupported chain detected, using default', { chainId });
                return DEFAULT_CHAIN_ID;
            }

            return chainId;
        } catch (error) {
            logger.warn('Failed to get current chain ID, using default', { error });
            return DEFAULT_CHAIN_ID;
        }
    }

    async getBalance(
        address: Address,
        chainId?: number,
        retryCount = 0,
    ): Promise<{ formatted: string; symbol: string; value: bigint; decimals: number }> {
        if (!this.isWalletAvailable()) {
            throw new Error('Wallet not found. Please install a Web3 wallet like MetaMask.');
        }

        if (!isAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        const normalizedAddress = getAddress(address);
        let targetChainId = chainId;

        if (!targetChainId) {
            targetChainId = await this.getCurrentChainId();
        }

        const chainConfig = getChainConfig(targetChainId);
        const isSupportedChain = SUPPORTED_CHAINS.some((chain) => chain.id === targetChainId);
        if (!isSupportedChain) {
            throw new Error(`Unsupported chain ID: ${targetChainId}`);
        }

        const primaryRpc = RPC_ENDPOINTS[targetChainId] || chainConfig.rpcUrls.default.http[0];
        const fallbackRpcs = RPC_FALLBACK_ENDPOINTS[targetChainId] || [];
        const allRpcs = [primaryRpc, ...fallbackRpcs].filter(Boolean);

        for (let i = 0; i < allRpcs.length; i++) {
            const rpcUrl = allRpcs[i];
            if (!rpcUrl) continue;

            try {
                const { createPublicClient, http, formatEther } = await import('viem');

                const publicClient = createPublicClient({
                    chain: chainConfig,
                    transport: http(rpcUrl, {
                        timeout: WALLET_TIMEOUTS.GET_BALANCE,
                        retryCount: 0,
                    }),
                });

                const balancePromise = publicClient.getBalance({
                    address: normalizedAddress,
                });

                const balance = await withTimeout(
                    balancePromise,
                    WALLET_TIMEOUTS.GET_BALANCE,
                    'Balance request timed out',
                );

                const formatted = formatEther(balance);
                const symbol = chainConfig.nativeCurrency.symbol;
                const decimals = chainConfig.nativeCurrency.decimals;

                if (i > 0 && PRODUCTION_CONFIG.enableLogging) {
                    logger.debug('Used fallback RPC endpoint', {
                        chainId: targetChainId,
                        endpointIndex: i,
                    });
                }

                return {
                    formatted,
                    symbol,
                    value: balance,
                    decimals,
                };
            } catch (error: unknown) {
                const isLastRpc = i === allRpcs.length - 1;
                const shouldRetry = retryCount < PRODUCTION_CONFIG.maxRetries && !isLastRpc;

                if (shouldRetry) {
                    logger.warn(`RPC endpoint failed, trying next`, {
                        rpcUrl,
                        attempt: retryCount + 1,
                        error,
                    });
                    continue;
                }

                if (isLastRpc) {
                    BlockchainErrorHandler.handle(error, 'get-balance');
                    throw error;
                }
            }
        }

        throw new Error('Failed to fetch balance from all RPC endpoints');
    }
}

export const walletService = WalletService.getInstance();

