import React, { useId } from 'react';
import { CircleCheck, CircleDashed, CircleHelp, CircleMinus, CircleX } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { DirectionFit, FitEvidenceState, QualificationFit } from '../../../services/careerOs/types';
import { EvidenceBadge } from './EvidenceBadge';
import { Skeleton } from './Skeleton';

/**
 * Why an opportunity does or does not fit, in two separately labelled regions
 * (DESIGN_SYSTEM.md): "Qualification fit" lists each requirement as supported,
 * partial, missing or unknown with the evidence behind it; "Career direction
 * fit" lists how the role sits against the goal's priorities and constraints.
 * Counts are shown per bucket — never a single score or a ring — and a region
 * with nothing to evaluate says "insufficient data" instead of pretending.
 * The ATS formatting score is a separate signal and is not shown here.
 */
export interface FitBreakdownProps {
    qualification?: QualificationFit | null;
    direction?: DirectionFit | null;
    /** The analysis is out of date with the facts, goal or listing it read. */
    stale?: boolean;
    loading?: boolean;
    /** Collapsed counts only; the lists are omitted. */
    compact?: boolean;
    className?: string;
}

const STATE_ORDER: FitEvidenceState[] = ['supported', 'partial', 'missing', 'unknown'];

const STATE_ICON: Record<FitEvidenceState, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>> = {
    supported: CircleCheck,
    partial: CircleMinus,
    missing: CircleX,
    unknown: CircleHelp,
};

const STATE_TONE: Record<FitEvidenceState, string> = {
    supported: 'text-status-success',
    partial: 'text-status-warning',
    missing: 'text-status-danger',
    unknown: 'text-content-muted',
};

const VERDICT_TONE = {
    aligned: 'text-status-success',
    met: 'text-status-success',
    tension: 'text-status-warning',
    broken: 'text-status-danger',
    unknown: 'text-content-muted',
} as const;

const Region: React.FC<{ id: string; title: string; hint?: string; children: React.ReactNode }> = ({ id, title, hint, children }) => (
    <section aria-labelledby={id} className="rounded-2xl border border-border-default bg-surface-panel p-5">
        <h3 id={id} className="text-sm font-semibold text-content-primary">
            {title}
        </h3>
        {hint && <p className="mt-0.5 text-xs text-content-muted">{hint}</p>}
        <div className="mt-3">{children}</div>
    </section>
);

const Insufficient: React.FC<{ reason?: string }> = ({ reason }) => {
    const { t } = useTranslation();
    return (
        <p className="flex items-start gap-2 text-sm text-content-secondary">
            <CircleDashed size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content-muted" aria-hidden="true" />
            <span>
                <span className="font-semibold text-content-primary">{t('careeros.fit.insufficientData', 'Insufficient data')}</span>
                {reason && <span className="block text-[13px] leading-relaxed">{reason}</span>}
            </span>
        </p>
    );
};

export const FitBreakdown: React.FC<FitBreakdownProps> = ({ qualification, direction, stale = false, loading = false, compact = false, className = '' }) => {
    const { t } = useTranslation();
    const qualId = useId();
    const dirId = useId();

    const stateLabel: Record<FitEvidenceState, string> = {
        supported: t('careeros.fit.supported', 'Supported'),
        partial: t('careeros.fit.partial', 'Partly supported'),
        missing: t('careeros.fit.missing', 'Missing'),
        unknown: t('careeros.fit.unknown', 'Unknown'),
    };
    const verdictLabel = {
        aligned: t('careeros.fit.aligned', 'Aligned'),
        met: t('careeros.fit.met', 'Met'),
        tension: t('careeros.fit.tension', 'Tension'),
        broken: t('careeros.fit.broken', 'Not met'),
        unknown: t('careeros.fit.unknown', 'Unknown'),
    } as const;

    if (loading) {
        return (
            <div className={`grid gap-4 md:grid-cols-2 ${className}`} aria-busy="true">
                {[0, 1].map((index) => (
                    <div key={index} className="rounded-2xl border border-border-default bg-surface-panel p-5" aria-hidden="true">
                        <Skeleton variant="title" width="50%" />
                        <Skeleton variant="text" lines={3} className="mt-3" />
                    </div>
                ))}
            </div>
        );
    }

    const qualCounts = qualification
        ? STATE_ORDER.map((state) => ({ state, count: qualification[state].length }))
        : [];
    const qualTotal = qualCounts.reduce((sum, item) => sum + item.count, 0);
    const dirTotal = direction ? direction.factors.length + direction.constraints.length : 0;

    return (
        <div className={className}>
            {stale && (
                <p role="status" className="mb-3 rounded-xl border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-[13px] text-content-primary">
                    {t('careeros.fit.stale', 'This analysis is out of date — your facts, goal or the listing changed since it ran.')}
                </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
                <Region
                    id={qualId}
                    title={t('careeros.fit.qualification', 'Qualification fit')}
                    hint={qualTotal > 0 ? t('careeros.fit.requirementsCount', '{count} requirements').replace('{count}', String(qualTotal)) : undefined}
                >
                    {!qualification || qualTotal === 0 ? (
                        <Insufficient reason={t('careeros.fit.noRequirements', 'No requirements have been read from this opportunity yet.')} />
                    ) : (
                        <>
                            <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t('careeros.fit.summary', 'Summary')}>
                                {qualCounts.map(({ state, count }) => {
                                    const Icon = STATE_ICON[state];
                                    return (
                                        <li key={state} className={`inline-flex items-center gap-1 text-[13px] font-semibold ${STATE_TONE[state]}`}>
                                            <Icon size={14} strokeWidth={2} aria-hidden="true" />
                                            <span>
                                                {count} {stateLabel[state].toLowerCase()}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                            {!compact && (
                                <ul className="mt-3 divide-y divide-border-default">
                                    {STATE_ORDER.flatMap((state) =>
                                        qualification[state].map((requirement) => {
                                            const Icon = STATE_ICON[state];
                                            return (
                                                <li key={requirement.requirementId} className="flex items-start gap-2 py-2">
                                                    <Icon size={16} strokeWidth={2} className={`mt-0.5 shrink-0 ${STATE_TONE[state]}`} aria-hidden="true" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm text-content-primary">
                                                            <span className="sr-only">{stateLabel[state]}: </span>
                                                            {requirement.text}
                                                        </p>
                                                        {requirement.note && <p className="mt-0.5 text-[13px] text-content-secondary">{requirement.note}</p>}
                                                        {requirement.evidence.length > 0 && (
                                                            <ul className="mt-1 flex flex-wrap gap-1.5">
                                                                {requirement.evidence.map((item) => (
                                                                    <li key={item.factId} className="inline-flex items-center gap-1 text-xs text-content-secondary">
                                                                        <span className="truncate">{item.label}</span>
                                                                        <EvidenceBadge state={item.confirmationState} />
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        }),
                                    )}
                                </ul>
                            )}
                        </>
                    )}
                </Region>

                <Region
                    id={dirId}
                    title={t('careeros.fit.direction', 'Career direction fit')}
                    hint={dirTotal > 0 ? t('careeros.fit.factorsCount', '{count} factors').replace('{count}', String(dirTotal)) : undefined}
                >
                    {!direction || direction.unavailableReason || dirTotal === 0 ? (
                        <Insufficient
                            reason={direction?.unavailableReason ?? t('careeros.fit.noGoal', 'Set a career goal to compare this role against where you want to go.')}
                        />
                    ) : (
                        <ul className="divide-y divide-border-default">
                            {direction.factors.map((factor) => (
                                <li key={`${factor.key}:${factor.label}`} className="py-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-content-primary">{factor.label}</p>
                                        <span className={`shrink-0 text-[13px] font-semibold ${VERDICT_TONE[factor.verdict]}`}>{verdictLabel[factor.verdict]}</span>
                                    </div>
                                    {!compact && factor.detail && <p className="mt-0.5 text-[13px] text-content-secondary">{factor.detail}</p>}
                                </li>
                            ))}
                            {direction.constraints.map((constraint) => (
                                <li key={constraint.constraintId} className="py-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-content-primary">
                                            {constraint.text}
                                            <span className="ml-1.5 text-xs text-content-muted">
                                                {constraint.kind === 'hard' ? t('careeros.fit.hardConstraint', 'must') : t('careeros.fit.softConstraint', 'prefer')}
                                            </span>
                                        </p>
                                        <span className={`shrink-0 text-[13px] font-semibold ${VERDICT_TONE[constraint.verdict]}`}>{verdictLabel[constraint.verdict]}</span>
                                    </div>
                                    {!compact && constraint.detail && <p className="mt-0.5 text-[13px] text-content-secondary">{constraint.detail}</p>}
                                </li>
                            ))}
                            {direction.missing.length > 0 && (
                                <li className="py-2 text-[13px] text-content-secondary">
                                    {t('careeros.fit.missingInputs', 'Not evaluated: {items}').replace('{items}', direction.missing.join(', '))}
                                </li>
                            )}
                        </ul>
                    )}
                </Region>
            </div>
        </div>
    );
};

export default FitBreakdown;
