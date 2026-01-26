import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { isAddress, getAddress, recoverMessageAddress } from 'viem';

import { signInWithMetaMask, logout as apiLogout } from '../api/auth';
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
            return walletService.generateNonce();
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
                            
                        if (result?.access_token) {
                            const nonceMatch = messageStr.match(/Nonce: (.+)/);
                            const chainIdMatch = messageStr.match(/Chain ID: (\d+)/);
                            const chainId = chainIdMatch ? parseInt(chainIdMatch[1], 10) : 11155111;
                            
                            if (isNaN(chainId) || chainId <= 0) {
                                return false;
                            }

                            const session = {
                                address: messageAddress.toLowerCase() as `0x${string}`,
                                chainId,
                                signature: signature,
                                nonce: nonceMatch?.[1] || '',
                                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                            };
                            
                            localStorage.setItem('auth_session', JSON.stringify(session));
                            
                            if (typeof document !== 'undefined') {
                                const event = new CustomEvent('auth:session-updated', { 
                                    detail: session,
                                    bubbles: true,
                                    cancelable: true
                                });
                                document.dispatchEvent(event);
                                
                                window.dispatchEvent(new StorageEvent('storage', {
                                    key: 'access_token',
                                    newValue: result.access_token,
                                    storageArea: localStorage,
                                }));
                                
                                if (typeof window !== 'undefined' && window.location.pathname === '/login') {
                                    const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl') || '/app';
                                    if (isValidCallbackUrl(callbackUrl)) {
                                        requestAnimationFrame(() => {
                                            window.location.href = callbackUrl;
                                        });
                                    }
                                }
                            }
                        }
                    } catch (backendError) {
                        ApiErrorHandler.handle(backendError, 'rainbowkit-backend-signin');
                    }
                }

                return isValid;
            } catch (error) {
                ApiErrorHandler.handle(error, 'signature-verification');
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
