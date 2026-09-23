import React, { useId } from 'react';

/**
 * Labelled form controls for the execution screens: every control has a
 * visible label, a 44px target, a visible focus ring on the semantic token
 * and an optional hint/error line linked through aria-describedby. Kept tiny
 * on purpose — the existing forms/* helpers own validation; these only make
 * sure no Career OS input ships without a label.
 */
const CONTROL =
    'tap-target w-full rounded-lg border border-border-default bg-surface-panel px-3 py-2.5 text-sm text-content-primary ' +
    'placeholder:text-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:border-border-strong ' +
    'disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-surface-canvas';

interface FieldFrameProps {
    label: string;
    hint?: string;
    error?: string;
    /** Marks the control as optional in the label. */
    optional?: string;
    className?: string;
    children: (ids: { id: string; describedBy: string | undefined }) => React.ReactNode;
}

const FieldFrame: React.FC<FieldFrameProps> = ({ label, hint, error, optional, className = '', children }) => {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
    return (
        <div className={className}>
            <label htmlFor={id} className="block text-[13px] font-semibold text-content-primary">
                {label}
                {optional && <span className="ml-1 font-normal text-content-muted">({optional})</span>}
            </label>
            <div className="mt-1.5">{children({ id, describedBy })}</div>
            {hint && <p id={hintId} className="mt-1 text-xs text-content-secondary">{hint}</p>}
            {error && <p id={errorId} role="alert" className="mt-1 text-xs text-status-danger">{error}</p>}
        </div>
    );
};

type Common = { label: string; hint?: string; error?: string; optional?: string; className?: string };

export const TextInput: React.FC<Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>> = ({
    label, hint, error, optional, className, ...rest
}) => (
    <FieldFrame label={label} hint={hint} error={error} optional={optional} className={className}>
        {({ id, describedBy }) => <input id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={CONTROL} {...rest} />}
    </FieldFrame>
);

export const TextArea: React.FC<Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>> = ({
    label, hint, error, optional, className, rows = 4, ...rest
}) => (
    <FieldFrame label={label} hint={hint} error={error} optional={optional} className={className}>
        {({ id, describedBy }) => (
            <textarea id={id} rows={rows} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={`${CONTROL} resize-y leading-relaxed`} {...rest} />
        )}
    </FieldFrame>
);

export interface SelectOption { value: string; label: string; disabled?: boolean }

export const Select: React.FC<Common & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & { options: SelectOption[] }> = ({
    label, hint, error, optional, className, options, ...rest
}) => (
    <FieldFrame label={label} hint={hint} error={error} optional={optional} className={className}>
        {({ id, describedBy }) => (
            <select id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={CONTROL} {...rest}>
                {options.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
                ))}
            </select>
        )}
    </FieldFrame>
);

export const Checkbox: React.FC<{ label: string; checked: boolean; onChange: (next: boolean) => void; hint?: string; disabled?: boolean; className?: string }> = ({
    label, checked, onChange, hint, disabled, className = '',
}) => {
    const id = useId();
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-border-strong text-action-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <label htmlFor={id} className="tap-target flex min-w-0 flex-col justify-center text-sm text-content-primary">
                <span>{label}</span>
                {hint && <span className="text-xs text-content-secondary">{hint}</span>}
            </label>
        </div>
    );
};

/** A section heading inside a workspace pane (h2 — the space header owns h1). */
export const PaneHeading: React.FC<{ title: string; description?: string; action?: React.ReactNode; level?: 2 | 3; id?: string }> = ({ title, description, action, level = 2, id }) => {
    const Tag = level === 2 ? 'h2' : 'h3';
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            {/* The text keeps a readable minimum width; a wide action wraps beneath it instead of squeezing the words. */}
            <div className="min-w-0 flex-1 sm:basis-[14rem]">
                <Tag id={id} className={`font-semibold tracking-tight text-content-primary ${level === 2 ? 'text-lg' : 'text-sm'}`}>{title}</Tag>
                {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-content-secondary">{description}</p>}
            </div>
            {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
        </div>
    );
};

export const Panel: React.FC<{ children: React.ReactNode; className?: string; as?: 'section' | 'div'; 'aria-labelledby'?: string }> = ({ children, className = '', as = 'div', ...rest }) => {
    const Tag = as;
    return <Tag className={`rounded-2xl border border-border-default bg-surface-panel p-5 ${className}`} {...rest}>{children}</Tag>;
};
