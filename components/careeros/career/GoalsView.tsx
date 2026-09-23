import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import { ConflictError, NotFoundError, type CareerGoal } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Button, CareerGoalCard, Pill, SkeletonCard, StatePanel, FILTER_GROUP, filterTabClass } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { GoalForm, goalToValues, valuesToGoalInput, type GoalFormValues } from './GoalForm';
import { ScenarioPanel } from './ScenarioPanel';
import { formatDate, priorityLabel } from './factFormat';
import { useGoalMutations, useGoals } from './useGoals';
import { useOnline } from './useOnline';

/**
 * Goals (REQ-14): the list with an archived toggle, create and edit through
 * the shared form, an explicit "make primary" and archive. A goal's detail
 * shows its revisions (decision-time snapshots applications keep) and the
 * scenario comparison. No goal is ever created or promoted automatically.
 */
export interface GoalsViewProps {
    goalId?: string;
}

const GoalsList: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const online = useOnline();
    const goals = useGoals();
    const mutations = useGoalMutations();
    const [showArchived, setShowArchived] = useState(false);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [archiving, setArchiving] = useState<CareerGoal | null>(null);

    const create = async (values: GoalFormValues) => {
        setSaving(true);
        setError(null);
        try {
            await mutations.create(valuesToGoalInput(values, 'user'));
            setCreating(false);
        } catch (err) {
            captureException(err, { context: 'career-goal-create' });
            setError(t('careeros.goal.saveFailed', 'The goal could not be saved. Your entries are still here.'));
        } finally {
            setSaving(false);
        }
    };

    const run = async (goal: CareerGoal, work: () => Promise<unknown>) => {
        setBusy(goal.id);
        setError(null);
        try {
            await work();
        } catch (err) {
            if (err instanceof ConflictError) { setError(t('careeros.goal.conflict', 'This goal changed elsewhere. It has been reloaded; try again.')); void goals.refresh(); }
            else { captureException(err, { context: 'career-goal-mutation' }); setError(t('careeros.goal.saveFailed', 'The goal could not be saved. Your entries are still here.')); }
        } finally {
            setBusy(null);
        }
    };

    const list = showArchived ? goals.archived : goals.active;

    return (
        <div className="space-y-4">
            {!online && <StatePanel kind="offline" compact description={t('careeros.goal.offline', 'Goals are shown from the last load. Changes need a connection.')} />}
            <div aria-live="polite">{error && <StatePanel kind="error" compact title={error} description="" />}</div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div role="tablist" aria-label={t('careeros.goal.listFilter', 'Goals filter')} className={FILTER_GROUP}>
                    {[{ key: false, label: t('careeros.goal.active', 'Active') }, { key: true, label: t('careeros.goal.archivedList', 'Archived') }].map((tab) => (
                        <button
                            key={String(tab.key)}
                            type="button"
                            role="tab"
                            aria-selected={showArchived === tab.key}
                            onClick={() => setShowArchived(tab.key)}
                            className={filterTabClass(showArchived === tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)} disabled={!online || creating}>{t('careeros.goal.new', 'New goal')}</Button>
            </div>

            {creating && (
                <section aria-label={t('careeros.goal.new', 'New goal')} className="rounded-2xl border border-action-primary/40 bg-surface-panel p-5">
                    <h2 className="text-base font-semibold text-content-primary">{t('careeros.goal.new', 'New goal')}</h2>
                    <p className="mt-1 mb-4 text-sm text-content-secondary">{t('careeros.goal.newHint', 'Only a role or title is required. The first goal becomes your primary goal; you can change that later.')}</p>
                    <GoalForm onSubmit={create} onCancel={() => setCreating(false)} submitLabel={t('careeros.goal.create', 'Create goal')} saving={saving} />
                </section>
            )}

            {goals.error !== null ? (
                <StatePanel kind="error" title={t('careeros.goal.loadError', 'Your goals could not be loaded')} onRetry={() => void goals.refresh()} />
            ) : goals.loading && goals.data === null ? (
                <div className="space-y-3" aria-busy="true"><SkeletonCard /><SkeletonCard /></div>
            ) : list.length === 0 ? (
                <StatePanel
                    kind="empty"
                    title={showArchived ? t('careeros.goal.noArchived', 'No archived goals') : t('careeros.goal.noneTitle', 'No goals yet')}
                    description={showArchived ? '' : t('careeros.goal.noneDescription', 'A goal gives Opportunities and Coach a direction to judge against. Having none is fine until you want that.')}
                    action={showArchived ? undefined : { label: t('careeros.goal.new', 'New goal'), onClick: () => setCreating(true) }}
                />
            ) : (
                <ul className="cos-list">
                    {list.map((goal) => (
                        <li key={goal.id}>
                            <CareerGoalCard
                                title={goal.title || goal.role}
                                role={goal.role}
                                level={goal.level}
                                location={goal.location}
                                status={goal.status}
                                isPrimary={goal.isPrimary}
                                priorities={goal.priorities}
                                constraintCount={goal.constraints.length}
                                targetLabel={goal.targetDate ? t('careeros.goal.target', 'Target: {date}').replace('{date}', formatDate(goal.targetDate)) : null}
                                action={{ label: t('careeros.goal.open', 'Open'), onClick: () => navigate(careerPath.toGoal(goal.id)) }}
                                secondaryAction={goal.status === 'active' && !goal.isPrimary
                                    ? { label: t('careeros.goal.makePrimary', 'Make primary'), loading: busy === goal.id, onClick: () => void run(goal, () => mutations.setPrimary(goal)), disabledReason: online ? undefined : t('careeros.goal.offlineShort', 'Offline') }
                                    : goal.status === 'active' ? { label: t('careeros.goal.archive', 'Archive'), loading: busy === goal.id, onClick: () => setArchiving(goal) } : undefined}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog
                open={archiving !== null}
                title={t('careeros.goal.archiveTitle', 'Archive this goal?')}
                description={t('careeros.goal.archiveDescription', 'It stops being primary and is no longer used for new recommendations. Applications keep the goal snapshot they were started with.')}
                confirmLabel={t('careeros.goal.archive', 'Archive')}
                onCancel={() => setArchiving(null)}
                onConfirm={() => { const goal = archiving; setArchiving(null); if (goal) void run(goal, () => mutations.archive(goal)); }}
            />
        </div>
    );
};

const GoalDetail: React.FC<{ goalId: string }> = ({ goalId }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    const online = useOnline();
    const goals = useGoals();
    const mutations = useGoalMutations();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showRevisions, setShowRevisions] = useState(false);
    const goal = (goals.data ?? []).find((g) => g.id === goalId) ?? null;
    const revisions = useOwnedQuery<CareerGoal[]>(userId, userId && goal ? `goal:${goal.id}:revisions:${goal.revision}` : null, () => goalRepo.listRevisions(userId as string, goalId));
    const missing = useOwnedQuery<boolean>(userId, userId && goals.data && !goal ? `goal:${goalId}:missing` : null, async () => {
        try { await goalRepo.get(userId as string, goalId); return false; } catch (err) { if (err instanceof NotFoundError) return true; throw err; }
    });

    useEffect(() => { setEditing(false); }, [goalId]);

    const save = async (values: GoalFormValues) => {
        if (!goal) return;
        setSaving(true);
        setError(null);
        try {
            const input = valuesToGoalInput(values, goal.source, goal);
            const { isPrimary: _p, status: _s, source: _src, ...patch } = input;
            await mutations.update(goal, patch);
            setEditing(false);
        } catch (err) {
            if (err instanceof ConflictError) { setError(t('careeros.goal.conflict', 'This goal changed elsewhere. It has been reloaded; try again.')); void goals.refresh(); }
            else { captureException(err, { context: 'career-goal-update' }); setError(t('careeros.goal.saveFailed', 'The goal could not be saved. Your entries are still here.')); }
        } finally {
            setSaving(false);
        }
    };

    if (goals.error !== null) return <StatePanel kind="error" title={t('careeros.goal.loadError', 'Your goals could not be loaded')} onRetry={() => void goals.refresh()} />;
    if (goals.loading && goals.data === null) return <div className="space-y-3" aria-busy="true"><SkeletonCard /><SkeletonCard /></div>;
    if (!goal) {
        return (
            <StatePanel
                kind={missing.data ? 'empty' : 'error'}
                title={t('careeros.goal.notFound', 'This goal is not in your account')}
                description={t('careeros.goal.notFoundDescription', 'The link may be old or point at something you do not own. No other goal was opened instead.')}
                action={{ label: t('careeros.goal.backToGoals', 'Back to goals'), onClick: () => navigate(careerPath.toCareer('goals')) }}
            />
        );
    }

    const remoteLabel = goal.remotePreference ? t(`careeros.goal.form.remote.${goal.remotePreference}`, goal.remotePreference) : null;
    const comp = goal.compMin !== null || goal.compMax !== null
        ? [goal.compMin, goal.compMax].filter((v): v is number => v !== null).map((v) => v.toLocaleString()).join(' – ') + ` ${goal.compCurrency ?? ''}${goal.compPeriod ? ` / ${goal.compPeriod}` : ''}`
        : null;

    return (
        <div className="space-y-6">
            <div>
                <Button variant="quiet" size="sm" icon={<ArrowLeft size={14} />} onClick={() => navigate(careerPath.toCareer('goals'))}>{t('careeros.goal.backToGoals', 'Back to goals')}</Button>
            </div>
            {!online && <StatePanel kind="offline" compact description={t('careeros.goal.offline', 'Goals are shown from the last load. Changes need a connection.')} />}
            <div aria-live="polite">{error && <StatePanel kind="error" compact title={error} description="" />}</div>

            {editing ? (
                <section className="rounded-2xl border border-border-default bg-surface-panel p-5" aria-label={t('careeros.goal.edit', 'Edit goal')}>
                    <h2 className="mb-4 text-base font-semibold text-content-primary">{t('careeros.goal.edit', 'Edit goal')}</h2>
                    <p className="mb-4 text-sm text-content-secondary">{t('careeros.goal.editHint', 'Saving records a new revision and marks fit analyses for this goal out of date. Applications keep the snapshot they started with.')}</p>
                    <GoalForm initial={goalToValues(goal)} onSubmit={save} onCancel={() => setEditing(false)} submitLabel={t('btn.save', 'Save')} saving={saving} />
                </section>
            ) : (
                <section className="rounded-2xl border border-border-default bg-surface-panel p-5" aria-labelledby="goal-detail-title">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {goal.isPrimary && <Pill tone="accent">{t('careeros.goal.primary', 'Primary goal')}</Pill>}
                                {goal.status === 'archived' && <Pill>{t('careeros.goal.archived', 'Archived')}</Pill>}
                                <Pill mono>{t('careeros.goal.revision', 'Revision {n}').replace('{n}', String(goal.revision))}</Pill>
                            </div>
                            <h2 id="goal-detail-title" className="mt-2 text-xl font-semibold text-content-primary">{goal.title || goal.role}</h2>
                            <p className="mt-0.5 text-sm text-content-secondary">{[goal.role, goal.level, goal.industry, goal.location, remoteLabel].filter(Boolean).join(' · ')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {goal.status === 'active' && !goal.isPrimary && <Button variant="secondary" size="sm" onClick={() => void mutations.setPrimary(goal).catch((err) => { captureException(err, { context: 'career-goal-primary' }); setError(t('careeros.goal.saveFailed', 'The goal could not be saved. Your entries are still here.')); })} disabled={!online}>{t('careeros.goal.makePrimary', 'Make primary')}</Button>}
                            <Button variant="primary" size="sm" onClick={() => setEditing(true)} disabled={!online || goal.status === 'archived'}>{t('careeros.goal.edit', 'Edit goal')}</Button>
                        </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs text-content-muted">{t('careeros.goal.form.compensation', 'Compensation range (optional)')}</dt><dd className="text-content-primary">{comp ?? t('careeros.goal.unknown', 'Not recorded')}</dd></div>
                        <div><dt className="text-xs text-content-muted">{t('careeros.goal.form.targetDate', 'Target date')}</dt><dd className="text-content-primary">{goal.targetDate ? formatDate(goal.targetDate) : t('careeros.goal.unknown', 'Not recorded')}</dd></div>
                        <div><dt className="text-xs text-content-muted">{t('careeros.goal.form.employers', 'Target employers (comma separated)')}</dt><dd className="text-content-primary">{goal.targetEmployers.length ? goal.targetEmployers.join(', ') : t('careeros.goal.unknown', 'Not recorded')}</dd></div>
                        <div>
                            <dt className="text-xs text-content-muted">{t('careeros.goal.priorities', 'Priorities')}</dt>
                            <dd className="text-content-primary">{goal.priorities.length ? [...goal.priorities].sort((a, b) => b.weight - a.weight).map((p) => `${priorityLabel(t, p.key)} ${Math.round(p.weight * 5)}/5`).join(', ') : t('careeros.goal.unknown', 'Not recorded')}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs text-content-muted">{t('careeros.goal.form.constraints', 'Constraints')}</dt>
                            <dd className="text-content-primary">
                                {goal.constraints.length === 0 ? t('careeros.goal.unknown', 'Not recorded') : (
                                    <ul className="list-disc pl-5">{goal.constraints.map((c) => <li key={c.id}>{c.kind === 'hard' ? t('careeros.goal.form.hard', 'Must') : t('careeros.goal.form.soft', 'Prefer')}: {c.text}</li>)}</ul>
                                )}
                            </dd>
                        </div>
                    </dl>
                </section>
            )}

            <section aria-labelledby="goal-revisions" className="rounded-2xl border border-border-default bg-surface-panel p-5">
                <button type="button" onClick={() => setShowRevisions((v) => !v)} aria-expanded={showRevisions} className="tap-target inline-flex items-center rounded-lg text-base font-semibold text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                    <span id="goal-revisions">{t('careeros.goal.revisions', 'Revisions')}</span>
                </button>
                <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.goal.revisionsHint', 'Every save is recorded. An application keeps the revision it was started with, so older decisions stay explainable.')}</p>
                {showRevisions && (
                    revisions.error !== null ? <StatePanel kind="error" compact className="mt-3" onRetry={() => void revisions.refresh()} />
                        : revisions.loading && revisions.data === null ? <p className="mt-3 text-sm text-content-secondary">{t('label.loading', 'Loading')}</p>
                            : (revisions.data ?? []).length === 0 ? <p className="mt-3 text-sm text-content-secondary">{t('careeros.goal.noRevisions', 'No earlier revisions recorded.')}</p>
                                : (
                                    <ol className="mt-3 divide-y divide-border-default">
                                        {[...(revisions.data ?? [])].reverse().map((rev) => (
                                            <li key={rev.revision} className="py-2 text-sm">
                                                <span className="font-semibold text-content-primary">{t('careeros.goal.revision', 'Revision {n}').replace('{n}', String(rev.revision))}</span>
                                                <span className="text-content-muted"> · {formatDate(rev.updatedAt)}</span>
                                                <p className="text-content-secondary">{[rev.title || rev.role, rev.level, rev.location, rev.remotePreference].filter(Boolean).join(' · ')}</p>
                                            </li>
                                        ))}
                                    </ol>
                                )
                )}
            </section>

            <ScenarioPanel goal={goal} goals={goals.active} />
        </div>
    );
};

export const GoalsView: React.FC<GoalsViewProps> = ({ goalId }) => (goalId ? <GoalDetail goalId={goalId} /> : <GoalsList />);

export default GoalsView;
