import { Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChangePassword } from '@/hooks/use-api-queries';
import { useValidation } from '@/hooks/use-validation';
import { validationRules } from '@/lib/validation';

interface ChangePasswordFormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const changePasswordMutation = useChangePassword();

    const {
        values,
        errors,
        touched,
        setValue,
        validateField,
        handleSubmit,
        reset,
    } = useValidation<ChangePasswordFormValues>({
        initialValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
        validationRules: {
            currentPassword: [
                validationRules.required('Current password'),
            ],
            newPassword: [
                validationRules.required('New password'),
                {
                    validate: (value: string) => value.length >= 8,
                    message: 'New password must be at least 8 characters long',
                },
            ],
            confirmPassword: [
                validationRules.required('Confirm password'),
            ],
        },
        onSubmit: async (formValues) => {
            // Additional validation: passwords match
            if (formValues.newPassword !== formValues.confirmPassword) {
                return;
            }

            // Additional validation: new password different from current
            if (formValues.currentPassword === formValues.newPassword) {
                return;
            }

            try {
                const result = await changePasswordMutation.mutateAsync({
                    currentPassword: formValues.currentPassword,
                    newPassword: formValues.newPassword,
                });
                
                reset();
                toast.success(result.message || 'Password changed successfully');
                onSuccess?.();
            } catch (_err) {
                const message =
                    _err instanceof Error
                        ? _err.message
                        : 'Failed to change password. Please try again.';
                toast.error(message);
            }
        },
    });

    // Custom validation for confirmPassword
    const validateConfirmPassword = () => {
        if (values.confirmPassword && values.newPassword !== values.confirmPassword) {
            return 'New passwords do not match';
        }
        return null;
    };

    // Custom validation for newPassword vs currentPassword
    const validateNewPassword = () => {
        if (values.newPassword && values.currentPassword === values.newPassword) {
            return 'New password must be different from current password';
        }
        return null;
    };

    const confirmPasswordError = errors.confirmPassword || validateConfirmPassword();
    const newPasswordError = errors.newPassword || validateNewPassword();

    return (
        <div className="space-y-6 pb-6">
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-xl font-semibold">Change Password</CardTitle>
                    </div>
                    <CardDescription className="mt-1.5">
                        Update your password to keep your account secure
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label 
                                htmlFor="currentPassword" 
                                className={`text-sm font-medium ${
                                    touched.currentPassword && errors.currentPassword ? 'text-destructive' : ''
                                }`}
                            >
                                Current Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={values.currentPassword}
                                    onChange={(e) => setValue('currentPassword', e.target.value)}
                                    onBlur={() => validateField('currentPassword')}
                                    placeholder="Enter your current password"
                                    className={`h-10 pr-10 ${
                                        touched.currentPassword && errors.currentPassword
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : ''
                                    }`}
                                    aria-invalid={
                                        touched.currentPassword && errors.currentPassword ? 'true' : 'false'
                                    }
                                    aria-describedby={
                                        touched.currentPassword && errors.currentPassword
                                            ? 'currentPassword-error'
                                            : undefined
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {touched.currentPassword && errors.currentPassword && (
                                <p id="currentPassword-error" className="text-xs text-destructive mt-1" role="alert">
                                    {errors.currentPassword}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label 
                                htmlFor="newPassword" 
                                className={`text-sm font-medium ${
                                    touched.newPassword && newPasswordError ? 'text-destructive' : ''
                                }`}
                            >
                                New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={values.newPassword}
                                    onChange={(e) => setValue('newPassword', e.target.value)}
                                    onBlur={() => validateField('newPassword')}
                                    placeholder="Enter your new password"
                                    className={`h-10 pr-10 ${
                                        touched.newPassword && newPasswordError
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : ''
                                    }`}
                                    aria-invalid={
                                        touched.newPassword && newPasswordError ? 'true' : 'false'
                                    }
                                    aria-describedby={
                                        touched.newPassword && newPasswordError
                                            ? 'newPassword-error'
                                            : undefined
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Must be at least 8 characters long
                            </p>
                            {touched.newPassword && newPasswordError && (
                                <p id="newPassword-error" className="text-xs text-destructive mt-1" role="alert">
                                    {newPasswordError}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label 
                                htmlFor="confirmPassword" 
                                className={`text-sm font-medium ${
                                    touched.confirmPassword && confirmPasswordError ? 'text-destructive' : ''
                                }`}
                            >
                                Confirm New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={values.confirmPassword}
                                    onChange={(e) => setValue('confirmPassword', e.target.value)}
                                    onBlur={() => {
                                        validateField('confirmPassword');
                                    }}
                                    placeholder="Confirm your new password"
                                    className={`h-10 pr-10 ${
                                        touched.confirmPassword && confirmPasswordError
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : ''
                                    }`}
                                    aria-invalid={
                                        touched.confirmPassword && confirmPasswordError ? 'true' : 'false'
                                    }
                                    aria-describedby={
                                        touched.confirmPassword && confirmPasswordError
                                            ? 'confirmPassword-error'
                                            : undefined
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {touched.confirmPassword && confirmPasswordError && (
                                <p id="confirmPassword-error" className="text-xs text-destructive mt-1" role="alert">
                                    {confirmPasswordError}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={reset}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={changePasswordMutation.isPending}>
                                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
