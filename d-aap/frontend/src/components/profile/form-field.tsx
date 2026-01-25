import { type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    children?: ReactNode;
}

export function FormField({
    id,
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    disabled = false,
    children,
}: FormFieldProps) {
    return (
        <div className="space-y-2.5">
            {label && (
                <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                </Label>
            )}
            {children || (
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="h-10"
                    disabled={disabled}
                />
            )}
        </div>
    );
}
