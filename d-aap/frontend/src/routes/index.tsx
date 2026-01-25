import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

import ProtectedRoute from '@/components/auth/protected-route';
import AppLayout from '@/components/layout/app-layout';

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/login'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/callback'));
const AuthErrorPage = lazy(() => import('@/pages/auth/error'));

// User pages
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const YieldStakingPage = lazy(() => import('@/pages/yield-staking'));
const StakePage = lazy(() => import('@/pages/stake'));
const WithdrawalsPage = lazy(() => import('@/pages/withdrawals'));
const RewardHistoryPage = lazy(() => import('@/pages/reward-history'));

// Admin pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/index'));
const AdminUsersPage = lazy(() => import('@/pages/admin/users'));
const AdminContractsPage = lazy(() => import('@/pages/admin/contracts'));
const AdminPositionsPage = lazy(() => import('@/pages/admin/positions'));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/transactions'));
const AdminBlockchainPage = lazy(() => import('@/pages/admin/blockchain'));

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute>{children}</ProtectedRoute>
);

const AdminPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>
);

export const routes: RouteObject[] = [
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
    {
        path: '/',
        element: <AppLayout />,
        children: [
            {
                index: true,
                element: (
                    <ProtectedRoute>
                        <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                ),
            },
            // User routes
            {
                path: 'dashboard',
                element: (
                    <ProtectedPage>
                        <DashboardPage />
                    </ProtectedPage>
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
            // Fallback
            {
                path: '*',
                element: <Navigate to="/dashboard" replace />,
            },
        ],
    },
];
