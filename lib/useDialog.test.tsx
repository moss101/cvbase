// @vitest-environment jsdom
import React, { useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDialog } from './useDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface DemoProps {
    open: boolean;
    onClose: () => void;
    focusSecond?: boolean;
}

const Demo: React.FC<DemoProps> = ({ open, onClose, focusSecond }) => {
    const second = useRef<HTMLButtonElement>(null);
    const dialog = useDialog({ open, onClose, initialFocusRef: focusSecond ? second : undefined });
    if (!open) return null;
    return (
        <div data-testid="overlay" {...dialog.overlayProps}>
            <div data-testid="panel" {...dialog.panelProps}>
                <h2 id={dialog.titleId}>Title</h2>
                <button data-testid="first">First</button>
                <button data-testid="second" ref={second}>Second</button>
                <button data-testid="last">Last</button>
            </div>
        </div>
    );
};

const key = (target: Element, key: string, shiftKey = false) =>
    act(() => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    });

const byId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

describe('useDialog', () => {
    let root: Root;
    let container: HTMLDivElement;
    let trigger: HTMLButtonElement;
    const onClose = vi.fn();

    const render = (props: Partial<DemoProps>) =>
        act(() => root.render(<Demo open={false} onClose={onClose} {...props} />));

    beforeEach(() => {
        onClose.mockReset();
        trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        trigger.remove();
    });

    it('exposes dialog semantics wired to the title', async () => {
        await render({ open: true });
        const panel = byId('panel');
        expect(panel.getAttribute('role')).toBe('dialog');
        expect(panel.getAttribute('aria-modal')).toBe('true');
        expect(panel.getAttribute('aria-labelledby')).toBe(container.querySelector('h2')!.id);
    });

    it('moves focus in on open and back to the trigger on close', async () => {
        await render({ open: true });
        expect(document.activeElement).toBe(byId('first'));
        await render({ open: false });
        expect(document.activeElement).toBe(trigger);
    });

    it('honours initialFocusRef', async () => {
        await render({ open: true, focusSecond: true });
        expect(document.activeElement).toBe(byId('second'));
    });

    it('traps Tab and Shift+Tab inside the panel', async () => {
        await render({ open: true });
        byId('last').focus();
        await key(byId('last'), 'Tab');
        expect(document.activeElement).toBe(byId('first'));
        await key(byId('first'), 'Tab', true);
        expect(document.activeElement).toBe(byId('last'));
    });

    it('closes on Escape', async () => {
        await render({ open: true });
        await key(document.body, 'Escape');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on backdrop click but not on panel click', async () => {
        await render({ open: true });
        await act(() => { byId('panel').click(); });
        expect(onClose).not.toHaveBeenCalled();
        await act(() => { byId('overlay').click(); });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('locks body scroll while open and restores it after', async () => {
        document.body.style.overflow = 'auto';
        await render({ open: true });
        expect(document.body.style.overflow).toBe('hidden');
        await render({ open: false });
        expect(document.body.style.overflow).toBe('auto');
    });
});
