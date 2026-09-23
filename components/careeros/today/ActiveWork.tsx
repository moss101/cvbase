import React, { useId } from 'react';
import { CalendarClock, ChevronRight, CircleAlert, Compass, FileText, Target } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import * as atsReportRepo from '../../../services/repos/atsReportRepo';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { Button, Skeleton, StatusChip, useApplicationStage } from '../primitives';
import { activeApplications, currentCv, priorityOpportunity, progressCounts, upcomingInterviews } from './commandCenter';
import type { TodayData } from './useTodayData';

/**
 * Layer three of Today: what is actually in progress — the CV the person
 * works from (with its version, ATS signal and where it is used), the
 * applications in motion, the next interview, the most promising saved
 * opportunity, the campaign and any profile gaps. One surface, hairline
 * sections; a block only appears when there is something real in it.
 */
export interface ActiveWorkProps {
    userId: string;
    data: TodayData | null;
    loading: boolean;
    now?: Date;
}

const dateTime = (iso: string, language: string, timeZone: string | null): string => {
    try { return new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(new Date(iso)); } catch { return iso; }
};
const shortDate = (iso: string | undefined, language: string): string => {
    if (!iso) return '';
    try { return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(new Date(iso)); } catch { return iso.slice(0, 10); }
};

const Block: React.FC<{ title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }> = ({ title, action, children }) => (
    <div className="min-w-0 px-6 py-5">
        <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[13.5px] font-semibold text-content-primary">{title}</h3>
            {action && <button type="button" onClick={action.onClick} className="shrink-0 text-[12.5px] font-medium text-content-secondary hover:text-content-primary">{action.label}</button>}
        </div>
        <div className="mt-2.5">{children}</div>
    </div>
);

export const ActiveWork: React.FC<ActiveWorkProps> = ({ userId, data, loading, now = new Date() }) => {
    const { t, language } = useTranslation();
    const { navigate } = useNavigation();
    const stageOf = useApplicationStage();
    const headingId = useId();
    const reports = useOwnedQuery(userId, 'today:ats-recent', () => atsReportRepo.listRecent(userId, 20), [userId]);

    if (loading || !data) {
        return <section className="cos-panel p-6" aria-busy="true" aria-label={t('careeros.today.work.title', 'In progress')}><Skeleton variant="text" lines={4} /></section>;
    }

    const cv = currentCv(data.resumes);
    const cvReport = cv?.id ? (reports.data ?? []).find((r) => r.resumeId === cv.id) : undefined;
    const usedBy = cv?.id ? data.applications.filter((a) => a.currentResumeId === cv.id && a.stage !== 'closed').length : 0;
    const tailored = data.resumes.filter((r) => r.applicationId).length;
    const apps = activeApplications(data).slice(0, 3);
    const interview = upcomingInterviews(data, now)[0];
    const opportunity = priorityOpportunity(data);
    const oppAnalysis = opportunity ? data.analyses.find((a) => a.opportunityId === opportunity.id && !a.stale) : undefined;
    const campaign = data.campaigns.find((c) => c.campaign.status === 'active');
    const counts = progressCounts(data, now);
    const profileGaps = counts.factsToReview > 0 || !data.goal || counts.factsTotal === 0;

    return (
        <section aria-labelledby={headingId} className="cos-panel">
            <h2 id={headingId} className="px-6 pt-5 text-[15px] font-semibold text-content-primary">{t('careeros.today.work.title', 'In progress')}</h2>
            <div className="divide-y divide-border-default">
                <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                        <span className="relative mt-0.5 grid h-[58px] w-[46px] shrink-0 place-items-center rounded-md border border-border-default bg-surface-canvas" aria-hidden="true">
                            <span className="absolute inset-x-2 top-2.5 h-[3px] rounded bg-content-muted/50" />
                            <span className="absolute inset-x-2 top-[18px] h-[2px] rounded bg-content-muted/25" />
                            <span className="absolute inset-x-2 top-[24px] h-[2px] w-[60%] rounded bg-content-muted/25" />
                            <FileText size={14} className="absolute bottom-2 text-content-muted" />
                        </span>
                        <div className="min-w-0">
                            {cv ? (
                                <>
                                    <p className="truncate text-[15px] font-semibold text-content-primary">{cv.title}</p>
                                    <p className="text-[13px] text-content-secondary">
                                        {[cv.isPrimary ? t('careeros.today.work.primaryCv', 'Primary CV') : t('careeros.today.work.latestCv', 'Latest CV'),
                                            typeof cv.revision === 'number' ? t('careeros.today.work.version', 'version {n}').replace('{n}', String(cv.revision)) : null,
                                            cv.updatedAt ? t('careeros.today.work.edited', 'edited {date}').replace('{date}', shortDate(cv.updatedAt, language)) : null].filter(Boolean).join(' · ')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-content-secondary">
                                        {cvReport && typeof cvReport.score === 'number'
                                            ? <span className={cvReport.score >= 75 ? 'text-status-success' : cvReport.score >= 50 ? 'text-status-warning' : 'text-status-danger'}>{t('careeros.library.score', 'Score {score}/100').replace('{score}', String(cvReport.score))} · {t('careeros.today.work.atsLabel', 'ATS')}</span>
                                            : <span>{t('careeros.today.work.atsNone', 'ATS not checked yet')}</span>}
                                        <span>{usedBy === 0 ? t('careeros.today.work.usedByNone', 'Not linked to an application yet') : usedBy === 1 ? t('careeros.today.work.usedByOne', 'Used by 1 application') : t('careeros.today.work.usedBy', 'Used by {n} applications').replace('{n}', String(usedBy))}</span>
                                        {tailored > 0 && <span>{tailored === 1 ? t('careeros.today.work.tailoredOne', '1 tailored version') : t('careeros.today.work.tailored', '{n} tailored versions').replace('{n}', String(tailored))}</span>}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-[15px] font-semibold text-content-primary">{t('careeros.today.work.noCv', 'No CV yet')}</p>
                                    <p className="text-[13px] text-content-secondary">{t('careeros.today.work.noCvDetail', 'Start one from a template or import the CV you already have.')}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {cv?.id
                            ? <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toCvEdit(cv.id as string))}>{t('careeros.today.work.openBuilder', 'Open in Builder')}</Button>
                            : <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toCvWorkspace())}>{t('careeros.today.work.createCv', 'Create a CV')}</Button>}
                        <Button variant="quiet" size="sm" onClick={() => navigate(careerPath.toCvWorkspace())}>{t('careeros.today.work.allCvs', 'All CVs')}</Button>
                    </div>
                </div>

                <Block title={t('careeros.space.applications', 'Applications')} action={{ label: t('careeros.today.work.allApplications', 'All applications'), onClick: () => navigate(careerPath.toSpace('applications')) }}>
                    {apps.length === 0 ? (
                        <p className="text-[13px] text-content-secondary">{t('careeros.today.work.noApplications', 'None in progress. Start one from a saved opportunity.')}</p>
                    ) : (
                        <ul className="-mx-2">
                            {apps.map((a) => {
                                const stage = stageOf(a.stage, a.closedReason);
                                return (
                                    <li key={a.id}>
                                        <button type="button" onClick={() => navigate(careerPath.toApplication(a.id))} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-canvas">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[14px] font-medium text-content-primary">{a.jobTitle}</span>
                                                <span className="block truncate text-[12.5px] text-content-secondary">
                                                    {a.company}
                                                    {!a.currentResumeId && a.stage === 'preparing' ? ` · ${t('careeros.today.work.needsCv', 'needs a CV')}` : ''}
                                                    {a.followUpAt ? ` · ${t('careeros.today.work.followUp', 'follow up {date}').replace('{date}', shortDate(a.followUpAt, language))}` : ''}
                                                </span>
                                            </span>
                                            <StatusChip label={stage.label} tone={stage.tone} />
                                            <ChevronRight size={15} className="shrink-0 text-content-muted" aria-hidden="true" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Block>

                {(interview || opportunity) && (
                    <div className="grid grid-cols-1 divide-y divide-border-default sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        {interview && (
                            <Block title={t('careeros.today.work.nextInterview', 'Next interview')}>
                                <p className="flex items-center gap-1.5 text-[14px] font-medium text-content-primary"><CalendarClock size={14} className="shrink-0 text-content-muted" aria-hidden="true" /><span className="truncate">{interview.session.scheduledAt ? dateTime(interview.session.scheduledAt, language, interview.session.timeZone) : t('careeros.progress.intNoDate', 'No time recorded yet')}</span></p>
                                <p className="mt-0.5 truncate text-[12.5px] text-content-secondary">{interview.application ? `${interview.application.jobTitle} · ${interview.application.company}` : ''}</p>
                                <p className="mt-1 text-[12.5px] text-content-secondary">{t('careeros.today.work.themes', '{covered} of {total} themes prepared').replace('{covered}', String(interview.session.themes.filter((th) => th.covered).length)).replace('{total}', String(interview.session.themes.length))}</p>
                                <Button className="mt-3" variant="secondary" size="sm" onClick={() => navigate(careerPath.toApplication(interview.session.applicationId, 'interview'))}>{t('careeros.today.work.prepare', 'Prepare')}</Button>
                            </Block>
                        )}
                        {opportunity && (
                            <Block title={t('careeros.today.work.opportunity', 'Worth a look')}>
                                <p className="truncate text-[14px] font-medium text-content-primary">{opportunity.title}</p>
                                <p className="truncate text-[12.5px] text-content-secondary">{opportunity.company}</p>
                                <p className="mt-1 text-[12.5px] text-content-secondary">
                                    {oppAnalysis
                                        ? t('careeros.today.work.fit', '{supported} of {total} requirements supported by confirmed facts')
                                            .replace('{supported}', String(oppAnalysis.qualification.supported.length))
                                            .replace('{total}', String(oppAnalysis.qualification.supported.length + oppAnalysis.qualification.partial.length + oppAnalysis.qualification.missing.length + oppAnalysis.qualification.unknown.length))
                                        : t('careeros.today.work.fitNone', 'Fit not analysed yet')}
                                </p>
                                <Button className="mt-3" variant="secondary" size="sm" onClick={() => navigate(careerPath.toOpportunity(opportunity.id))}>{t('careeros.today.work.review', 'Review')}</Button>
                            </Block>
                        )}
                    </div>
                )}

                {(campaign || profileGaps) && (
                    <div className="grid grid-cols-1 divide-y divide-border-default sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        {campaign && (
                            <Block title={t('careeros.today.work.campaign', 'Campaign')}>
                                <p className="flex items-center gap-1.5 text-[14px] font-medium text-content-primary"><Compass size={14} className="shrink-0 text-content-muted" aria-hidden="true" /><span className="truncate">{campaign.campaign.name}</span></p>
                                <p className="mt-1 text-[12.5px] text-content-secondary cos-num">
                                    {t('careeros.today.work.campaignFunnel', '{preparing} preparing · {submitted} sent · {interview} interviewing')
                                        .replace('{preparing}', String(campaign.funnel.preparing)).replace('{submitted}', String(campaign.funnel.submitted + campaign.funnel.response)).replace('{interview}', String(campaign.funnel.interview))}
                                </p>
                                <Button className="mt-3" variant="quiet" size="sm" onClick={() => navigate(careerPath.toCampaign(campaign.campaign.id))}>{t('careeros.today.work.openBoard', 'Open board')}</Button>
                            </Block>
                        )}
                        {profileGaps && (
                            <Block title={t('careeros.today.work.profile', 'Career profile')}>
                                <ul className="space-y-1 text-[13px] text-content-secondary">
                                    {!data.goal && <li className="flex items-center gap-1.5"><Target size={13} className="shrink-0 text-status-warning" aria-hidden="true" />{t('careeros.today.work.noGoal', 'No career goal yet')}</li>}
                                    {counts.factsToReview > 0 && <li className="flex items-center gap-1.5"><CircleAlert size={13} className="shrink-0 text-status-warning" aria-hidden="true" />{t('careeros.progress.factsBlocker', 'Facts to review: {count}').replace('{count}', String(counts.factsToReview))}</li>}
                                    {counts.factsTotal === 0 && <li className="flex items-center gap-1.5"><CircleAlert size={13} className="shrink-0 text-status-warning" aria-hidden="true" />{t('careeros.today.work.noFacts', 'No experience recorded yet')}</li>}
                                </ul>
                                <Button className="mt-3" variant="quiet" size="sm" onClick={() => navigate(counts.factsToReview > 0 ? careerPath.toCareer('evidence') : !data.goal ? careerPath.toCareer('goals') : careerPath.toCareer())}>{t('careeros.today.work.completeProfile', 'Complete profile')}</Button>
                            </Block>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ActiveWork;
