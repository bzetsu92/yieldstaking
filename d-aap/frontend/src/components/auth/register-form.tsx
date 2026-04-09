import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin, useRegister } from '@/hooks/use-api-queries';
import { useValidation } from '@/hooks/use-validation';
import { validationRules } from '@/lib/validation';
import { cn } from '@/lib/utils';

import { LoginFormSidebar } from './login-form-sidebar';
import { TermsAndPrivacy } from './terms-and-privacy';

interface RegisterFormValues {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export function RegisterForm({ className, ...props }: React.ComponentProps<'div'>) {
    const navigate = useNavigate();
    const registerMutation = useRegister();
    const loginMutation = useLogin();

    const {
        values,
        errors,
        touched,
        setValue,
        validateField,
        handleSubmit,
    } = useValidation<RegisterFormValues>({
        initialValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
        validationRules: {
            name: [
                validationRules.required('Full name'),
                validationRules.name(),
            ],
            email: [
                validationRules.required('Email'),
                validationRules.email(),
            ],
            password: [
                validationRules.required('Password'),
                validationRules.minLength(6),
            ],
            confirmPassword: [
                validationRules.required('Confirm password'),
            ],
        },
        onSubmit: async (formValues) => {
            // Additional validation: passwords match
            if (formValues.password !== formValues.confirmPassword) {
                toast.error('Registration failed', {
                    description: 'Passwords do not match',
                });
                return;
            }

            try {
                await registerMutation.mutateAsync({
                    name: formValues.name.trim(),
                    email: formValues.email.trim().toLowerCase(),
                    password: formValues.password,
                });

                try {
                    await loginMutation.mutateAsync({
                        email: formValues.email.trim().toLowerCase(),
                        password: formValues.password,
                    });
                    toast.success('Welcome!', {
                        description:
                            'You are signed in. Link your wallet in profile to stake and view positions.',
                    });
                    navigate('/app', { replace: true });
                } catch {
                    toast.message('Account created', {
                        description: 'Please sign in with your email and password.',
                    });
                    navigate('/login', {
                        replace: true,
                        state: { registeredEmail: formValues.email },
                    });
                }
            } catch (error) {
                toast.error('Registration failed', {
                    description:
                        error instanceof Error
                            ? error.message
                            : 'Please review your information and try again',
                });
            }
        },
    });

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

                            <form onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-6">
                                    <div className="grid gap-3">
                                        <Label 
                                            htmlFor="name" 
                                            className={touched.name && errors.name ? 'text-destructive' : ''}
                                        >
                                            Full name
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Nguyen Van A"
                                            value={values.name}
                                            onChange={(e) => setValue('name', e.target.value)}
                                            onBlur={() => validateField('name')}
                                            disabled={registerMutation.isPending || loginMutation.isPending}
                                            className={touched.name && errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                                            aria-invalid={touched.name && errors.name ? 'true' : 'false'}
                                            aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                                        />
                                        {touched.name && errors.name && (
                                            <p id="name-error" className="text-xs text-destructive mt-1" role="alert">
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid gap-3">
                                        <Label 
                                            htmlFor="email" 
                                            className={touched.email && errors.email ? 'text-destructive' : ''}
                                        >
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
                                            disabled={registerMutation.isPending || loginMutation.isPending}
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
                                        <Label 
                                            htmlFor="password" 
                                            className={touched.password && errors.password ? 'text-destructive' : ''}
                                        >
                                            Password
                                        </Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={values.password}
                                            onChange={(e) => setValue('password', e.target.value)}
                                            onBlur={() => validateField('password')}
                                            disabled={registerMutation.isPending || loginMutation.isPending}
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
                                    <div className="grid gap-3">
                                        <Label 
                                            htmlFor="confirmPassword" 
                                            className={touched.confirmPassword && errors.confirmPassword ? 'text-destructive' : ''}
                                        >
                                            Confirm password
                                        </Label>
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            value={values.confirmPassword}
                                            onChange={(e) => setValue('confirmPassword', e.target.value)}
                                            onBlur={() => validateField('confirmPassword')}
                                            disabled={registerMutation.isPending || loginMutation.isPending}
                                            className={touched.confirmPassword && errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}
                                            aria-invalid={touched.confirmPassword && errors.confirmPassword ? 'true' : 'false'}
                                            aria-describedby={touched.confirmPassword && errors.confirmPassword ? 'confirmPassword-error' : undefined}
                                        />
                                        {touched.confirmPassword && errors.confirmPassword && (
                                            <p id="confirmPassword-error" className="text-xs text-destructive mt-1" role="alert">
                                                {errors.confirmPassword}
                                            </p>
                                        )}
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="w-full" 
                                        disabled={registerMutation.isPending || loginMutation.isPending}
                                    >
                                        {registerMutation.isPending || loginMutation.isPending ? (
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
