import React from 'react';
import { Compass, Flag } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CampaignFunnel, CampaignStatus } from '../../../services/careerOs/types';
import { EntityCard, type EntityCardAction } from './EntityCard';
import { StatusChip, type Tone } from './Pill';

/**
 * A campaign: coordinated effort toward one goal. Progress is the observed
 * funnel — how many opportunities, how many submitted, how many in interview
 * — with the counts visible, never a synthetic percentage. The next milestone
 * is named when there is one.
 */
export interface CampaignCardProps {
    name: string;
    goalLabel?: string | null;
    status: CampaignStatus;
    funnel?: CampaignFunnel | null;
    nextMilestone?: { title: string; dueLabel?: string } | null;
    action?: EntityCardAction;
    secondaryAction?: EntityCardAction;
    loading?: boolean;
    compact?: boolean;
    className?: string;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
    name,
    goalLabel,
    status,
    funnel,
    nextMilestone,
    action,
    secondaryAction,
    loading = false,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();

    const statusChip: Record<CampaignStatus, { label: string; tone: Tone }> = {
        active: { label: t('careeros.campaign.status.active', 'Active'), tone: 'success' },
        paused: { label: t('careeros.campaign.status.paused', 'Paused'), tone: 'warning' },
        closed: { label: t('careeros.campaign.status.closed', 'Closed'), tone: 'neutral' },
    };

    const stages: Array<{ key: keyof CampaignFunnel; label: string }> = [
        { key: 'opportunities', label: t('careeros.campaign.funnel.opportunities', 'Opportunities') },
        { key: 'submitted', label: t('careeros.campaign.funnel.submitted', 'Submitted') },
        { key: 'interview', label: t('careeros.campaign.funnel.interview', 'Interviewing') },
        { key: 'offers', label: t('careeros.campaign.funnel.offers', 'Offers') },
    ];

    return (
        <EntityCard
            kind={t('careeros.campaign.kind', 'Campaign')}
            kindIcon={<Compass />}
            title={name}
            meta={
                goalLabel
                    ? t('careeros.campaign.towardGoal', 'Toward {goal}').replace('{goal}', goalLabel)
                    : t('careeros.campaign.noGoal', 'No goal linked')
            }
            chips={<StatusChip label={statusChip[status].label} tone={statusChip[status].tone} />}
            footnote={
                nextMilestone ? (
                    <span className="inline-flex items-center gap-1">
                        <Flag size={12} strokeWidth={2} aria-hidden="true" />
                        <span>
                            {t('careeros.campaign.next', 'Next: {milestone}').replace('{milestone}', nextMilestone.title)}
                            {nextMilestone.dueLabel && ` · ${nextMilestone.dueLabel}`}
                        </span>
                    </span>
                ) : undefined
            }
            action={action}
            secondaryAction={secondaryAction}
            loading={loading}
            compact={compact}
            className={className}
        >
            {funnel ? (
                <dl className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
                    {stages.map(({ key, label }) => (
                        <div key={key} className="rounded-lg bg-surface-canvas px-2.5 py-2">
                            <dt className="text-[11px] text-content-muted">{label}</dt>
                            <dd className="text-base font-semibold tabular-nums text-content-primary">{funnel[key]}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="text-[13px] text-content-secondary">{t('careeros.campaign.noActivity', 'No applications in this campaign yet.')}</p>
            )}
        </EntityCard>
    );
};

export default CampaignCard;
