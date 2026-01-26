import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';

import ProtectedRoute from '@/components/auth/protected-route';
import AppLayout from '@/components/layout/app-layout';
import { RoleBasedRedirect } from '@/components/auth/role-based-redirect';

// Public pages
const HomePage = lazy(() => import('@/pages/home'));

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/login'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/callback'));
const AuthErrorPage = lazy(() => import('@/pages/auth/error'));

// User pages (Aureus)
const YieldStakingPage = lazy(() => import('@/pages/aureus/yield-staking'));
const StakePage = lazy(() => import('@/pages/aureus/stake'));
const WithdrawalsPage = lazy(() => import('@/pages/aureus/withdrawals'));
const RewardHistoryPage = lazy(() => import('@/pages/aureus/reward-history'));

// Admin pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/index'));
const AdminUsersPage = lazy(() => import('@/pages/admin/users'));
const AdminContractsPage = lazy(() => import('@/pages/admin/contracts'));
const AdminPositionsPage = lazy(() => import('@/pages/admin/positions'));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/transactions'));
const AdminBlockchainPage = lazy(() => import('@/pages/admin/blockchain'));

// Error pages
const NotFoundPage = lazy(() => import('@/pages/not-found'));

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute>{children}</ProtectedRoute>
);

const AdminPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>
);

export const routes: RouteObject[] = [
    // Public home page (no layout)
    {
        path: '/',
        element: <HomePage />,
    },
    // Auth pages
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/auth/callback',
        element: <AuthCallbackPage />,
    },
    {
        path: '/auth/error',
        element: <AuthErrorPage />,
    },
    // App routes (with layout, requires login)
    {
        path: '/app',
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: (
                    <ProtectedRoute>
                        <RoleBasedRedirect />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'yield-staking',
                element: (
                    <ProtectedPage>
                        <YieldStakingPage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'stake',
                element: (
                    <ProtectedPage>
                        <StakePage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'withdrawals',
                element: (
                    <ProtectedPage>
                        <WithdrawalsPage />
                    </ProtectedPage>
                ),
            },
            {
                path: 'reward-history',
                element: (
                    <ProtectedPage>
                        <RewardHistoryPage />
                    </ProtectedPage>
                ),
            },
            // Admin routes
            {
                path: 'admin',
                element: (
                    <AdminPage>
                        <AdminDashboardPage />
                    </AdminPage>
                ),
            },
            {
                path: 'admin/users',
                element: (
                    <AdminPage>
                        <AdminUsersPage />
                    </AdminPage>
                ),
            },
            {
                path: 'admin/contracts',
                element: (
                    <AdminPage>
                        <AdminContractsPage />
                    </AdminPage>
                ),
            },
            {
                path: 'admin/positions',
                element: (
                    <AdminPage>
                        <AdminPositionsPage />
                    </AdminPage>
                ),
            },
            {
                path: 'admin/transactions',
                element: (
                    <AdminPage>
                        <AdminTransactionsPage />
                    </AdminPage>
                ),
            },
            {
                path: 'admin/blockchain',
                element: (
                    <AdminPage>
                        <AdminBlockchainPage />
                    </AdminPage>
                ),
            },
            // Fallback - 404 page
            {
                path: '*',
                element: <NotFoundPage />,
            },
        ],
    },
    // Catch-all for routes outside /app
    {
        path: '*',
        element: <NotFoundPage />,
    },
];
