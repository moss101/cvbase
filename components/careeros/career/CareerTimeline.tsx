import React, { useId, useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import type { CareerFact } from '../../../services/careerOs/types';
import { Button, EvidenceBadge, Skeleton, StatePanel } from '../primitives';
import { byRecency, periodLabel } from './factFormat';

/**
 * Professional progression as a dated list of experience facts, newest
 * first, each with its evidence state and the achievements recorded under
 * it. It is a timeline of claims, not a CV layout: no styling implies a
 * fact is more trustworthy than its badge says. Long careers page in steps.
 */
export interface CareerTimelineProps {
    facts: CareerFact[];
    loading?: boolean;
    onOpen?: (fact: CareerFact) => void;
    pageSize?: number;
    compact?: boolean;
    className?: string;
}

export const CareerTimeline: React.FC<CareerTimelineProps> = ({ facts, loading = false, onOpen, pageSize = 8, compact = false, className = '' }) => {
    const { t } = useTranslation();
    const headingId = useId();
    const [shown, setShown] = useState(pageSize);

    const experience = useMemo(() => facts.filter((f) => f.status === 'active' && f.kind === 'experience').sort(byRecency), [facts]);
    const achievementsByParent = useMemo(() => {
        const map = new Map<string, CareerFact[]>();
        for (const f of facts) {
            if (f.status !== 'active' || f.kind !== 'achievement' || !f.parentFactId) continue;
            map.set(f.parentFactId, [...(map.get(f.parentFactId) ?? []), f]);
        }
        return map;
    }, [facts]);

    if (loading) {
        return (
            <div className={className} aria-busy="true" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                    <div key={index} className="flex gap-3 py-3">
                        <Skeleton variant="circle" className="mt-1.5 h-2.5 w-2.5" />
                        <div className="flex-1">
                            <Skeleton variant="text" width="30%" className="h-2.5" />
                            <Skeleton variant="title" width="60%" className="mt-2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (experience.length === 0) {
        return (
            <StatePanel
                kind="empty"
                compact
                title={t('careeros.career.timeline.emptyTitle', 'No experience recorded yet')}
                description={t('careeros.career.timeline.emptyDescription', 'Import a CV or add a role to see your progression here.')}
                className={className}
            />
        );
    }

    return (
        <section aria-labelledby={headingId} className={className}>
            <h3 id={headingId} className="sr-only">{t('careeros.career.timeline.title', 'Progression')}</h3>
            <ol className="relative border-l border-border-default pl-5">
                {experience.slice(0, shown).map((fact) => {
                    const achievements = achievementsByParent.get(fact.id) ?? [];
                    return (
                        <li key={fact.id} className={`relative ${compact ? 'pb-3' : 'pb-5'} last:pb-0`}>
                            <span className="absolute -left-[25px] top-1.5 inline-flex h-2.5 w-2.5 rounded-full border-2 border-surface-panel bg-content-muted" aria-hidden="true" />
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-xs text-content-muted">{periodLabel(t, fact) || t('careeros.career.timeline.undated', 'Undated')}</span>
                                <EvidenceBadge state={fact.confirmationState} />
                            </div>
                            <p className="mt-0.5 text-sm font-medium text-content-primary">
                                {onOpen ? (
                                    <button type="button" onClick={() => onOpen(fact)} className="tap-target rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                                        {fact.title || t('careeros.career.untitled', 'Untitled')}
                                    </button>
                                ) : (fact.title || t('careeros.career.untitled', 'Untitled'))}
                                {fact.organization && <span className="text-content-secondary"> · {fact.organization}</span>}
                            </p>
                            {!compact && achievements.length > 0 && (
                                <ul className="mt-1.5 space-y-1">
                                    {achievements.map((a) => (
                                        <li key={a.id} className="flex items-start gap-1.5 text-[13px] text-content-secondary">
                                            <span aria-hidden="true">–</span>
                                            <span>{a.title}{a.payload.metric ? ` (${[a.payload.metric, a.payload.unit].filter(Boolean).join(' ')})` : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ol>
            {experience.length > shown && (
                <div className="mt-3 pl-5">
                    <Button variant="quiet" size="sm" onClick={() => setShown((n) => n + pageSize)}>
                        {t('careeros.career.timeline.showEarlier', 'Show {count} earlier roles').replace('{count}', String(Math.min(pageSize, experience.length - shown)))}
                    </Button>
                </div>
            )}
        </section>
    );
};

export default CareerTimeline;
