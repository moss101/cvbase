// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, toastBus, useToast } from '../Toast';
import { TranslationProvider } from '../../../services/translationService';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('toastBus', () => {
    beforeEach(() => toastBus.__reset());
    afterEach(() => toastBus.__reset());

    it('delivers to every subscriber', () => {
        const a = vi.fn();
        const b = vi.fn();
        toastBus.subscribe(a);
        toastBus.subscribe(b);
        toastBus.emit({ title: 'Hi' });
        expect(a).toHaveBeenCalledWith({ title: 'Hi' });
        expect(b).toHaveBeenCalledWith({ title: 'Hi' });
    });

    it('holds notices emitted before a subscriber exists and flushes them once', () => {
        toastBus.emit({ title: 'early 1' });
        toastBus.emit({ title: 'early 2' });
        const first = vi.fn();
        toastBus.subscribe(first);
        expect(first.mock.calls.map(([o]) => o.title)).toEqual(['early 1', 'early 2']);
        const second = vi.fn();
        toastBus.subscribe(second);
        expect(second).not.toHaveBeenCalled();
    });

    it('caps the pending queue and keeps the newest', () => {
        for (let i = 0; i < 30; i += 1) toastBus.emit({ title: `n${i}` });
        const listener = vi.fn();
        toastBus.subscribe(listener);
        expect(listener).toHaveBeenCalledTimes(20);
        expect(listener.mock.calls[0][0].title).toBe('n10');
        expect(listener.mock.calls[19][0].title).toBe('n29');
    });

    it('stops delivering after unsubscribe', () => {
        const listener = vi.fn();
        const unsubscribe = toastBus.subscribe(listener);
        unsubscribe();
        toastBus.emit({ title: 'gone' });
        expect(listener).not.toHaveBeenCalled();
    });
});

describe('ToastProvider', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        toastBus.__reset();
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
        toastBus.__reset();
    });

    const Trigger: React.FC = () => {
        const { toast } = useToast();
        return (
            <button
                type="button"
                onClick={() => toast({ title: 'Saved', description: 'All changes are in.', variant: 'success' })}
            >
                go
            </button>
        );
    };

    it('renders a toast from useToast and auto-dismisses it', () => {
        act(() => {
            root.render(
                <TranslationProvider>
                    <ToastProvider>
                        <Trigger />
                    </ToastProvider>
                </TranslationProvider>,
            );
        });
        act(() => {
            container.querySelector('button')!.click();
        });
        const status = container.querySelector('[role="status"]');
        expect(status?.textContent).toContain('Saved');
        expect(status?.textContent).toContain('All changes are in.');
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(container.querySelector('[role="status"]')).toBeNull();
    });

    it('renders errors as alerts and shows notices from the bus', () => {
        act(() => {
            root.render(
                <TranslationProvider>
                    <ToastProvider>
                        <div />
                    </ToastProvider>
                </TranslationProvider>,
            );
        });
        act(() => {
            toastBus.emit({ title: 'Sync failed', variant: 'error' });
        });
        const alert = container.querySelector('[role="alert"]');
        expect(alert?.getAttribute('aria-live')).toBe('assertive');
        expect(alert?.textContent).toContain('Sync failed');
    });

    it('runs the action and dismisses, and the close button dismisses', () => {
        const onClick = vi.fn();
        act(() => {
            root.render(
                <TranslationProvider>
                    <ToastProvider>
                        <div />
                    </ToastProvider>
                </TranslationProvider>,
            );
        });
        act(() => {
            toastBus.emit({ title: 'Deleted', action: { label: 'Undo', onClick } });
            toastBus.emit({ title: 'Second', durationMs: 0 });
        });
        const undo = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Undo')!;
        act(() => undo.click());
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(container.textContent).not.toContain('Deleted');
        expect(container.textContent).toContain('Second');
        act(() => {
            vi.advanceTimersByTime(60_000);
        });
        expect(container.textContent).toContain('Second');
        act(() => {
            container.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!.click();
        });
        expect(container.querySelector('[role="status"]')).toBeNull();
    });
});
