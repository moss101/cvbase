import React, { useMemo, useState } from 'react';
import { ExternalLink, Send, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import { summarizeReadiness } from '../../../services/careerOs/readiness';
import { outcomeHistory } from '../../../services/careerOs/outcomes';
import { APPLICATION_SECTIONS, type ApplicationSection, type Campaign, type OutcomeObservation } from '../../../services/careerOs/types';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { Dialog } from '../../common/Dialog';
import { useMobileShell } from '../../../lib/useMobileShell';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, ContextSwitcher, ReadinessChecklist, Skeleton, SpaceHeader, StatePanel, StatusChip, useApplicationStage } from '../primitives';
import { FailureNotice } from './FailureNotice';
import { formatDate } from './format';
import { OutcomeDialog } from './OutcomeDialog';
import { SubmissionDialog } from './SubmissionDialog';
import { useAsyncAction } from './useAsyncAction';
import { useApplicationWorkspace } from './useApplicationWorkspace';
import { AnalysisSection } from './sections/AnalysisSection';
import { CvSection } from './sections/CvSection';
import { CoverLetterSection } from './sections/CoverLetterSection';
import { QuestionsSection } from './sections/QuestionsSection';
import { LinkedInSection } from './sections/LinkedInSection';
import { NetworkingSection } from './sections/NetworkingSection';
import { InterviewSection } from './sections/InterviewSection';
import { NotesSection } from './sections/NotesSection';
import { ActivitySection, useOutcomeKindLabel } from './sections/ActivitySection';

/**
 * The application workspace (REQ-17/REQ-18, COS-016/022/024/025/023): one
 * durable place per application. The header names the role, stage and
 * attempt; the context strip shows the goal as it was when the application
 * started (and whether it has changed since), the campaign (changeable) and
 * the opportunity; readiness is the checklist; sections come from the URL so
 * reload and back restore them. Submission and outcome recording live in the
 * rail — "Open employer site" only opens the site.
 */
const openExternal = async (url: string): Promise<void> => {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url });
            return;
        }
    } catch { /* fall through */ }
    window.open(url, '_blank', 'noopener,noreferrer');
};

export const ApplicationWorkspace: React.FC<{ id: string; route: CareerRoute }> = ({ id, route }) => {
    const { t } = useTranslation();
    const { userId, context, invalidate } = useCareerOs();
    const { navigate, replace, back, reset } = useNavigation();
    const isMobile = useMobileShell();
    const workspace = useApplicationWorkspace(id);
    const stageOf = useApplicationStage();
    const kindLabel = useOutcomeKindLabel();
    const [submissionOpen, setSubmissionOpen] = useState(false);
    const [outcomeOpen, setOutcomeOpen] = useState(false);
    const [correcting, setCorrecting] = useState<OutcomeObservation | null>(null);
    const [campaignPickerOpen, setCampaignPickerOpen] = useState(false);

    const section: ApplicationSection = (APPLICATION_SECTIONS as readonly string[]).includes(route.section ?? '') ? (route.section as ApplicationSection) : 'analysis';
    const data = workspace.data;
    const app = data?.application ?? null;

    const campaigns = useOwnedQuery(userId, campaignPickerOpen ? 'campaigns:active' : null, () => campaignRepo.list(userId as string, 'active'));
    const [assignCampaign, assignState] = useAsyncAction(async (campaign: Campaign | null) => {
        if (!userId || !app) return;
        const next = await campaignRepo.assignApplication(userId, app.id, campaign?.id ?? null, app.revision);
        workspace.setApplication(next);
        invalidate('campaign');
        invalidate('applications:');
        setCampaignPickerOpen(false);
        await workspace.refresh();
    });

    const sections: Array<{ key: ApplicationSection; label: string }> = [
        { key: 'analysis', label: t('careeros.section.analysis', 'Role analysis') },
        { key: 'cv', label: t('careeros.section.cv', 'CV') },
        { key: 'cover-letter', label: t('careeros.section.coverLetter', 'Cover letter') },
        { key: 'questions', label: t('careeros.section.questions', 'Questions') },
        { key: 'linkedin', label: t('careeros.section.linkedin', 'LinkedIn') },
        { key: 'networking', label: t('careeros.section.networking', 'Networking') },
        { key: 'interview', label: t('careeros.section.interview', 'Interview prep') },
        { key: 'notes', label: t('careeros.section.notes', 'Notes') },
        { key: 'activity', label: t('careeros.section.activity', 'Activity') },
    ];
    const goTo = (next: ApplicationSection) => replace(careerPath.toApplication(id, next, route.context));

    const latestStanding = useMemo(() => {
        const standing = outcomeHistory(data?.outcomes ?? []).filter((e) => !e.superseded && !e.retracted && e.effectiveKind !== null);
        return standing[standing.length - 1] ?? null;
    }, [data?.outcomes]);

    const onBack = () => { if (!back()) reset(careerPath.toSpace('applications')); };

    if (workspace.error) {
        return (
            <div className="mx-auto w-full max-w-[1240px]">
                <SpaceHeader eyebrow={t('careeros.space.applications', 'Applications')} title={t('careeros.application.unavailableTitle', 'Application unavailable')} compact />
                <FailureNotice error={workspace.error} onRetry={() => { void workspace.refresh(); }} onReload={() => { void workspace.refresh(); }} />
                <Button variant="quiet" className="mt-4" onClick={onBack}>{t('careeros.common.back', 'Back')}</Button>
            </div>
        );
    }
    if (!data || !app) {
        return (
            <div className="mx-auto w-full max-w-[1240px]" aria-busy="true">
                <Skeleton variant="text" width="6rem" className="h-2.5" />
                <Skeleton variant="title" width="50%" className="mt-3" />
                <Skeleton variant="text" lines={2} className="mt-4" />
                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]"><Skeleton variant="block" className="h-64" /><Skeleton variant="block" className="h-64" /></div>
            </div>
        );
    }

    const stage = stageOf(app.stage, app.closedReason);
    const goalChanged = app.goalSnapshot !== null && data.currentGoal !== null && app.goalRevision !== null && data.currentGoal.revision !== app.goalRevision;
    const goalTitle = app.goalSnapshot ? (app.goalSnapshot.title || app.goalSnapshot.role) : data.currentGoal ? (data.currentGoal.title || data.currentGoal.role) : null;
    const readinessItems = workspace.readiness?.items ?? app.readiness?.items ?? [];
    const readinessSummary = workspace.readiness ? summarizeReadiness(workspace.readiness) : null;
    const employerUrl = app.jobUrl ?? data.opportunity?.sourceUrl ?? null;

    const rail = (
        <aside className="space-y-4" aria-label={t('careeros.application.rail', 'Readiness and outcomes')}>
            <ReadinessChecklist items={readinessItems} onOpen={(item) => item.destination && goTo(item.destination)} compact={isMobile} />
            <section aria-labelledby="ws-outcomes" className="rounded-2xl border border-border-default bg-surface-panel p-4">
                <h2 id="ws-outcomes" className="text-sm font-semibold text-content-primary">{t('careeros.application.outcomesTitle', 'Submission & outcomes')}</h2>
                <p className="mt-1 text-[13px] text-content-secondary">
                    {app.submittedAt
                        ? t('careeros.application.submittedOn', 'Submission recorded {date}.').replace('{date}', formatDate(app.submittedAt))
                        : t('careeros.application.notSubmitted', 'Not recorded as sent. Opening the employer site does not change that.')}
                </p>
                <p className="mt-1 text-[13px] text-content-secondary">
                    {latestStanding && latestStanding.effectiveKind !== 'submitted'
                        ? t('careeros.application.latestOutcome', 'Latest: {kind} ({date})').replace('{kind}', kindLabel(latestStanding.effectiveKind)).replace('{date}', formatDate(latestStanding.observedAt))
                        : app.submittedAt ? t('careeros.application.noResponseYet', 'No response recorded yet.') : ''}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                    {employerUrl && (
                        <Button variant="secondary" fullWidth icon={<ExternalLink size={14} />} onClick={() => { void openExternal(employerUrl); }}>{t('careeros.application.openEmployerSite', 'Open employer site')}</Button>
                    )}
                    <Button variant={app.submittedAt ? 'secondary' : 'primary'} fullWidth icon={<Send size={14} />} onClick={() => setSubmissionOpen(true)} disabled={app.stage === 'closed' && app.closedReason !== 'archived'}>
                        {app.submittedAt ? t('careeros.application.recordAnotherSubmission', 'Record another submission') : t('careeros.application.recordSubmission', 'Record submission')}
                    </Button>
                    <Button variant="secondary" fullWidth onClick={() => { setCorrecting(null); setOutcomeOpen(true); }}>{t('careeros.application.recordOutcome', 'Record response / outcome')}</Button>
                    {latestStanding && latestStanding.kind !== 'correction' && (
                        <Button variant="quiet" fullWidth onClick={() => { setCorrecting(latestStanding); setOutcomeOpen(true); }}>{t('careeros.application.correctLatest', 'Correct the latest observation')}</Button>
                    )}
                </div>
                {readinessSummary && !readinessSummary.ready && (
                    <p className="mt-3 text-xs text-content-muted">{t('careeros.application.readinessHint', 'Readiness lists what is still open; you can record a submission whenever you have actually sent it.')}</p>
                )}
            </section>
        </aside>
    );

    return (
        <div className="mx-auto w-full max-w-[1240px]">
            <SpaceHeader
                eyebrow={t('careeros.space.applications', 'Applications')}
                title={app.jobTitle || t('careeros.application.untitled', 'Untitled application')}
                description={app.company}
                compact
                action={data.opportunity ? <Button variant="quiet" size="sm" icon={<Sparkles size={14} />} onClick={() => navigate(careerPath.toCoach(undefined, { application: app.id }))}>{t('careeros.opportunity.askCoach', 'Ask Coach')}</Button> : undefined}
            >
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-content-secondary">
                    <StatusChip label={stage.label} tone={stage.tone} announce />
                    <span>{t('careeros.application.attempt', 'Attempt {n}').replace('{n}', String(app.attemptNo))}</span>
                    {app.previousAttemptId && (
                        <button type="button" onClick={() => navigate(careerPath.toApplication(app.previousAttemptId as string, 'activity'))} className="tap-target inline-flex items-center rounded font-semibold text-action-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                            {t('careeros.application.previousAttempt', 'Previous attempt')}
                        </button>
                    )}
                    {app.followUpAt && <span>· {t('careeros.application.followUp', 'Follow up {date}').replace('{date}', formatDate(app.followUpAt))}</span>}
                </div>
                <div className="mt-3">
                    <ContextSwitcher
                        compact={isMobile}
                        conflicts={context?.conflicts ?? []}
                        refs={[
                            { kind: 'goal', label: goalTitle, meta: app.goalSnapshot ? (goalChanged ? t('careeros.application.goalChanged', 'Decision-time goal — it has changed since') : t('careeros.application.goalAtStart', 'Goal when this application started')) : undefined, locked: true },
                            { kind: 'campaign', label: data.campaign?.name ?? null, onChange: () => setCampaignPickerOpen(true) },
                            { kind: 'opportunity', label: data.opportunity?.title ?? null, meta: data.opportunity?.company, locked: true },
                        ]}
                    />
                    {goalChanged && data.currentGoal && (
                        <p role="status" className="mt-2 text-xs text-content-secondary">
                            {t('careeros.application.goalChangedDetail', 'Your goal is now at revision {new}; this application was started at revision {old}. Fit here still uses the goal as it was then.').replace('{new}', String(data.currentGoal.revision)).replace('{old}', String(app.goalRevision))}
                            {' '}
                            <button type="button" onClick={() => navigate(careerPath.toGoal(data.currentGoal?.id as string))} className="font-semibold text-action-primary underline-offset-2 hover:underline">{t('careeros.application.viewGoal', 'View goal')}</button>
                        </p>
                    )}
                </div>
            </SpaceHeader>

            {data.failed.length > 0 && (
                <StatePanel kind="partial" compact className="mb-4" description={t('careeros.application.partialLoad', 'Could not load: {parts}. Showing everything else.').replace('{parts}', data.failed.join(', '))} onRetry={() => { void workspace.refresh(); }} />
            )}
            {assignState.error ? <FailureNotice error={assignState.error} onReload={() => { void workspace.refresh(); }} onDismiss={assignState.reset} className="mb-4" /> : null}

            <nav aria-label={t('careeros.application.sections', 'Workspace sections')} className="mb-4 border-b border-border-default">
                <ul className="-mb-px flex gap-1 overflow-x-auto">
                    {sections.map((s) => (
                        <li key={s.key}>
                            <button
                                type="button"
                                aria-current={section === s.key ? 'page' : undefined}
                                onClick={() => goTo(s.key)}
                                className={`tap-target whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${section === s.key ? 'border-action-primary text-content-primary' : 'border-transparent text-content-secondary hover:text-content-primary'}`}
                            >
                                {s.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0">
                    {section === 'analysis' && <AnalysisSection workspace={workspace} />}
                    {section === 'cv' && <CvSection workspace={workspace} />}
                    {section === 'cover-letter' && <CoverLetterSection workspace={workspace} />}
                    {section === 'questions' && <QuestionsSection workspace={workspace} />}
                    {section === 'linkedin' && <LinkedInSection workspace={workspace} />}
                    {section === 'networking' && <NetworkingSection workspace={workspace} />}
                    {section === 'interview' && <InterviewSection workspace={workspace} />}
                    {section === 'notes' && <NotesSection workspace={workspace} />}
                    {section === 'activity' && <ActivitySection workspace={workspace} />}
                </div>
                {rail}
            </div>

            <SubmissionDialog open={submissionOpen} workspace={workspace} onClose={() => setSubmissionOpen(false)} />
            <OutcomeDialog open={outcomeOpen} workspace={workspace} correcting={correcting} onClose={() => { setOutcomeOpen(false); setCorrecting(null); }} />
            <Dialog open={campaignPickerOpen} onClose={() => setCampaignPickerOpen(false)} title={t('careeros.application.changeCampaign', 'Change campaign')} panelClassName="max-w-md">
                <p className="text-[13px] text-content-secondary">{t('careeros.application.changeCampaignHint', 'An application belongs to one campaign or none. Changing it moves this record — it is never copied.')}</p>
                {campaigns.error ? <StatePanel kind="error" compact className="mt-3" onRetry={() => { void campaigns.refresh(); }} /> : (
                    <ul className="mt-3 divide-y divide-border-default rounded-xl border border-border-default">
                        <li className="flex items-center justify-between gap-3 p-3">
                            <span className="text-sm text-content-primary">{t('careeros.application.noCampaign', 'No campaign')}</span>
                            <Button size="sm" variant="secondary" disabled={app.campaignId === null} loading={assignState.pending} onClick={() => { void assignCampaign(null); }}>{t('careeros.campaign.assign', 'Assign')}</Button>
                        </li>
                        {(campaigns.data ?? []).map((c) => (
                            <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                                <span className="text-sm font-semibold text-content-primary">{c.name}</span>
                                <Button size="sm" variant="secondary" disabled={app.campaignId === c.id} loading={assignState.pending} onClick={() => { void assignCampaign(c); }}>{t('careeros.campaign.assign', 'Assign')}</Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Dialog>
        </div>
    );
};

export default ApplicationWorkspace;
