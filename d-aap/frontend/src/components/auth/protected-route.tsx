import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuthentication } from '@/hooks/use-authentication';
import { useAuthProfile } from '@/hooks/use-api-queries';

type UserRole = 'USER' | 'ADMIN';

type ProtectedRouteProps = {
    children: React.ReactNode;
    requiredRole?: UserRole;
};

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuthentication();
    const { data: profile, isLoading: profileLoading } = useAuthProfile();
    const location = useLocation();
    const lastDeniedPathRef = useRef<string | null>(null);
    const userRole = profile?.role?.toUpperCase() as UserRole | undefined;
    const hasRoleAccess =
        !requiredRole ||
        userRole === 'ADMIN' ||
        (requiredRole === 'USER' && userRole === 'USER');

    useEffect(() => {
        if (!requiredRole || profileLoading || hasRoleAccess) {
            return;
        }

        if (lastDeniedPathRef.current === location.pathname) {
            return;
        }

        lastDeniedPathRef.current = location.pathname;
        toast.error('Access Denied', {
            description: 'You do not have permission to access this page.',
        });
    }, [hasRoleAccess, location.pathname, profileLoading, requiredRole]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && profileLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Checking permissions...</div>
            </div>
        );
    }

    if (requiredRole) {
        if (!hasRoleAccess) {
            return <Navigate to="/app/stake" replace />;
        }
    }

    return <>{children}</>;
}
