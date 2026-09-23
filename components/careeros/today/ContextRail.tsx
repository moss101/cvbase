import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { ACTIVITY_FEED_EVENTS } from '../../../services/careerOs/careerEvents';
import { careerPath, useNavigation, type CareerContextHints } from '../../NavigationProvider';
import { handOffToCoach } from '../coach/coachHandoff';
import { Skeleton } from '../primitives';
import { currentCv, nextDeadline, priorityOpportunity, upcomingInterviews } from './commandCenter';
import { eventTitle } from './RecentActivity';
import { InsightsPanel } from './InsightsPanel';
import type { TodayData } from './useTodayData';

/**
 * Layer four of Today: the persistent context rail — goal, the CV version in
 * use, the active campaign, the next dated commitment, recent activity and
 * Coach questions that fit the moment. Calm reference, not more cards: on
 * wide screens it sits at the right; narrower, it follows the main column.
 */
export interface ContextRailProps {
    userId: string;
    data: TodayData | null;
    loading: boolean;
    online: boolean;
    now?: Date;
}

const RailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="min-w-0 border-t border-border-default pt-4 first:border-t-0 first:pt-0">
        <h2 className="text-[12.5px] font-semibold text-content-muted">{title}</h2>
        <div className="mt-1.5">{children}</div>
    </section>
);

const when = (iso: string, language: string, timeZone: string | null, withTime: boolean): string => {
    try { return new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), ...(timeZone ? { timeZone } : {}) }).format(new Date(iso)); } catch { return iso.slice(0, 10); }
};

export const ContextRail: React.FC<ContextRailProps> = ({ userId, data, loading, online, now = new Date() }) => {
    const { t, language } = useTranslation();
    const { navigate } = useNavigation();
    const [insightsOpen, setInsightsOpen] = useState(false);

    if (loading || !data) {
        return <aside className="space-y-5" aria-busy="true" aria-label={t('careeros.rail.label', 'Context')}><Skeleton variant="text" lines={6} /></aside>;
    }

    const cv = currentCv(data.resumes);
    const campaign = data.campaigns.find((c) => c.campaign.status === 'active');
    const deadline = nextDeadline(data, now);
    const goal = data.goal;
    const goalTarget = goal ? [goal.level, goal.location, goal.targetDate ? t('careeros.rail.by', 'by {date}').replace('{date}', when(goal.targetDate, language, null, false)) : null].filter(Boolean).join(' · ') : '';
    const interview = upcomingInterviews(data, now)[0];
    const opportunity = priorityOpportunity(data);
    const activity = data.events.filter((e) => ACTIVITY_FEED_EVENTS.includes(e.eventName)).slice(0, 3);

    // Questions for the Coach that fit what is on the person's plate right now.
    const suggestions: Array<{ key: string; text: string; context?: CareerContextHints }> = [];
    if (interview?.application) suggestions.push({ key: 'interview', text: t('careeros.rail.askInterview', 'How should I prepare for the {company} interview?').replace('{company}', interview.application.company), context: { application: interview.application.id } });
    if (opportunity) suggestions.push({ key: 'opportunity', text: t('careeros.rail.askOpportunity', 'Is {role} at {company} worth applying for?').replace('{role}', opportunity.title).replace('{company}', opportunity.company || '—'), context: { opportunity: opportunity.id } });
    suggestions.push({ key: 'week', text: t('careeros.rail.askWeek', 'What should I focus on this week?') });

    const deadlineKind = deadline ? { interview: t('careeros.rail.deadlineInterview', 'Interview'), follow_up: t('careeros.rail.deadlineFollowUp', 'Follow-up'), milestone: t('careeros.rail.deadlineMilestone', 'Milestone') }[deadline.kind] : '';

    return (
        <aside className="space-y-4 xl:sticky xl:top-8" aria-label={t('careeros.rail.label', 'Context')}>
            <RailSection title={t('careeros.context.goal', 'Goal')}>
                {data.goal ? (
                    <button type="button" onClick={() => navigate(careerPath.toGoal(data.goal!.id))} className="block w-full text-left">
                        <span className="block truncate text-[14px] font-medium text-content-primary hover:underline">{data.goal.title || data.goal.role}</span>
                        {goalTarget && <span className="block truncate text-[12.5px] text-content-secondary">{goalTarget}</span>}
                    </button>
                ) : (
                    <button type="button" onClick={() => navigate(careerPath.toCareer('goals'))} className="text-[13.5px] font-medium text-action-primary hover:underline">{t('careeros.rail.setGoal', 'Set a career goal')}</button>
                )}
            </RailSection>

            <RailSection title={t('careeros.rail.cv', 'CV in use')}>
                {cv?.id ? (
                    <button type="button" onClick={() => navigate(careerPath.toCvEdit(cv.id as string))} className="block w-full text-left">
                        <span className="block truncate text-[14px] font-medium text-content-primary hover:underline">{cv.title}</span>
                        <span className="block text-[12.5px] text-content-secondary">{typeof cv.revision === 'number' ? t('careeros.today.work.version', 'version {n}').replace('{n}', String(cv.revision)) : t('careeros.today.work.primaryCv', 'Primary CV')}</span>
                    </button>
                ) : (
                    <button type="button" onClick={() => navigate(careerPath.toCvWorkspace())} className="text-[13.5px] font-medium text-action-primary hover:underline">{t('careeros.today.work.createCv', 'Create a CV')}</button>
                )}
            </RailSection>

            {campaign && (
                <RailSection title={t('careeros.today.work.campaign', 'Campaign')}>
                    <button type="button" onClick={() => navigate(careerPath.toCampaign(campaign.campaign.id))} className="block w-full text-left">
                        <span className="block truncate text-[14px] font-medium text-content-primary hover:underline">{campaign.campaign.name}</span>
                        {campaign.goalLabel && <span className="block truncate text-[12.5px] text-content-secondary">{t('careeros.rail.toward', 'Toward {goal}').replace('{goal}', campaign.goalLabel)}</span>}
                    </button>
                </RailSection>
            )}

            <RailSection title={t('careeros.rail.next', 'Next date')}>
                {deadline ? (
                    <button type="button" onClick={() => navigate(deadline.applicationId ? careerPath.toApplication(deadline.applicationId, deadline.kind === 'interview' ? 'interview' : 'activity') : deadline.campaignId ? careerPath.toCampaign(deadline.campaignId) : careerPath.toSpace('today'))} className="block w-full text-left">
                        <span className="block text-[14px] font-medium text-content-primary cos-num">{when(deadline.at, language, deadline.timeZone, deadline.kind === 'interview')}</span>
                        <span className="block truncate text-[12.5px] text-content-secondary">{deadlineKind}{deadline.label ? ` · ${deadline.label}` : ''}</span>
                    </button>
                ) : (
                    <p className="text-[13px] text-content-secondary">{t('careeros.rail.noDates', 'Nothing dated. Interviews, follow-ups and milestones you record appear here.')}</p>
                )}
            </RailSection>

            <RailSection title={t('careeros.rail.coach', 'Ask the Coach')}>
                <ul className="space-y-1">
                    {suggestions.map((s) => (
                        <li key={s.key}>
                            <button
                                type="button"
                                onClick={() => { handOffToCoach(s.text); navigate(careerPath.toCoach(undefined, s.context)); }}
                                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-content-secondary transition-colors duration-150 hover:bg-surface-panel hover:text-content-primary -mx-2"
                            >
                                <MessageCircle size={14} className="mt-0.5 shrink-0 text-action-primary" aria-hidden="true" />
                                <span>{s.text}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </RailSection>

            <RailSection title={t('careeros.today.activity.title', 'Recent activity')}>
                {activity.length === 0 ? (
                    <p className="text-[13px] text-content-secondary">{t('careeros.today.activity.empty', 'No activity yet')}</p>
                ) : (
                    <ul className="space-y-1.5">
                        {activity.map((e) => (
                            <li key={e.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                                <span className="min-w-0 truncate text-content-primary">{eventTitle(t, e.eventName)}</span>
                                <span className="shrink-0 text-[12px] text-content-muted cos-num">{when(e.occurredAt, language, null, false)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </RailSection>

            <section className="border-t border-border-default pt-3">
                <button type="button" onClick={() => setInsightsOpen((v) => !v)} aria-expanded={insightsOpen} className="flex w-full items-center justify-between py-1 text-left text-[12.5px] font-semibold text-content-muted hover:text-content-primary">
                    {t('careeros.rail.insights', 'What your outcomes show')}
                    <ChevronDown size={15} className={`transition-transform duration-150 ${insightsOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {insightsOpen && (
                    <div className="mt-3">
                        <InsightsPanel userId={userId} insights={data.insights} submittedCount={data.applications.filter((a) => a.submittedAt).length} goal={data.goal} loading={false} online={online} />
                    </div>
                )}
            </section>
        </aside>
    );
};

export default ContextRail;
