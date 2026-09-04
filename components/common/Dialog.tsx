import React from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../../lib/useDialog';
import { useTranslation } from '../../services/translationService';

/**
 * Thin styled shell over `useDialog`: backdrop, centred panel, a hairline
 * header with the title and an accessible close button, and an optional
 * footer. Every colour resolves through the theme variables, so it needs no
 * `dark:` variants; the overlay respects the safe areas and the entrance
 * animation is dropped under reduced motion.
 *
 * Callers own the layout inside: pass `panelClassName` for width/height
 * (`max-w-md`, `max-h-[85vh]` …) and put the body in `children`.
 */
export interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    /** Appended to the panel's base classes (width, height, padding overrides). */
    panelClassName?: string;
    headerClassName?: string;
    titleClassName?: string;
    bodyClassName?: string;
    /** Element to focus on open; defaults to the first focusable control. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    closeLabel?: string;
    /** z-index utility for the overlay; defaults to `z-50`. */
    zClassName?: string;
}

export const Dialog: React.FC<DialogProps> = ({
    open,
    onClose,
    title,
    children,
    footer,
    panelClassName = 'max-w-md',
    headerClassName = 'mb-4 pb-3',
    titleClassName = 'text-lg font-bold text-gray-800 flex items-center gap-2',
    bodyClassName = '',
    initialFocusRef,
    closeLabel,
    zClassName = 'z-50',
}) => {
    const { t } = useTranslation();
    const resolvedCloseLabel = closeLabel ?? t('btn.close', 'Close');
    const dialog = useDialog({ open, onClose, initialFocusRef });
    if (!open) return null;

    return (
        <div
            className={`fixed inset-0 ${zClassName} flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in motion-reduce:animate-none`}
            style={{
                paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
            }}
            {...dialog.overlayProps}
        >
            <div
                {...dialog.panelProps}
                className={`flex w-full flex-col rounded-2xl border border-border bg-white p-6 text-dark shadow-2xl outline-none ${panelClassName}`}
            >
                <div className={`flex shrink-0 items-center justify-between border-b border-gray-100 ${headerClassName}`}>
                    <h2 id={dialog.titleId} className={titleClassName}>{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={resolvedCloseLabel}
                        className="tap-target -mr-2 flex items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <X size={20} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                </div>
                <div className={`min-h-0 ${bodyClassName}`}>{children}</div>
                {footer}
            </div>
        </div>
    );
};

export default Dialog;
