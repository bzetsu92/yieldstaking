import { Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-api-queries';

interface EmailPasswordFormProps {
    disabled: boolean;
    onSuccess?: () => void;
    callbackUrl: string;
    onLoadingChange?: (loading: boolean) => void;
}

export function EmailPasswordForm({
    disabled,
    onSuccess,
    callbackUrl,
    onLoadingChange,
}: EmailPasswordFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const loginMutation = useLogin();

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setIsLoading(true);
            onLoadingChange?.(true);

            const formData = new FormData(e.currentTarget);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;

            try {
                const result = await loginMutation.mutateAsync({ email, password });

                toast.success('Login successful!', {
                    description: `Welcome back, ${result.user?.name || email}!`,
                });

                onSuccess?.();
                navigate(callbackUrl);
            } catch (error) {
                toast.error('Login failed', {
                    description:
                        error instanceof Error ? error.message : 'Please check your credentials',
                });
            } finally {
                setIsLoading(false);
                onLoadingChange?.(false);
            }
        },
        [loginMutation, onSuccess, navigate, callbackUrl, onLoadingChange],
    );

    return (
        <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        disabled={disabled}
                    />
                </div>
                <div className="grid gap-3">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                        <a
                            href="#"
                            className="ml-auto text-sm underline-offset-2 hover:underline"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/forgot-password');
                            }}
                        >
                            Forgot your password?
                        </a>
                    </div>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        disabled={disabled}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={disabled}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        'Login'
                    )}
                </Button>
            </div>
        </form>
    );
}
