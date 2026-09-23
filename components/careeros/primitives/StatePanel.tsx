import React from 'react';
import { CircleAlert, Inbox, LoaderCircle, Lock, Sparkles, TriangleAlert, WifiOff } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { Button } from './Button';

/**
 * The non-normal states every Career OS workflow has to cover (PRD REQ-30):
 * loading, empty/first use, recoverable error, offline, permission or plan
 * denied, AI unavailable and partial data. One component so each state looks
 * and announces the same on every screen — a page never invents its own
 * "something went wrong" box.
 *
 * Loading, empty and partial are `role="status"` (polite); error, offline,
 * denied and AI-unavailable are `role="alert"` (assertive) because the person
 * needs to act or stop waiting. `partial` renders its children — the data that
 * did load — beneath a notice, so preserved work is never hidden behind a
 * failure message.
 */
export type StatePanelKind = 'loading' | 'empty' | 'error' | 'offline' | 'denied' | 'ai-unavailable' | 'partial';

export interface StatePanelAction {
    label: string;
    onClick: () => void;
}

export interface StatePanelProps {
    kind: StatePanelKind;
    /** Overrides the default title for the kind. */
    title?: string;
    /** Overrides the default description for the kind. */
    description?: string;
    /** The one thing to do from here (for `error`, prefer `onRetry`). */
    action?: StatePanelAction;
    secondaryAction?: StatePanelAction;
    /** For `error` and `offline`: renders the Retry button. */
    onRetry?: () => void;
    /** Inline, single-row treatment for list rows and side panels. */
    compact?: boolean;
    /** For `partial`: the content that did load. */
    children?: React.ReactNode;
    className?: string;
}

const ALERT_KINDS: ReadonlySet<StatePanelKind> = new Set(['error', 'offline', 'denied', 'ai-unavailable']);

const ICON: Record<StatePanelKind, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>> = {
    loading: LoaderCircle,
    empty: Inbox,
    error: CircleAlert,
    offline: WifiOff,
    denied: Lock,
    'ai-unavailable': Sparkles,
    partial: TriangleAlert,
};

const ICON_TONE: Record<StatePanelKind, string> = {
    loading: 'text-content-muted',
    empty: 'text-content-muted',
    error: 'text-status-danger',
    offline: 'text-status-warning',
    denied: 'text-content-secondary',
    'ai-unavailable': 'text-status-info',
    partial: 'text-status-warning',
};

export const StatePanel: React.FC<StatePanelProps> = ({
    kind,
    title,
    description,
    action,
    secondaryAction,
    onRetry,
    compact = false,
    children,
    className = '',
}) => {
    const { t } = useTranslation();

    const defaults: Record<StatePanelKind, { title: string; description: string }> = {
        loading: {
            title: t('careeros.state.loading.title', 'Loading'),
            description: t('careeros.state.loading.description', 'Fetching the latest from your account.'),
        },
        empty: {
            title: t('careeros.state.empty.title', 'Nothing here yet'),
            description: t('careeros.state.empty.description', 'When there is something to show, it will appear here.'),
        },
        error: {
            title: t('careeros.state.error.title', 'This could not be loaded'),
            description: t('careeros.state.error.description', 'Your saved work is safe. Try again, or come back in a moment.'),
        },
        offline: {
            title: t('careeros.state.offline.title', 'You are offline'),
            description: t('careeros.state.offline.description', 'Saved work stays on this device. Cloud and AI features need a connection.'),
        },
        denied: {
            title: t('careeros.state.denied.title', 'Not available on your plan'),
            description: t('careeros.state.denied.description', 'This part of Career OS needs a different plan or permission.'),
        },
        'ai-unavailable': {
            title: t('careeros.state.aiUnavailable.title', 'AI assistance is unavailable'),
            description: t('careeros.state.aiUnavailable.description', 'Everything else still works. Your facts and documents are unchanged.'),
        },
        partial: {
            title: t('careeros.state.partial.title', 'Some of this could not be loaded'),
            description: t('careeros.state.partial.description', 'Showing what is available. The rest will fill in when it can be reached.'),
        },
    };

    const resolvedTitle = title ?? defaults[kind].title;
    const resolvedDescription = description ?? defaults[kind].description;
    const Icon = ICON[kind];
    const isAlert = ALERT_KINDS.has(kind);
    const retryAction: StatePanelAction | undefined =
        onRetry && (kind === 'error' || kind === 'offline' || kind === 'partial')
            ? { label: t('careeros.state.retry', 'Retry'), onClick: onRetry }
            : undefined;
    const primary = retryAction ?? action;
    const secondary = retryAction ? action ?? secondaryAction : secondaryAction;

    const iconNode = (
        <Icon
            size={compact ? 18 : 22}
            strokeWidth={1.75}
            className={`shrink-0 ${ICON_TONE[kind]} ${kind === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''}`}
            aria-hidden="true"
        />
    );

    const actions = (primary || secondary) && (
        <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'justify-center'}`}>
            {primary && (
                <Button variant={isAlert ? 'primary' : 'secondary'} size={compact ? 'sm' : 'md'} onClick={primary.onClick}>
                    {primary.label}
                </Button>
            )}
            {secondary && (
                <Button variant="quiet" size={compact ? 'sm' : 'md'} onClick={secondary.onClick}>
                    {secondary.label}
                </Button>
            )}
        </div>
    );

    const notice = compact ? (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex">{iconNode}</span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-content-primary">{resolvedTitle}</p>
                {resolvedDescription && <p className="mt-0.5 text-[13px] leading-relaxed text-content-secondary">{resolvedDescription}</p>}
                {actions && <div className="mt-2">{actions}</div>}
            </div>
        </div>
    ) : (
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-canvas">{iconNode}</span>
            <p className="mt-3 text-base font-semibold text-content-primary">{resolvedTitle}</p>
            {resolvedDescription && <p className="mt-1 text-sm leading-relaxed text-content-secondary">{resolvedDescription}</p>}
            {actions && <div className="mt-4">{actions}</div>}
        </div>
    );

    const frame = `rounded-2xl border ${isAlert ? 'border-status-danger/25' : 'border-border-default'} bg-surface-panel ${compact ? 'p-4' : 'px-6 py-8'} ${className}`;

    if (kind === 'partial') {
        return (
            <div className={className}>
                {/* Same shape as Notice: tone in the icon, the one action at the right. */}
                <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-panel px-5 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="mt-0.5 inline-flex">{iconNode}</span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-content-primary">{resolvedTitle}</p>
                            {resolvedDescription && <p className="mt-0.5 text-[13px] leading-relaxed text-content-secondary">{resolvedDescription}</p>}
                        </div>
                    </div>
                    {(primary || secondary) && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-2">
                            {primary && <Button variant="secondary" size="sm" onClick={primary.onClick}>{primary.label}</Button>}
                            {secondary && <Button variant="quiet" size="sm" onClick={secondary.onClick}>{secondary.label}</Button>}
                        </div>
                    )}
                </div>
                {children && <div className="mt-4">{children}</div>}
            </div>
        );
    }

    return (
        <div role={isAlert ? 'alert' : 'status'} aria-live={isAlert ? 'assertive' : 'polite'} aria-busy={kind === 'loading' || undefined} className={frame}>
            {notice}
        </div>
    );
};

export default StatePanel;
