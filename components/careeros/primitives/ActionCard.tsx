import React, { useId, useState } from 'react';
import { AlarmClockOff, ArrowRight, Ellipsis, X } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ActionStatus, PriorityBand } from '../../../services/careerOs/types';
import { Button } from './Button';
import { Pill, StatusChip, type Tone } from './Pill';
import { Skeleton } from './Skeleton';

/**
 * One recommended action (docs/career-os/CAREER_OS_CONTEXT_MODEL.md): a title,
 * the reason it is being suggested, where it came from, its status and one
 * dominant action that opens the destination. Dismiss and snooze are real
 * buttons behind a disclosure — not a menu widget — so they work with a
 * keyboard and a screen reader without any ARIA choreography.
 *
 * The status chip announces itself, so a card that moves from "Ready" to "In
 * progress" is read out rather than only recoloured.
 */
export interface ActionCardProps {
    title: string;
    reason: string;
    /** Where the suggestion came from, e.g. "From your goal" or "Coach". */
    source: string;
    status: ActionStatus;
    priority?: PriorityBand;
    /** Label of the dominant action, e.g. "Open application". */
    actionLabel: string;
    onAction: () => void;
    onDismiss?: () => void;
    onSnooze?: () => void;
    /** Short visible evidence labels, e.g. fact titles. */
    evidence?: string[];
    /** Estimated effort with its provenance; shown only when both are known. */
    effort?: { label: string; source: string };
    /** Renders the skeleton in the card's own layout. */
    loading?: boolean;
    /** Disables the dominant action with a visible reason. */
    disabledReason?: string;
    compact?: boolean;
    className?: string;
}

/** Translated label and tone for each action status. */
export const useActionStatus = (): ((status: ActionStatus) => { label: string; tone: Tone }) => {
    const { t } = useTranslation();
    return (status) => {
        switch (status) {
            case 'PROPOSED':
                return { label: t('careeros.action.status.proposed', 'Suggested'), tone: 'neutral' };
            case 'READY':
                return { label: t('careeros.action.status.ready', 'Ready'), tone: 'accent' };
            case 'IN_PROGRESS':
                return { label: t('careeros.action.status.inProgress', 'In progress'), tone: 'info' };
            case 'WAITING_FOR_USER':
                return { label: t('careeros.action.status.waiting', 'Needs your input'), tone: 'warning' };
            case 'FAILED':
                return { label: t('careeros.action.status.failed', 'Failed'), tone: 'danger' };
            case 'COMPLETED':
                return { label: t('careeros.action.status.completed', 'Done'), tone: 'success' };
            case 'DISMISSED':
                return { label: t('careeros.action.status.dismissed', 'Dismissed'), tone: 'neutral' };
            case 'EXPIRED':
            default:
                return { label: t('careeros.action.status.expired', 'Expired'), tone: 'neutral' };
        }
    };
};

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    reason,
    source,
    status,
    priority,
    actionLabel,
    onAction,
    onDismiss,
    onSnooze,
    evidence,
    effort,
    loading = false,
    disabledReason,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();
    const statusOf = useActionStatus();
    const [moreOpen, setMoreOpen] = useState(false);
    const moreId = useId();
    const titleId = useId();

    const frame = `rounded-2xl border border-border-default bg-surface-panel ${compact ? 'p-4' : 'p-5'} ${className}`;

    if (loading) {
        return (
            <div className={frame} aria-busy="true">
                <Skeleton variant="text" width="6rem" className="h-2.5" />
                <Skeleton variant="title" width="65%" className="mt-3" />
                <Skeleton variant="text" lines={2} className="mt-3" />
                <Skeleton variant="button" className="mt-4" />
            </div>
        );
    }

    const { label: statusLabel, tone } = statusOf(status);
    const hasMore = Boolean(onDismiss || onSnooze);
    const terminal = status === 'COMPLETED' || status === 'DISMISSED' || status === 'EXPIRED';

    const priorityLabel =
        priority === 'now'
            ? t('careeros.action.priority.now', 'Now')
            : priority === 'soon'
              ? t('careeros.action.priority.soon', 'Soon')
              : priority === 'later'
                ? t('careeros.action.priority.later', 'Later')
                : null;

    return (
        <article className={frame} aria-labelledby={titleId}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Pill mono>{source}</Pill>
                    {priorityLabel && <Pill tone={priority === 'now' ? 'accent' : 'neutral'}>{priorityLabel}</Pill>}
                    <StatusChip label={statusLabel} tone={tone} announce />
                </div>
                {hasMore && (
                    <button
                        type="button"
                        aria-expanded={moreOpen}
                        aria-controls={moreId}
                        aria-label={t('careeros.action.moreOptions', 'More options')}
                        onClick={() => setMoreOpen((open) => !open)}
                        className="tap-target -mr-2 -mt-2 inline-flex shrink-0 items-center justify-center rounded-lg text-content-secondary transition-colors hover:bg-surface-canvas hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                        <Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                )}
            </div>

            <h3 id={titleId} className={`mt-3 font-semibold text-content-primary ${compact ? 'text-[15px]' : 'text-base'}`}>
                {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-content-secondary">{reason}</p>

            {evidence && evidence.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t('careeros.action.evidence', 'Based on')}>
                    {evidence.map((item) => (
                        <li key={item}>
                            <Pill>{item}</Pill>
                        </li>
                    ))}
                </ul>
            )}

            <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'mt-3' : 'mt-4'}`}>
                <div className="min-w-0">
                    {effort && (
                        <p className="text-xs text-content-muted">
                            {t('careeros.action.effort', 'About {effort}').replace('{effort}', effort.label)}
                            <span className="sr-only">, </span>
                            <span aria-hidden="true"> · </span>
                            {effort.source}
                        </p>
                    )}
                    {disabledReason && <p className="text-xs text-status-warning">{disabledReason}</p>}
                </div>
                {!terminal && (
                    <Button
                        variant="primary"
                        size={compact ? 'sm' : 'md'}
                        onClick={onAction}
                        disabled={Boolean(disabledReason)}
                        trailingIcon={<ArrowRight size={16} strokeWidth={2} />}
                    >
                        {actionLabel}
                    </Button>
                )}
            </div>

            {hasMore && (
                <div id={moreId} hidden={!moreOpen} className="mt-3 flex flex-wrap gap-2 border-t border-border-default pt-3">
                    {onSnooze && (
                        <Button variant="quiet" size="sm" icon={<AlarmClockOff size={14} strokeWidth={2} />} onClick={onSnooze}>
                            {t('careeros.action.snooze', 'Snooze')}
                        </Button>
                    )}
                    {onDismiss && (
                        <Button variant="quiet" size="sm" icon={<X size={14} strokeWidth={2} />} onClick={onDismiss}>
                            {t('careeros.action.dismiss', 'Dismiss')}
                        </Button>
                    )}
                </div>
            )}
        </article>
    );
};

export default ActionCard;
