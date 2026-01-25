import { useState } from 'react';
import { toast } from 'sonner';
import { useAccount, useChainId } from 'wagmi';

import { DEFAULT_CHAIN_ID } from '@/lib/config/chains';
import { EXPLORER_ENDPOINTS } from '@/lib/constants/rpc';
import { formatTxHash } from '@/lib/utils';
import { BlockchainErrorHandler } from '@/lib/utils/blockchain-error-handler';

export interface UseBlockchainTransactionOptions {
    successMessage?: string;
    errorContext?: string;
    showExplorerLink?: boolean;
    onSuccess?: (result: any) => void;
    onError?: (error: unknown) => void;
}

export function useBlockchainTransaction<T = any>(options: UseBlockchainTransactionOptions = {}) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [isProcessing, setIsProcessing] = useState(false);

    const {
        successMessage,
        errorContext = 'Transaction',
        showExplorerLink = true,
        onSuccess,
        onError,
    } = options;

    const execute = async (
        transactionFn: (chainId: number) => Promise<T>,
        customOptions?: Partial<UseBlockchainTransactionOptions>,
    ): Promise<T | null> => {
        if (!address || !isConnected) {
            toast.error('Please connect your wallet');
            return null;
        }

        setIsProcessing(true);

        try {
            const currentChainId = (chainId || DEFAULT_CHAIN_ID) as any;

            const result = await transactionFn(currentChainId);

            const message = customOptions?.successMessage || successMessage || 'Transaction successful!';
            const explorerBase = EXPLORER_ENDPOINTS[currentChainId] || EXPLORER_ENDPOINTS[DEFAULT_CHAIN_ID];

            if (showExplorerLink && result && typeof result === 'object' && 'txHash' in result) {
                toast.success(message, {
                    description: `Transaction: ${formatTxHash(result.txHash as string)}`,
                    action: {
                        label: 'View',
                        onClick: () => window.open(`${explorerBase}/tx/${result.txHash}`, '_blank'),
                    },
                    duration: 5000,
                });
            } else {
                toast.success(message);
            }

            onSuccess?.(result);
            return result;
        } catch (error: unknown) {
            if (BlockchainErrorHandler.isTransactionRejected(error)) {
                toast.info('Transaction cancelled');
                return null;
            }

            const errorMessage = BlockchainErrorHandler.getBlockchainErrorMessage(error, customOptions?.errorContext || errorContext);
            
            const lowerMessage = errorMessage.toLowerCase();
            if (
                lowerMessage.includes('not whitelisted') || 
                lowerMessage.includes('whitelisted') ||
                lowerMessage.includes('not whitelist') ||
                lowerMessage.includes('whitelist')
            ) {
                toast.error('Organizer Whitelist Required', {
                    description: 'Your wallet address needs to be whitelisted as an organizer. Please contact the platform administrator to whitelist your address.',
                    duration: 10000,
                });
            } else if (errorMessage.includes('Factory contract is currently paused')) {
                toast.error('Contract Paused', {
                    description: 'The Factory contract is currently paused. Please try again later.',
                    duration: 8000,
                });
            } else if (errorMessage.includes('insufficient creation fee') || errorMessage.includes('insufficient fee')) {
                toast.error('Insufficient Fee', {
                    description: 'Not enough funds to cover the creation fee. Please ensure you have enough ETH.',
                    duration: 8000,
                });
            } else {
                toast.error(customOptions?.errorContext || errorContext || 'Transaction failed', {
                    description: errorMessage,
                    duration: 8000,
                });
            }

            onError?.(error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        execute,
        isProcessing,
        isConnected: !!address && isConnected,
    };
}

