import React from 'react';

/**
 * Inline validation message for a form field.
 *
 * `id` must be `${fieldId}-error` so it pairs with the `aria-describedby`
 * produced by `describedBy()` in lib/validation.ts. `role="alert"` makes screen
 * readers announce the message when it appears.
 */
const FieldError: React.FC<{ id: string; message: string | null }> = ({ id, message }) => {
    if (!message) return null;
    return (
        <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 flex items-start gap-1 text-xs font-medium text-danger"
        >
            <span className="material-symbols-outlined text-[14px] leading-4" aria-hidden="true">
                error
            </span>
            {message}
        </p>
    );
};

export default FieldError;
