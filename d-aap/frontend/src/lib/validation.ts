export interface ValidationError {
    field: string;
    message: string;
}

export interface ValidationRule {
    validate: (value: any) => boolean;
    message: string;
}

export const validationRules = {
    required: (fieldName = 'This field'): ValidationRule => ({
        validate: (value: any) => {
            if (typeof value === 'string') return value.trim().length > 0;
            return value !== null && value !== undefined;
        },
        message: `${fieldName} is required`,
    }),

    email: (): ValidationRule => ({
        validate: (value: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value);
        },
        message: 'Invalid email address',
    }),

    minLength: (min: number): ValidationRule => ({
        validate: (value: string) => value.length >= min,
        message: `Must be at least ${min} characters long`,
    }),

    maxLength: (max: number): ValidationRule => ({
        validate: (value: string) => value.length <= max,
        message: `Must be no more than ${max} characters long`,
    }),

    password: (): ValidationRule => ({
        validate: (value: string) => {
            const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/]).{8,}$/;
            return passwordRegex.test(value);
        },
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
    }),

    confirmPassword: (password: string): ValidationRule => ({
        validate: (value: string) => value === password,
        message: 'Passwords do not match',
    }),

    name: (): ValidationRule => ({
        validate: (value: string) => {
            const trimmed = value.trim();
            return trimmed.length > 0 && trimmed.length <= 200;
        },
        message: 'Name must be between 1 and 200 characters',
    }),

    url: (): ValidationRule => ({
        validate: (value: string) => {
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        },
        message: 'Must be a valid URL',
    }),

    walletAddress: (): ValidationRule => ({
        validate: (value: string) => {
            const walletRegex = /^0x[a-fA-F0-9]{40}$/;
            return walletRegex.test(value);
        },
        message: 'Invalid wallet address format',
    }),

    phone: (): ValidationRule => ({
        validate: (value: string) => {
            if (!value || value.trim() === '') return true; // Optional field
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
            return phoneRegex.test(value);
        },
        message: 'Invalid phone number format',
    }),
};

export function validateField(value: any, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
        if (!rule.validate(value)) {
            return rule.message;
        }
    }
    return null;
}

export function validateForm<T extends Record<string, any>>(
    values: T,
    rules: Record<keyof T, ValidationRule[]>
): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [field, fieldRules] of Object.entries(rules)) {
        const value = values[field as keyof T];
        const error = validateField(value, fieldRules);
        if (error) {
            errors.push({ field: field as string, message: error });
        }
    }

    return errors;
}

export interface UseFormState<T> {
    values: T;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    setValue: (field: keyof T, value: any) => void;
    setErrors: (errors: Record<string, string>) => void;
    setTouched: (field: keyof T, touched: boolean) => void;
    validateField: (field: keyof T, rules: ValidationRule[]) => boolean;
    validateAll: (rules: Record<keyof T, ValidationRule[]>) => boolean;
    reset: () => void;
    subscribe: (listener: () => void) => () => void;
}

export function createFormState<T extends Record<string, any>>(
    initialValues: T
): UseFormState<T> {
    let values = { ...initialValues };
    let errors: Record<string, string> = {};
    let touched: Record<string, boolean> = {};

    const listeners: Set<() => void> = new Set();

    const notify = () => {
        listeners.forEach(listener => listener());
    };

    return {
        get values() { return values; },
        get errors() { return errors; },
        get touched() { return touched; },

        setValue: (field: keyof T, value: any) => {
            values = { ...values, [field]: value };
            notify();
        },

        setErrors: (newErrors: Record<string, string>) => {
            errors = newErrors;
            notify();
        },

        setTouched: (field: keyof T, isTouched: boolean) => {
            touched = { ...touched, [field]: isTouched };
            notify();
        },

        validateField: (field: keyof T, rules: ValidationRule[]): boolean => {
            const value = values[field];
            const error = validateField(value, rules);
            if (error) {
                errors = { ...errors, [field]: error };
            } else {
                const { [field]: _, ...rest } = errors;
                errors = rest;
            }
            touched = { ...touched, [field]: true };
            notify();
            return !error;
        },

        validateAll: (rules: Record<keyof T, ValidationRule[]>): boolean => {
            const newErrors: Record<string, string> = {};
            let isValid = true;

            for (const [field, fieldRules] of Object.entries(rules)) {
                const value = values[field as keyof T];
                const error = validateField(value, fieldRules);
                if (error) {
                    newErrors[field] = error;
                    isValid = false;
                }
            }

            errors = newErrors;
            touched = Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {});
            notify();
            return isValid;
        },

        reset: () => {
            values = { ...initialValues };
            errors = {};
            touched = {};
            notify();
        },

        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
