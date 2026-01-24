import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';

export default function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            const accessToken = searchParams.get('access_token');
            const refreshToken = searchParams.get('refresh_token');
            const error = searchParams.get('error');
            const message = searchParams.get('message');

            if (error || message) {
                toast.error(message || 'Authentication failed', {
                    description: error || 'Please try again',
                });
                navigate('/login');
                return;
            }

            if (accessToken && refreshToken) {
                localStorage.setItem('access_token', accessToken);
                localStorage.setItem('refresh_token', refreshToken);

                toast.success('Successfully signed in with Google!', {
                    description: 'Welcome back!',
                });

                const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
                navigate(callbackUrl);
            } else {
                toast.error('Authentication failed', {
                    description: 'Missing authentication tokens',
                });
                navigate('/login');
            }
        };

        void handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-center">
                        Completing authentication...
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

