import { useState, useCallback } from 'react';

import { type ValidationRule, type ValidationError, validateField as validateFieldValue, validateForm } from '@/lib/validation';

interface UseValidationOptions<T> {
    initialValues: T;
    validationRules: Record<keyof T, ValidationRule[]>;
    onSubmit?: (values: T) => void | Promise<void>;
}

interface UseValidationReturn<T> {
    values: T;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
    
    setValue: (field: keyof T, value: any) => void;
    setValues: (values: Partial<T>) => void;
    validateField: (field: keyof T) => boolean;
    validateAll: () => boolean;
    handleSubmit: (e?: React.FormEvent) => Promise<void>;
    reset: () => void;
    resetErrors: () => void;
}

export function useValidation<T extends Record<string, any>>({
    initialValues,
    validationRules,
    onSubmit,
}: UseValidationOptions<T>): UseValidationReturn<T> {
    const [values, setValuesState] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const setValue = useCallback((field: keyof T, value: any) => {
        setValuesState(prev => ({ ...prev, [field]: value }));
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field as string];
            return newErrors;
        });
    }, []);

    const setValues = useCallback((newValues: Partial<T>) => {
        setValuesState(prev => ({ ...prev, ...newValues }));
    }, []);

    const validateField = useCallback((field: keyof T): boolean => {
        const rules = validationRules[field];
        if (!rules) return true;

        const value = values[field];
        const error = validateFieldValue(value, rules);
        
        setTouched(prev => ({ ...prev, [field]: true }));
        
        if (error) {
            setErrors(prev => ({ 
                ...prev, 
                [field as string]: error,
            }));
            return false;
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field as string];
                return newErrors;
            });
            return true;
        }
    }, [values, validationRules]);

    const validateAll = useCallback((): boolean => {
        const validationErrors = validateForm(values, validationRules);
        
        const newErrors: Record<string, string> = {};
        validationErrors.forEach((err: ValidationError) => {
            newErrors[err.field] = err.message;
        });

        setErrors(newErrors);
        setTouched(
            Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
        );

        return validationErrors.length === 0;
    }, [values, validationRules]);

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        const isValid = validateAll();
        if (!isValid) return;

        if (!onSubmit) return;

        setIsSubmitting(true);
        try {
            await onSubmit(values);
        } finally {
            setIsSubmitting(false);
        }
    }, [validateAll, onSubmit, values]);

    const reset = useCallback(() => {
        setValuesState(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    const resetErrors = useCallback(() => {
        setErrors({});
    }, []);

    const isValid = Object.keys(errors).length === 0;

    return {
        values,
        errors,
        touched,
        isSubmitting,
        isValid,
        setValue,
        setValues,
        validateField,
        validateAll,
        handleSubmit,
        reset,
        resetErrors,
    };
}
