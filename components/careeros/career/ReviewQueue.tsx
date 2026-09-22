import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import type { FactPatch } from '../../../services/careerOs/mappers';
import { ConflictError, type CareerFact } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Button, EvidenceBadge, StatePanel } from '../primitives';
import { FactCard } from './FactCard';
import { FactEditor } from './FactEditor';
import { ImpactBanner } from './ImpactBanner';
import { factTitle, kindLabel, periodLabel, sourceLabel } from './factFormat';
import type { EditImpact, FactMutations } from './useCareerFacts';

/**
 * The review queue shared by onboarding and the Evidence view: unconfirmed
 * candidates to confirm, edit or discard one by one (or all at once), and
 * contradictions shown side by side so the person picks which version is
 * theirs. Nothing is merged automatically; a re-import cannot resurrect what
 * was discarded because the tombstone keeps the fingerprint.
 */
export interface ReviewQueueProps {
    userId: string;
    /** All facts (any status). */
    facts: CareerFact[];
    mutations: FactMutations;
    /** Called after every durable change so the caller can refresh derived state. */
    onChanged?: () => void;
    /** Subject id for the career_import_reviewed event. */
    resumeId?: string;
    pageSize?: number;
}

const PAGE = 20;

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ userId, facts, mutations, onChanged, resumeId, pageSize = PAGE }) => {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [discarding, setDiscarding] = useState<CareerFact | null>(null);
    const [impact, setImpact] = useState<EditImpact | null>(null);
    const [shown, setShown] = useState(pageSize);
    const [confirmingAll, setConfirmingAll] = useState(false);

    const active = useMemo(() => facts.filter((f) => f.status === 'active'), [facts]);
    const candidates = useMemo(() => active.filter((f) => f.reviewState === 'candidate'), [active]);
    const conflictGroups = useMemo(() => {
        const groups = new Map<string, CareerFact[]>();
        for (const fact of active) {
            if (fact.reviewState === 'conflict' && fact.conflictGroup) groups.set(fact.conflictGroup, [...(groups.get(fact.conflictGroup) ?? []), fact]);
        }
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [active]);

    const run = async (fact: CareerFact, work: () => Promise<unknown>) => {
        setBusy(fact.id);
        setError(null);
        try {
            await work();
            onChanged?.();
        } catch (err) {
            if (err instanceof ConflictError) setError(t('careeros.career.review.conflictError', 'This fact changed elsewhere. It has been reloaded; try again.'));
            else {
                captureException(err, { context: 'career-review' });
                setError(t('careeros.career.review.failed', 'That change could not be saved. Nothing was lost.'));
            }
            onChanged?.();
        } finally {
            setBusy(null);
        }
    };

    const save = async (fact: CareerFact, patch: FactPatch) => {
        await run(fact, async () => {
            const result = await mutations.edit(fact, patch);
            setEditing(null);
            if (result.impact.total > 0) setImpact(result);
        });
    };

    const confirmAll = async () => {
        setConfirmingAll(true);
        setError(null);
        try {
            await mutations.confirmAll(candidates, resumeId);
            onChanged?.();
        } catch (err) {
            captureException(err, { context: 'career-review-confirm-all' });
            setError(t('careeros.career.review.failed', 'That change could not be saved. Nothing was lost.'));
        } finally {
            setConfirmingAll(false);
        }
    };

    const total = candidates.length + conflictGroups.length;

    return (
        <div className="space-y-4">
            <div aria-live="polite">
                {error && <StatePanel kind="error" compact title={error} description="" />}
                {impact && <ImpactBanner impact={impact} userId={userId} onDismiss={() => setImpact(null)} />}
            </div>

            {total === 0 ? (
                <StatePanel
                    kind="empty"
                    title={t('careeros.career.review.emptyTitle', 'Nothing waiting for review')}
                    description={t('careeros.career.review.emptyDescription', 'Imported claims appear here as candidates until you confirm, edit or discard them.')}
                />
            ) : (
                <>
                    {conflictGroups.length > 0 && (
                        <section aria-labelledby="review-conflicts" className="space-y-3">
                            <h3 id="review-conflicts" className="text-sm font-semibold text-content-primary">
                                {t('careeros.career.review.conflictsTitle', '{count} contradictions to resolve').replace('{count}', String(conflictGroups.length))}
                            </h3>
                            <p className="text-[13px] text-content-secondary">{t('careeros.career.review.conflictsDescription', 'Two versions of the same claim disagree. Keep the one that is right; the other is withdrawn with its source recorded.')}</p>
                            {conflictGroups.map(([groupId, members]) => (
                                <div key={groupId} className="rounded-2xl border border-status-warning/30 bg-surface-panel p-4">
                                    <p className="text-sm font-semibold text-content-primary">{factTitle(members[0])}</p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        {members.map((member) => (
                                            <div key={member.id} className="flex flex-col rounded-xl border border-border-default bg-surface-canvas p-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <EvidenceBadge state={member.confirmationState} />
                                                    <span className="text-xs text-content-muted">{sourceLabel(t, member.sourceKind)}</span>
                                                </div>
                                                <dl className="mt-2 space-y-1 text-[13px]">
                                                    <div><dt className="inline text-content-muted">{t('careeros.career.editor.title', 'Title')}: </dt><dd className="inline text-content-primary">{member.title || '—'}</dd></div>
                                                    {member.organization && <div><dt className="inline text-content-muted">{t('careeros.career.editor.organization', 'Organisation')}: </dt><dd className="inline text-content-primary">{member.organization}</dd></div>}
                                                    <div><dt className="inline text-content-muted">{t('careeros.career.review.period', 'Period')}: </dt><dd className="inline text-content-primary">{periodLabel(t, member) || '—'}</dd></div>
                                                    {member.narrative && <div><dt className="sr-only">{t('careeros.career.editor.description', 'Description')}</dt><dd className="line-clamp-3 whitespace-pre-line text-content-secondary">{member.narrative.replace(/<[^>]+>/g, ' ')}</dd></div>}
                                                </dl>
                                                <div className="mt-auto pt-3">
                                                    <Button variant="primary" size="sm" loading={busy === member.id} onClick={() => void run(member, () => mutations.resolveConflict(groupId, member.id))}>
                                                        {t('careeros.career.review.keepThis', 'Keep this one')}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {candidates.length > 0 && (
                        <section aria-labelledby="review-candidates" className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 id="review-candidates" className="text-sm font-semibold text-content-primary">
                                    {t('careeros.career.review.candidatesTitle', '{count} candidates waiting for you').replace('{count}', String(candidates.length))}
                                </h3>
                                <Button variant="secondary" size="sm" onClick={() => void confirmAll()} loading={confirmingAll}>
                                    {t('careeros.career.review.confirmAll', 'Confirm all {count}').replace('{count}', String(candidates.length))}
                                </Button>
                            </div>
                            <p className="text-[13px] text-content-secondary">{t('careeros.career.review.candidatesDescription', 'Confirming marks a claim as yours. It does not make it verified — that needs a recorded method and source.')}</p>
                            <ul className="space-y-3">
                                {candidates.slice(0, shown).map((fact) => (
                                    <li key={fact.id}>
                                        {editing === fact.id ? (
                                            <div className="rounded-2xl border border-border-default bg-surface-panel p-4">
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">{kindLabel(t, fact.kind)}</p>
                                                <FactEditor fact={fact} onSave={(patch) => save(fact, patch)} onCancel={() => setEditing(null)} saving={busy === fact.id} />
                                            </div>
                                        ) : (
                                            <FactCard
                                                fact={fact}
                                                compact
                                                primaryAction={{ label: t('careeros.career.review.confirm', 'Confirm'), loading: busy === fact.id, onClick: () => void run(fact, () => mutations.confirm(fact)) }}
                                                secondaryActions={[
                                                    { label: t('careeros.career.review.edit', 'Edit'), onClick: () => setEditing(fact.id) },
                                                    { label: t('careeros.career.review.discard', 'Discard'), onClick: () => setDiscarding(fact), destructive: true },
                                                ]}
                                            />
                                        )}
                                    </li>
                                ))}
                            </ul>
                            {candidates.length > shown && (
                                <Button variant="quiet" size="sm" onClick={() => setShown((n) => n + pageSize)}>
                                    {t('careeros.career.review.showMore', 'Show {count} more').replace('{count}', String(Math.min(pageSize, candidates.length - shown)))}
                                </Button>
                            )}
                        </section>
                    )}
                </>
            )}

            <ConfirmDialog
                open={discarding !== null}
                title={t('careeros.career.review.discardTitle', 'Discard this candidate?')}
                description={t('careeros.career.review.discardDescription', 'It is removed from review and will not come back on a re-import. The source CV is unchanged.')}
                confirmLabel={t('careeros.career.review.discard', 'Discard')}
                destructive
                onCancel={() => setDiscarding(null)}
                onConfirm={() => { const fact = discarding; setDiscarding(null); if (fact) void run(fact, () => mutations.remove(fact)); }}
            />
        </div>
    );
};

export default ReviewQueue;
