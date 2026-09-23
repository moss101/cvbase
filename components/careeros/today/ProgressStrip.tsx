import React from 'react';
import { AlertCircle, Award, Briefcase, CalendarClock, ChevronRight, Flag, Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { Skeleton } from '../primitives';
import { progressCounts, upcomingInterviews } from './commandCenter';
import type { TodayData } from './useTodayData';

/**
 * Layer two of Today: the journey as one strip — Goal → Opportunities →
 * Applications → Interviews → Offers — each stage a door into its workspace,
 * with its count, a plain status line and, when something is stuck, the
 * blocker. Counts are the person's own records; an empty stage says so.
 */
interface Stage {
    key: string;
    label: string;
    value: string;
    detail: string;
    blocker?: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }>;
    route: CareerRoute;
}

const dayLabel = (iso: string, language: string, timeZone?: string | null): string => {
    try { return new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short', ...(timeZone ? { timeZone } : {}) }).format(new Date(iso)); } catch { return iso.slice(0, 10); }
};

export const ProgressStrip: React.FC<{ data: TodayData | null; loading: boolean; now?: Date }> = ({ data, loading, now = new Date() }) => {
    const { t, language } = useTranslation();
    const { navigate } = useNavigation();

    if (loading || !data) {
        return <div className="cos-panel p-5" aria-busy="true"><Skeleton variant="text" lines={2} /></div>;
    }
    const c = progressCounts(data, now);
    const next = upcomingInterviews(data, now)[0];

    const stages: Stage[] = [
        {
            key: 'goal', Icon: Flag, label: t('careeros.progress.goal', 'Goal'),
            value: data.goal ? (data.goal.title || data.goal.role) : t('careeros.progress.goalNone', 'Not set'),
            detail: c.factsTotal > 0
                ? t('careeros.progress.facts', '{confirmed} of {total} facts confirmed').replace('{confirmed}', String(c.factsConfirmed)).replace('{total}', String(c.factsTotal))
                : t('careeros.progress.noFacts', 'No career facts yet'),
            blocker: !data.goal ? t('careeros.progress.goalBlocker', 'Set one to rank what comes next') : c.factsToReview > 0 ? t('careeros.progress.factsBlocker', 'Facts to review: {count}').replace('{count}', String(c.factsToReview)) : undefined,
            route: data.goal ? careerPath.toGoal(data.goal.id) : careerPath.toCareer('goals'),
        },
        {
            key: 'opportunities', Icon: Target, label: t('careeros.space.opportunities', 'Opportunities'),
            value: String(c.opportunities),
            detail: c.opportunities === 0 ? t('careeros.progress.oppNone', 'None saved yet') : c.opportunitiesNewThisWeek > 0 ? t('careeros.progress.oppNew', '{count} added this week').replace('{count}', String(c.opportunitiesNewThisWeek)) : t('careeros.progress.oppSaved', 'Saved or watching'),
            route: careerPath.toSpace('opportunities'),
        },
        {
            key: 'applications', Icon: Briefcase, label: t('careeros.space.applications', 'Applications'),
            value: String(c.applicationsActive),
            detail: c.applicationsActive === 0 ? t('careeros.progress.appNone', 'None in progress') : t('careeros.progress.appSplit', '{preparing} preparing · {submitted} sent').replace('{preparing}', String(c.applicationsPreparing)).replace('{submitted}', String(c.applicationsSubmitted)),
            blocker: c.applicationsNeedingCv > 0 ? t('careeros.progress.appBlocker', '{count} without a CV').replace('{count}', String(c.applicationsNeedingCv)) : undefined,
            route: careerPath.toSpace('applications'),
        },
        {
            key: 'interviews', Icon: CalendarClock, label: t('careeros.progress.interviews', 'Interviews'),
            value: String(c.interviewsUpcoming),
            // The date itself lives in the next step and the rail; here, who it is with.
            detail: next
                ? (next.application?.company ? t('careeros.progress.intNext', 'Next: {company}').replace('{company}', next.application.company) : next.session.scheduledAt ? dayLabel(next.session.scheduledAt, language, next.session.timeZone) : t('careeros.progress.intNoDate', 'No time recorded yet'))
                : t('careeros.progress.intNone', 'None scheduled'),
            blocker: c.interviewsUnprepared > 0 ? t('careeros.progress.intBlocker', '{count} not prepared yet').replace('{count}', String(c.interviewsUnprepared)) : undefined,
            route: next?.application ? careerPath.toApplication(next.application.id, 'interview') : careerPath.toSpace('applications'),
        },
        {
            key: 'offers', Icon: Award, label: t('careeros.progress.offers', 'Offers'),
            value: String(c.offers),
            detail: c.accepted > 0 ? t('careeros.progress.accepted', '{count} accepted').replace('{count}', String(c.accepted)) : c.offers > 0 ? t('careeros.progress.offerStage', 'At final stage') : t('careeros.progress.offerNone', 'None yet'),
            route: careerPath.toSpace('applications'),
        },
    ];

    return (
        <nav aria-label={t('careeros.progress.label', 'Career progress')} className="cos-panel overflow-hidden">
            <ol className="flex overflow-x-auto lg:grid lg:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))] lg:overflow-visible">
                {stages.map((s, i) => (
                    <li key={s.key} className={`relative min-w-[160px] flex-1 lg:min-w-0 ${i > 0 ? 'border-l border-border-default' : ''}`}>
                        {i > 0 && (
                            // The journey reads as a path: a small step marker sits on each divider.
                            <span className="pointer-events-none absolute -left-[9px] top-[18px] z-10 grid h-[18px] w-[18px] place-items-center rounded-full border border-border-default bg-surface-panel text-content-muted" aria-hidden="true">
                                <ChevronRight size={11} strokeWidth={2.2} />
                            </span>
                        )}
                        <button type="button" onClick={() => navigate(s.route)} className="flex h-full w-full flex-col gap-1 px-4 py-4 text-left transition-colors duration-150 hover:bg-surface-canvas">
                            <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-content-muted">
                                <s.Icon size={14} strokeWidth={1.9} className="shrink-0" aria-hidden="true" />
                                <span className="truncate">{s.label}</span>
                            </span>
                            <span className={`font-semibold text-content-primary ${s.key === 'goal' ? 'line-clamp-2 text-[15.5px] leading-snug' : 'cos-num text-[22px] leading-tight'}`}>{s.value}</span>
                            <span className="line-clamp-2 text-[12.5px] leading-snug text-content-secondary">{s.detail}</span>
                            {s.blocker && (
                                <span className="mt-0.5 flex items-start gap-1 text-[12.5px] font-medium leading-snug text-status-warning">
                                    <AlertCircle size={13} strokeWidth={2} className="mt-[2px] shrink-0" aria-hidden="true" />
                                    <span>{s.blocker}</span>
                                </span>
                            )}
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default ProgressStrip;
