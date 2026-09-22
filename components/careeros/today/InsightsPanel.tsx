import React, { useId, useState } from 'react';
import { BellRing, Scale } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as insightRepo from '../../../services/careerOs/insightRepo';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import type { InsightDraft } from '../../../services/careerOs/frontier/outcomeInsights';
import type { CareerGoal } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button, Pill, Skeleton, StatePanel } from '../primitives';
import { formatDate } from '../career/factFormat';

/**
 * Outcome insights (REQ-09): descriptive statements over the person's own
 * submitted applications, each with its sample size, denominator, missing
 * outcomes and observation window visible. "Review" persists the statement
 * and records that it was looked at. Links lead to the scenario comparison
 * and to the proactive-reminder preferences; nothing here is a prediction.
 */
export interface InsightsPanelProps {
    userId: string;
    insights: InsightDraft[];
    submittedCount: number;
    goal: CareerGoal | null;
    loading: boolean;
    online: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ userId, insights, submittedCount, goal, loading, online }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const headingId = useId();
    const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const review = async (insight: InsightDraft) => {
        setBusy(insight.kind);
        setError(null);
        try {
            const saved = await insightRepo.create(userId, insight);
            void emit(userId, buildEvent('career_insight_reviewed', {
                subjectRefs: { insight: saved.id },
                payload: { kind: saved.kind, sampleSize: saved.sampleSize, denominator: saved.denominator, missingOutcomes: saved.missingOutcomes, policy: saved.policyVersion },
            }));
            setReviewed((prev) => ({ ...prev, [insight.kind]: true }));
        } catch (err) {
            captureException(err, { context: 'today-insight-review' });
            setError(t('careeros.today.insights.reviewFailed', 'The review could not be recorded.'));
        } finally {
            setBusy(null);
        }
    };

    const links = (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-default pt-3">
            <Button variant="quiet" size="sm" icon={<Scale size={14} />} onClick={() => navigate(goal ? careerPath.toGoal(goal.id) : careerPath.toCareer('goals'))}>
                {t('careeros.today.insights.compare', 'Compare options')}
            </Button>
            <Button variant="quiet" size="sm" icon={<BellRing size={14} />} onClick={() => navigate(careerPath.toSpace('settings'))}>
                {t('careeros.today.insights.reminders', 'Reminders')}
            </Button>
        </div>
    );

    return (
        <section aria-labelledby={headingId} className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <h2 id={headingId} className="text-base font-semibold text-content-primary">{t('careeros.today.insights.title', 'What your outcomes show')}</h2>
            <p className="mt-0.5 text-xs text-content-muted">{t('careeros.today.insights.hint', 'Observations over your own applications, with the numbers behind each one. Not causes, not predictions.')}</p>
            <div className="mt-3">
                {loading ? (
                    <Skeleton variant="text" lines={3} />
                ) : submittedCount === 0 ? (
                    <StatePanel
                        kind="empty"
                        compact
                        title={t('careeros.today.insights.noneTitle', 'No submitted applications yet')}
                        description={t('careeros.today.insights.noneDescription', 'Insights are computed from recorded submissions and outcomes. Until then there is nothing to observe.')}
                    />
                ) : insights.length === 0 ? (
                    <StatePanel
                        kind="empty"
                        compact
                        title={t('careeros.today.insights.tooEarlyTitle', 'Still inside the observation window')}
                        description={t('careeros.today.insights.tooEarlyDescription', 'Submitted applications are counted after 21 days so an unknown outcome is not treated as a rejection.')}
                    />
                ) : (
                    <ul className="space-y-3">
                        {insights.map((insight) => (
                            <li key={insight.kind} className="rounded-xl border border-border-default bg-surface-canvas p-3">
                                <p className="text-sm text-content-primary">{insight.statement}</p>
                                <dl className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                                    <div><dt className="sr-only">{t('careeros.today.insights.sample', 'Sample')}</dt><dd><Pill>{t('careeros.today.insights.sampleValue', '{n} of {d}').replace('{n}', String(insight.sampleSize)).replace('{d}', String(insight.denominator))}</Pill></dd></div>
                                    <div><dt className="sr-only">{t('careeros.today.insights.missing', 'Missing outcomes')}</dt><dd><Pill tone={insight.missingOutcomes > 0 ? 'warning' : 'neutral'}>{t('careeros.today.insights.missingValue', '{n} unknown').replace('{n}', String(insight.missingOutcomes))}</Pill></dd></div>
                                    <div><dt className="sr-only">{t('careeros.today.insights.window', 'Window')}</dt><dd><Pill>{t('careeros.today.insights.windowValue', 'Since {from}').replace('{from}', insight.observationWindow.from ? formatDate(insight.observationWindow.from) : '—')}</Pill></dd></div>
                                    <div><dt className="sr-only">{t('careeros.today.insights.policy', 'Policy')}</dt><dd><Pill mono>{insight.policyVersion}</Pill></dd></div>
                                </dl>
                                <div className="mt-2">
                                    {reviewed[insight.kind] ? (
                                        <span role="status" className="text-xs font-semibold text-status-success">{t('careeros.today.insights.reviewed', 'Reviewed')}</span>
                                    ) : (
                                        <Button variant="secondary" size="sm" onClick={() => void review(insight)} loading={busy === insight.kind} disabled={!online}>{t('careeros.today.insights.review', 'Review')}</Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {error && <p role="alert" className="mt-2 text-xs text-status-danger">{error}</p>}
            </div>
            {links}
        </section>
    );
};

export default InsightsPanel;
