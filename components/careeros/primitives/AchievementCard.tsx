import React from 'react';
import { Award, TriangleAlert } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { AchievementPayload, ConfirmationState, ReviewState } from '../../../services/careerOs/types';
import { EntityCard, type EntityCardAction } from './EntityCard';
import { EvidenceBadge } from './EvidenceBadge';
import { Pill, StatusChip } from './Pill';

/**
 * An achievement fact: what was done, where, and the metric behind it. The
 * evidence badge says how trustworthy the fact is; a conflict with another
 * imported fact is shown as a chip so it can be resolved, never merged
 * silently. The dominant action is whatever the caller needs next —
 * "Improve", "Confirm" or "Resolve".
 */
export interface AchievementCardProps {
    title: string;
    organization?: string;
    /** "2019 – 2021" style text, already formatted. */
    periodLabel?: string;
    narrative?: string;
    metric?: AchievementPayload;
    confirmationState: ConfirmationState;
    reviewState?: ReviewState;
    /** Where the fact came from: "Imported from CV", "Added by you" … */
    sourceLabel?: string;
    action?: EntityCardAction;
    secondaryAction?: EntityCardAction;
    loading?: boolean;
    compact?: boolean;
    className?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
    title,
    organization,
    periodLabel,
    narrative,
    metric,
    confirmationState,
    reviewState,
    sourceLabel,
    action,
    secondaryAction,
    loading = false,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();
    const meta = [organization, periodLabel].filter(Boolean).join(' · ');
    const metricText = metric?.metric ? [metric.metric, metric.unit].filter(Boolean).join(' ') : null;

    return (
        <EntityCard
            kind={t('careeros.achievement.kind', 'Achievement')}
            kindIcon={<Award />}
            title={title}
            meta={meta || undefined}
            chips={
                <>
                    <EvidenceBadge state={confirmationState} />
                    {reviewState === 'conflict' && (
                        <StatusChip label={t('careeros.achievement.conflict', 'Conflicts with another fact')} tone="warning" icon={<TriangleAlert />} />
                    )}
                    {reviewState === 'candidate' && <StatusChip label={t('careeros.achievement.candidate', 'Needs review')} tone="neutral" />}
                </>
            }
            footnote={sourceLabel}
            action={action}
            secondaryAction={secondaryAction}
            loading={loading}
            compact={compact}
            className={className}
        >
            {metricText && (
                <p className="text-sm text-content-primary">
                    <span className="font-semibold tabular-nums">{metricText}</span>
                    {metric?.period && <span className="text-content-secondary"> · {metric.period}</span>}
                </p>
            )}
            {!compact && narrative && <p className={`${metricText ? 'mt-1' : ''} text-[13px] leading-relaxed text-content-secondary`}>{narrative}</p>}
            {!metricText && !narrative && confirmationState === 'incomplete' && (
                <Pill tone="neutral">{t('careeros.achievement.noMetric', 'No metric recorded')}</Pill>
            )}
        </EntityCard>
    );
};

export default AchievementCard;
