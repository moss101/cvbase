import React from 'react';
import { Briefcase, CircleCheck, CircleDashed, CircleMinus, CircleX, MapPin } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { Freshness, OpportunityStatus, OpportunityType } from '../../../services/careerOs/types';
import { EntityCard, type EntityCardAction } from './EntityCard';
import { StatusChip, type Tone } from './Pill';

/**
 * One opportunity in a list. Shows the role, the company, where it is, how
 * fresh the listing is and — when an analysis exists — the qualification fit
 * as counts (supported / partial / missing). No score: the counts are the
 * denominator. Without an analysis the card says so rather than showing zero.
 */
export interface OpportunityFitSummary {
    supported: number;
    partial: number;
    missing: number;
    unknown: number;
    stale?: boolean;
}

export interface OpportunityCardProps {
    title: string;
    company: string;
    location?: string;
    remoteType?: 'remote' | 'hybrid' | 'onsite' | null;
    type?: OpportunityType;
    status?: OpportunityStatus;
    freshness?: Freshness;
    /** Qualification fit counts; `null` means no analysis has run yet. */
    fit?: OpportunityFitSummary | null;
    /** Where it came from: "Pasted", "Coach", "Imported from tracker" … */
    sourceLabel?: string;
    action?: EntityCardAction;
    secondaryAction?: EntityCardAction;
    loading?: boolean;
    compact?: boolean;
    className?: string;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
    title,
    company,
    location,
    remoteType,
    type = 'role',
    status,
    freshness,
    fit,
    sourceLabel,
    action,
    secondaryAction,
    loading = false,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();

    const typeLabel: Record<OpportunityType, string> = {
        role: t('careeros.opportunity.type.role', 'Opportunity'),
        project: t('careeros.opportunity.type.project', 'Project'),
        path: t('careeros.opportunity.type.path', 'Career path'),
    };
    const statusChip: Record<OpportunityStatus, { label: string; tone: Tone }> = {
        saved: { label: t('careeros.opportunity.status.saved', 'Saved'), tone: 'neutral' },
        watching: { label: t('careeros.opportunity.status.watching', 'Watching'), tone: 'info' },
        applied: { label: t('careeros.opportunity.status.applied', 'Applied'), tone: 'success' },
        not_interested: { label: t('careeros.opportunity.status.notInterested', 'Not interested'), tone: 'neutral' },
        archived: { label: t('careeros.opportunity.status.archived', 'Archived'), tone: 'neutral' },
    };
    const freshnessChip: Partial<Record<Freshness, { label: string; tone: Tone }>> = {
        aging: { label: t('careeros.opportunity.freshness.aging', 'Listing aging'), tone: 'warning' },
        stale: { label: t('careeros.opportunity.freshness.stale', 'Listing may be stale'), tone: 'warning' },
        closed: { label: t('careeros.opportunity.freshness.closed', 'Listing closed'), tone: 'danger' },
    };
    const remoteLabel = remoteType
        ? {
              remote: t('careeros.opportunity.remote', 'Remote'),
              hybrid: t('careeros.opportunity.hybrid', 'Hybrid'),
              onsite: t('careeros.opportunity.onsite', 'On site'),
          }[remoteType]
        : null;

    const where = [location, remoteLabel].filter(Boolean).join(' · ');
    const fresh = freshness ? freshnessChip[freshness] : undefined;
    const fitTotal = fit ? fit.supported + fit.partial + fit.missing + fit.unknown : 0;

    return (
        <EntityCard
            kind={typeLabel[type]}
            kindIcon={<Briefcase />}
            title={title}
            meta={company}
            chips={
                <>
                    {status && <StatusChip label={statusChip[status].label} tone={statusChip[status].tone} />}
                    {fresh && <StatusChip label={fresh.label} tone={fresh.tone} />}
                </>
            }
            footnote={sourceLabel}
            action={action}
            secondaryAction={secondaryAction}
            loading={loading}
            compact={compact}
            className={className}
        >
            {where && (
                <p className="inline-flex items-center gap-1 text-[13px] text-content-secondary">
                    <MapPin size={13} strokeWidth={2} className="shrink-0 text-content-muted" aria-hidden="true" />
                    {where}
                </p>
            )}
            {!compact && (
                <div className="mt-2">
                    <p className="text-[12px] font-medium text-content-muted">{t('careeros.fit.qualification', 'Qualification fit')}</p>
                    {fit && fitTotal > 0 ? (
                        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold" aria-label={t('careeros.fit.qualification', 'Qualification fit')}>
                            <li className="inline-flex items-center gap-1 text-status-success">
                                <CircleCheck size={13} strokeWidth={2} aria-hidden="true" />
                                {fit.supported} {t('careeros.fit.supported', 'Supported').toLowerCase()}
                            </li>
                            <li className="inline-flex items-center gap-1 text-status-warning">
                                <CircleMinus size={13} strokeWidth={2} aria-hidden="true" />
                                {fit.partial} {t('careeros.fit.partialShort', 'partly').toLowerCase()}
                            </li>
                            <li className="inline-flex items-center gap-1 text-status-danger">
                                <CircleX size={13} strokeWidth={2} aria-hidden="true" />
                                {fit.missing} {t('careeros.fit.missing', 'Missing').toLowerCase()}
                            </li>
                            {fit.unknown > 0 && (
                                <li className="inline-flex items-center gap-1 text-content-muted">
                                    <CircleDashed size={13} strokeWidth={2} aria-hidden="true" />
                                    {fit.unknown} {t('careeros.fit.unknown', 'Unknown').toLowerCase()}
                                </li>
                            )}
                            {fit.stale && <li className="text-status-warning">{t('careeros.fit.staleShort', 'out of date')}</li>}
                        </ul>
                    ) : (
                        <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-content-secondary">
                            <CircleDashed size={13} strokeWidth={2} className="text-content-muted" aria-hidden="true" />
                            {t('careeros.fit.insufficientData', 'Insufficient data')}
                        </p>
                    )}
                </div>
            )}
        </EntityCard>
    );
};

export default OpportunityCard;
