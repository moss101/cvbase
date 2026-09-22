import React, { useId, useState } from 'react';
import { Award, Pencil } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as careerProfileRepo from '../../../services/careerOs/careerProfileRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import { ConflictError, type StaleReference } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button, CareerGoalCard, Skeleton, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { CareerTimeline } from './CareerTimeline';
import { FIELD_CLASS } from './FactEditor';
import { countByConfirmation, formatDate } from './factFormat';
import { useCareerFacts } from './useCareerFacts';
import { useGoals } from './useGoals';
import { useOnline } from './useOnline';

/**
 * Career overview: the headline, progression, how much of the record is
 * confirmed, the primary goal and one dominant action — capture an
 * achievement — which works without any job search (journey J10). A banner
 * says when drafts were built from older versions of facts.
 */
export const OverviewView: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId, profile, refreshProfile } = useCareerOs();
    const online = useOnline();
    const facts = useCareerFacts();
    const goals = useGoals();
    const stale = useOwnedQuery<StaleReference[]>(userId, userId ? 'staleRefs' : null, () => factRepo.staleReferences(userId as string));
    const [editingHeadline, setEditingHeadline] = useState(false);
    const [headline, setHeadline] = useState('');
    const [savingHeadline, setSavingHeadline] = useState(false);
    const [headlineError, setHeadlineError] = useState<string | null>(null);
    const headlineId = useId();

    const counts = countByConfirmation(facts.active);
    const staleArtifacts = new Set((stale.data ?? []).map((r) => `${r.artifactKind}:${r.artifactId}`)).size;

    const saveHeadline = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!userId || !profile) return;
        setSavingHeadline(true);
        setHeadlineError(null);
        try {
            await careerProfileRepo.updateHeadline(userId, headline.trim(), profile.revision);
            await refreshProfile();
            setEditingHeadline(false);
        } catch (err) {
            if (err instanceof ConflictError) {
                setHeadlineError(t('careeros.career.headlineConflict', 'Your profile changed elsewhere. It has been reloaded; try again.'));
                void refreshProfile();
            } else {
                captureException(err, { context: 'career-headline' });
                setHeadlineError(t('careeros.career.headlineFailed', 'The headline could not be saved.'));
            }
        } finally {
            setSavingHeadline(false);
        }
    };

    const rows: Array<{ key: string; label: string; value: number; tone: string }> = [
        { key: 'verified', label: t('careeros.evidence.verified', 'Verified'), value: counts.verified, tone: 'text-evidence-verified' },
        { key: 'confirmed', label: t('careeros.evidence.userConfirmed', 'Confirmed by you'), value: counts.user_confirmed, tone: 'text-evidence-confirmed' },
        { key: 'inferred', label: t('careeros.evidence.inferred', 'Inferred'), value: counts.inferred, tone: 'text-evidence-inferred' },
        { key: 'incomplete', label: t('careeros.evidence.incomplete', 'Incomplete'), value: counts.incomplete, tone: 'text-evidence-incomplete' },
    ];

    return (
        <div className="space-y-6">
            {!online && <StatePanel kind="offline" compact description={t('careeros.career.offlineDescription', 'Your facts are shown from the last load. Edits need a connection.')} />}

            <section aria-labelledby={`${headlineId}-label`} className="rounded-2xl border border-border-default bg-surface-panel p-5">
                <p id={`${headlineId}-label`} className="font-label text-[10px] uppercase tracking-[0.14em] text-content-muted">{t('careeros.career.headline', 'Headline')}</p>
                {profile === null ? (
                    <Skeleton variant="title" width="50%" className="mt-2" />
                ) : editingHeadline ? (
                    <form onSubmit={(event) => void saveHeadline(event)} className="mt-2 space-y-2">
                        <label htmlFor={headlineId} className="sr-only">{t('careeros.career.headline', 'Headline')}</label>
                        <input id={headlineId} value={headline} onChange={(e) => setHeadline(e.target.value)} className={FIELD_CLASS} maxLength={160} disabled={savingHeadline} placeholder={t('careeros.career.headlinePlaceholder', 'One line on where you are professionally')} />
                        {headlineError && <p role="alert" className="text-xs text-status-danger">{headlineError}</p>}
                        <div className="flex gap-2">
                            <Button type="submit" variant="primary" size="sm" loading={savingHeadline}>{t('btn.save', 'Save')}</Button>
                            <Button variant="quiet" size="sm" onClick={() => setEditingHeadline(false)} disabled={savingHeadline}>{t('btn.cancel', 'Cancel')}</Button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                        <p className={`text-lg font-semibold ${profile.headline ? 'text-content-primary' : 'text-content-muted'}`}>
                            {profile.headline || t('careeros.career.headlineEmpty', 'No headline yet')}
                        </p>
                        <Button variant="quiet" size="sm" icon={<Pencil size={14} />} onClick={() => { setHeadline(profile.headline); setEditingHeadline(true); }} disabled={!online}>
                            {profile.headline ? t('careeros.career.editHeadline', 'Edit') : t('careeros.career.addHeadline', 'Add headline')}
                        </Button>
                    </div>
                )}
            </section>

            {staleArtifacts > 0 && (
                <StatePanel
                    kind="partial"
                    title={t('careeros.career.staleTitle', '{count} drafts use older versions of your facts').replace('{count}', String(staleArtifacts))}
                    description={t('careeros.career.staleDescription', 'Review what changed and decide whether each draft should follow. Submitted snapshots stay as they were.')}
                    action={{ label: t('careeros.career.openEvidence', 'Open evidence'), onClick: () => navigate(careerPath.toCareer('evidence')) }}
                />
            )}

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <section aria-labelledby="overview-progression" className="rounded-2xl border border-border-default bg-surface-panel p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="overview-progression" className="text-base font-semibold text-content-primary">{t('careeros.career.progression', 'Progression')}</h2>
                        <Button variant="primary" size="sm" icon={<Award size={14} />} onClick={() => navigate(careerPath.toCareer('achievements'))} disabled={!online}>
                            {t('careeros.career.captureAchievement', 'Capture an achievement')}
                        </Button>
                    </div>
                    <div className="mt-4">
                        {facts.error !== null ? (
                            <StatePanel kind="error" compact title={t('careeros.career.factsError', 'Your facts could not be loaded')} onRetry={() => void facts.refresh()} />
                        ) : (
                            <CareerTimeline facts={facts.active} loading={facts.loading && facts.data === null} onOpen={() => navigate(careerPath.toCareer('experience'))} />
                        )}
                    </div>
                </section>

                <div className="space-y-6">
                    <section aria-labelledby="overview-counts" className="rounded-2xl border border-border-default bg-surface-panel p-5">
                        <h2 id="overview-counts" className="text-base font-semibold text-content-primary">{t('careeros.career.evidenceState', 'Evidence state')}</h2>
                        {facts.loading && facts.data === null ? (
                            <Skeleton variant="text" lines={4} className="mt-3" />
                        ) : counts.total === 0 ? (
                            <p className="mt-2 text-sm text-content-secondary">{t('careeros.career.noFacts', 'No facts recorded yet.')}</p>
                        ) : (
                            <dl className="mt-3 space-y-1.5">
                                {rows.map((row) => (
                                    <div key={row.key} className="flex items-center justify-between text-sm">
                                        <dt className={`font-medium ${row.tone}`}>{row.label}</dt>
                                        <dd className="tabular-nums text-content-primary">{row.value}</dd>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between border-t border-border-default pt-1.5 text-sm">
                                    <dt className="text-content-secondary">{t('careeros.career.awaitingReview', 'Awaiting review')}</dt>
                                    <dd className="tabular-nums text-content-primary">{counts.candidates + counts.conflicts}</dd>
                                </div>
                            </dl>
                        )}
                        {(counts.candidates > 0 || counts.conflicts > 0) && (
                            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate(careerPath.toCareer('evidence'))}>{t('careeros.career.reviewNow', 'Review now')}</Button>
                        )}
                    </section>

                    <section aria-labelledby="overview-goal">
                        <h2 id="overview-goal" className="sr-only">{t('careeros.career.primaryGoal', 'Primary goal')}</h2>
                        {goals.loading && goals.data === null ? (
                            <CareerGoalCard title="" status="active" loading />
                        ) : goals.primary ? (
                            <CareerGoalCard
                                title={goals.primary.title || goals.primary.role}
                                role={goals.primary.role}
                                level={goals.primary.level}
                                location={goals.primary.location}
                                status={goals.primary.status}
                                isPrimary
                                priorities={goals.primary.priorities}
                                constraintCount={goals.primary.constraints.length}
                                targetLabel={goals.primary.targetDate ? t('careeros.goal.target', 'Target: {date}').replace('{date}', formatDate(goals.primary.targetDate)) : null}
                                action={{ label: t('careeros.career.openGoal', 'Open goal'), onClick: () => navigate(careerPath.toGoal(goals.primary!.id)) }}
                                compact
                            />
                        ) : (
                            <StatePanel
                                kind="empty"
                                compact
                                title={t('careeros.career.noPrimaryGoal', 'No primary goal')}
                                description={t('careeros.career.noPrimaryGoalDescription', 'That is a valid state. Set one when you want opportunities judged against a direction.')}
                                action={{ label: t('careeros.career.setGoal', 'Set a goal'), onClick: () => navigate(careerPath.toCareer('goals')) }}
                            />
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OverviewView;
