import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as factRepo from '../../../services/careerOs/factRepo';
import type { FactPatch } from '../../../services/careerOs/mappers';
import { ConflictError, type CareerFact } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { AchievementCard, Button, SkeletonCard, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { FactEditor } from './FactEditor';
import { ImpactBanner } from './ImpactBanner';
import { byRecency, factTitle, periodLabel, sourceLabel } from './factFormat';
import { useCareerFacts, useFactMutations, type EditImpact } from './useCareerFacts';
import { useOnline } from './useOnline';

/**
 * Achievements: what was done, where, with an optional metric and the facts
 * that back it up. Capturing one needs no job search. "Used in" comes from
 * the fact reference edges, so editing a referenced achievement reports which
 * drafts depend on it.
 */
const PAGE = 12;

const blankAchievement = (): CareerFact => ({
    id: 'new', kind: 'achievement', title: '', organization: '', location: '', startDate: '', endDate: '', narrative: '', payload: {},
    parentFactId: null, confirmationState: 'user_confirmed', verification: null, extractionConfidence: null, sourceKind: 'manual', sourceRef: {},
    sourceFingerprint: null, legacyId: null, conflictGroup: null, reviewState: 'reviewed', status: 'active', sortOrder: 0, revision: 0, createdAt: '', updatedAt: '',
});

export const AchievementsView: React.FC = () => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const online = useOnline();
    const facts = useCareerFacts();
    const mutations = useFactMutations(facts.data);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [removing, setRemoving] = useState<CareerFact | null>(null);
    const [impact, setImpact] = useState<EditImpact | null>(null);
    const [usedIn, setUsedIn] = useState<Record<string, number>>({});
    const [shown, setShown] = useState(PAGE);

    const achievements = useMemo(() => facts.active.filter((f) => f.kind === 'achievement').sort(byRecency), [facts.active]);
    const experience = useMemo(() => facts.active.filter((f) => f.kind === 'experience').sort(byRecency), [facts.active]);
    const experienceOptions = useMemo(() => experience.map((f) => ({ id: f.id, label: factTitle(f) })), [experience]);
    const evidenceOptions = useMemo(() => facts.active.filter((f) => f.kind !== 'achievement' && f.kind !== 'summary').map((f) => ({ id: f.id, label: factTitle(f) })), [facts.active]);
    const parentLabel = (fact: CareerFact): string | undefined => {
        const parent = fact.parentFactId ? experience.find((e) => e.id === fact.parentFactId) : undefined;
        return parent ? factTitle(parent) : undefined;
    };

    // "Used in" counts, bounded to the visible page so a large record does not fan out.
    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const visible = achievements.slice(0, shown).filter((a) => usedIn[a.id] === undefined);
        if (visible.length === 0) return;
        Promise.all(visible.map(async (a) => {
            try { return [a.id, new Set((await factRepo.listForFact(userId, a.id)).map((r) => `${r.artifactKind}:${r.artifactId}`)).size] as const; }
            catch { return [a.id, -1] as const; }
        })).then((pairs) => {
            if (cancelled) return;
            setUsedIn((prev) => ({ ...prev, ...Object.fromEntries(pairs.filter(([, n]) => n >= 0)) }));
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, achievements, shown]);

    const run = async (id: string, work: () => Promise<unknown>) => {
        setBusy(id);
        setError(null);
        try {
            await work();
        } catch (err) {
            if (err instanceof ConflictError) {
                setError(t('careeros.career.review.conflictError', 'This fact changed elsewhere. It has been reloaded; try again.'));
                void facts.refresh();
            } else {
                captureException(err, { context: 'career-achievements' });
                setError(t('careeros.career.review.failed', 'That change could not be saved. Nothing was lost.'));
            }
        } finally {
            setBusy(null);
        }
    };

    const create = (patch: FactPatch) => run('new', async () => {
        await mutations.create({
            kind: 'achievement',
            title: patch.title ?? '',
            narrative: patch.narrative ?? '',
            startDate: patch.startDate,
            endDate: patch.endDate,
            payload: patch.payload ?? {},
            parentFactId: patch.parentFactId ?? null,
        });
        setCreating(false);
    });

    const save = (fact: CareerFact, patch: FactPatch) => run(fact.id, async () => {
        const result = await mutations.edit(fact, patch);
        setEditing(null);
        setUsedIn((prev) => { const next = { ...prev }; delete next[fact.id]; return next; });
        if (result.impact.total > 0) setImpact(result);
    });

    return (
        <div className="space-y-4">
            {!online && <StatePanel kind="offline" compact description={t('careeros.career.offlineDescription', 'Your facts are shown from the last load. Edits need a connection.')} />}
            <div aria-live="polite" className="space-y-3">
                {error && <StatePanel kind="error" compact title={error} description="" />}
                {impact && userId && <ImpactBanner impact={impact} userId={userId} onDismiss={() => setImpact(null)} />}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-content-secondary">{t('careeros.career.achievements.intro', 'Capture results as they happen. Each one can cite the facts behind it and is reused across applications.')}</p>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)} disabled={!online || creating}>
                    {t('careeros.career.captureAchievement', 'Capture an achievement')}
                </Button>
            </div>

            {creating && (
                <div className="rounded-2xl border border-action-primary/40 bg-surface-panel p-4">
                    <p className="mb-3 text-sm font-semibold text-content-primary">{t('careeros.career.achievements.newTitle', 'New achievement')}</p>
                    <FactEditor fact={blankAchievement()} experienceOptions={experienceOptions} evidenceOptions={evidenceOptions} onSave={create} onCancel={() => setCreating(false)} saving={busy === 'new'} />
                </div>
            )}

            {facts.error !== null ? (
                <StatePanel kind="error" title={t('careeros.career.factsError', 'Your facts could not be loaded')} onRetry={() => void facts.refresh()} />
            ) : facts.loading && facts.data === null ? (
                <div className="space-y-3" aria-busy="true"><SkeletonCard /><SkeletonCard /></div>
            ) : achievements.length === 0 ? (
                !creating && (
                    <StatePanel
                        kind="empty"
                        title={t('careeros.career.achievements.emptyTitle', 'No achievements captured yet')}
                        description={t('careeros.career.achievements.emptyDescription', 'A result you can point to — a number, a delivery, a change — is the strongest evidence you can keep. It does not need a job search.')}
                        action={{ label: t('careeros.career.captureAchievement', 'Capture an achievement'), onClick: () => setCreating(true) }}
                    />
                )
            ) : (
                <>
                    <ul className="cos-list">
                        {achievements.slice(0, shown).map((fact) => (
                            <li key={fact.id}>
                                {editing === fact.id ? (
                                    <div className="px-6 py-5">
                                        <FactEditor fact={fact} experienceOptions={experienceOptions} evidenceOptions={evidenceOptions} onSave={(patch) => save(fact, patch)} onCancel={() => setEditing(null)} saving={busy === fact.id} />
                                    </div>
                                ) : (
                                    <AchievementCard
                                        title={fact.title || t('careeros.career.untitled', 'Untitled')}
                                        organization={parentLabel(fact)}
                                        periodLabel={periodLabel(t, fact) || undefined}
                                        narrative={fact.narrative.replace(/<[^>]+>/g, ' ').trim() || undefined}
                                        metric={fact.payload}
                                        confirmationState={fact.confirmationState}
                                        reviewState={fact.reviewState}
                                        sourceLabel={[
                                            sourceLabel(t, fact.sourceKind),
                                            usedIn[fact.id] === undefined ? null : usedIn[fact.id] === 0 ? t('careeros.career.usedInNone', 'Not used in any draft') : t('careeros.career.usedIn', 'Used in {count} drafts').replace('{count}', String(usedIn[fact.id])),
                                        ].filter(Boolean).join(' · ')}
                                        action={fact.reviewState === 'candidate'
                                            ? { label: t('careeros.career.review.confirm', 'Confirm'), loading: busy === fact.id, onClick: () => void run(fact.id, () => mutations.confirm(fact)) }
                                            : { label: t('careeros.career.review.edit', 'Edit'), onClick: () => setEditing(fact.id) }}
                                        secondaryAction={{ label: t('btn.delete', 'Delete'), onClick: () => setRemoving(fact) }}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                    {achievements.length > shown && (
                        <Button variant="quiet" size="sm" onClick={() => setShown((n) => n + PAGE)}>
                            {t('careeros.career.showMoreItems', 'Show {count} more').replace('{count}', String(Math.min(PAGE, achievements.length - shown)))}
                        </Button>
                    )}
                </>
            )}

            <ConfirmDialog
                open={removing !== null}
                title={t('careeros.career.deleteTitle', 'Delete this fact?')}
                description={t('careeros.career.deleteDescription', 'The narrative is removed and the fact will not return on a re-import. Drafts that used it are marked out of date; submitted snapshots are unchanged.')}
                confirmLabel={t('btn.delete', 'Delete')}
                destructive
                onCancel={() => setRemoving(null)}
                onConfirm={() => { const fact = removing; setRemoving(null); if (fact) void run(fact.id, () => mutations.remove(fact)); }}
            />
        </div>
    );
};

export default AchievementsView;
