import axios, {
    type AxiosError,
    type AxiosInstance,
    type InternalAxiosRequestConfig,
    type AxiosResponse,
    type AxiosRequestConfig,
} from 'axios';

import { publicEnv } from '../config/env';
import { PRODUCTION_CONFIG } from '../constants/production';
import { ApiErrorHandler } from '../utils/api-error-handler';
import { logger } from '../utils/logger';

import type { ApiResponse } from '@/interfaces';

const MAX_RETRIES = PRODUCTION_CONFIG.maxRetries;
const RETRY_DELAY = 1000;

const shouldRetry = (error: AxiosError): boolean => {
    if (!error.response) {
        return true;
    }

    const status = error.response.status;
    return status >= 500 || status === 429;
};

const getRetryDelay = (attempt: number): number => {
    return RETRY_DELAY * Math.pow(2, attempt);
};

const createApiClient = (): AxiosInstance => {
    const baseURL = publicEnv.API_URL.endsWith('/api')
        ? publicEnv.API_URL
        : `${publicEnv.API_URL}/api`;
    
    const client = axios.create({
        baseURL,
        timeout: PRODUCTION_CONFIG.requestTimeout,
        headers: {
            'Content-Type': 'application/json',
        },
        withCredentials: true,
    });

    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token =
                typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            if (typeof window !== 'undefined') {
                config.headers['X-Request-ID'] =
                    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }

            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }

            logger.debug('API Request:', {
                method: config.method?.toUpperCase(),
                url: config.url,
                baseURL: config.baseURL,
            });
            return config;
        },
        (error: AxiosError) => {
            logger.error('API Request Error:', error);
            return Promise.reject(error);
        },
    );

    client.interceptors.response.use(
        (response: AxiosResponse) => {
            logger.debug('API Response:', {
                status: response.status,
                url: response.config.url,
            });
            return response;
        },
        async (error: AxiosError) => {
            const config = error.config as InternalAxiosRequestConfig & {
                _retry?: boolean;
                _retryCount?: number;
            };

            if (shouldRetry(error) && config && !config._retry) {
                config._retry = true;
                config._retryCount = (config._retryCount || 0) + 1;

                if (config._retryCount <= MAX_RETRIES) {
                    const delay = getRetryDelay(config._retryCount - 1);
                    logger.warn(
                        `Retrying request (${config._retryCount}/${MAX_RETRIES}) after ${delay}ms:`,
                        config.url,
                    );

                    await new Promise((resolve) => setTimeout(resolve, delay));
                    return client(config);
                }
            }

            const status = error.response?.status;
            const handledError = ApiErrorHandler.handle(error, 'API Request');

            if (status === 401) {
                logger.warn('Unauthorized request - redirecting to login');
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('auth_session');
                    if (!window.location.pathname.includes('/login')) {
                        window.location.replace('/login');
                    }
                }
            } else if (status === 403) {
                logger.warn('Forbidden request');
            } else if (status === 404) {
                logger.debug('Resource not found:', config.url);
            } else if (status && status >= 500) {
                logger.error('Server error:', handledError);
            } else if (!status && error.code === 'ECONNABORTED') {
                logger.error('Request timeout:', handledError);
            } else if (!status && error.message === 'Network Error') {
                logger.error('Network error - check connection:', handledError);
            }

            return Promise.reject(handledError);
        },
    );

    return client;
};

export const apiClient = createApiClient();

export const api = {
    get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
        apiClient.get<ApiResponse<T>>(url, config).then((res) => res.data.data),
    post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        apiClient.post<ApiResponse<T>>(url, data, config).then((res) => res.data.data),
    put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        apiClient.put<ApiResponse<T>>(url, data, config).then((res) => res.data.data),
    patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
        apiClient.patch<ApiResponse<T>>(url, data, config).then((res) => res.data.data),
    delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
        apiClient.delete<ApiResponse<T>>(url, config).then((res) => res.data.data),
};
