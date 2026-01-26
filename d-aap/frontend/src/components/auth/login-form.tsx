import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/auth';
import { createAuth } from '@/lib/auth';
import { useAuthentication } from '@/hooks/use-authentication';

import { EmailPasswordForm } from './email-password-form';
import { LoginFormHeader } from './login-form-header';
import { LoginFormSidebar } from './login-form-sidebar';
import { SignUpLink } from './sign-up-link';
import { SocialAuthButtons } from './social-auth-buttons';
import { TermsAndPrivacy } from './terms-and-privacy';

const isValidCallbackUrl = (url: string): boolean => {
    if (!url || url.startsWith('http://') || url.startsWith('https://')) {
        return false;
    }
    return url.startsWith('/');
};

export function LoginForm({
    className,
    onSuccess,
    ...props
}: React.ComponentProps<'div'> & {
    onSuccess?: () => void;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const rawCallbackUrl = searchParams.get('callbackUrl') || '/app';
    const callbackUrl = useMemo(() => {
        return isValidCallbackUrl(rawCallbackUrl) ? rawCallbackUrl : '/app';
    }, [rawCallbackUrl]);

    const { address, isConnected } = useAccount();
    const { isAuthenticated } = useAuthentication();
    const { getSession } = createAuth();

    useEffect(() => {
        const checkAndNavigate = () => {
            const accessToken = getAccessToken();
            const session = getSession();
            
            if ((accessToken || session) && isConnected && address) {
                onSuccess?.();
                navigate(callbackUrl, { replace: true });
            }
        };

        if (isAuthenticated && isConnected && address) {
            checkAndNavigate();
        }

        const handleAuthUpdate = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(checkAndNavigate, 100);
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('auth:session-updated', handleAuthUpdate as EventListener);
            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                document.removeEventListener('auth:session-updated', handleAuthUpdate as EventListener);
            };
        }
    }, [isAuthenticated, isConnected, address, callbackUrl, navigate, onSuccess, getSession]);

    const disabled = isLoading;

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col gap-6">
                            <LoginFormHeader
                                isLoading={isLoading}
                                isSigningMessage={false}
                            />
                            <EmailPasswordForm
                                disabled={disabled}
                                onSuccess={onSuccess}
                                callbackUrl={callbackUrl}
                                onLoadingChange={setIsLoading}
                            />
                            <SocialAuthButtons
                                isLoading={isLoading}
                                isSigningMessage={false}
                            />
                            <SignUpLink />
                        </div>
                    </div>
                    <LoginFormSidebar />
                </CardContent>
            </Card>
            <TermsAndPrivacy />
        </div>
    );
}
