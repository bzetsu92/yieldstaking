import { Suspense } from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';

import { ErrorBoundary } from './components/common/error-boundary';
import { PageLoader } from './components/common/page-loader';
import { Providers } from './components/common/providers';
import { ThemeProvider } from './components/layout/theme-provider';
import { Toaster } from './components/ui/sonner';
import { routes } from './routes';

function AppRoutes() {
    const element = useRoutes(routes);
    return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <Providers>
                    <BrowserRouter
                        future={{
                            v7_startTransition: true,
                            v7_relativeSplatPath: true,
                        }}
                    >
                        <AppRoutes />
                    </BrowserRouter>
                </Providers>
                <Toaster />
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
