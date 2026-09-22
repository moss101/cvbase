import React, { useId } from 'react';
import { ChevronRight, CircleCheck, CircleDashed } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { Skeleton, StatePanel } from '../primitives';
import type { TodayData } from './useTodayData';

/**
 * Career pulse as a checklist, not a ring: each row is a count the person
 * can decompose (confirmed facts vs candidates, goal set, active
 * applications, open interviews) with a link to where it lives. With no
 * records at all it says "insufficient data" rather than showing zeros as
 * progress. No percentage anywhere.
 */
export interface CareerPulseProps {
    data: TodayData | null;
    loading: boolean;
}

interface Row {
    key: string;
    label: string;
    value: string;
    done: boolean;
    route: CareerRoute;
}

export const CareerPulse: React.FC<CareerPulseProps> = ({ data, loading }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const headingId = useId();

    let body: React.ReactNode;
    if (loading || !data) {
        body = <div className="space-y-2" aria-busy="true"><Skeleton variant="text" lines={4} /></div>;
    } else {
        const facts = data.facts.filter((f) => f.status === 'active');
        const confirmed = facts.filter((f) => f.confirmationState === 'verified' || f.confirmationState === 'user_confirmed').length;
        const candidates = facts.filter((f) => f.reviewState === 'candidate' || f.reviewState === 'conflict').length;
        const activeApps = data.applications.filter((a) => a.stage !== 'closed').length;
        const openInterviews = data.interviews.filter((s) => s.status === 'planned' || s.status === 'prepared').length;
        const nothing = facts.length === 0 && data.applications.length === 0 && !data.goal && data.interviews.length === 0;
        if (nothing) {
            body = (
                <StatePanel
                    kind="empty"
                    compact
                    title={t('careeros.today.pulse.insufficient', 'Insufficient data')}
                    description={t('careeros.today.pulse.insufficientDescription', 'The pulse is built from your confirmed facts, goal, applications and interviews. There is nothing to count yet.')}
                    action={{ label: t('careeros.today.pulse.startCareer', 'Open Career'), onClick: () => navigate(careerPath.toCareer()) }}
                />
            );
        } else {
            const rows: Row[] = [
                {
                    key: 'facts',
                    label: t('careeros.today.pulse.facts', 'Confirmed facts'),
                    value: candidates > 0
                        ? t('careeros.today.pulse.factsValue', '{confirmed} confirmed · {candidates} to review').replace('{confirmed}', String(confirmed)).replace('{candidates}', String(candidates))
                        : t('careeros.today.pulse.factsConfirmed', '{confirmed} of {total} confirmed').replace('{confirmed}', String(confirmed)).replace('{total}', String(facts.length)),
                    done: facts.length > 0 && candidates === 0,
                    route: careerPath.toCareer(candidates > 0 ? 'evidence' : 'overview'),
                },
                {
                    key: 'goal',
                    label: t('careeros.today.pulse.goal', 'Primary goal'),
                    value: data.goal ? (data.goal.title || data.goal.role) : t('careeros.today.pulse.noGoal', 'Not set (that is fine)'),
                    done: Boolean(data.goal),
                    route: data.goal ? careerPath.toGoal(data.goal.id) : careerPath.toCareer('goals'),
                },
                {
                    key: 'applications',
                    label: t('careeros.today.pulse.applications', 'Active applications'),
                    value: String(activeApps),
                    done: activeApps > 0,
                    route: careerPath.toSpace('applications'),
                },
                {
                    key: 'interviews',
                    label: t('careeros.today.pulse.interviews', 'Open interviews'),
                    value: String(openInterviews),
                    done: openInterviews > 0,
                    route: careerPath.toSpace('applications'),
                },
            ];
            body = (
                <ul className="divide-y divide-border-default">
                    {rows.map((row) => (
                        <li key={row.key}>
                            <button
                                type="button"
                                onClick={() => navigate(row.route)}
                                className="tap-target flex w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                            >
                                {row.done
                                    ? <CircleCheck size={16} strokeWidth={2} className="shrink-0 text-status-success" aria-hidden="true" />
                                    : <CircleDashed size={16} strokeWidth={2} className="shrink-0 text-content-muted" aria-hidden="true" />}
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-content-primary">{row.label}</span>
                                    <span className="block text-[13px] text-content-secondary">{row.value}</span>
                                </span>
                                <ChevronRight size={16} className="shrink-0 text-content-muted" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            );
        }
    }

    return (
        <section aria-labelledby={headingId} className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <h2 id={headingId} className="text-base font-semibold text-content-primary">{t('careeros.today.pulse.title', 'Career pulse')}</h2>
            <p className="mt-0.5 text-xs text-content-muted">{t('careeros.today.pulse.hint', 'Counts from your records — not a score.')}</p>
            <div className="mt-3">{body}</div>
        </section>
    );
};

export default CareerPulse;
