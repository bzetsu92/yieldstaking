import { Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/use-api-queries';
import { cn } from '@/lib/utils';

import { LoginFormSidebar } from './login-form-sidebar';
import { TermsAndPrivacy } from './terms-and-privacy';

export function RegisterForm({ className, ...props }: React.ComponentProps<'div'>) {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const registerMutation = useRegister();

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setIsLoading(true);

            const formData = new FormData(e.currentTarget);
            const name = String(formData.get('name') || '').trim();
            const email = String(formData.get('email') || '').trim();
            const password = String(formData.get('password') || '');
            const confirmPassword = String(formData.get('confirmPassword') || '');

            if (password !== confirmPassword) {
                toast.error('Registration failed', {
                    description: 'Passwords do not match',
                });
                setIsLoading(false);
                return;
            }

            try {
                const result = await registerMutation.mutateAsync({ name, email, password });

                toast.success('Registration successful', {
                    description: result.message || 'Your account has been created successfully.',
                });

                navigate('/login', {
                    replace: true,
                    state: { registeredEmail: email },
                });
            } catch (error) {
                toast.error('Registration failed', {
                    description:
                        error instanceof Error
                            ? error.message
                            : 'Please review your information and try again',
                });
            } finally {
                setIsLoading(false);
            }
        },
        [navigate, registerMutation],
    );

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col items-center text-center">
                                <h1 className="text-2xl font-bold">Create your account</h1>
                                <p className="text-muted-foreground text-balance">
                                    Register with your email to start using AUR.
                                </p>
                            </div>

                            <form onSubmit={(e) => void handleSubmit(e)}>
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-3">
                                        <Label htmlFor="name">Full name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Nguyen Van A"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="m@example.com"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            minLength={6}
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="grid gap-3">
                                        <Label htmlFor="confirmPassword">Confirm password</Label>
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            minLength={6}
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating account...
                                            </>
                                        ) : (
                                            'Sign up'
                                        )}
                                    </Button>
                                </div>
                            </form>

                            <div className="text-center text-sm">
                                Already have an account?{' '}
                                <Link to="/login" className="underline underline-offset-4">
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                    <LoginFormSidebar />
                </CardContent>
            </Card>
            <TermsAndPrivacy />
        </div>
    );
}
