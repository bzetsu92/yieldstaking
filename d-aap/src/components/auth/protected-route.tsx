import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuthentication } from '@/hooks/use-authentication';
import { useUserInfo } from '@/hooks/use-user-info';

type ProtectedRouteProps = {
    children: React.ReactNode;
    requiredRole?: 'ORGANIZER' | 'ADMIN' | 'PLATFORM_ADMIN';
};

const ROLE_HIERARCHY: Record<string, string[]> = {
    ORGANIZER: ['ORGANIZER', 'ADMIN', 'PLATFORM_ADMIN'],
    ADMIN: ['ADMIN', 'PLATFORM_ADMIN'],
    PLATFORM_ADMIN: ['PLATFORM_ADMIN'],
} as const;

const TOKEN_KEYS = ['access_token', 'auth_session'] as const;

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuthentication();
    const userInfo = useUserInfo();

    const hasLocalAuth = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return TOKEN_KEYS.some((key) => !!localStorage.getItem(key));
    }, []);

    if (isLoading && !hasLocalAuth) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated && hasLocalAuth && isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Authenticating...</div>
            </div>
        );
    }

    if (!isAuthenticated && !hasLocalAuth) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole) {
        const userRole = userInfo.role?.toUpperCase();
        const allowed = ROLE_HIERARCHY[requiredRole] || [];
        
        if (!userRole || !allowed.includes(userRole)) {
            toast.error('Access Denied', {
                description: `This page requires ${requiredRole} role. Please upgrade your account.`,
            });
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
