import React from 'react';
import { LoaderCircle } from 'lucide-react';

/**
 * The one button the Career OS surfaces share. A screen has one dominant
 * action, so `primary` is the only saturated variant; everything else is quiet.
 * Every variant meets the 44px touch target, shows a visible focus ring on
 * the semantic focus token, and swaps its label for a spinner while `loading`
 * without changing width enough to shift the layout.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    children: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Icon placed before the label; it is decorative, the label carries meaning. */
    icon?: React.ReactNode;
    /** Icon placed after the label. */
    trailingIcon?: React.ReactNode;
    /** Shows a spinner and disables the control; the label stays for width and screen readers. */
    loading?: boolean;
    fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
    primary:
        'bg-action-primary text-white hover:bg-primary-dark active:bg-primary-dark',
    secondary:
        'border border-border-strong bg-surface-panel text-content-primary hover:bg-surface-canvas',
    quiet:
        'text-content-secondary hover:bg-surface-canvas hover:text-content-primary',
    danger:
        'border border-status-danger/40 bg-surface-panel text-status-danger hover:bg-status-danger/10',
};

const SIZE: Record<ButtonSize, string> = {
    sm: 'px-3 py-2 text-[13px]',
    md: 'px-4 py-2.5 text-sm',
};

export const BUTTON_BASE =
    'tap-target inline-flex items-center justify-center gap-2 rounded-lg font-semibold leading-none ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'secondary',
    size = 'md',
    icon,
    trailingIcon,
    loading = false,
    fullWidth = false,
    className = '',
    disabled,
    type = 'button',
    ...rest
}) => (
    <button
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={`${BUTTON_BASE} ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
    >
        {loading ? (
            <LoaderCircle size={16} strokeWidth={2} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
            icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>
        )}
        <span>{children}</span>
        {trailingIcon && !loading && <span className="inline-flex shrink-0" aria-hidden="true">{trailingIcon}</span>}
    </button>
);

export default Button;
