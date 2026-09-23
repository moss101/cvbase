import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as factRepo from '../../../services/careerOs/factRepo';
import type { StaleReference } from '../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button, Notice, SkeletonCard, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { FactCard } from './FactCard';
import { ImportPanel } from './ImportPanel';
import { ReviewQueue } from './ReviewQueue';
import type { ImportResult } from './importResume';
import { useCareerFacts, useFactMutations } from './useCareerFacts';
import { useOnline } from './useOnline';

/**
 * Evidence: the review queue for imported candidates and contradictions,
 * the import panel, the drafts built from older versions of facts, and the
 * withdrawn facts with their provenance. The one place where claims enter or
 * leave career memory.
 */
export const EvidenceView: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId, invalidate } = useCareerOs();
    const online = useOnline();
    const facts = useCareerFacts();
    const mutations = useFactMutations(facts.data);
    const stale = useOwnedQuery<StaleReference[]>(userId, userId ? 'staleRefs' : null, () => factRepo.staleReferences(userId as string));
    const [lastImport, setLastImport] = useState<ImportResult | null>(null);
    const [showWithdrawn, setShowWithdrawn] = useState(false);
    const [showImport, setShowImport] = useState(false);

    const withdrawn = useMemo(() => (facts.data ?? []).filter((f) => f.status === 'withdrawn'), [facts.data]);
    const staleByFact = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const ref of stale.data ?? []) map.set(ref.factId, new Set([...(map.get(ref.factId) ?? []), `${ref.artifactKind}:${ref.artifactId}`]));
        return map;
    }, [stale.data]);
    const staleArtifacts = new Set((stale.data ?? []).map((r) => `${r.artifactKind}:${r.artifactId}`)).size;

    const onImported = (result: ImportResult) => {
        setLastImport(result);
        setShowImport(false);
        invalidate('facts');
        invalidate('today');
    };

    if (!userId) return null;

    return (
        <div className="space-y-6">
            {!online && <StatePanel kind="offline" compact description={t('careeros.career.offlineDescription', 'Your facts are shown from the last load. Edits need a connection.')} />}

            <div aria-live="polite">
                {lastImport && (
                    <StatePanel
                        kind="partial"
                        title={lastImport.inserted.length === 0
                            ? t('careeros.import.resultNone', 'Nothing new: every claim in that CV was already recorded')
                            : t('careeros.import.resultTitle', '{count} candidate facts added for review').replace('{count}', String(lastImport.inserted.length))}
                        description={t('careeros.import.resultDescription', '{parsed} read · {duplicates} already recorded · {conflicts} contradictions to resolve')
                            .replace('{parsed}', String(lastImport.parsed)).replace('{duplicates}', String(lastImport.duplicates + lastImport.withinImport)).replace('{conflicts}', String(lastImport.conflicts))}
                        action={{ label: t('btn.close', 'Close'), onClick: () => setLastImport(null) }}
                    />
                )}
            </div>

            {staleArtifacts > 0 && (
                <div className="space-y-3">
                    <Notice
                        tone="warning"
                        title={t('careeros.career.staleTitle', '{count} drafts use older versions of your facts').replace('{count}', String(staleArtifacts))}
                        action={<Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toSpace('applications'))}>{t('careeros.career.openApplications', 'Open applications')}</Button>}
                    >
                        {t('careeros.career.staleEvidenceDescription', 'The facts below changed after these drafts were written. Open the application to review each draft; submitted snapshots stay as they were.')}
                    </Notice>
                    <ul className="cos-list">
                        {(facts.data ?? []).filter((f) => staleByFact.has(f.id)).slice(0, 10).map((fact) => (
                            <li key={fact.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                                <span className="text-content-primary">{fact.title || fact.kind}</span>
                                <span className="text-xs tabular-nums text-content-muted">{t('careeros.career.staleCount', '{count} drafts').replace('{count}', String(staleByFact.get(fact.id)?.size ?? 0))}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <section aria-labelledby="evidence-review">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="evidence-review" className="text-base font-semibold text-content-primary">{t('careeros.career.evidence.reviewTitle', 'Review queue')}</h2>
                    <Button variant={showImport ? 'quiet' : 'primary'} size="sm" onClick={() => setShowImport((v) => !v)} disabled={!online} aria-expanded={showImport}>
                        {showImport ? t('btn.cancel', 'Cancel') : t('careeros.career.evidence.importMore', 'Import more')}
                    </Button>
                </div>
                {showImport && (
                    <div className="mt-3">
                        <ImportPanel userId={userId} existingFacts={facts.data ?? []} onImported={onImported} />
                    </div>
                )}
                <div className="mt-3">
                    {facts.error !== null ? (
                        <StatePanel kind="error" title={t('careeros.career.factsError', 'Your facts could not be loaded')} onRetry={() => void facts.refresh()} />
                    ) : facts.loading && facts.data === null ? (
                        <div className="space-y-3" aria-busy="true"><SkeletonCard compact /><SkeletonCard compact /></div>
                    ) : (
                        <ReviewQueue userId={userId} facts={facts.data ?? []} mutations={mutations} onChanged={() => void facts.refresh()} />
                    )}
                </div>
            </section>

            {withdrawn.length > 0 && (
                <section aria-labelledby="evidence-withdrawn">
                    <button
                        type="button"
                        onClick={() => setShowWithdrawn((v) => !v)}
                        aria-expanded={showWithdrawn}
                        className="tap-target inline-flex items-center rounded-lg text-sm font-semibold text-content-secondary hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                        <span id="evidence-withdrawn">{t('careeros.career.evidence.withdrawn', '{count} withdrawn facts').replace('{count}', String(withdrawn.length))}</span>
                    </button>
                    {showWithdrawn && (
                        <ul className="cos-list mt-3">
                            {withdrawn.slice(0, 20).map((fact) => (
                                <li key={fact.id}><FactCard fact={fact} compact /></li>
                            ))}
                        </ul>
                    )}
                </section>
            )}
        </div>
    );
};

export default EvidenceView;
