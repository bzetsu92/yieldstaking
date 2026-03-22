import { Navigate } from 'react-router-dom';
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
        const userRole = profile?.role?.toUpperCase() as UserRole | undefined;
        
        const hasAccess = userRole === 'ADMIN' || (requiredRole === 'USER' && userRole === 'USER');
        
        if (!hasAccess) {
            toast.error('Access Denied', {
                description: 'You do not have permission to access this page.',
            });
            return <Navigate to="/app/stake" replace />;
        }
    }

    return <>{children}</>;
}
