import React, { useMemo } from 'react';
import { EyeOff, RefreshCw, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import { buildAnalysis, isAnalysisStale } from '../../../services/careerOs/careerFit';
import { factsRevision } from '../../../services/careerOs/careerFacts';
import { track } from '../../../services/careerOs/careerEvents';
import type { CareerGoal, Opportunity, OpportunityAnalysis } from '../../../services/careerOs/types';
import { parseFromResumeData, runFullAnalysis } from '../../../lib/ats';
import type { ResumeData } from '../../../types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, FitBreakdown, Pill, StatePanel } from '../primitives';
import { FailureNotice } from '../application/FailureNotice';
import { useAsyncAction } from '../application/useAsyncAction';
import { formatDate } from '../application/format';

/**
 * The two fit panels for an opportunity (REQ-07): qualification fit against
 * the person's facts and career-direction fit against the primary goal, from
 * the latest persisted analysis. When none exists or its inputs changed, the
 * person runs "Analyse fit" — it is never recomputed silently. The ATS
 * keyword match is one separate signal, missing pay stays "not stated", a
 * hidden-by-constraint result shows its inspectable reason, and a legacy
 * tracker match score is labelled historical.
 */
export interface FitPanelProps {
    opportunity: Opportunity;
    goal: CareerGoal | null;
    /** Binds new analyses to the application (workspace analysis section). */
    applicationId?: string | null;
    /** Legacy tracker `matchScore`, shown only as a historical label. */
    legacyMatchScore?: number | null;
    /** Called after a new analysis is saved. */
    onAnalysed?: (analysis: OpportunityAnalysis) => void;
    compact?: boolean;
    className?: string;
}

/** ATS resume↔JD alignment from the deterministic engine, or null when there is no usable resume/JD. */
async function atsSignal(userId: string, jdText: string): Promise<number | null> {
    if (!jdText || jdText.trim().length < 80) return null;
    try {
        const primary = await resumeRepo.getPrimary(userId);
        if (!primary) return null;
        const { report } = runFullAnalysis(parseFromResumeData(primary.data as ResumeData), jdText);
        return typeof report.matchScore === 'number' ? report.matchScore : null;
    } catch {
        return null;
    }
}

export const FitPanel: React.FC<FitPanelProps> = ({ opportunity, goal, applicationId = null, legacyMatchScore = null, onAnalysed, compact = false, className = '' }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate } = useNavigation();

    const analysisQuery = useOwnedQuery(userId, `analysis:latest:${opportunity.id}`, () => analysisRepo.latestForOpportunity(userId as string, opportunity.id));
    const factsQuery = useOwnedQuery(userId, 'facts:active', () => factRepo.list(userId as string));

    const currentFactsRevision = useMemo(() => factsRevision(factsQuery.data ?? []), [factsQuery.data]);
    const analysis = analysisQuery.data ?? null;
    const stale = analysis && factsQuery.data
        ? isAnalysisStale(analysis, { opportunity: { id: opportunity.id, revision: opportunity.revision }, goal: goal ? { id: goal.id, revision: goal.revision } : null, factsRevision: currentFactsRevision })
        : false;

    const [analyse, analyseState] = useAsyncAction(async () => {
        if (!userId) return;
        const facts = factsQuery.data ?? (await factRepo.list(userId));
        const atsScore = await atsSignal(userId, opportunity.capturedContent);
        const input = buildAnalysis({ opportunity, goal, facts, atsScore, applicationId });
        const saved = await analysisRepo.save(userId, input);
        analysisQuery.setData(saved);
        invalidate('analysis:');
        invalidate('opportunities:');
        await track(userId, 'opportunity_fit_reviewed', {
            subjectRefs: { opportunity: opportunity.id, analysis: saved.id, ...(applicationId ? { application: applicationId } : {}) },
            payload: {
                supported: saved.qualification.supported.length,
                partial: saved.qualification.partial.length,
                missing: saved.qualification.missing.length,
                unknown: saved.qualification.unknown.length,
                hiddenByConstraint: saved.hiddenByConstraint !== null,
                hasGoal: goal !== null,
            },
        });
        onAnalysed?.(saved);
    });

    const loading = analysisQuery.loading || factsQuery.loading;
    const loadError = analysisQuery.error ?? factsQuery.error;

    const payLabel = opportunity.compMin === null && opportunity.compMax === null
        ? t('careeros.opportunity.payNotStated', 'Pay not stated')
        : [opportunity.compMin, opportunity.compMax].filter((v): v is number => v !== null).join('–') + (opportunity.compCurrency ? ` ${opportunity.compCurrency}` : '') + (opportunity.compPeriod ? ` / ${opportunity.compPeriod}` : '');

    const analyseLabel = analysis ? t('careeros.fit.reanalyse', 'Re-analyse fit') : t('careeros.fit.analyse', 'Analyse fit');

    return (
        <div className={className}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-content-secondary">
                    <span>
                        <span className="font-semibold text-content-primary">{t('careeros.opportunity.pay', 'Pay')}:</span> {payLabel}
                    </span>
                    {analysis && (
                        <span>
                            <span aria-hidden="true">· </span>
                            {t('careeros.fit.computedAt', 'Analysed {date}').replace('{date}', formatDate(analysis.computedAt))}
                        </span>
                    )}
                    {typeof analysis?.atsScore === 'number' && (
                        <Pill tone="neutral" title={t('careeros.fit.atsHint', 'Keyword alignment between your primary CV and the listing, from the deterministic ATS engine. A formatting signal, not a hiring probability.')}>
                            {t('careeros.fit.atsSignal', 'ATS keyword match {score}/100').replace('{score}', String(analysis.atsScore))}
                        </Pill>
                    )}
                    {typeof legacyMatchScore === 'number' && (
                        <Pill tone="neutral">{t('careeros.fit.legacyScore', 'Legacy match score (historical): {score}').replace('{score}', String(legacyMatchScore))}</Pill>
                    )}
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon={analysis ? <RefreshCw size={14} strokeWidth={2} /> : <Sparkles size={14} strokeWidth={2} />}
                    onClick={() => { void analyse(); }}
                    loading={analyseState.pending}
                    disabled={loading || !userId}
                >
                    {analyseLabel}
                </Button>
            </div>

            {analyseState.error ? <FailureNotice error={analyseState.error} onRetry={() => { void analyse(); }} onDismiss={analyseState.reset} className="mb-3" /> : null}

            {loadError ? (
                <StatePanel kind="error" compact onRetry={() => { void analysisQuery.refresh(); void factsQuery.refresh(); }} />
            ) : loading && !analysis ? (
                <FitBreakdown loading />
            ) : !analysis ? (
                <StatePanel
                    kind="empty"
                    title={t('careeros.fit.noneTitle', 'Fit has not been analysed yet')}
                    description={goal
                        ? t('careeros.fit.noneDescription', 'Analyse fit to see which requirements your facts support and how the role sits against your goal.')
                        : t('careeros.fit.noneNoGoal', 'Analyse fit to see which requirements your facts support. Set a career goal to also see direction fit.')}
                    action={{ label: analyseLabel, onClick: () => { void analyse(); } }}
                    secondaryAction={!goal ? { label: t('careeros.fit.setGoal', 'Set a goal'), onClick: () => navigate(careerPath.toCareer('goals')) } : undefined}
                />
            ) : (
                <>
                    {analysis.hiddenByConstraint && (
                        <div role="status" className="mb-3 rounded-xl bg-surface-canvas px-3.5 py-3">
                            <p className="flex items-start gap-2 text-sm text-content-primary">
                                <EyeOff size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-status-warning" aria-hidden="true" />
                                <span>
                                    <span className="font-semibold">{t('careeros.fit.hiddenTitle', 'Hidden from For You by a hard constraint')}</span>
                                    <span className="block text-[13px] text-content-secondary">{analysis.hiddenByConstraint.text}</span>
                                </span>
                            </p>
                            {analysis.goalId && (
                                <Button variant="quiet" size="sm" className="mt-1" onClick={() => navigate(careerPath.toGoal(analysis.goalId as string))}>
                                    {t('careeros.fit.reviseConstraint', 'Revise constraint')}
                                </Button>
                            )}
                        </div>
                    )}
                    <FitBreakdown qualification={analysis.qualification} direction={analysis.direction} stale={stale} compact={compact} />
                    {!goal && analysis.direction.unavailableReason && (
                        <p className="mt-2 text-[13px] text-content-secondary">
                            <button type="button" onClick={() => navigate(careerPath.toCareer('goals'))} className="tap-target inline-flex items-center font-semibold text-action-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded">
                                {t('careeros.fit.setGoal', 'Set a goal')}
                            </button>
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

export default FitPanel;
