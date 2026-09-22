import React, { useId, useState } from 'react';
import { ArrowLeft, Briefcase, Compass, RotateCcw, TrendingUp } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import type { CareerProfile, OnboardingObjective, OnboardingStep } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { Button, SpaceHeader, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { GoalForm, valuesToGoalInput, type GoalFormValues } from '../career/GoalForm';
import { ImportPanel } from '../career/ImportPanel';
import { ReviewQueue } from '../career/ReviewQueue';
import type { ImportResult } from '../career/importResume';
import { useCareerFacts, useFactMutations } from '../career/useCareerFacts';
import { useGoalMutations } from '../career/useGoals';
import { useOnline } from '../career/useOnline';
import { resumeStep, useOnboardingState } from './useOnboardingState';

/**
 * Resumable onboarding (REQ-24, COS-030): objective → import → review →
 * goal → done. Progress is written to the profile after every step, so a
 * closed tab resumes where it stopped, and "Finish later" is on every step.
 * Every step can be skipped: a person may reach Today with nothing but an
 * objective recorded, and Today still offers one honest action.
 */
export interface OnboardingFlowProps {
    userId: string;
    profile: CareerProfile;
    /** Called when the flow completes or pauses, after the profile was written. */
    onExit: () => void;
}

const STEPS: OnboardingStep[] = ['objective', 'import', 'review', 'goal', 'done'];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userId, profile, onExit }) => {
    const { t } = useTranslation();
    const { refreshProfile, invalidate } = useCareerOs();
    const online = useOnline();
    const persistence = useOnboardingState(userId, profile);
    const [step, setStep] = useState<OnboardingStep>(() => resumeStep(profile.onboarding));
    const [objective, setObjective] = useState<OnboardingObjective | undefined>(profile.onboarding.objective);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [goalSaving, setGoalSaving] = useState(false);
    const [goalError, setGoalError] = useState<string | null>(null);
    const [stepError, setStepError] = useState<string | null>(null);
    const facts = useCareerFacts();
    const factMutations = useFactMutations(facts.data);
    const goalMutations = useGoalMutations();
    const headingId = useId();

    const stepTitles: Record<OnboardingStep, string> = {
        objective: t('careeros.onboarding.title.objective', 'What brings you here?'),
        import: t('careeros.onboarding.title.import', 'Bring in what you already have'),
        review: t('careeros.onboarding.title.review', 'Check what was read'),
        goal: t('careeros.onboarding.title.goal', 'Where are you heading?'),
        done: t('careeros.onboarding.title.done', 'You are set up'),
    };
    const stepDescriptions: Record<OnboardingStep, string> = {
        objective: t('careeros.onboarding.description.objective', 'This shapes the first actions Today suggests. You can change it any time.'),
        import: t('careeros.onboarding.description.import', 'A CV becomes candidate facts you confirm in the next step. Nothing is confirmed or rewritten for you.'),
        review: t('careeros.onboarding.description.review', 'Confirm what is right, fix what is not, discard what is not yours. Skipping leaves the rest for later.'),
        goal: t('careeros.onboarding.description.goal', 'A goal gives opportunities a direction to be judged against. Only a role is needed; having no goal is also fine.'),
        done: t('careeros.onboarding.description.done', 'Today will show one useful next step drawn from what you recorded.'),
    };
    const stepLabels: Record<OnboardingStep, string> = {
        objective: t('careeros.onboarding.step.objective', 'Objective'),
        import: t('careeros.onboarding.step.import', 'Import'),
        review: t('careeros.onboarding.step.review', 'Review'),
        goal: t('careeros.onboarding.step.goal', 'Goal'),
        done: t('careeros.onboarding.step.done', 'Done'),
    };

    const persist = async (patch: Parameters<typeof persistence.save>[0], next: OnboardingStep) => {
        setStepError(null);
        try {
            await persistence.save({ ...patch, step: next, pausedAt: undefined });
            setStep(next);
        } catch (err) {
            captureException(err, { context: 'onboarding-save' });
            setStepError(t('careeros.onboarding.saveFailed', 'Your progress could not be saved. Nothing was lost on this screen; try again.'));
        }
    };

    const finishLater = async () => {
        setStepError(null);
        try {
            await persistence.save({ step, objective, pausedAt: new Date().toISOString() });
            await refreshProfile();
            onExit();
        } catch (err) {
            captureException(err, { context: 'onboarding-pause' });
            setStepError(t('careeros.onboarding.saveFailed', 'Your progress could not be saved. Nothing was lost on this screen; try again.'));
        }
    };

    const complete = async () => {
        setStepError(null);
        try {
            const saved = await persistence.save({ step: 'done', completedAt: new Date().toISOString(), pausedAt: undefined });
            void emit(userId, buildEvent('career_onboarding_completed', {
                payload: { objective: saved.onboarding.objective ?? null, imported: Boolean(saved.onboarding.importedResumeId), reviewed: Boolean(saved.onboarding.reviewedAt), goal: Boolean(saved.onboarding.goalId) },
                dedupeKey: `career_onboarding_completed:${userId}`,
            }));
            invalidate('today');
            await refreshProfile();
            onExit();
        } catch (err) {
            captureException(err, { context: 'onboarding-complete' });
            setStepError(t('careeros.onboarding.saveFailed', 'Your progress could not be saved. Nothing was lost on this screen; try again.'));
        }
    };

    const objectives: Array<{ key: OnboardingObjective; title: string; description: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }> }> = [
        { key: 'active_search', title: t('careeros.onboarding.objective.activeSearch', 'Actively looking'), description: t('careeros.onboarding.objective.activeSearchDescription', 'I want to apply for roles now.'), Icon: Briefcase },
        { key: 'develop', title: t('careeros.onboarding.objective.develop', 'Growing in my role'), description: t('careeros.onboarding.objective.developDescription', 'Keep evidence of what I do; not searching.'), Icon: TrendingUp },
        { key: 'explore', title: t('careeros.onboarding.objective.explore', 'Exploring options'), description: t('careeros.onboarding.objective.exploreDescription', 'Compare directions before deciding.'), Icon: Compass },
        { key: 'return', title: t('careeros.onboarding.objective.return', 'Returning to work'), description: t('careeros.onboarding.objective.returnDescription', 'Rebuild my record after time away.'), Icon: RotateCcw },
    ];

    const saveGoal = async (values: GoalFormValues) => {
        setGoalSaving(true);
        setGoalError(null);
        try {
            const goal = await goalMutations.create(valuesToGoalInput(values, 'onboarding'));
            await persist({ goalId: goal.id }, 'done');
        } catch (err) {
            captureException(err, { context: 'onboarding-goal' });
            setGoalError(t('careeros.goal.saveFailed', 'The goal could not be saved. Your entries are still here.'));
        } finally {
            setGoalSaving(false);
        }
    };

    const candidates = facts.active.filter((f) => f.reviewState === 'candidate' || f.reviewState === 'conflict').length;
    const stepIndex = STEPS.indexOf(step);

    return (
        <div className="mx-auto w-full max-w-3xl">
            <SpaceHeader
                eyebrow={t('careeros.onboarding.eyebrow', 'Set up your Career OS')}
                title={stepTitles[step]}
                description={stepDescriptions[step]}
                compact
            >
                <ol aria-label={t('careeros.onboarding.progress', 'Setup steps')} className="flex flex-wrap gap-2 text-xs">
                    {STEPS.map((s, index) => (
                        <li key={s} aria-current={s === step ? 'step' : undefined} className={`rounded-full px-2.5 py-1 font-semibold ${s === step ? 'bg-action-primary/10 text-action-primary' : index < stepIndex ? 'text-content-secondary' : 'text-content-muted'}`}>
                            {index + 1}. {stepLabels[s]}
                        </li>
                    ))}
                </ol>
            </SpaceHeader>

            <div aria-live="polite" className="mb-4 space-y-3">
                {!online && <StatePanel kind="offline" compact description={t('careeros.onboarding.offline', 'You can read this screen offline; each step is saved when you reconnect.')} />}
                {stepError && <StatePanel kind="error" compact title={stepError} description="" />}
            </div>

            <section aria-labelledby={headingId} className="rounded-2xl border border-border-default bg-surface-panel p-5">
                <h2 id={headingId} className="sr-only">{stepLabels[step]}</h2>

                {step === 'objective' && (
                    <div>
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {objectives.map(({ key, title, description, Icon }) => (
                                <li key={key}>
                                    <button
                                        type="button"
                                        aria-pressed={objective === key}
                                        onClick={() => setObjective(key)}
                                        className={`tap-target flex h-full w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                                            objective === key ? 'border-action-primary bg-action-primary/5' : 'border-border-default bg-surface-canvas hover:border-border-strong'
                                        }`}
                                    >
                                        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                                        <span>
                                            <span className="block text-sm font-semibold text-content-primary">{title}</span>
                                            <span className="block text-[13px] text-content-secondary">{description}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="primary" onClick={() => void persist({ objective }, 'import')} disabled={!objective || !online} loading={persistence.saving}>{t('careeros.onboarding.continue', 'Continue')}</Button>
                            <Button variant="quiet" onClick={() => void finishLater()} disabled={persistence.saving}>{t('careeros.onboarding.finishLater', 'Finish later')}</Button>
                        </div>
                    </div>
                )}

                {step === 'import' && (
                    <div>
                        {importResult ? (
                            <StatePanel
                                kind="partial"
                                title={importResult.inserted.length === 0
                                    ? t('careeros.import.resultNone', 'Nothing new: every claim in that CV was already recorded')
                                    : t('careeros.import.resultTitle', '{count} candidate facts added for review').replace('{count}', String(importResult.inserted.length))}
                                description={t('careeros.import.resultDescription', '{parsed} read · {duplicates} already recorded · {conflicts} contradictions to resolve')
                                    .replace('{parsed}', String(importResult.parsed)).replace('{duplicates}', String(importResult.duplicates + importResult.withinImport)).replace('{conflicts}', String(importResult.conflicts))}
                                action={{ label: t('careeros.onboarding.reviewNow', 'Review them'), onClick: () => void persist({ importedResumeId: importResult.resumeId }, 'review') }}
                                secondaryAction={{ label: t('careeros.onboarding.importAnother', 'Import another'), onClick: () => setImportResult(null) }}
                            />
                        ) : (
                            <ImportPanel userId={userId} existingFacts={facts.data ?? []} embedded onImported={(result) => { setImportResult(result); invalidate('facts'); }} />
                        )}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-default pt-4">
                            <Button variant="quiet" icon={<ArrowLeft size={14} />} onClick={() => setStep('objective')}>{t('btn.back', 'Back')}</Button>
                            <Button variant="secondary" onClick={() => void persist({}, candidates > 0 ? 'review' : 'goal')} disabled={!online} loading={persistence.saving}>
                                {importResult ? t('careeros.onboarding.continue', 'Continue') : t('careeros.onboarding.skipImport', 'Skip for now')}
                            </Button>
                            <Button variant="quiet" onClick={() => void finishLater()} disabled={persistence.saving}>{t('careeros.onboarding.finishLater', 'Finish later')}</Button>
                        </div>
                    </div>
                )}

                {step === 'review' && (
                    <div>
                        {facts.error !== null ? (
                            <StatePanel kind="error" title={t('careeros.career.factsError', 'Your facts could not be loaded')} onRetry={() => void facts.refresh()} />
                        ) : facts.loading && facts.data === null ? (
                            <StatePanel kind="loading" compact />
                        ) : (
                            <ReviewQueue userId={userId} facts={facts.data ?? []} mutations={factMutations} resumeId={persistence.state.importedResumeId} onChanged={() => void facts.refresh()} />
                        )}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-default pt-4">
                            <Button variant="quiet" icon={<ArrowLeft size={14} />} onClick={() => setStep('import')}>{t('btn.back', 'Back')}</Button>
                            <Button variant="primary" onClick={() => void persist({ reviewedAt: candidates === 0 ? new Date().toISOString() : undefined }, 'goal')} disabled={!online} loading={persistence.saving}>
                                {candidates > 0 ? t('careeros.onboarding.reviewLater', 'Leave {count} for later').replace('{count}', String(candidates)) : t('careeros.onboarding.continue', 'Continue')}
                            </Button>
                            <Button variant="quiet" onClick={() => void finishLater()} disabled={persistence.saving}>{t('careeros.onboarding.finishLater', 'Finish later')}</Button>
                        </div>
                    </div>
                )}

                {step === 'goal' && (
                    <div>
                        <GoalForm onSubmit={saveGoal} submitLabel={t('careeros.onboarding.saveGoal', 'Save goal and finish')} saving={goalSaving} error={goalError} compact />
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-default pt-4">
                            <Button variant="quiet" icon={<ArrowLeft size={14} />} onClick={() => setStep('review')}>{t('btn.back', 'Back')}</Button>
                            <Button variant="secondary" onClick={() => void persist({}, 'done')} disabled={!online} loading={persistence.saving}>{t('careeros.onboarding.skipGoal', 'No goal for now')}</Button>
                            <Button variant="quiet" onClick={() => void finishLater()} disabled={persistence.saving}>{t('careeros.onboarding.finishLater', 'Finish later')}</Button>
                        </div>
                    </div>
                )}

                {step === 'done' && (
                    <div>
                        <ul className="space-y-1.5 text-sm text-content-secondary">
                            <li>{persistence.state.objective ? t('careeros.onboarding.summary.objective', 'Objective recorded.') : t('careeros.onboarding.summary.noObjective', 'No objective recorded.')}</li>
                            <li>{persistence.state.importedResumeId ? t('careeros.onboarding.summary.imported', 'A CV was imported; its claims are candidates until confirmed.') : t('careeros.onboarding.summary.notImported', 'No CV imported yet — you can do that under Career › Evidence.')}</li>
                            <li>{candidates > 0 ? t('careeros.onboarding.summary.pending', '{count} facts still wait for your review.').replace('{count}', String(candidates)) : t('careeros.onboarding.summary.reviewed', 'Nothing is waiting for review.')}</li>
                            <li>{persistence.state.goalId ? t('careeros.onboarding.summary.goal', 'A primary goal is set.') : t('careeros.onboarding.summary.noGoal', 'No goal set — that is a valid state.')}</li>
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button variant="primary" onClick={() => void complete()} disabled={!online} loading={persistence.saving}>{t('careeros.onboarding.goToToday', 'Go to Today')}</Button>
                            <Button variant="quiet" icon={<ArrowLeft size={14} />} onClick={() => setStep('goal')}>{t('btn.back', 'Back')}</Button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default OnboardingFlow;
