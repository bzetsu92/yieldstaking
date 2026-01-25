import { toast } from 'sonner';
import { logger } from './logger';

export interface AppError extends Error {
    code?: string | number;
    statusCode?: number;
    context?: Record<string, unknown>;
}

export class ApiErrorHandler {
    static isNetworkError(error: unknown): boolean {
        if (error instanceof Error) {
            return (
                error.message.includes('network') ||
                error.message.includes('fetch') ||
                error.message.includes('timeout')
            );
        }
        return false;
    }

    static handle(error: unknown, context?: string): AppError {
        const appError: AppError = error instanceof Error ? error : new Error(String(error));

        if (context) {
            appError.context = { ...appError.context, context };
        }

        const isNetworkError = this.isNetworkError(error);
        const errorMessage =
            error && typeof error === 'object' && 'message' in error
                ? String((error as any).message)
                : '';
        const isCorsError = errorMessage.includes('CORS') || errorMessage.includes('Network Error');
        const is404Error =
            error &&
            typeof error === 'object' &&
            'response' in error &&
            (error as any).response?.status === 404;
        const isExpectedError = isNetworkError || isCorsError || is404Error;

        if (!isExpectedError) {
            logger.error('API error occurred:', {
                message: appError.message,
                stack: appError.stack,
                code: appError.code,
                context: appError.context,
            });
        }

        return appError;
    }

    static getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
        if (this.isNetworkError(error)) {
            return 'Network error. Please check your connection';
        }

        if (error instanceof Error) {
            return error.message || fallback;
        }

        if (error && typeof error === 'object' && 'message' in error) {
            const message = String((error as any).message);
            if (message) {
                return message;
            }
        }

        return fallback;
    }
}

export interface HandleApiErrorOptions {
    error: unknown;
    context: string;
    showToast?: boolean;
}

export function handleApiError(options: HandleApiErrorOptions): Error {
    const { error, context, showToast = true } = options;

    const appError = ApiErrorHandler.handle(error, context);
    const errorMessage = ApiErrorHandler.getErrorMessage(error, context);

    if (showToast && !ApiErrorHandler.isNetworkError(error)) {
        toast.error(errorMessage);
    }

    return appError;
}

