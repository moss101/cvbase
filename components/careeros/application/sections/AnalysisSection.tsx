import React, { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../../../services/translationService';
import * as artifactRepo from '../../../../services/careerOs/artifactRepo';
import { track } from '../../../../services/careerOs/careerEvents';
import type { OpportunityAnalysis } from '../../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../../NavigationProvider';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { Button, StatePanel, StatusChip } from '../../primitives';
import { FitPanel } from '../../opportunities/FitPanel';
import { FailureNotice } from '../FailureNotice';
import { Panel, PaneHeading } from '../fields';
import { useAsyncAction } from '../useAsyncAction';
import type { Workspace } from '../useApplicationWorkspace';

/**
 * Role analysis for the application: the opportunity summary and the same
 * two fit panels as the opportunity page, with new analyses bound to this
 * application. "Mark reviewed" records a `role_analysis` artifact pointing
 * at the analysis it reviewed — the readiness item — and re-analysing
 * returns it to draft so a changed analysis is reviewed again.
 */
export const AnalysisSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate } = useNavigation();
    const data = workspace.data;
    const reviewArtifact = useMemo(() => (data?.artifacts ?? []).filter((a) => a.kind === 'role_analysis' && a.status !== 'snapshot').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null, [data?.artifacts]);

    const [markReviewed, reviewState] = useAsyncAction(async (analysisId: string | null) => {
        if (!userId || !data) return;
        const saved = reviewArtifact
            ? await artifactRepo.save(userId, { id: reviewArtifact.id, content: { ...(analysisId ? { analysisId } : {}) }, status: 'reviewed', stale: false }, reviewArtifact.revision)
            : await artifactRepo.save(userId, { applicationId: data.application.id, kind: 'role_analysis', title: t('careeros.analysis.reviewTitle', 'Role analysis review'), content: analysisId ? { analysisId } : {}, plainText: '', source: 'user', status: 'reviewed' });
        workspace.setArtifacts([...data.artifacts.filter((a) => a.id !== saved.id), saved]);
        invalidate('applications:');
        await track(userId, 'application_artifact_saved', { subjectRefs: { application: saved.applicationId, artifact: saved.id }, payload: { kind: 'role_analysis', status: 'reviewed', revision: saved.revision } });
    });

    const onAnalysed = async (analysis: OpportunityAnalysis) => {
        if (!userId || !data || !reviewArtifact || reviewArtifact.status !== 'reviewed') return;
        try {
            const back = await artifactRepo.save(userId, { id: reviewArtifact.id, content: { analysisId: analysis.id }, status: 'draft' }, reviewArtifact.revision);
            workspace.setArtifacts([...data.artifacts.filter((a) => a.id !== back.id), back]);
        } catch { void workspace.refresh(); }
    };

    if (!data) return null;
    const { opportunity, application } = data;

    return (
        <div className="space-y-4">
            <Panel as="section" aria-labelledby="analysis-opportunity">
                <PaneHeading
                    id="analysis-opportunity"
                    title={opportunity ? opportunity.title : application.jobTitle}
                    description={opportunity ? [opportunity.company, opportunity.location].filter(Boolean).join(' · ') : application.company}
                    action={opportunity ? <Button size="sm" variant="secondary" onClick={() => navigate(careerPath.toOpportunity(opportunity.id, { application: application.id }))}>{t('careeros.analysis.openOpportunity', 'Open opportunity')}</Button> : undefined}
                />
                {!opportunity && (
                    <StatePanel kind="empty" compact className="mt-3" title={t('careeros.analysis.noOpportunity', 'No opportunity is linked to this application')} description={t('careeros.analysis.noOpportunityDescription', 'This is a tracker entry without a captured listing, so fit cannot be analysed. Add the opportunity and start from it, or keep working in the other sections.')} action={{ label: t('careeros.opportunity.add', 'Add opportunity'), onClick: () => navigate(careerPath.toSpace('opportunities')) }} />
                )}
            </Panel>

            {opportunity && (
                <Panel as="section" aria-labelledby="analysis-fit">
                    <PaneHeading
                        id="analysis-fit"
                        title={t('careeros.analysis.fitTitle', 'Fit for this application')}
                        description={t('careeros.analysis.fitDescription', 'Qualification fit is evidence from your facts; career-direction fit is the goal you started this application with. Neither is a probability of being hired.')}
                        action={
                            <div className="flex items-center gap-2">
                                {reviewArtifact?.status === 'reviewed' && !reviewArtifact.stale ? (
                                    <StatusChip label={t('careeros.analysis.reviewed', 'Reviewed')} tone="success" announce />
                                ) : (
                                    <Button size="sm" variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => { void markReviewed(typeof reviewArtifact?.content.analysisId === 'string' ? reviewArtifact.content.analysisId : null); }} loading={reviewState.pending}>
                                        {t('careeros.analysis.markReviewed', 'Mark analysis reviewed')}
                                    </Button>
                                )}
                            </div>
                        }
                    />
                    {reviewState.error ? <FailureNotice error={reviewState.error} onReload={() => { void workspace.refresh(); }} onDismiss={reviewState.reset} className="mt-3" /> : null}
                    <div className="mt-4">
                        <FitPanel opportunity={opportunity} goal={application.goalSnapshot ?? data.currentGoal} applicationId={application.id} legacyMatchScore={application.matchScore} onAnalysed={(a) => { void onAnalysed(a); }} />
                    </div>
                    <p className="mt-3 text-xs text-content-muted">{t('careeros.analysis.prismNote', 'PRISM\'s clarification questions (CV section) are not employer questions — the Questions section holds those.')}</p>
                </Panel>
            )}
        </div>
    );
};

export default AnalysisSection;
