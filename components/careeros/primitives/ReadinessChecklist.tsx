import React, { useId } from 'react';
import { Ban, Circle, CircleCheck } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ReadinessItem } from '../../../services/careerOs/types';
import { Skeleton } from './Skeleton';

/**
 * What still stands between an application and "ready to submit". Items are
 * necessary or optional and each is complete, incomplete or blocked; the
 * denominator is the list itself, so there is no percentage and no ring
 * (DESIGN_SYSTEM.md). An item with a destination becomes a button that opens
 * the section where it can be finished.
 */
export interface ReadinessChecklistProps {
    items: ReadinessItem[];
    /** Opens the section an item points at. */
    onOpen?: (item: ReadinessItem) => void;
    loading?: boolean;
    compact?: boolean;
    className?: string;
}

const ICON: Record<ReadinessItem['state'], { Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>; tone: string }> = {
    complete: { Icon: CircleCheck, tone: 'text-status-success' },
    incomplete: { Icon: Circle, tone: 'text-content-muted' },
    blocked: { Icon: Ban, tone: 'text-status-danger' },
};

export const ReadinessChecklist: React.FC<ReadinessChecklistProps> = ({ items, onOpen, loading = false, compact = false, className = '' }) => {
    const { t } = useTranslation();
    const headingId = useId();

    if (loading) {
        return (
            <div className={`rounded-2xl border border-border-default bg-surface-panel p-5 ${className}`} aria-busy="true" aria-hidden="true">
                <Skeleton variant="title" width="40%" />
                <Skeleton variant="text" lines={4} className="mt-3" />
            </div>
        );
    }

    const necessary = items.filter((item) => item.kind === 'necessary');
    const optional = items.filter((item) => item.kind === 'optional');
    const necessaryDone = necessary.filter((item) => item.state === 'complete').length;
    const blocked = items.filter((item) => item.state === 'blocked').length;

    const stateLabel: Record<ReadinessItem['state'], string> = {
        complete: t('careeros.readiness.complete', 'Complete'),
        incomplete: t('careeros.readiness.incomplete', 'Not done'),
        blocked: t('careeros.readiness.blocked', 'Blocked'),
    };

    const renderItem = (item: ReadinessItem) => {
        const { Icon, tone } = ICON[item.state];
        const openable = Boolean(onOpen && item.destination && item.state !== 'complete');
        const body = (
            <>
                <Icon size={18} strokeWidth={2} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${item.state === 'complete' ? 'text-content-secondary' : 'text-content-primary'}`}>
                        <span className="sr-only">{stateLabel[item.state]}: </span>
                        {item.label}
                    </span>
                    {!compact && item.detail && <span className="mt-0.5 block text-[13px] text-content-secondary">{item.detail}</span>}
                </span>
            </>
        );
        return (
            <li key={item.id}>
                {openable ? (
                    <button
                        type="button"
                        onClick={() => onOpen?.(item)}
                        className="tap-target flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                        {body}
                    </button>
                ) : (
                    <div className="flex items-start gap-3 px-2 py-2">{body}</div>
                )}
            </li>
        );
    };

    return (
        <section aria-labelledby={headingId} className={`rounded-2xl border border-border-default bg-surface-panel ${compact ? 'p-4' : 'p-5'} ${className}`}>
            <div className="flex items-baseline justify-between gap-3">
                <h3 id={headingId} className="text-sm font-semibold text-content-primary">
                    {t('careeros.readiness.title', 'Readiness')}
                </h3>
                {items.length > 0 && (
                    <p className="text-xs text-content-muted">
                        {t('careeros.readiness.necessaryDone', '{done} of {total} necessary')
                            .replace('{done}', String(necessaryDone))
                            .replace('{total}', String(necessary.length))}
                        {blocked > 0 && (
                            <>
                                <span aria-hidden="true"> · </span>
                                <span className="text-status-danger">{t('careeros.readiness.blockedCount', '{count} blocked').replace('{count}', String(blocked))}</span>
                            </>
                        )}
                    </p>
                )}
            </div>

            {items.length === 0 ? (
                <p className="mt-3 text-sm text-content-secondary">{t('careeros.readiness.empty', 'Readiness has not been computed for this application yet.')}</p>
            ) : (
                <>
                    {necessary.length > 0 && (
                        <ul className="mt-2 -mx-2" aria-label={t('careeros.readiness.necessary', 'Necessary')}>
                            {necessary.map(renderItem)}
                        </ul>
                    )}
                    {optional.length > 0 && (
                        <>
                            <p className="mt-3 text-[12px] font-medium text-content-muted">{t('careeros.readiness.optional', 'Optional')}</p>
                            <ul className="mt-1 -mx-2" aria-label={t('careeros.readiness.optional', 'Optional')}>
                                {optional.map(renderItem)}
                            </ul>
                        </>
                    )}
                </>
            )}
        </section>
    );
};

export default ReadinessChecklist;
