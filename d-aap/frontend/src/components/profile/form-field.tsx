import { type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    error?: string;
    touched?: boolean;
    required?: boolean;
    children?: ReactNode;
}

export function FormField({
    id,
    label,
    value,
    onChange,
    onBlur,
    placeholder,
    type = 'text',
    disabled = false,
    error,
    touched = false,
    required = false,
    children,
}: FormFieldProps) {
    const showError = touched && error;

    return (
        <div className="space-y-2.5">
            {label && (
                <Label 
                    htmlFor={id} 
                    className={`text-sm font-medium ${showError ? 'text-destructive' : ''}`}
                >
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </Label>
            )}
            {children || (
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className={`h-10 ${showError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    disabled={disabled}
                    aria-invalid={showError ? 'true' : 'false'}
                    aria-describedby={showError ? `${id}-error` : undefined}
                />
            )}
            {showError && (
                <p id={`${id}-error`} className="text-xs text-destructive mt-1" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
