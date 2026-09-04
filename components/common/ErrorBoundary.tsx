import React from 'react';
import { captureException } from '../../lib/monitoring';
import { useTranslation } from '../../services/translationService';

/**
 * Catches render errors below it and shows a calm fallback instead of a
 * blank page. Reports every catch to monitoring with the boundary's scope.
 *
 * Give the boundary a `key` tied to the route or tab so a fresh screen
 * clears the error automatically; `resetKeys` does the same without a remount.
 */

export interface ErrorFallbackProps {
    error: Error;
    /** Clears the error and re-renders the children. */
    reset: () => void;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /** Named in monitoring context, e.g. "route:dashboard". */
    scope?: string;
    fallback?: React.ReactNode | ((props: ErrorFallbackProps) => React.ReactNode);
    /** When any of these change, the boundary resets. */
    resetKeys?: ReadonlyArray<unknown>;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    error: Error | null;
}

const toError = (value: unknown): Error =>
    value instanceof Error ? value : new Error(typeof value === 'string' ? value : 'Unknown error');

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { error: toError(error) };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo): void {
        captureException(error, {
            scope: this.props.scope ?? 'unscoped',
            componentStack: info.componentStack ?? undefined,
        });
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps): void {
        if (!this.state.error || !this.props.resetKeys) return;
        const prev = prevProps.resetKeys ?? [];
        const next = this.props.resetKeys;
        const changed =
            prev.length !== next.length || next.some((value, index) => !Object.is(value, prev[index]));
        if (changed) this.reset();
    }

    reset = (): void => {
        this.props.onReset?.();
        this.setState({ error: null });
    };

    render(): React.ReactNode {
        const { error } = this.state;
        if (!error) return this.props.children;

        const { fallback } = this.props;
        if (typeof fallback === 'function') return fallback({ error, reset: this.reset });
        if (fallback !== undefined) return fallback;
        return <ScreenErrorFallback error={error} reset={this.reset} />;
    }
}

export interface ScreenErrorFallbackProps extends ErrorFallbackProps {
    /** Quiet escape route shown beside "Try again", e.g. back to the dashboard. */
    secondaryAction?: { label: string; onClick: () => void };
    /** Overrides the default hint about where to go instead. */
    hint?: string;
}

/** Default fallback for a screen or panel: the shell around it survives. */
export const ScreenErrorFallback: React.FC<ScreenErrorFallbackProps> = ({ reset, secondaryAction, hint }) => {
    const { t } = useTranslation();
    return (
    <div role="alert" className="mx-auto my-12 w-full max-w-md px-6 text-center">
        <p className="font-label text-[10px] uppercase tracking-[0.14em] text-ink-faint">{t('errorBoundary.somethingWrong', 'Something went wrong')}</p>
        <h2 className="mt-3 text-xl font-semibold text-dark">{t('errorBoundary.screenError', 'This screen hit an error.')}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {t('errorBoundary.workSaved', 'Your work is saved as of the last change.')}{' '}
            {hint ?? t('errorBoundary.defaultHint', 'Try again, or pick another screen from the menu.')}
        </p>
        <div className="mt-6 flex flex-col-reverse items-center justify-center gap-2 sm:flex-row">
            {secondaryAction && (
                <button
                    type="button"
                    onClick={secondaryAction.onClick}
                    className="tap-target inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    {secondaryAction.label}
                </button>
            )}
            <button
                type="button"
                onClick={reset}
                className="tap-target inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
                {t('errorBoundary.tryAgain', 'Try again')}
            </button>
        </div>
    </div>
    );
};

const LOCAL_KEY_PREFIX = 'cvbase-';

/** Removes every cvbase-* key. Returns how many were cleared. */
export function clearLocalAppData(): number {
    let cleared = 0;
    try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_KEY_PREFIX)) keys.push(key);
        }
        keys.forEach((key) => {
            localStorage.removeItem(key);
            cleared += 1;
        });
    } catch {
        /* storage unavailable — nothing to clear */
    }
    return cleared;
}

/**
 * Fallback for the root boundary, rendered with no providers underneath it.
 * Offers a reload, and an escape hatch for the case where something persisted
 * on this device is what keeps crashing the app. The reset is a two-step
 * confirm kept inline so it works even when nothing else does.
 */
export const RootErrorFallback: React.FC<ErrorFallbackProps> = () => {
    const { t } = useTranslation();
    const [confirming, setConfirming] = React.useState(false);

    const reload = () => window.location.reload();
    const resetLocalData = () => {
        clearLocalAppData();
        reload();
    };

    return (
        <div className="grid min-h-screen place-items-center bg-light px-6 py-12 font-sans text-dark">
            <div role="alert" className="w-full max-w-md rounded-2xl border border-border bg-white p-7">
                <p className="font-label text-[10px] uppercase tracking-[0.14em] text-ink-faint">CVBase</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-dark">{t('errorBoundary.rootTitle', 'Something went wrong.')}</h1>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                    {t('errorBoundary.rootDesc', 'The app hit an error it could not recover from. Reloading usually fixes it. Anything saved to your account is safe.')}
                </p>

                {confirming ? (
                    <div className="mt-6 rounded-xl border border-border bg-light p-4">
                        <p className="text-sm font-semibold text-dark">{t('errorBoundary.resetConfirmTitle', 'Reset local data on this device?')}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                            {t('errorBoundary.resetConfirmDesc', 'This clears unsaved drafts and settings stored in this browser, then reloads. Resumes saved to your account are not affected.')}
                        </p>
                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setConfirming(false)}
                                className="tap-target rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-dark"
                            >
                                {t('errorBoundary.keepMyData', 'Keep my data')}
                            </button>
                            <button
                                type="button"
                                onClick={resetLocalData}
                                className="tap-target rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                {t('errorBoundary.resetAndReload', 'Reset and reload')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setConfirming(true)}
                            className="tap-target rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-dark"
                        >
                            {t('errorBoundary.resetLocalData', 'Reset local data')}
                        </button>
                        <button
                            type="button"
                            onClick={reload}
                            className="tap-target rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                        >
                            {t('errorBoundary.reload', 'Reload')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ErrorBoundary;
