import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthErrorPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const error = searchParams.get('error');
    const message = searchParams.get('message') || 'Authentication failed';

    useEffect(() => {
        if (error || message) {
            toast.error(message, {
                description: error || 'Please try again',
            });
        }
    }, [error, message]);

    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <CardTitle>Authentication Error</CardTitle>
                    </div>
                    <CardDescription>{message}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {error && (
                        <p className="text-muted-foreground text-sm">
                            <strong>Error:</strong> {error}
                        </p>
                    )}
                    <Button onClick={() => navigate('/login')} className="w-full">
                        Back to Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

