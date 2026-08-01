import { useCallback, useMemo, useState } from 'react';
import type { Validator } from './validation';

/**
 * Touched/submitted bookkeeping for a set of validated fields.
 *
 * Errors are computed from the live values but only *shown* once a field has
 * been blurred or the form has been submitted, so a user is never told their
 * email is invalid while they are still typing the first character.
 */

export interface FieldConfig<T> {
    /** Validator for each field. Omit a key to leave that field unvalidated. */
    [key: string]: Validator | undefined;
}

export interface FormValidation<T extends Record<string, unknown>> {
    /** Error for a field, or null when it is valid or not yet revealed. */
    errorFor: (field: keyof T & string) => string | null;
    /** True when every configured field passes. */
    isValid: boolean;
    /** Marks a field as touched — wire to onBlur. */
    onBlur: (field: keyof T & string) => void;
    /**
     * Reveals every error and reports whether the form may be submitted.
     * Call at the top of a submit handler.
     */
    submit: () => boolean;
    /** Clears touched state, e.g. after a successful save. */
    reset: () => void;
    /** Every currently failing field, regardless of touched state. */
    errors: Record<string, string>;
}

export const useFormValidation = <T extends Record<string, unknown>>(
    values: T,
    validators: Partial<Record<keyof T & string, Validator>>,
): FormValidation<T> => {
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [submitted, setSubmitted] = useState(false);

    const errors = useMemo(() => {
        const result: Record<string, string> = {};
        for (const [field, validate] of Object.entries(validators)) {
            if (!validate) continue;
            const raw = values[field as keyof T];
            // Non-string fields are coerced; validators all operate on strings.
            const error = validate(raw == null ? '' : String(raw));
            if (error) result[field] = error;
        }
        return result;
    }, [values, validators]);

    const errorFor = useCallback(
        (field: keyof T & string) =>
            touched[field] || submitted ? (errors[field] ?? null) : null,
        [errors, touched, submitted],
    );

    const onBlur = useCallback((field: keyof T & string) => {
        setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
    }, []);

    const submit = useCallback(() => {
        setSubmitted(true);
        return Object.keys(errors).length === 0;
    }, [errors]);

    const reset = useCallback(() => {
        setTouched({});
        setSubmitted(false);
    }, []);

    return {
        errorFor,
        isValid: Object.keys(errors).length === 0,
        onBlur,
        submit,
        reset,
        errors,
    };
};
