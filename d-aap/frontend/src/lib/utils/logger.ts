const isDevelopment = import.meta.env.DEV;
const isDebugMode = import.meta.env.VITE_DEBUG_MODE === 'true';

class Logger {
    private shouldLog(level: 'log' | 'error' | 'warn' | 'debug'): boolean {
        if (level === 'error') return true;
        if (level === 'warn') return isDevelopment || isDebugMode;
        return isDevelopment && isDebugMode;
    }

    log(...args: unknown[]): void {
        if (this.shouldLog('log')) {
            console.log('[LOG]', ...args);
        }
    }

    error(...args: unknown[]): void {
        if (this.shouldLog('error')) {
            console.error('[ERROR]', ...args);
        }
    }

    warn(...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            console.warn('[WARN]', ...args);
        }
    }

    debug(...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            console.debug('[DEBUG]', ...args);
        }
    }
}

export const logger = new Logger();
