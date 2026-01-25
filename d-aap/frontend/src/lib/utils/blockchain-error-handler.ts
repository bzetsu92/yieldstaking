import { logger } from './logger';

export interface AppError extends Error {
    code?: string | number;
    statusCode?: number;
    context?: Record<string, unknown>;
}

export class BlockchainErrorHandler {
    static isTransactionRejected(error: unknown): boolean {
        if (typeof error === 'object' && error !== null) {
            const err = error as { code?: number | string };
            return err.code === 4001 || err.code === 'ACTION_REJECTED';
        }
        return false;
    }

    static getBlockchainErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
        if (this.isTransactionRejected(error)) {
            return 'Transaction was rejected';
        }

        if (error instanceof Error) {
            let message = error.message || fallback;

            const lowerMessage = message.toLowerCase();
            if (
                lowerMessage.includes('not whitelisted') ||
                lowerMessage.includes('whitelisted') ||
                lowerMessage.includes('not whitelist') ||
                lowerMessage.includes('whitelist')
            ) {
                if (message.includes('not whitelisted') || message.includes('whitelist')) {
                    return message;
                }
                return 'Your wallet address is not whitelisted as an organizer. Please contact the platform administrator to whitelist your address.';
            }

            if (message.includes('execution reverted') || message.includes('revert')) {
                const revertMatch = message.match(/execution reverted[:\s]+(.+)/i);
                if (revertMatch) {
                    const revertReason = revertMatch[1].trim();
                    if (revertReason.includes('not minter')) {
                        return 'You do not have permission to mint. Only the organizer (contract deployer) can mint NFTs.';
                    }
                    if (revertReason.includes('insufficient fee')) {
                        return 'Insufficient fee. Please ensure you have enough funds to pay the minting fee.';
                    }
                    if (revertReason.includes('exceed max supply')) {
                        return 'Maximum supply exceeded for this token ID.';
                    }
                    if (revertReason.includes('zero address')) {
                        return 'Invalid address provided.';
                    }
                    if (revertReason.includes('zero amount')) {
                        return 'Amount must be greater than zero.';
                    }
                    return `Transaction failed: ${revertReason}`;
                }
            }

            if (message.includes('ContractFunctionExecutionError')) {
                const reasonMatch = message.match(/reason[:\s]+(.+?)(?:\n|$)/i);
                if (reasonMatch) {
                    const reason = reasonMatch[1].trim();
                    if (reason.includes('not minter')) {
                        return 'You do not have permission to mint. Only the organizer (contract deployer) can mint NFTs.';
                    }
                    return `Contract error: ${reason}`;
                }
            }

            return message;
        }

        if (error && typeof error === 'object' && 'message' in error) {
            const message = String((error as any).message);
            if (message) {
                return message;
            }
        }

        return fallback;
    }

    static handle(error: unknown, context?: string): AppError {
        const appError: AppError = error instanceof Error ? error : new Error(String(error));

        if (context) {
            appError.context = { ...appError.context, context };
        }

        logger.error('Blockchain error occurred:', {
            message: appError.message,
            stack: appError.stack,
            code: appError.code,
            context: appError.context,
        });

        return appError;
    }
}

