import { useCallback, useEffect, useId, useRef } from 'react';
import type React from 'react';

/**
 * Accessible modal behaviour with no dependency: focus trap, Escape, initial
 * focus + restore, body scroll lock and overlay-click-to-close.
 *
 * Usage:
 *   const dialog = useDialog({ open: isOpen, onClose });
 *   <div {...dialog.overlayProps}>            // backdrop — click closes
 *     <div {...dialog.panelProps}>           // role="dialog", trap lives here
 *       <h2 id={dialog.titleId}>Title</h2>    // wired to aria-labelledby
 *
 * Pass `label` instead of rendering a heading for dialogs with no visible
 * title (the panel then gets `aria-label`). Components that early-return on
 * `!open` must still call the hook first — the effects are keyed on `open`.
 */

export interface UseDialogOptions {
    open: boolean;
    onClose: () => void;
    /** Element to focus on open. Defaults to the first focusable, else the panel. */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    /** Accessible name when there is no heading to point `aria-labelledby` at. */
    label?: string;
}

export interface UseDialogResult {
    titleId: string;
    close: () => void;
    overlayProps: { onClick: (e: React.MouseEvent<HTMLElement>) => void };
    panelProps: {
        ref: React.RefCallback<HTMLElement>;
        role: 'dialog';
        'aria-modal': true;
        'aria-labelledby'?: string;
        'aria-label'?: string;
        tabIndex: -1;
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
    };
}

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

// `checkVisibility` handles display/visibility/content-visibility in every
// current browser; jsdom lacks it (and reports offsetParent === null for
// everything), so we fall back to "visible" there rather than to "hidden".
const isVisible = (el: HTMLElement): boolean => {
    if (el.hidden || el.closest('[hidden],[aria-hidden="true"]')) return false;
    const check = (el as HTMLElement & { checkVisibility?: () => boolean }).checkVisibility;
    return typeof check === 'function' ? check.call(el) : true;
};

const focusables = (root: HTMLElement): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);

// Nested dialogs: only the topmost one answers Escape; the body lock is refcounted.
const openStack: symbol[] = [];
let lockCount = 0;
let previousBodyOverflow = '';

export function useDialog({ open, onClose, initialFocusRef, label }: UseDialogOptions): UseDialogResult {
    const titleId = useId();
    const panelRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const initialFocusRefRef = useRef(initialFocusRef);
    initialFocusRefRef.current = initialFocusRef;

    const close = useCallback(() => onCloseRef.current(), []);

    useEffect(() => {
        if (!open) return;
        const token = Symbol('dialog');
        openStack.push(token);
        const restoreTo = document.activeElement as HTMLElement | null;

        if (lockCount++ === 0) {
            previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }

        const panel = panelRef.current;
        const target = initialFocusRefRef.current?.current ?? (panel ? focusables(panel)[0] : null) ?? panel;
        target?.focus({ preventScroll: true });

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            if (openStack[openStack.length - 1] !== token) return;
            e.preventDefault();
            onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            openStack.splice(openStack.indexOf(token), 1);
            if (--lockCount === 0) document.body.style.overflow = previousBodyOverflow;
            if (restoreTo && restoreTo.isConnected && typeof restoreTo.focus === 'function') {
                restoreTo.focus({ preventScroll: true });
            }
        };
    }, [open]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key !== 'Tab' || !panelRef.current) return;
        const items = focusables(panelRef.current);
        if (items.length === 0) {
            e.preventDefault();
            panelRef.current.focus();
            return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }, []);

    const onOverlayClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
        // Only a click on the backdrop itself closes; clicks inside the panel
        // bubble up here with a different target and are ignored.
        if (e.target === e.currentTarget) onCloseRef.current();
    }, []);

    const setPanel = useCallback<React.RefCallback<HTMLElement>>((el) => { panelRef.current = el; }, []);

    return {
        titleId,
        close,
        overlayProps: { onClick: onOverlayClick },
        panelProps: {
            ref: setPanel,
            role: 'dialog',
            'aria-modal': true,
            ...(label ? { 'aria-label': label } : { 'aria-labelledby': titleId }),
            tabIndex: -1,
            onKeyDown,
        },
    };
}

export default useDialog;
