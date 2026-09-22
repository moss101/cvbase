import React from 'react';
import { Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { GoalPriority, GoalStatus } from '../../../services/careerOs/types';
import { EntityCard, type EntityCardAction } from './EntityCard';
import { Pill, StatusChip } from './Pill';

/**
 * A career goal: the direction the rest of Career OS measures against. Shows
 * the target role and level, the top priorities by weight and how many
 * constraints apply. The primary goal is marked as such rather than sorted
 * to the top silently.
 */
export interface CareerGoalCardProps {
    title: string;
    role?: string;
    level?: string;
    location?: string;
    status: GoalStatus;
    isPrimary?: boolean;
    priorities?: GoalPriority[];
    constraintCount?: number;
    /** "Target: Dec 2026" style text, already formatted. */
    targetLabel?: string | null;
    action?: EntityCardAction;
    secondaryAction?: EntityCardAction;
    loading?: boolean;
    compact?: boolean;
    className?: string;
}

export const CareerGoalCard: React.FC<CareerGoalCardProps> = ({
    title,
    role,
    level,
    location,
    status,
    isPrimary = false,
    priorities = [],
    constraintCount = 0,
    targetLabel,
    action,
    secondaryAction,
    loading = false,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();

    const priorityLabel: Record<GoalPriority['key'], string> = {
        compensation: t('careeros.goal.priority.compensation', 'Compensation'),
        growth: t('careeros.goal.priority.growth', 'Growth'),
        stability: t('careeros.goal.priority.stability', 'Stability'),
        flexibility: t('careeros.goal.priority.flexibility', 'Flexibility'),
        mission: t('careeros.goal.priority.mission', 'Mission'),
        learning: t('careeros.goal.priority.learning', 'Learning'),
        location: t('careeros.goal.priority.location', 'Location'),
        title: t('careeros.goal.priority.title', 'Title'),
    };

    const meta = [role, level, location].filter(Boolean).join(' · ');
    const topPriorities = [...priorities].sort((a, b) => b.weight - a.weight).slice(0, compact ? 2 : 3);

    return (
        <EntityCard
            kind={t('careeros.goal.kind', 'Career goal')}
            kindIcon={<Target />}
            title={title}
            meta={meta || undefined}
            selected={isPrimary}
            chips={
                <>
                    {isPrimary && <StatusChip label={t('careeros.goal.primary', 'Primary goal')} tone="accent" />}
                    {status === 'archived' && <StatusChip label={t('careeros.goal.archived', 'Archived')} tone="neutral" />}
                </>
            }
            footnote={
                <>
                    {targetLabel}
                    {targetLabel && constraintCount > 0 && <span aria-hidden="true"> · </span>}
                    {constraintCount > 0 && t('careeros.goal.constraintCount', '{count} constraints').replace('{count}', String(constraintCount))}
                </>
            }
            action={action}
            secondaryAction={secondaryAction}
            loading={loading}
            compact={compact}
            className={className}
        >
            {topPriorities.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label={t('careeros.goal.priorities', 'Priorities')}>
                    {topPriorities.map((priority) => (
                        <li key={priority.key}>
                            <Pill>{priority.label ?? priorityLabel[priority.key]}</Pill>
                        </li>
                    ))}
                </ul>
            )}
        </EntityCard>
    );
};

export default CareerGoalCard;
