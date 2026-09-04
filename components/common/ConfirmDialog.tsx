import React, { useEffect, useId, useRef, useState } from 'react';
import { useBackHandler } from '../NavigationProvider';
import { useTranslation } from '../../services/translationService';

/**
 * In-app replacement for window.confirm / window.prompt.
 *
 * - role="dialog" + aria-modal, labelled by its title and described by its copy
 * - focus moves into the dialog on open and returns to the trigger on close
 * - Escape, the backdrop, and the hardware back button all cancel
 * - Tab cycles inside the dialog while it is open
 *
 * `mode="prompt"` adds a single text field; `onConfirm` then receives its value.
 */

export interface ConfirmDialogProps {
    open: boolean;
    mode?: 'confirm' | 'prompt';
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Styles the confirm button as a destructive action. */
    destructive?: boolean;
    /** Prompt mode only. */
    defaultValue?: string;
    inputLabel?: string;
    placeholder?: string;
    /** Prompt mode only: block confirm when the trimmed value is empty. */
    required?: boolean;
    onConfirm: (value?: string) => void;
    onCancel: () => void;
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    mode = 'confirm',
    title,
    description,
    confirmLabel,
    cancelLabel,
    destructive = false,
    defaultValue = '',
    inputLabel,
    placeholder,
    required = false,
    onConfirm,
    onCancel,
}) => {
    const { t } = useTranslation();
    const resolvedConfirmLabel = confirmLabel ?? t('btn.confirm', 'Confirm');
    const resolvedCancelLabel = cancelLabel ?? t('btn.cancel', 'Cancel');
    const titleId = useId();
    const descriptionId = useId();
    const inputId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const triggerRef = useRef<Element | null>(null);
    const [value, setValue] = useState(defaultValue);

    // Fresh value each time the dialog opens.
    useEffect(() => {
        if (open) setValue(defaultValue);
    }, [open, defaultValue]);

    // Move focus in on open; hand it back to whatever opened us on close.
    useEffect(() => {
        if (!open) return;
        triggerRef.current = document.activeElement;
        const target = mode === 'prompt' ? inputRef.current : confirmRef.current;
        target?.focus();
        if (mode === 'prompt') inputRef.current?.select();
        return () => {
            const trigger = triggerRef.current;
            if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
        };
    }, [open, mode]);

    useBackHandler(open, onCancel);

    if (!open) return null;

    const canConfirm = mode !== 'prompt' || !required || value.trim().length > 0;

    const confirm = () => {
        if (!canConfirm) return;
        onConfirm(mode === 'prompt' ? value : undefined);
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
            return;
        }
        if (event.key === 'Tab' && panelRef.current) {
            const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (nodes.length === 0) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4"
            style={{
                paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            }}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                onKeyDown={onKeyDown}
                className="animate-fade-in w-full max-w-md rounded-2xl border border-border bg-white p-6 text-dark"
            >
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-dark">
                    {title}
                </h2>
                {description && (
                    <p id={descriptionId} className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
                        {description}
                    </p>
                )}

                {mode === 'prompt' && (
                    <form
                        className="mt-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            confirm();
                        }}
                    >
                        <label htmlFor={inputId} className="block text-[12px] font-semibold text-ink-soft">
                            {inputLabel ?? title}
                        </label>
                        <input
                            ref={inputRef}
                            id={inputId}
                            type="text"
                            value={value}
                            placeholder={placeholder}
                            onChange={(event) => setValue(event.target.value)}
                            aria-invalid={required && value.trim().length === 0 ? true : undefined}
                            className="tap-target mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[15px] text-dark outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
                        />
                    </form>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="tap-target rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {resolvedCancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={confirm}
                        disabled={!canConfirm}
                        className={`tap-target rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${
                            destructive
                                ? 'bg-danger hover:opacity-90 focus-visible:ring-danger/40'
                                : 'bg-primary hover:bg-primary-dark focus-visible:ring-primary/40'
                        }`}
                    >
                        {resolvedConfirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
