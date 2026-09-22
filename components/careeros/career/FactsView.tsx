import React, { useId, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { FactPatch } from '../../../services/careerOs/mappers';
import { ConflictError, type CareerFact, type FactKind } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Button, SkeletonCard, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { FactCard } from './FactCard';
import { FactEditor, FIELD_CLASS, LABEL_CLASS } from './FactEditor';
import { ImpactBanner } from './ImpactBanner';
import { VerifyDialog } from './VerifyDialog';
import { byRecency, kindLabel } from './factFormat';
import { useCareerFacts, useFactMutations, type EditImpact } from './useCareerFacts';
import { useOnline } from './useOnline';

/**
 * Experience, Education and Skills are the same screen over a different fact
 * kind: a list ordered newest first (skills by their sort order), inline
 * editing, confirm for candidates, verify with a recorded method, withdraw
 * and delete behind a confirm dialog. Large records page in steps.
 */
export interface FactsViewProps {
    kind: 'experience' | 'education' | 'skill';
}

const PAGE = 15;

interface SortOption { key: 'recent' | 'title' | 'state'; label: string }

const STATE_ORDER: Record<CareerFact['confirmationState'], number> = { verified: 0, user_confirmed: 1, inferred: 2, incomplete: 3 };

export const FactsView: React.FC<FactsViewProps> = ({ kind }) => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const online = useOnline();
    const facts = useCareerFacts();
    const mutations = useFactMutations(facts.data);
    const [editing, setEditing] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState<CareerFact | null>(null);
    const [removing, setRemoving] = useState<{ fact: CareerFact; mode: 'withdraw' | 'delete' } | null>(null);
    const [impact, setImpact] = useState<EditImpact | null>(null);
    const [adding, setAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newOrg, setNewOrg] = useState('');
    const [sort, setSort] = useState<SortOption['key']>('recent');
    const [shown, setShown] = useState(PAGE);
    const addId = useId();
    const sortId = useId();

    const list = useMemo(() => {
        const items = facts.active.filter((f) => f.kind === kind);
        const sorted = [...items];
        if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
        else if (sort === 'state') sorted.sort((a, b) => STATE_ORDER[a.confirmationState] - STATE_ORDER[b.confirmationState] || a.title.localeCompare(b.title));
        else if (kind === 'skill') sorted.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
        else sorted.sort(byRecency);
        return sorted;
    }, [facts.active, kind, sort]);

    const label = kindLabel(t, kind as FactKind);
    const sortOptions: SortOption[] = [
        { key: 'recent', label: kind === 'skill' ? t('careeros.career.sort.order', 'Your order') : t('careeros.career.sort.recent', 'Newest first') },
        { key: 'title', label: t('careeros.career.sort.title', 'By title') },
        { key: 'state', label: t('careeros.career.sort.state', 'By evidence state') },
    ];

    const run = async (fact: CareerFact | null, work: () => Promise<unknown>) => {
        setBusy(fact?.id ?? 'new');
        setError(null);
        try {
            await work();
        } catch (err) {
            if (err instanceof ConflictError) {
                setError(t('careeros.career.review.conflictError', 'This fact changed elsewhere. It has been reloaded; try again.'));
                void facts.refresh();
            } else {
                captureException(err, { context: `career-facts-${kind}` });
                setError(t('careeros.career.review.failed', 'That change could not be saved. Nothing was lost.'));
            }
        } finally {
            setBusy(null);
        }
    };

    const save = (fact: CareerFact, patch: FactPatch) => run(fact, async () => {
        const result = await mutations.edit(fact, patch);
        setEditing(null);
        if (result.impact.total > 0) setImpact(result);
    });

    const add = (event: React.FormEvent) => {
        event.preventDefault();
        if (!newTitle.trim()) return;
        void run(null, async () => {
            await mutations.create({ kind: kind as FactKind, title: newTitle, organization: newOrg, sortOrder: kind === 'skill' ? list.length + 1 : 0 });
            setNewTitle('');
            setNewOrg('');
            setAdding(false);
        });
    };

    return (
        <div className="space-y-4">
            {!online && <StatePanel kind="offline" compact description={t('careeros.career.offlineDescription', 'Your facts are shown from the last load. Edits need a connection.')} />}
            <div aria-live="polite" className="space-y-3">
                {error && <StatePanel kind="error" compact title={error} description="" />}
                {impact && userId && <ImpactBanner impact={impact} userId={userId} onDismiss={() => setImpact(null)} />}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <label htmlFor={sortId} className="text-xs font-semibold text-content-secondary">{t('careeros.career.sort.label', 'Sort')}</label>
                    <select id={sortId} value={sort} onChange={(e) => setSort(e.target.value as SortOption['key'])} className={`${FIELD_CLASS} w-auto py-2`}>
                        {sortOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </div>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAdding(true)} disabled={!online || adding}>
                    {t('careeros.career.add', 'Add {kind}').replace('{kind}', label.toLowerCase())}
                </Button>
            </div>

            {adding && (
                <form onSubmit={add} className="rounded-2xl border border-border-default bg-surface-panel p-4" aria-labelledby={`${addId}-legend`}>
                    <p id={`${addId}-legend`} className="text-sm font-semibold text-content-primary">{t('careeros.career.addTitle', 'New {kind}').replace('{kind}', label.toLowerCase())}</p>
                    <p className="mt-0.5 text-xs text-content-secondary">{t('careeros.career.addHint', 'Recorded as confirmed by you. You can add dates and details after saving.')}</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${addId}-title`} className={LABEL_CLASS}>{kind === 'education' ? t('careeros.career.editor.degree', 'Degree or qualification') : kind === 'skill' ? t('careeros.career.editor.skill', 'Skill') : t('careeros.career.editor.jobTitle', 'Job title')}</label>
                            <input id={`${addId}-title`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={`${FIELD_CLASS} mt-1`} required disabled={busy === 'new'} />
                        </div>
                        {kind !== 'skill' && (
                            <div>
                                <label htmlFor={`${addId}-org`} className={LABEL_CLASS}>{kind === 'education' ? t('careeros.career.editor.school', 'School') : t('careeros.career.editor.organization', 'Organisation')}</label>
                                <input id={`${addId}-org`} value={newOrg} onChange={(e) => setNewOrg(e.target.value)} className={`${FIELD_CLASS} mt-1`} disabled={busy === 'new'} />
                            </div>
                        )}
                    </div>
                    <div className="mt-3 flex gap-2">
                        <Button type="submit" variant="primary" size="sm" loading={busy === 'new'} disabled={!newTitle.trim()}>{t('btn.save', 'Save')}</Button>
                        <Button variant="quiet" size="sm" onClick={() => setAdding(false)} disabled={busy === 'new'}>{t('btn.cancel', 'Cancel')}</Button>
                    </div>
                </form>
            )}

            {facts.error !== null ? (
                <StatePanel kind="error" title={t('careeros.career.factsError', 'Your facts could not be loaded')} onRetry={() => void facts.refresh()} />
            ) : facts.loading && facts.data === null ? (
                <div className="space-y-3" aria-busy="true"><SkeletonCard compact /><SkeletonCard compact /><SkeletonCard compact /></div>
            ) : list.length === 0 ? (
                <StatePanel
                    kind="empty"
                    title={t('careeros.career.emptyKind', 'No {kind} recorded yet').replace('{kind}', label.toLowerCase())}
                    description={t('careeros.career.emptyKindDescription', 'Import a CV from the Evidence view or add one here. Nothing is filled in for you.')}
                    action={{ label: t('careeros.career.add', 'Add {kind}').replace('{kind}', label.toLowerCase()), onClick: () => setAdding(true) }}
                />
            ) : (
                <>
                    <ul className="space-y-3">
                        {list.slice(0, shown).map((fact) => (
                            <li key={fact.id}>
                                {editing === fact.id ? (
                                    <div className="rounded-2xl border border-border-default bg-surface-panel p-4">
                                        <FactEditor fact={fact} onSave={(patch) => save(fact, patch)} onCancel={() => setEditing(null)} saving={busy === fact.id} />
                                    </div>
                                ) : (
                                    <FactCard
                                        fact={fact}
                                        compact={kind === 'skill'}
                                        primaryAction={fact.reviewState === 'candidate'
                                            ? { label: t('careeros.career.review.confirm', 'Confirm'), loading: busy === fact.id, onClick: () => void run(fact, () => mutations.confirm(fact)) }
                                            : { label: t('careeros.career.review.edit', 'Edit'), onClick: () => setEditing(fact.id) }}
                                        secondaryActions={[
                                            ...(fact.reviewState === 'candidate' ? [{ label: t('careeros.career.review.edit', 'Edit'), onClick: () => setEditing(fact.id) }] : []),
                                            ...(fact.confirmationState !== 'verified' ? [{ label: t('careeros.career.verifyAction', 'Record verification'), onClick: () => setVerifying(fact) }] : []),
                                            { label: t('careeros.career.withdrawAction', 'Withdraw'), onClick: () => setRemoving({ fact, mode: 'withdraw' }) },
                                            { label: t('btn.delete', 'Delete'), onClick: () => setRemoving({ fact, mode: 'delete' }), destructive: true },
                                        ]}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                    {list.length > shown && (
                        <Button variant="quiet" size="sm" onClick={() => setShown((n) => n + PAGE)}>
                            {t('careeros.career.showMoreItems', 'Show {count} more').replace('{count}', String(Math.min(PAGE, list.length - shown)))}
                        </Button>
                    )}
                </>
            )}

            <VerifyDialog fact={verifying} onClose={() => setVerifying(null)} onVerify={(fact, verification) => run(fact, () => mutations.verify(fact, verification))} />
            <ConfirmDialog
                open={removing !== null}
                title={removing?.mode === 'delete' ? t('careeros.career.deleteTitle', 'Delete this fact?') : t('careeros.career.withdrawTitle', 'Withdraw this fact?')}
                description={removing?.mode === 'delete'
                    ? t('careeros.career.deleteDescription', 'The narrative is removed and the fact will not return on a re-import. Drafts that used it are marked out of date; submitted snapshots are unchanged.')
                    : t('careeros.career.withdrawDescription', 'The fact stops being used for new drafts but keeps its source. You can see it under Evidence.')}
                confirmLabel={removing?.mode === 'delete' ? t('btn.delete', 'Delete') : t('careeros.career.withdrawAction', 'Withdraw')}
                destructive={removing?.mode === 'delete'}
                onCancel={() => setRemoving(null)}
                onConfirm={() => {
                    const target = removing;
                    setRemoving(null);
                    if (!target) return;
                    void run(target.fact, () => (target.mode === 'delete' ? mutations.remove(target.fact) : mutations.withdraw(target.fact)));
                }}
            />
        </div>
    );
};

export default FactsView;
