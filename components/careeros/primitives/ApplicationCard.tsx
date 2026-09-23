import React from 'react';
import { CalendarDays, FileText } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ApplicationStage, ClosedReason, ReadinessItem } from '../../../services/careerOs/types';
import { EntityCard, type EntityCardAction } from './EntityCard';
import { StatusChip, type Tone } from './Pill';

/**
 * One application in a list or on a board. The stage is the status; when the
 * application is closed the reason is part of the label so "Closed" never
 * hides an offer or a rejection. Readiness is summarised as necessary items
 * done over total — the checklist itself lives in the workspace.
 */
export interface ApplicationCardProps {
    jobTitle: string;
    company: string;
    stage: ApplicationStage;
    closedReason?: ClosedReason | null;
    /** Readiness items, summarised as "n of m necessary". */
    readiness?: ReadinessItem[] | null;
    /** Already formatted, e.g. "Follow up Fri 3 May". */
    followUpLabel?: string | null;
    /** The campaign this belongs to. */
    campaignLabel?: string | null;
    action?: EntityCardAction;
    secondaryAction?: EntityCardAction;
    loading?: boolean;
    compact?: boolean;
    /** No frame of its own (board tiles and rows inside a panel). */
    flush?: boolean;
    className?: string;
}

/** Translated label and tone for an application stage. */
export const useApplicationStage = (): ((stage: ApplicationStage, closedReason?: ClosedReason | null) => { label: string; tone: Tone }) => {
    const { t } = useTranslation();
    return (stage, closedReason) => {
        switch (stage) {
            case 'saved':
                return { label: t('careeros.application.stage.saved', 'Saved'), tone: 'neutral' };
            case 'preparing':
                return { label: t('careeros.application.stage.preparing', 'Preparing'), tone: 'info' };
            case 'submitted':
                return { label: t('careeros.application.stage.submitted', 'Submitted'), tone: 'accent' };
            case 'response':
                return { label: t('careeros.application.stage.response', 'Response received'), tone: 'info' };
            case 'interview':
                return { label: t('careeros.application.stage.interview', 'Interviewing'), tone: 'accent' };
            case 'final':
                return { label: t('careeros.application.stage.final', 'Final stage'), tone: 'accent' };
            case 'closed':
            default:
                switch (closedReason) {
                    case 'accepted':
                        return { label: t('careeros.application.closed.accepted', 'Offer accepted'), tone: 'success' };
                    case 'rejected':
                        return { label: t('careeros.application.closed.rejected', 'Not selected'), tone: 'danger' };
                    case 'withdrawn':
                        return { label: t('careeros.application.closed.withdrawn', 'Withdrawn'), tone: 'neutral' };
                    case 'archived':
                    default:
                        return { label: t('careeros.application.closed.archived', 'Closed'), tone: 'neutral' };
                }
        }
    };
};

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
    jobTitle,
    company,
    stage,
    closedReason,
    readiness,
    followUpLabel,
    campaignLabel,
    action,
    secondaryAction,
    loading = false,
    compact = false,
    flush = false,
    className = '',
}) => {
    const { t } = useTranslation();
    const stageOf = useApplicationStage();
    const { label, tone } = stageOf(stage, closedReason);

    const necessary = readiness?.filter((item) => item.kind === 'necessary') ?? [];
    const done = necessary.filter((item) => item.state === 'complete').length;
    const blocked = readiness?.some((item) => item.state === 'blocked') ?? false;
    const showReadiness = (stage === 'saved' || stage === 'preparing') && readiness && readiness.length > 0;

    return (
        <EntityCard
            kind={t('careeros.application.kind', 'Application')}
            kindIcon={<FileText />}
            title={jobTitle}
            meta={campaignLabel ? `${company} · ${campaignLabel}` : company}
            chips={<StatusChip label={label} tone={tone} announce />}
            footnote={
                followUpLabel ? (
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} strokeWidth={2} aria-hidden="true" />
                        {followUpLabel}
                    </span>
                ) : undefined
            }
            action={action}
            secondaryAction={secondaryAction}
            loading={loading}
            compact={compact}
            flush={flush}
            className={className}
        >
            {showReadiness && (
                <p className="text-[13px] text-content-secondary">
                    {t('careeros.readiness.necessaryDone', '{done} of {total} necessary')
                        .replace('{done}', String(done))
                        .replace('{total}', String(necessary.length))}
                    {blocked && <span className="ml-1.5 font-semibold text-status-danger">{t('careeros.readiness.blocked', 'Blocked')}</span>}
                </p>
            )}
        </EntityCard>
    );
};

export default ApplicationCard;
