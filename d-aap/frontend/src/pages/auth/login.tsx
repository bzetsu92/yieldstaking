import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { LoginForm } from '@/components/auth';
import { createAuth } from '@/lib/auth';

export default function LoginPage() {
    const { getSession } = createAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const session = getSession();
        if (session && Date.now() >= session.expiresAt) {
            localStorage.removeItem('auth_session');
        }
    }, [getSession]);

    useEffect(() => {
        const registeredEmail = location.state?.registeredEmail as string | undefined;

        if (!registeredEmail) {
            return;
        }

        toast.success('Registration completed', {
            description: `You can now sign in with ${registeredEmail}.`,
        });

        navigate(location.pathname + location.search, {
            replace: true,
            state: null,
        });
    }, [location.pathname, location.search, location.state, navigate]);

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <LoginForm />
            </div>
        </div>
    );
}
