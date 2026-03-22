import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { isAddress, getAddress, recoverMessageAddress } from 'viem';

import { getMetaMaskNonce, signInWithMetaMask, logout as apiLogout } from '../api/auth';
import { clearAuthStorage, storeWalletSession } from './auth';
import { walletService } from '../wallet/wallet.service';
import { ApiErrorHandler } from '../utils/api-error-handler';

const isValidSignature = (signature: string): boolean => {
    return /^0x[a-fA-F0-9]{130}$/.test(signature);
};

const isValidCallbackUrl = (url: string): boolean => {
    try {
        if (!url || url.startsWith('http://') || url.startsWith('https://')) {
            return false;
        }
        if (!url.startsWith('/')) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

export const createCustomAuthenticationAdapter = () => {
    return createAuthenticationAdapter<unknown>({
        getNonce: async () => {
            try {
                return await getMetaMaskNonce();
            } catch (error) {
                ApiErrorHandler.handle(error, 'metamask-nonce');
                throw new Error('Unable to start wallet sign-in. Please try again.');
            }
        },

        createMessage: ({ nonce, address, chainId }) => {
            return walletService.createAuthMessage(address, chainId, nonce);
        },

        verify: async ({ message, signature }: { message: unknown; signature: string }): Promise<boolean> => {
            try {
                if (!signature || !isValidSignature(signature)) {
                    return false;
                }

                const messageStr = String(message);
                if (!messageStr || messageStr.length > 10000) {
                    return false;
                }

                const recoveredAddress = await recoverMessageAddress({
                    message: messageStr,
                    signature: signature as `0x${string}`,
                });

                const addressMatch = messageStr.match(/Wallet: (0x[a-fA-F0-9]{40})/);
                if (!addressMatch || !isAddress(addressMatch[1])) {
                    return false;
                }

                const messageAddress = getAddress(addressMatch[1]);
                const isValid = recoveredAddress.toLowerCase() === messageAddress.toLowerCase();

                if (isValid) {
                    try {
                        const result = await signInWithMetaMask({
                            walletAddress: messageAddress,
                            signature: signature,
                            message: messageStr,
                        });

                        if (!result?.access_token || !result?.refresh_token) {
                            clearAuthStorage();
                            return false;
                        }

                        const nonceMatch = messageStr.match(/Nonce:\s*(.+)/);
                        const chainIdMatch = messageStr.match(/Chain ID:\s*(\d+)/);
                        const chainId = chainIdMatch ? parseInt(chainIdMatch[1], 10) : NaN;
                        const nonce = nonceMatch?.[1]?.trim();

                        if (!nonce || Number.isNaN(chainId) || chainId <= 0) {
                            clearAuthStorage();
                            return false;
                        }

                        storeWalletSession({
                            address: messageAddress,
                            chainId,
                            signature,
                            nonce,
                            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                        });

                        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
                            const callbackUrl =
                                new URLSearchParams(window.location.search).get('callbackUrl') || '/app';
                            if (isValidCallbackUrl(callbackUrl)) {
                                requestAnimationFrame(() => {
                                    window.location.replace(callbackUrl);
                                });
                            }
                        }

                        return true;
                    } catch (backendError) {
                        ApiErrorHandler.handle(backendError, 'rainbowkit-backend-signin');
                        clearAuthStorage();
                        return false;
                    }
                }

                return false;
            } catch (error) {
                ApiErrorHandler.handle(error, 'signature-verification');
                clearAuthStorage();
                return false;
            }
        },

        signOut: async () => {
            try {
                const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
                if (refreshToken) {
                    await apiLogout(refreshToken);
                }
            } catch (error) {
                ApiErrorHandler.handle(error, 'logout');
            }
        },
    });
};
