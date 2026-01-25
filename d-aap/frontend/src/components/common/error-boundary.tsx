import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
                    <div className="flex items-center gap-2 text-red-600 mb-4">
                        <AlertTriangle className="h-6 w-6" />
                        <h2 className="text-lg font-semibold">An error occurred</h2>
                    </div>
                    <p className="text-gray-600 text-center mb-6 max-w-md">
                        Sorry, an unexpected error occurred. Please try again or contact support if
                        the problem persists.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={this.resetError} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                        <Button onClick={() => window.location.reload()}>Reload Page</Button>
                    </div>
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mt-6 p-4 bg-gray-100 rounded-lg max-w-2xl">
                            <summary className="cursor-pointer font-medium mb-2">
                                Error Details (Development)
                            </summary>
                            <pre className="text-sm text-red-600 whitespace-pre-wrap">
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export function useErrorHandler() {
    const [error, setError] = React.useState<Error | null>(null);

    const handleError = React.useCallback((error: Error) => {
        logger.error('Error caught by useErrorHandler:', error);
        setError(error);
    }, []);

    const resetError = React.useCallback(() => {
        setError(null);
    }, []);

    return { error, handleError, resetError };
}
