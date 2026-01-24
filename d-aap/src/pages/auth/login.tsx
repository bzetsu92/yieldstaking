import { useEffect } from 'react';

import { LoginForm } from '@/components/auth';
import { createAuth } from '@/lib/auth';

export default function LoginPage() {
    const { getSession } = createAuth();

    useEffect(() => {
        const session = getSession();
        if (session && Date.now() >= session.expiresAt) {
            localStorage.removeItem('auth_session');
        }
    }, [getSession]);

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-3xl">
                <LoginForm />
            </div>
        </div>
    );
}
