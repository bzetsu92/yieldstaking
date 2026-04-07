import { toast } from 'sonner';
import { logger } from './logger';

export interface AppError extends Error {
    code?: string | number;
    statusCode?: number;
    context?: Record<string, unknown>;
    details?: unknown;
}

type ApiErrorResponse = {
    message?: string;
    details?: unknown;
    error?: {
        message?: string;
        details?: unknown;
        code?: string | number;
    };
    response?: {
        status?: number;
        data?: {
            message?: string;
            details?: unknown;
            error?: {
                message?: string;
                details?: unknown;
                code?: string | number;
            };
        };
    };
    code?: string | number;
};

export class ApiErrorHandler {
    static extractServerError(error: unknown): { message?: string; details?: unknown; code?: string | number } {
        if (!error || typeof error !== 'object') {
            return {};
        }

        const apiError = error as ApiErrorResponse;
        const responseData = apiError.response?.data;
        const serverCode = responseData?.error?.code ?? apiError.error?.code ?? apiError.code;
        const details = responseData?.error?.details ?? responseData?.details ?? apiError.error?.details ?? apiError.details;
        const baseMessage =
            responseData?.error?.message ??
            responseData?.message ??
            apiError.error?.message ??
            apiError.message;

        if (typeof baseMessage !== 'string' || !baseMessage.trim()) {
            return { details, code: serverCode };
        }

        if (baseMessage === 'Validation failed' && details && typeof details === 'object') {
            const detailEntries = Object.entries(details as Record<string, unknown>)
                .map(([field, detail]) => `${field}: ${String(detail)}`)
                .filter(Boolean);

            if (detailEntries.length > 0) {
                return {
                    message: `${baseMessage}: ${detailEntries.join('; ')}`,
                    details,
                    code: serverCode,
                };
            }
        }

        return {
            message: baseMessage,
            details,
            code: serverCode,
        };
    }

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
        const serverError = this.extractServerError(error);

        if (serverError.message) {
            appError.message = serverError.message;
        }

        if (serverError.details !== undefined) {
            appError.details = serverError.details;
        }

        if (error && typeof error === 'object') {
            const errorWithHttpContext = error as {
                code?: string | number;
                response?: {
                    status?: number;
                };
            };

            if (appError.code === undefined) {
                appError.code = serverError.code ?? errorWithHttpContext.code;
            }

            if (
                appError.statusCode === undefined &&
                typeof errorWithHttpContext.response?.status === 'number'
            ) {
                appError.statusCode = errorWithHttpContext.response.status;
            }
        }

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

        const serverError = this.extractServerError(error);
        if (serverError.message) {
            return serverError.message;
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
    const errorMessage = ApiErrorHandler.getErrorMessage(appError, context);

    if (showToast && !ApiErrorHandler.isNetworkError(error)) {
        toast.error(errorMessage);
    }

    return appError;
}
