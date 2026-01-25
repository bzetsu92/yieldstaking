import { toast } from 'sonner';
import { BlockchainErrorHandler } from './blockchain-error-handler';
import { ApiErrorHandler } from './api-error-handler';

export interface HandleModalErrorOptions {
    error: unknown;
    context?: string;
    defaultMessage?: string;
    onError?: (errorMessage: string, statusCode?: number) => void;
    showToast?: boolean;
}


export function handleModalError(options: HandleModalErrorOptions): string {
    const {
        error,
        context = 'Operation',
        defaultMessage = 'An error occurred. Please try again.',
        onError,
        showToast = true,
    } = options;

    if (BlockchainErrorHandler.isTransactionRejected(error)) {
        if (showToast) {
            toast.info('Transaction cancelled');
        }
        return 'Transaction cancelled';
    }

    const blockchainMessage = BlockchainErrorHandler.getBlockchainErrorMessage(error, '');
    const apiMessage = ApiErrorHandler.getErrorMessage(error, context);
    const errorMessage = blockchainMessage || apiMessage;
    
    const statusCode = (error as { response?: { status?: number } })?.response?.status;

    if (statusCode === 404) {
        const message = `${context} not available. Please contact support or try again later.`;
        if (showToast) {
            toast.error(`${context} Not Available`, {
                description: message,
                duration: 8000,
            });
        }
        if (onError) {
            onError(message, statusCode);
        }
        return message;
    }

    if (statusCode === 400) {
        const message = errorMessage || 'Invalid request. Please check your input.';
        if (showToast) {
            toast.error('Invalid Request', {
                description: message,
                duration: 8000,
            });
        }
        if (onError) {
            onError(message, statusCode);
        }
        return message;
    }

    if (statusCode === 401 || statusCode === 403) {
        const message = 'Authentication required. Please login and connect your wallet.';
        if (showToast) {
            toast.error('Authentication Required', {
                description: message,
                duration: 8000,
            });
        }
        if (onError) {
            onError(message, statusCode);
        }
        return message;
    }

    const finalMessage = errorMessage || defaultMessage;
    if (showToast) {
        toast.error(`${context} Failed`, {
            description: finalMessage,
            duration: 8000,
        });
    }
    if (onError) {
        onError(finalMessage, statusCode);
    }
    return finalMessage;
}

