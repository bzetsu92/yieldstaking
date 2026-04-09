import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-api-queries';
import { useValidation } from '@/hooks/use-validation';
import { validationRules } from '@/lib/validation';

interface EmailPasswordFormProps {
    disabled: boolean;
    onSuccess?: () => void;
    callbackUrl: string;
    onLoadingChange?: (loading: boolean) => void;
}

interface LoginFormValues {
    email: string;
    password: string;
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

    const {
        values,
        errors,
        touched,
        setValue,
        validateField,
        handleSubmit,
    } = useValidation<LoginFormValues>({
        initialValues: {
            email: '',
            password: '',
        },
        validationRules: {
            email: [
                validationRules.required('Email'),
                validationRules.email(),
            ],
            password: [
                validationRules.required('Password'),
            ],
        },
        onSubmit: async (formValues) => {
            setIsLoading(true);
            onLoadingChange?.(true);

            try {
                const result = await loginMutation.mutateAsync({
                    email: formValues.email.trim().toLowerCase(),
                    password: formValues.password,
                });

                toast.success('Login successful!', {
                    description: `Welcome back, ${result.user?.name || formValues.email}!`,
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
    });

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="email" className={touched.email && errors.email ? 'text-destructive' : ''}>
                        Email
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="m@example.com"
                        value={values.email}
                        onChange={(e) => setValue('email', e.target.value)}
                        onBlur={() => validateField('email')}
                        disabled={disabled || isLoading}
                        className={touched.email && errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                        aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                        aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                    />
                    {touched.email && errors.email && (
                        <p id="email-error" className="text-xs text-destructive mt-1" role="alert">
                            {errors.email}
                        </p>
                    )}
                </div>
                <div className="grid gap-3">
                    <div className="flex items-center">
                        <Label htmlFor="password" className={touched.password && errors.password ? 'text-destructive' : ''}>
                            Password
                        </Label>
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
                        value={values.password}
                        onChange={(e) => setValue('password', e.target.value)}
                        onBlur={() => validateField('password')}
                        disabled={disabled || isLoading}
                        className={touched.password && errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
                        aria-invalid={touched.password && errors.password ? 'true' : 'false'}
                        aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
                    />
                    {touched.password && errors.password && (
                        <p id="password-error" className="text-xs text-destructive mt-1" role="alert">
                            {errors.password}
                        </p>
                    )}
                </div>
                <Button type="submit" className="w-full" disabled={disabled || isLoading}>
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
