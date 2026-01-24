import { useEffect } from 'react';
import { useFcm } from '@/hooks/use-fcm';
import { useAuthentication } from '@/hooks/use-authentication';

export function FcmProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthentication();
    const { registerToken, isRegistered } = useFcm({
        enabled: isAuthenticated,
        onNotification: () => {
            // Notification handled
        },
    });

    useEffect(() => {
        if (isAuthenticated && !isRegistered) {
            const timer = setTimeout(() => {
                registerToken();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, isRegistered, registerToken]);

    return <>{children}</>;
}

