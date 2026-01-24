import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';

import ProtectedRoute from '@/components/auth/protected-route';
import AppLayout from '@/components/layout/app-layout';

const LoginPage = lazy(() => import('@/pages/auth/login'));
const AuthCallbackPage = lazy(() => import('@/pages/auth/callback'));
const AuthErrorPage = lazy(() => import('@/pages/auth/error'));
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const YieldStakingPage = lazy(() => import('@/pages/yield-staking'));
const StakePage = lazy(() => import('@/pages/stake'));
const WithdrawalsPage = lazy(() => import('@/pages/withdrawals'));
const RewardHistoryPage = lazy(() => import('@/pages/reward-history'));

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
    <ProtectedRoute>{children}</ProtectedRoute>
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
            {
                path: '*',
                element: <Navigate to="/dashboard" replace />,
            },
        ],
    },
];
