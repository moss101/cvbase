import React, { useId, useState } from 'react';
import { CheckCheck, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import { explainDominantReason } from '../../../services/careerOs/careerActions';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import { ConflictError, type CareerAction } from '../../../services/careerOs/types';
import { DAY_MS } from '../../../services/careerOs/util';
import { captureException } from '../../../lib/monitoring';
import { useNavigation } from '../../NavigationProvider';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { ActionCard, Button, StatePanel } from '../primitives';
import { destinationToRoute, evidenceRefRoute } from '../career/factFormat';
import type { RankedAction } from './useTodayData';

/**
 * The priority queue (REQ-12): up to three eligible actions with the rest
 * behind a disclosure. Each card names the rule that produced it, the
 * dominant ranking reason, the evidence it read (as links), and offers
 * snooze, dismiss and "I did this elsewhere". Begin marks the action in
 * progress and opens its destination; it never marks it complete.
 */
export interface ActionQueueProps {
    userId: string;
    actions: RankedAction[];
    loading: boolean;
    failed: boolean;
    online: boolean;
    onChanged: () => void;
    onRetry: () => void;
    top?: number;
}

const sourceLabel = (t: (key: string, fallback: string) => string, action: CareerAction): string => {
    switch (action.source) {
        case 'rule': return `${t('careeros.today.source.rule', 'Rule')} ${action.ruleVersion}`.trim();
        case 'coach': return t('careeros.today.source.coach', 'Coach');
        case 'outcome_policy': return t('careeros.today.source.outcomePolicy', 'Outcome policy');
        case 'proactive': return t('careeros.today.source.proactive', 'Reminder');
        default: return t('careeros.today.source.userReported', 'Recorded by you');
    }
};

interface RowProps {
    userId: string;
    ranked: RankedAction;
    online: boolean;
    onChanged: () => void;
}

const ActionRow: React.FC<RowProps> = ({ userId, ranked, online, onChanged }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { action, candidate } = ranked;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [snoozeOpen, setSnoozeOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const snoozeId = useId();

    const run = async (work: () => Promise<unknown>, after?: () => void) => {
        setBusy(true);
        setError(null);
        try {
            await work();
            after?.();
            onChanged();
        } catch (err) {
            if (err instanceof ConflictError) { setError(t('careeros.today.action.conflict', 'This action changed elsewhere. The list has been refreshed.')); onChanged(); }
            else { captureException(err, { context: 'today-action' }); setError(t('careeros.today.action.failed', 'That could not be saved. The action is unchanged.')); }
        } finally {
            setBusy(false);
        }
    };

    const begin = async () => {
        const route = destinationToRoute(action.destination);
        setBusy(true);
        setError(null);
        try {
            if (action.status === 'READY') {
                await actionRepo.start(userId, action.id, action.revision);
                void emit(userId, buildEvent('recommendation_accepted', { subjectRefs: { action: action.id }, payload: { actionType: action.actionType, source: action.source, rule: action.ruleVersion || null } }));
                onChanged();
            }
        } catch (err) {
            // A stale revision or an invalid transition must not block the person from reaching the work.
            if (!(err instanceof ConflictError)) captureException(err, { context: 'today-action-start' });
            onChanged();
        } finally {
            setBusy(false);
            navigate(route);
        }
    };

    const dismiss = () => run(async () => {
        await actionRepo.dismiss(userId, action.id, action.revision);
        void emit(userId, buildEvent('recommendation_dismissed', { subjectRefs: { action: action.id }, payload: { actionType: action.actionType, source: action.source } }));
    });

    const snooze = (days: number) => run(async () => {
        const until = new Date(Date.now() + days * DAY_MS);
        until.setHours(8, 0, 0, 0);
        await actionRepo.snooze(userId, action.id, action.revision, until.toISOString());
    }, () => setSnoozeOpen(false));

    const reportDone = () => run(async () => {
        try {
            await actionRepo.complete(userId, action.id, action.revision, { resultRef: { reportedAt: new Date().toISOString() }, completionSource: 'user_reported' });
        } catch (err) {
            // Rows not yet READY cannot complete in place; record the report on its own.
            if (!(err instanceof Error) || !err.message.startsWith('invalid_transition')) throw err;
            await actionRepo.recordUserReported(userId, { actionType: action.actionType, title: action.title, contextRefs: action.contextRefs, evidenceRefs: action.evidenceRefs, destination: action.destination, subjectId: action.id, resultRef: { actionId: action.id } });
            await actionRepo.dismiss(userId, action.id, action.revision);
        }
        void emit(userId, buildEvent('career_action_completed', { subjectRefs: { action: action.id }, payload: { actionType: action.actionType, completionSource: 'user_reported', goalLinked: Boolean(action.contextRefs.goal) } }));
    });

    const dominant = candidate ? explainDominantReason(candidate) : null;
    const reason = dominant ? `${dominant}. ${action.reason}` : action.reason;

    return (
        <li>
            <ActionCard
                title={action.title}
                reason={reason}
                source={sourceLabel(t, action)}
                status={action.status}
                priority={action.priorityBand}
                actionLabel={action.status === 'IN_PROGRESS' ? t('careeros.today.action.resume', 'Resume') : t('careeros.today.action.begin', 'Begin')}
                onAction={() => void begin()}
                onDismiss={() => void dismiss()}
                onSnooze={() => setSnoozeOpen((v) => !v)}
                effort={action.estimatedEffort && action.effortSource ? { label: action.estimatedEffort, source: action.effortSource === 'rule_estimate' ? t('careeros.today.action.ruleEstimate', 'rule estimate') : action.effortSource } : undefined}
                disabledReason={online ? undefined : t('careeros.today.action.offline', 'Needs a connection to start')}
            />
            <div className="-mt-2 rounded-b-2xl border border-t-0 border-border-default bg-surface-canvas px-4 pb-3 pt-4 text-[13px]">
                {action.resurfacedReason && (
                    <p className="mb-2 flex items-start gap-1.5 text-content-secondary">
                        <RotateCcw size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{t('careeros.today.action.resurfaced', 'Resurfaced because: {reason}').replace('{reason}', action.resurfacedReason.replace(/^Returned because\s*/i, ''))}</span>
                    </p>
                )}
                {action.evidenceRefs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-content-muted">{t('careeros.action.evidence', 'Based on')}:</span>
                        {action.evidenceRefs.slice(0, 5).map((ref) => {
                            const route = evidenceRefRoute(ref.kind, ref.id);
                            const chip = 'inline-flex max-w-full items-center rounded-full border border-border-default bg-surface-panel px-2 py-0.5 text-[11px] font-semibold text-content-secondary';
                            return route ? (
                                <button key={`${ref.kind}:${ref.id}`} type="button" onClick={() => navigate(route)} className={`${chip} tap-target hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}>
                                    <span className="truncate">{ref.label}</span>
                                </button>
                            ) : (
                                <span key={`${ref.kind}:${ref.id}`} className={chip}><span className="truncate">{ref.label}</span></span>
                            );
                        })}
                    </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button variant="quiet" size="sm" icon={<CheckCheck size={14} />} onClick={() => setReportOpen(true)} disabled={busy || !online}>
                        {t('careeros.today.action.didElsewhere', 'I did this elsewhere')}
                    </Button>
                </div>
                {snoozeOpen && (
                    <div id={snoozeId} role="group" aria-label={t('careeros.today.action.snoozeUntil', 'Snooze until')} className="mt-2 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void snooze(1)} loading={busy}>{t('careeros.today.action.snoozeTomorrow', 'Tomorrow')}</Button>
                        <Button variant="secondary" size="sm" onClick={() => void snooze(7)} loading={busy}>{t('careeros.today.action.snoozeWeek', 'Next week')}</Button>
                        <Button variant="quiet" size="sm" onClick={() => setSnoozeOpen(false)}>{t('btn.cancel', 'Cancel')}</Button>
                    </div>
                )}
                {error && <p role="alert" className="mt-2 text-status-danger">{error}</p>}
            </div>
            <ConfirmDialog
                open={reportOpen}
                title={t('careeros.today.action.reportTitle', 'Record this as done outside CVBase?')}
                description={t('careeros.today.action.reportDescription', 'It is recorded with source "reported by you" — not as a verified result — and leaves the queue.')}
                confirmLabel={t('careeros.today.action.reportConfirm', 'Record as done')}
                onCancel={() => setReportOpen(false)}
                onConfirm={() => { setReportOpen(false); void reportDone(); }}
            />
        </li>
    );
};

export const ActionQueue: React.FC<ActionQueueProps> = ({ userId, actions, loading, failed, online, onChanged, onRetry, top = 3 }) => {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const headingId = useId();
    const listId = useId();

    const visible = showAll ? actions : actions.slice(0, top);
    const rest = actions.length - top;

    return (
        <section aria-labelledby={headingId}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={headingId} className="text-base font-semibold text-content-primary">{t('careeros.today.actions.title', 'Next actions')}</h2>
                {actions.length > 0 && <span className="text-xs text-content-muted">{t('careeros.today.actions.count', '{count} eligible').replace('{count}', String(actions.length))}</span>}
            </div>
            <div className="mt-3">
                {loading ? (
                    <ul className="space-y-3" aria-busy="true">
                        <li><ActionCard title="" reason="" source="" status="READY" actionLabel="" onAction={() => undefined} loading /></li>
                        <li><ActionCard title="" reason="" source="" status="READY" actionLabel="" onAction={() => undefined} loading /></li>
                    </ul>
                ) : failed ? (
                    <StatePanel kind="error" title={t('careeros.today.actions.error', 'The action queue could not be loaded')} description={t('careeros.today.actions.errorDescription', 'Your records are unchanged. The rest of Today still works.')} onRetry={onRetry} />
                ) : actions.length === 0 ? (
                    <StatePanel
                        kind="empty"
                        title={t('careeros.today.actions.emptyTitle', 'Nothing is waiting on you')}
                        description={t('careeros.today.actions.emptyDescription', 'Actions appear when a rule finds one: an import to review, an interview coming up, a follow-up you set. Nothing is invented to fill this space.')}
                    />
                ) : (
                    <>
                        <ul id={listId} className="space-y-4">
                            {visible.map((ranked) => <ActionRow key={ranked.action.id} userId={userId} ranked={ranked} online={online} onChanged={onChanged} />)}
                        </ul>
                        {rest > 0 && (
                            <div className="mt-3">
                                <Button variant="quiet" size="sm" aria-expanded={showAll} aria-controls={listId} onClick={() => setShowAll((v) => !v)}>
                                    {showAll ? t('careeros.today.actions.showTop', 'Show top {count} only').replace('{count}', String(top)) : t('careeros.today.actions.showAll', 'Show all {count}').replace('{count}', String(actions.length))}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default ActionQueue;
