import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useTranslation } from '../../services/translationService';

/**
 * App-wide notices.
 *
 * Two entry points share one queue: `useToast()` for components, and
 * `toastBus.emit()` for plain modules (services, repos) that have no React
 * context. Toasts stack bottom-centre on phones and bottom-right on wider
 * screens, clear the safe area, and read as hairline cards on the themed
 * surface — no shadows, one accent.
 */

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastOptions {
    title: string;
    description?: string;
    variant?: ToastVariant;
    /** Auto-dismiss delay. Defaults to 5s (8s for errors). 0 keeps it until dismissed. */
    durationMs?: number;
    action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
    id: number;
    variant: ToastVariant;
    durationMs: number;
}

type ToastListener = (opts: ToastOptions) => void;

const MAX_VISIBLE = 4;
const MAX_QUEUED = 20;

const listeners = new Set<ToastListener>();
/** Emitted before any provider mounted — flushed to the first subscriber. */
const pending: ToastOptions[] = [];

/**
 * Non-hook entry point. Safe to call from anywhere, at any time; notices sent
 * before a provider exists are held (bounded) and shown once one mounts.
 */
export const toastBus = {
    emit(opts: ToastOptions): void {
        if (listeners.size === 0) {
            pending.push(opts);
            if (pending.length > MAX_QUEUED) pending.shift();
            return;
        }
        listeners.forEach((listener) => listener(opts));
    },
    subscribe(listener: ToastListener): () => void {
        listeners.add(listener);
        if (pending.length > 0) {
            const queued = pending.splice(0, pending.length);
            queued.forEach((opts) => listener(opts));
        }
        return () => {
            listeners.delete(listener);
        };
    },
    /** Test-only: drop queued notices and subscribers. */
    __reset(): void {
        listeners.clear();
        pending.length = 0;
    },
};

interface ToastContextValue {
    toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Returns `{ toast }`. Outside a provider it degrades to the bus so callers
 * never have to guard for context (tests, storybook-style renders).
 */
export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext);
    return context ?? { toast: toastBus.emit };
};

const defaultDuration = (variant: ToastVariant, hasAction: boolean): number => {
    if (variant === 'error') return 8000;
    return hasAction ? 7000 : 5000;
};

let nextId = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastRecord[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    const push = useCallback((opts: ToastOptions) => {
        const variant = opts.variant ?? 'info';
        const record: ToastRecord = {
            ...opts,
            id: nextId++,
            variant,
            durationMs: opts.durationMs ?? defaultDuration(variant, Boolean(opts.action)),
        };
        setToasts((current) => [...current, record].slice(-MAX_VISIBLE));
    }, []);

    useEffect(() => toastBus.subscribe(push), [push]);

    const value = useMemo<ToastContextValue>(() => ({ toast: push }), [push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
};

const ToastViewport: React.FC<{ toasts: ToastRecord[]; onDismiss: (id: number) => void }> = ({
    toasts,
    onDismiss,
}) => {
    if (toasts.length === 0) return null;
    return (
        <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
            style={{
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
                paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
                paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            }}
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
            ))}
        </div>
    );
};

const VARIANT_ICON: Record<ToastVariant, React.ReactNode> = {
    info: <Info size={18} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />,
    success: <CheckCircle2 size={18} strokeWidth={1.75} className="text-primary" aria-hidden="true" />,
    error: <AlertCircle size={18} strokeWidth={1.75} className="text-danger" aria-hidden="true" />,
};

const ToastItem: React.FC<{ toast: ToastRecord; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const { t } = useTranslation();
    const [paused, setPaused] = useState(false);
    const remainingRef = useRef(toast.durationMs);
    const startedRef = useRef<number>(0);

    // Auto-dismiss, paused while hovered or focused so the copy can be read.
    useEffect(() => {
        if (toast.durationMs <= 0 || paused) return;
        startedRef.current = Date.now();
        const timer = window.setTimeout(onDismiss, remainingRef.current);
        return () => {
            window.clearTimeout(timer);
            remainingRef.current = Math.max(
                1000,
                remainingRef.current - (Date.now() - startedRef.current),
            );
        };
    }, [paused, toast.durationMs, onDismiss]);

    const isError = toast.variant === 'error';

    return (
        <div
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 text-dark"
        >
            <span className="mt-0.5 shrink-0">{VARIANT_ICON[toast.variant]}</span>
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold leading-snug">{toast.title}</p>
                {toast.description && (
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{toast.description}</p>
                )}
                {toast.action && (
                    <button
                        type="button"
                        onClick={() => {
                            toast.action?.onClick();
                            onDismiss();
                        }}
                        className="mt-2 inline-flex min-h-[32px] items-center rounded-md px-1 text-[13px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>
            <button
                type="button"
                onClick={onDismiss}
                aria-label={t('toast.dismiss', 'Dismiss')}
                className="-my-2 -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
        </div>
    );
};
