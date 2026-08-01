/**
 * Shared field validation.
 *
 * Rules are small pure functions returning an error string or null, so they can
 * be unit-tested without React and composed per field. `useFieldValidation`
 * layers the touched/submitted bookkeeping on top so errors appear when the user
 * has finished with a field rather than while they are still typing it.
 */

export type Validator = (value: string) => string | null;

/** Trailing-dot, double-dot and missing-TLD cases the naive /\S+@\S+/ lets through. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const required =
    (label = 'This field'): Validator =>
    (value) =>
        value.trim().length === 0 ? `${label} is required.` : null;

export const email: Validator = (value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null; // `required` owns emptiness
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address, like you@example.com.';
    return null;
};

/**
 * Password strength. Deliberately states every unmet requirement at once rather
 * than revealing them one failed submit at a time.
 */
export const password: Validator = (value) => {
    if (value.length === 0) return null;
    const unmet: string[] = [];
    if (value.length < 8) unmet.push('at least 8 characters');
    if (!/[a-z]/.test(value)) unmet.push('a lowercase letter');
    if (!/[A-Z]/.test(value)) unmet.push('an uppercase letter');
    if (!/\d/.test(value)) unmet.push('a number');
    if (unmet.length === 0) return null;
    return `Password needs ${unmet.join(', ')}.`;
};

export const minLength =
    (min: number, label = 'This field'): Validator =>
    (value) =>
        value.trim().length > 0 && value.trim().length < min
            ? `${label} must be at least ${min} characters.`
            : null;

export const maxLength =
    (max: number, label = 'This field'): Validator =>
    (value) =>
        value.length > max ? `${label} must be ${max} characters or fewer.` : null;

/** Accepts international formats; rejects anything without enough digits. */
export const phone: Validator = (value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (!/^[+()\d\s.-]+$/.test(trimmed)) {
        return 'Phone numbers can only contain digits, spaces and + ( ) - .';
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7) return 'That phone number looks too short.';
    if (digits.length > 15) return 'That phone number looks too long.';
    return null;
};

/** Tolerates a missing scheme — users paste "linkedin.com/in/name" constantly. */
export const url: Validator = (value) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(candidate);
        if (!parsed.hostname.includes('.')) return 'Enter a full web address, like example.com/page.';
        return null;
    } catch {
        return 'Enter a valid web address.';
    }
};

/** Same as `url`, but also insists the host matches an expected domain. */
export const urlOnDomain =
    (domain: string, label: string): Validator =>
    (value) => {
        const base = url(value);
        if (base) return base;
        if (value.trim().length === 0) return null;
        const trimmed = value.trim();
        const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        try {
            const { hostname } = new URL(candidate);
            const normalised = hostname.replace(/^www\./i, '').toLowerCase();
            if (normalised !== domain && !normalised.endsWith(`.${domain}`)) {
                return `That does not look like a ${label} address.`;
            }
        } catch {
            return 'Enter a valid web address.';
        }
        return null;
    };

/** Runs validators in order and returns the first failure. */
export const compose =
    (...validators: Validator[]): Validator =>
    (value) => {
        for (const validate of validators) {
            const error = validate(value);
            if (error) return error;
        }
        return null;
    };

/**
 * Props that wire a field's error state to assistive technology. Spread onto the
 * input so screen readers announce the error and associate it with the control.
 */
export const describedBy = (id: string, hasError: boolean) => ({
    'aria-invalid': hasError || undefined,
    'aria-describedby': hasError ? `${id}-error` : undefined,
});
