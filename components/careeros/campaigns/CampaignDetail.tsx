import React, { useMemo, useState } from 'react';
import { Circle, CircleCheck, CircleDot, Pause, Pencil, Play, Plus, Square, X } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import { computeFunnel, milestoneSummary } from '../../../services/careerOs/campaignFunnel';
import { track } from '../../../services/careerOs/careerEvents';
import type { ApplicationRecord, ApplicationStage, Campaign, CampaignMilestone, CareerGoal, ClosedReason, Opportunity, OutcomeObservation } from '../../../services/careerOs/types';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Dialog } from '../../common/Dialog';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, Skeleton, SpaceHeader, StatePanel, StatusChip, type Tone } from '../primitives';
import { FailureNotice } from '../application/FailureNotice';
import { Panel, PaneHeading, Select, TextArea } from '../application/fields';
import { formatDate } from '../application/format';
import { useAsyncAction } from '../application/useAsyncAction';
import { useStartApplication } from '../opportunities/useStartApplication';
import { OpportunityPicker } from '../opportunities/OpportunityPicker';
import { ApplicationBoard, type LastMove } from './ApplicationBoard';
import { CampaignForm, type CampaignFormValue } from './CampaignForm';
import { stageLabels } from './stages';

/**
 * One campaign (REQ-16/COS-021): its board or list of applications with
 * keyboard-operable stage moves, the opportunities it targets, milestones,
 * notes and the observed funnel. Assigning an application changes only its
 * owning campaign — it is never copied — and unassigned records stay
 * visible in Applications.
 */
interface DetailData {
    campaign: Campaign;
    goal: CareerGoal | null;
    applications: ApplicationRecord[];
    opportunities: Opportunity[];
    outcomes: OutcomeObservation[];
    unassigned: ApplicationRecord[];
    partial: boolean;
}

async function loadDetail(userId: string, id: string): Promise<DetailData> {
    const campaign = await campaignRepo.get(userId, id);
    const settled = await Promise.allSettled([
        campaign.goalId ? goalRepo.get(userId, campaign.goalId) : Promise.resolve(null),
        applicationRepo.listForCampaign(userId, id),
        campaignRepo.listOpportunityIds(userId, id).then(async (ids) => {
            if (ids.length === 0) return [] as Opportunity[];
            const all = await opportunityRepo.list(userId, 'all', { includeMerged: true });
            const wanted = new Set(ids);
            return all.filter((o) => wanted.has(o.id));
        }),
        outcomeRepo.list(userId),
        applicationRepo.list(userId).then((apps) => apps.filter((a) => a.campaignId === null)),
    ]);
    const value = <T,>(index: number, fallback: T): T => (settled[index].status === 'fulfilled' ? (settled[index] as PromiseFulfilledResult<T>).value : fallback);
    const applications = value<ApplicationRecord[]>(1, []);
    const appIds = new Set(applications.map((a) => a.id));
    return {
        campaign,
        goal: value<CareerGoal | null>(0, null),
        applications,
        opportunities: value<Opportunity[]>(2, []),
        outcomes: value<OutcomeObservation[]>(3, []).filter((o) => appIds.has(o.applicationId)),
        unassigned: value<ApplicationRecord[]>(4, []),
        partial: settled.some((s) => s.status === 'rejected'),
    };
}

const CLOSED_REASONS: ClosedReason[] = ['rejected', 'withdrawn', 'accepted', 'archived'];
const VIEW_KEY = 'careeros.campaign.view';
const readStoredView = (): 'board' | 'list' => {
    try { return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board'; } catch { return 'board'; }
};
const storeView = (view: 'board' | 'list'): void => {
    try { window.localStorage.setItem(VIEW_KEY, view); } catch { /* per-viewer convenience only */ }
};

const TargetOpportunityRow: React.FC<{ opportunity: Opportunity; campaignId: string; onRemove: () => void; removing: boolean }> = ({ opportunity, campaignId, onRemove, removing }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const start = useStartApplication(opportunity.id);
    return (
        <li className="flex flex-wrap items-center justify-between gap-2 py-2">
            <button type="button" onClick={() => navigate(careerPath.toOpportunity(opportunity.id))} className="tap-target min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                <span className="block truncate text-sm font-semibold text-content-primary">{opportunity.title}</span>
                <span className="block truncate text-xs text-content-secondary">{opportunity.company}{opportunity.mergedIntoId ? ` · ${t('careeros.opportunity.mergedChip', 'Merged into another record')}` : ''}</span>
            </button>
            <div className="flex items-center gap-1">
                {start.latest ? (
                    <Button size="sm" variant="secondary" onClick={start.openLatest}>{t('careeros.opportunity.openApplication', 'Open application')}</Button>
                ) : (
                    <Button size="sm" variant="primary" onClick={() => { void start.start({ campaignId }); }} loading={start.pending} disabled={start.loading || Boolean(opportunity.mergedIntoId)}>{t('careeros.opportunity.startApplication', 'Start application')}</Button>
                )}
                <Button size="sm" variant="quiet" icon={<X size={14} />} onClick={onRemove} loading={removing} aria-label={t('careeros.campaign.removeTarget', 'Remove {title} from targets').replace('{title}', opportunity.title)}>{t('careeros.common.remove', 'Remove')}</Button>
            </div>
            {start.error ? <FailureNotice error={start.error} className="w-full" /> : null}
        </li>
    );
};

export const CampaignDetail: React.FC<{ id: string; route: CareerRoute }> = ({ id, route }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate, replace, back, reset } = useNavigation();
    // The route's `view` wins; without one (a reload drops the detail query)
    // the per-viewer preference stored on this device is used.
    const view: 'board' | 'list' = route.query?.view === 'list' || route.query?.view === 'board'
        ? route.query.view
        : readStoredView();
    const query = useOwnedQuery(userId, `campaign:detail:${id}`, () => loadDetail(userId as string, id), [id]);
    const [editOpen, setEditOpen] = useState(false);
    const [closeOpen, setCloseOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [targetOpen, setTargetOpen] = useState(false);
    const [closing, setClosing] = useState<{ app: ApplicationRecord; reason: ClosedReason } | null>(null);
    const [lastMove, setLastMove] = useState<LastMove | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [notes, setNotes] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [goalsForForm, setGoalsForForm] = useState<CareerGoal[]>([]);

    const data = query.data;
    const campaign = data?.campaign ?? null;
    const labels = useMemo(() => stageLabels(t), [t]);

    const refresh = async () => { invalidate('campaign'); invalidate('applications'); await query.refresh(); };

    const [updateCampaign, updateState] = useAsyncAction(async (patch: Parameters<typeof campaignRepo.update>[2]) => {
        if (!userId || !campaign) return;
        const next = await campaignRepo.update(userId, campaign.id, patch, campaign.revision);
        query.setData({ ...(data as DetailData), campaign: next });
        invalidate('campaigns:list');
    });

    const [setStatus, statusState] = useAsyncAction(async (action: 'pause' | 'close' | 'reopen', reason?: string) => {
        if (!userId || !campaign) return;
        const next = action === 'pause'
            ? await campaignRepo.pause(userId, campaign.id, campaign.revision)
            : action === 'close'
                ? await campaignRepo.close(userId, campaign.id, campaign.revision, reason ?? null)
                : await campaignRepo.reopen(userId, campaign.id, campaign.revision);
        if (action === 'close') {
            await track(userId, 'campaign_completed', { subjectRefs: { campaign: campaign.id }, payload: { applications: data?.applications.length ?? 0 }, dedupeKey: `campaign_completed:${campaign.id}:${next.revision}` });
        }
        query.setData({ ...(data as DetailData), campaign: next });
        invalidate('campaigns:list');
    });

    const [move, moveState] = useAsyncAction(async (app: ApplicationRecord, next: ApplicationStage, closedReason: ClosedReason | null, record: boolean) => {
        if (!userId) return;
        setBusyId(app.id);
        try {
            const updated = await applicationRepo.update(userId, app.id, next === 'closed' ? { stage: next, closedReason } : { stage: next, closedReason: null }, app.revision);
            if (data) query.setData({ ...data, applications: data.applications.map((a) => (a.id === updated.id ? updated : a)) });
            invalidate('applications');
            invalidate('campaigns:list');
            if (record) setLastMove({ applicationId: app.id, title: app.jobTitle, from: app.stage, to: next });
            else setLastMove(null);
        } finally {
            setBusyId(null);
        }
    });

    const onMove = (app: ApplicationRecord, next: ApplicationStage) => {
        if (next === 'closed') { setClosing({ app, reason: 'archived' }); return; }
        void move(app, next, null, true);
    };

    const undoMove = () => {
        if (!lastMove || !data) return;
        const app = data.applications.find((a) => a.id === lastMove.applicationId);
        if (!app) return;
        const previousReason = lastMove.from === 'closed' ? 'archived' : null;
        void move(app, lastMove.from, previousReason, false);
    };

    const [assign, assignState] = useAsyncAction(async (app: ApplicationRecord, campaignId: string | null) => {
        if (!userId) return;
        await campaignRepo.assignApplication(userId, app.id, campaignId, app.revision);
        setAssignOpen(false);
        await refresh();
    });

    const [addTarget, addTargetState] = useAsyncAction(async (opportunity: Opportunity) => {
        if (!userId || !campaign) return;
        await campaignRepo.addOpportunity(userId, campaign.id, opportunity.id);
        setTargetOpen(false);
        await refresh();
    });

    const [removeTarget, removeTargetState] = useAsyncAction(async (opportunity: Opportunity) => {
        if (!userId || !campaign) return;
        setRemovingId(opportunity.id);
        try {
            await campaignRepo.removeOpportunity(userId, campaign.id, opportunity.id);
            await refresh();
        } finally {
            setRemovingId(null);
        }
    });

    const [saveEdit, editState] = useAsyncAction(async (value: CampaignFormValue) => {
        await updateCampaign({ name: value.name, goalId: value.goalId, milestones: value.milestones });
        setEditOpen(false);
        await refresh();
    });

    const openEdit = async () => {
        if (userId) setGoalsForForm(await goalRepo.list(userId, 'active').catch(() => []));
        setEditOpen(true);
    };

    const cycleMilestone = (m: CampaignMilestone) => {
        if (!campaign) return;
        const nextState: CampaignMilestone['state'] = m.state === 'todo' ? 'doing' : m.state === 'doing' ? 'done' : 'todo';
        void updateCampaign({ milestones: campaign.milestones.map((x) => (x.id === m.id ? { ...x, state: nextState } : x)) });
    };

    const onBack = () => { if (!back()) reset(careerPath.toSpace('campaigns')); };
    const anyError = updateState.error ?? statusState.error ?? moveState.error ?? assignState.error ?? addTargetState.error ?? removeTargetState.error ?? editState.error;
    const resetErrors = () => { updateState.reset(); statusState.reset(); moveState.reset(); assignState.reset(); addTargetState.reset(); removeTargetState.reset(); editState.reset(); };

    if (query.error) {
        return (
            <div className="mx-auto w-full max-w-5xl">
                <SpaceHeader eyebrow={t('careeros.space.campaigns', 'Campaigns')} title={t('careeros.campaign.unavailableTitle', 'Campaign unavailable')} compact />
                <FailureNotice error={query.error} onRetry={() => { void query.refresh(); }} onReload={() => { void query.refresh(); }} />
                <Button variant="quiet" className="mt-4" onClick={onBack}>{t('careeros.common.back', 'Back')}</Button>
            </div>
        );
    }
    if (!campaign || !data) {
        return (
            <div className="mx-auto w-full max-w-5xl" aria-busy="true">
                <Skeleton variant="text" width="6rem" className="h-2.5" />
                <Skeleton variant="title" width="50%" className="mt-3" />
                <Skeleton variant="block" className="mt-6" />
            </div>
        );
    }

    const funnel = computeFunnel(data.applications, data.opportunities, data.outcomes);
    const summary = milestoneSummary(campaign);
    const statusChip: Record<Campaign['status'], { label: string; tone: Tone }> = {
        active: { label: t('careeros.campaign.status.active', 'Active'), tone: 'success' },
        paused: { label: t('careeros.campaign.status.paused', 'Paused'), tone: 'warning' },
        closed: { label: t('careeros.campaign.status.closed', 'Closed'), tone: 'neutral' },
    };
    const funnelRows: Array<[string, number]> = [
        [t('careeros.campaign.funnel.opportunities', 'Opportunities'), funnel.opportunities],
        [t('careeros.application.stage.preparing', 'Preparing'), funnel.preparing],
        [t('careeros.campaign.funnel.submitted', 'Submitted'), funnel.submitted],
        [t('careeros.application.stage.response', 'Response received'), funnel.response],
        [t('careeros.campaign.funnel.interview', 'Interviewing'), funnel.interview],
        [t('careeros.application.stage.final', 'Final stage'), funnel.final],
        [t('careeros.campaign.funnel.offers', 'Offers'), funnel.offers],
        [t('careeros.campaign.funnel.rejected', 'Rejected'), funnel.rejected],
        [t('careeros.campaign.funnel.unknown', 'No response yet'), funnel.unknownOutcome],
    ];

    return (
        <div className="mx-auto w-full max-w-6xl">
            <SpaceHeader
                eyebrow={t('careeros.space.campaigns', 'Campaigns')}
                title={campaign.name}
                description={data.goal ? t('careeros.campaign.towardGoal', 'Toward {goal}').replace('{goal}', data.goal.title || data.goal.role) : t('careeros.campaign.noGoal', 'No goal linked')}
                compact
                action={
                    <div className="flex flex-wrap gap-1">
                        <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => { void openEdit(); }}>{t('careeros.common.edit', 'Edit')}</Button>
                        {campaign.status === 'active' && <Button variant="quiet" size="sm" icon={<Pause size={14} />} onClick={() => { void setStatus('pause'); }} loading={statusState.pending}>{t('careeros.campaign.pause', 'Pause')}</Button>}
                        {campaign.status !== 'closed' && <Button variant="quiet" size="sm" icon={<Square size={14} />} onClick={() => setCloseOpen(true)}>{t('careeros.campaign.close', 'Close')}</Button>}
                        {campaign.status !== 'active' && <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={() => { void setStatus('reopen'); }} loading={statusState.pending}>{t('careeros.campaign.reopen', 'Reopen')}</Button>}
                    </div>
                }
            >
                <div className="flex flex-wrap items-center gap-2">
                    <StatusChip label={statusChip[campaign.status].label} tone={statusChip[campaign.status].tone} announce />
                    {campaign.closedReason && <span className="text-[13px] text-content-secondary">{t('careeros.campaign.closedReason', 'Reason: {reason}').replace('{reason}', campaign.closedReason)}</span>}
                </div>
            </SpaceHeader>

            {anyError ? <FailureNotice error={anyError} onReload={() => { void refresh(); }} onDismiss={resetErrors} className="mb-4" /> : null}
            {data.partial && <StatePanel kind="partial" compact className="mb-4" onRetry={() => { void query.refresh(); }} />}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="min-w-0 space-y-4">
                    <Panel as="section" aria-labelledby="campaign-board">
                        <PaneHeading
                            id="campaign-board"
                            title={t('careeros.campaign.applications', 'Applications')}
                            description={t('careeros.campaign.boardHint', 'Move cards with the Earlier / Later buttons. A move you make is labelled as yours and can be undone.')}
                            action={
                                <div className="flex flex-wrap items-center gap-2">
                                    <div role="group" aria-label={t('careeros.campaign.viewLabel', 'View')} className="flex rounded-lg border border-border-default p-0.5">
                                        {(['board', 'list'] as const).map((v) => (
                                            <button key={v} type="button" aria-pressed={view === v} onClick={() => { storeView(v); replace({ ...route, query: { view: v } }); }} className={`tap-target rounded-md px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${view === v ? 'bg-action-primary/10 text-content-primary' : 'text-content-secondary'}`}>
                                                {v === 'board' ? t('careeros.campaign.view.board', 'Board') : t('careeros.campaign.view.list', 'List')}
                                            </button>
                                        ))}
                                    </div>
                                    <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setAssignOpen(true)}>{t('careeros.campaign.assignExisting', 'Assign existing application')}</Button>
                                </div>
                            }
                        />
                        <div className="mt-4">
                            {data.applications.length === 0 ? (
                                <StatePanel kind="empty" compact title={t('careeros.campaign.noApplications', 'No applications in this campaign yet')} description={t('careeros.campaign.noApplicationsDescription', 'Start one from a target opportunity below, or assign an application you already have.')} />
                            ) : (
                                <ApplicationBoard
                                    applications={data.applications}
                                    view={view}
                                    onMove={onMove}
                                    onOpen={(app) => navigate(careerPath.toApplication(app.id, 'analysis'))}
                                    onUnassign={(app) => { void assign(app, null); }}
                                    busyId={busyId}
                                    lastMove={lastMove}
                                    onUndo={undoMove}
                                    campaignLabel={campaign.name}
                                />
                            )}
                        </div>
                    </Panel>

                    <Panel as="section" aria-labelledby="campaign-targets">
                        <PaneHeading id="campaign-targets" title={t('careeros.campaign.targets', 'Target opportunities')} description={t('careeros.campaign.targetsHint', 'An opportunity can sit in several campaigns. Starting an application here assigns it to this campaign.')} action={<Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setTargetOpen(true)}>{t('careeros.campaign.addTarget', 'Add opportunity')}</Button>} />
                        {data.opportunities.length === 0 ? (
                            <p className="mt-3 text-[13px] text-content-secondary">{t('careeros.campaign.noTargets', 'No target opportunities yet.')}</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-border-default">
                                {data.opportunities.map((o) => <TargetOpportunityRow key={o.id} opportunity={o} campaignId={campaign.id} onRemove={() => { void removeTarget(o); }} removing={removingId === o.id} />)}
                            </ul>
                        )}
                    </Panel>

                    <Panel as="section" aria-labelledby="campaign-notes">
                        <PaneHeading id="campaign-notes" title={t('careeros.campaign.notes', 'Relationship notes')} description={t('careeros.campaign.notesHint', 'Private notes for this campaign. Per-application contact notes live in each application\'s Networking section.')} />
                        <TextArea label={t('careeros.campaign.notesField', 'Notes')} className="mt-3" rows={4} value={notes ?? campaign.notes} onChange={(event) => setNotes(event.target.value)} />
                        <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="primary" disabled={notes === null || notes === campaign.notes} loading={updateState.pending} onClick={() => { void updateCampaign({ notes: notes ?? '' }).then((ok) => { if (ok) setNotes(null); }); }}>{t('careeros.common.save', 'Save')}</Button>
                        </div>
                    </Panel>
                </div>

                <aside className="space-y-4">
                    <Panel as="section" aria-labelledby="campaign-funnel">
                        <h2 id="campaign-funnel" className="text-sm font-semibold text-content-primary">{t('careeros.campaign.funnelTitle', 'Funnel (observed)')}</h2>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                            {funnelRows.map(([label, count]) => (
                                <React.Fragment key={label}>
                                    <dt className="text-content-secondary">{label}</dt>
                                    <dd className="text-right font-semibold tabular-nums text-content-primary">{count}</dd>
                                </React.Fragment>
                            ))}
                        </dl>
                    </Panel>
                    <Panel as="section" aria-labelledby="campaign-milestones">
                        <h2 id="campaign-milestones" className="text-sm font-semibold text-content-primary">
                            {t('careeros.campaign.milestones', 'Milestones')} <span className="font-normal text-content-muted">{summary.done}/{summary.total}</span>
                        </h2>
                        {campaign.milestones.length === 0 ? (
                            <p className="mt-2 text-[13px] text-content-secondary">{t('careeros.campaign.noMilestones', 'No milestones. Add some from Edit.')}</p>
                        ) : (
                            <ul className="mt-2 space-y-1">
                                {campaign.milestones.map((m) => {
                                    const Icon = m.state === 'done' ? CircleCheck : m.state === 'doing' ? CircleDot : Circle;
                                    const overdue = summary.overdue.some((o) => o.id === m.id);
                                    return (
                                        <li key={m.id}>
                                            <button type="button" onClick={() => cycleMilestone(m)} disabled={updateState.pending} aria-label={t('careeros.milestone.cycle', '{title}: {state}. Activate to change.').replace('{title}', m.title).replace('{state}', { todo: t('careeros.milestone.todo', 'To do'), doing: t('careeros.milestone.doing', 'In progress'), done: t('careeros.milestone.done', 'Done') }[m.state])} className="tap-target flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                                                <Icon size={16} className={`mt-0.5 shrink-0 ${m.state === 'done' ? 'text-status-success' : m.state === 'doing' ? 'text-status-info' : 'text-content-muted'}`} aria-hidden="true" />
                                                <span className="min-w-0">
                                                    <span className={`block text-sm ${m.state === 'done' ? 'text-content-secondary line-through' : 'text-content-primary'}`}>{m.title}</span>
                                                    {m.dueDate && <span className={`block text-xs ${overdue ? 'text-status-danger' : 'text-content-muted'}`}>{overdue ? t('careeros.milestone.overdue', 'Overdue · {date}').replace('{date}', formatDate(m.dueDate)) : formatDate(m.dueDate)}</span>}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>
                </aside>
            </div>

            <CampaignForm open={editOpen} title={t('careeros.campaign.editTitle', 'Edit campaign')} goals={goalsForForm} initial={{ name: campaign.name, goalId: campaign.goalId, milestones: campaign.milestones }} pending={editState.pending} onClose={() => setEditOpen(false)} onSubmit={(value) => { void saveEdit(value); }} />
            <ConfirmDialog
                open={closeOpen}
                mode="prompt"
                title={t('careeros.campaign.closeTitle', 'Close this campaign')}
                description={t('careeros.campaign.closeDescription', 'Its applications keep their stages. You can reopen it later.')}
                inputLabel={t('careeros.campaign.closeReason', 'Reason')}
                confirmLabel={t('careeros.campaign.close', 'Close')}
                onCancel={() => setCloseOpen(false)}
                onConfirm={(value) => { setCloseOpen(false); void setStatus('close', value?.trim() || undefined); }}
            />
            <Dialog open={closing !== null} onClose={() => setClosing(null)} title={t('careeros.board.closeTitle', 'Close this application')} footer={
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="quiet" onClick={() => setClosing(null)}>{t('btn.cancel', 'Cancel')}</Button>
                    <Button variant="primary" loading={moveState.pending} onClick={() => { if (closing) { const c = closing; setClosing(null); void move(c.app, 'closed', c.reason, true); } }}>{t('careeros.board.closeConfirm', 'Move to closed')}</Button>
                </div>
            }>
                {closing && (
                    <Select label={t('careeros.board.closeReason', 'Why is it closed?')} options={CLOSED_REASONS.map((r) => ({ value: r, label: { rejected: t('careeros.application.closed.rejected', 'Not selected'), withdrawn: t('careeros.application.closed.withdrawn', 'Withdrawn'), accepted: t('careeros.application.closed.accepted', 'Offer accepted'), archived: t('careeros.application.closed.archived', 'Closed') }[r] }))} value={closing.reason} onChange={(event) => setClosing({ app: closing.app, reason: event.target.value as ClosedReason })} hint={t('careeros.board.closeHint', 'Record the actual outcome in the application workspace to keep the observation history; this only sets the board stage.')} />
                )}
            </Dialog>
            <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} title={t('careeros.campaign.assignExisting', 'Assign existing application')} panelClassName="max-w-lg max-h-[85vh]" bodyClassName="overflow-y-auto">
                {data.unassigned.length === 0 ? (
                    <StatePanel kind="empty" compact title={t('careeros.campaign.noUnassigned', 'No unassigned applications')} description={t('careeros.campaign.noUnassignedDescription', 'Every application already belongs to a campaign.')} />
                ) : (
                    <ul className="divide-y divide-border-default rounded-xl border border-border-default">
                        {data.unassigned.map((app) => (
                            <li key={app.id} className="flex items-center justify-between gap-3 p-3">
                                <span className="min-w-0 text-sm text-content-primary">
                                    <span className="block truncate font-semibold">{app.jobTitle}</span>
                                    <span className="block truncate text-xs text-content-secondary">{app.company} · {labels[app.stage]}</span>
                                </span>
                                <Button size="sm" variant="secondary" loading={assignState.pending} onClick={() => { void assign(app, campaign.id); }}>{t('careeros.campaign.assign', 'Assign')}</Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Dialog>
            <OpportunityPicker open={targetOpen} title={t('careeros.campaign.addTarget', 'Add opportunity')} confirmLabel={t('careeros.common.add', 'Add')} excludeIds={data.opportunities.map((o) => o.id)} onClose={() => setTargetOpen(false)} onPick={(o) => { void addTarget(o); }} pending={addTargetState.pending} />
        </div>
    );
};

export default CampaignDetail;
