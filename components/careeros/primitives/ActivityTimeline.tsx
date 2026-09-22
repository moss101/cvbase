import React, { useId } from 'react';
import { useTranslation } from '../../../services/translationService';
import { Pill } from './Pill';
import { Skeleton } from './Skeleton';
import { StatePanel } from './StatePanel';

/**
 * A dated list of what happened to a record — submissions, outcomes, tool
 * runs, notes — each with the source it came from. Rendered as an ordered
 * list so the sequence is part of the semantics, with a "show earlier" button
 * for large histories rather than an endless scroll.
 */
export interface ActivityEntry {
    id: string;
    /** ISO timestamp. */
    at: string;
    title: string;
    detail?: string;
    /** Where the entry came from: "You", "Coach", "PRISM", "Import" … */
    source: string;
    /** Optional icon for the entry kind. */
    icon?: React.ReactNode;
}

export interface ActivityTimelineProps {
    entries: ActivityEntry[];
    loading?: boolean;
    /** Whether older entries exist beyond `entries`. */
    hasMore?: boolean;
    onLoadMore?: () => void;
    loadingMore?: boolean;
    /** Locale for dates; falls back to the browser's. */
    locale?: string;
    compact?: boolean;
    className?: string;
}

const formatDate = (iso: string, locale?: string): { visible: string; machine: string } => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return { visible: iso, machine: iso };
    try {
        return {
            visible: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date),
            machine: date.toISOString(),
        };
    } catch {
        return { visible: date.toDateString(), machine: date.toISOString() };
    }
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
    entries,
    loading = false,
    hasMore = false,
    onLoadMore,
    loadingMore = false,
    locale,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();
    const headingId = useId();

    if (loading) {
        return (
            <div className={className} aria-busy="true" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                    <div key={index} className="flex gap-3 py-3">
                        <Skeleton variant="circle" className="h-2.5 w-2.5 mt-1.5" />
                        <div className="flex-1">
                            <Skeleton variant="text" width="30%" className="h-2.5" />
                            <Skeleton variant="title" width="60%" className="mt-2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <StatePanel
                kind="empty"
                compact
                title={t('careeros.activity.emptyTitle', 'No activity yet')}
                description={t('careeros.activity.emptyDescription', 'Changes, submissions and outcomes will be recorded here.')}
                className={className}
            />
        );
    }

    return (
        <section aria-labelledby={headingId} className={className}>
            <h3 id={headingId} className="sr-only">
                {t('careeros.activity.title', 'Activity')}
            </h3>
            <ol className="relative border-l border-border-default pl-5">
                {entries.map((entry) => {
                    const { visible, machine } = formatDate(entry.at, locale);
                    return (
                        <li key={entry.id} className={`relative ${compact ? 'pb-3' : 'pb-5'} last:pb-0`}>
                            <span
                                className="absolute -left-[25px] top-1.5 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 border-surface-panel bg-content-muted"
                                aria-hidden="true"
                            />
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <time dateTime={machine} className="text-xs text-content-muted">
                                    {visible}
                                </time>
                                <Pill mono>{entry.source}</Pill>
                            </div>
                            <p className="mt-0.5 flex items-start gap-1.5 text-sm font-medium text-content-primary">
                                {entry.icon && <span className="mt-0.5 inline-flex shrink-0 text-content-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">{entry.icon}</span>}
                                <span>{entry.title}</span>
                            </p>
                            {!compact && entry.detail && <p className="mt-0.5 text-[13px] leading-relaxed text-content-secondary">{entry.detail}</p>}
                        </li>
                    );
                })}
            </ol>
            {hasMore && onLoadMore && (
                <div className="mt-3 pl-5">
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        aria-busy={loadingMore || undefined}
                        className="tap-target inline-flex items-center rounded-lg px-3 text-[13px] font-semibold text-content-secondary transition-colors hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-60"
                    >
                        {loadingMore ? t('careeros.activity.loadingMore', 'Loading earlier activity…') : t('careeros.activity.showEarlier', 'Show earlier activity')}
                    </button>
                </div>
            )}
        </section>
    );
};

export default ActivityTimeline;
