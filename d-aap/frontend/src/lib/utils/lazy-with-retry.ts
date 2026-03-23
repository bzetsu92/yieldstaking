import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * A wrapper around React.lazy that handles chunk loading errors by forcing a page reload.
 * This is useful for single-page applications where a new deployment might have removed
 * old chunks that the client is still trying to fetch.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
    return lazy(async () => {
        try {
            return await componentImport();
        } catch (error) {
            const isChunkLoadFailed =
                error instanceof Error &&
                (error.message.includes('Failed to fetch dynamically imported module') ||
                    error.message.includes('Importing a module script failed') ||
                    error.message.includes('error loading dynamically imported module'));

            if (isChunkLoadFailed) {
                const hasReloaded = window.sessionStorage.getItem('chunk-load-failed-reloaded');

                if (!hasReloaded) {
                    window.sessionStorage.setItem('chunk-load-failed-reloaded', 'true');
                    window.location.reload();
                    return new Promise(() => {}) as any;
                }
            }

            throw error;
        }
    });
}
