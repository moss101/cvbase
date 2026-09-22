import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import type { ApplicationSection, ArtifactKind, CareerFact } from '../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button, StatePanel } from '../primitives';
import type { EditImpact } from './useCareerFacts';
import { stripHtml } from '../../../services/careerOs/util';

/**
 * Shown after a referenced fact changes (COS-023): which drafts were built
 * from the old version, the reviewed diff of what changed, and a link to each
 * affected application. Submitted snapshots are never touched, and the copy
 * says so — the person decides whether a draft should follow the correction.
 */
export interface ImpactBannerProps {
    impact: EditImpact;
    userId: string;
    onDismiss: () => void;
}

const SECTION_FOR: Partial<Record<ArtifactKind, ApplicationSection>> = {
    role_analysis: 'analysis',
    cover_letter: 'cover-letter',
    employer_question: 'questions',
    linkedin: 'linkedin',
    networking_note: 'networking',
    note: 'notes',
    interview_story: 'interview',
    submission: 'activity',
};

interface AffectedArtifact {
    id: string;
    applicationId: string;
    title: string;
    kind: ArtifactKind;
    snapshot: boolean;
}

type DiffField = keyof Pick<CareerFact, 'title' | 'organization' | 'location' | 'startDate' | 'endDate' | 'narrative'>;
const DIFF_FIELDS: DiffField[] = ['title', 'organization', 'location', 'startDate', 'endDate', 'narrative'];

export const ImpactBanner: React.FC<ImpactBannerProps> = ({ impact, userId, onDismiss }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [artifacts, setArtifacts] = useState<AffectedArtifact[] | null>(null);
    const [loadError, setLoadError] = useState(false);

    const artifactIds = impact.impact.byKind.application_artifact ?? [];
    const resumeIds = [...(impact.impact.byKind.resume ?? []), ...(impact.impact.byKind.resume_version ?? [])];

    useEffect(() => {
        if (artifactIds.length === 0) { setArtifacts([]); return; }
        let cancelled = false;
        Promise.all(artifactIds.slice(0, 20).map(async (id) => {
            try {
                const artifact = await artifactRepo.get(userId, id);
                return { id, applicationId: artifact.applicationId, title: artifact.title, kind: artifact.kind, snapshot: artifact.status === 'snapshot' } satisfies AffectedArtifact;
            } catch {
                return null;
            }
        })).then((rows) => {
            if (cancelled) return;
            setArtifacts(rows.filter((r): r is AffectedArtifact => r !== null));
            setLoadError(rows.some((r) => r === null));
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, artifactIds.join(',')]);

    const fieldLabel: Record<DiffField, string> = {
        title: t('careeros.career.editor.title', 'Title'),
        organization: t('careeros.career.editor.organization', 'Organisation'),
        location: t('careeros.career.editor.location', 'Location'),
        startDate: t('careeros.career.editor.startDate', 'Start (YYYY-MM)'),
        endDate: t('careeros.career.editor.endDate', 'End (YYYY-MM or blank for present)'),
        narrative: t('careeros.career.editor.description', 'Description'),
    };
    const changed = DIFF_FIELDS.filter((field) => impact.before[field] !== impact.fact[field]);

    if (impact.impact.total === 0) {
        return (
            <StatePanel
                kind="partial"
                title={t('careeros.career.impact.noneTitle', 'Saved. No drafts referenced this fact.')}
                description={t('careeros.career.impact.noneDescription', 'Future drafts will use the corrected version.')}
                action={{ label: t('btn.close', 'Close'), onClick: onDismiss }}
            />
        );
    }

    return (
        <section role="status" aria-live="polite" className="rounded-2xl border border-status-warning/30 bg-status-warning/10 p-4">
            <h3 className="text-sm font-semibold text-content-primary">
                {t('careeros.career.impact.title', '{count} drafts were built from the previous version of this fact').replace('{count}', String(impact.impact.total))}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">
                {t('careeros.career.impact.description', 'Those drafts and any fit analysis are now marked out of date. Submitted snapshots are never changed — they record what was actually sent.')}
            </p>
            {changed.length > 0 && (
                <dl className="mt-3 space-y-1.5 rounded-xl bg-surface-panel p-3 text-[13px]">
                    {changed.map((field) => (
                        <div key={field} className="grid grid-cols-1 gap-x-3 sm:grid-cols-[8rem_1fr]">
                            <dt className="font-semibold text-content-secondary">{fieldLabel[field]}</dt>
                            <dd className="min-w-0">
                                <del className="block break-words text-content-muted">{stripHtml(impact.before[field]) || t('careeros.career.impact.empty', '(empty)')}</del>
                                <ins className="block break-words text-content-primary no-underline">{stripHtml(impact.fact[field]) || t('careeros.career.impact.empty', '(empty)')}</ins>
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
            <ul className="mt-3 space-y-2">
                {artifacts === null && artifactIds.length > 0 && <li className="text-[13px] text-content-secondary">{t('careeros.career.impact.loading', 'Finding the affected drafts…')}</li>}
                {(artifacts ?? []).map((artifact) => (
                    <li key={artifact.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-panel px-3 py-2">
                        <span className="min-w-0 text-sm text-content-primary">
                            {artifact.title || artifact.kind}
                            {artifact.snapshot && <span className="ml-2 text-xs text-content-muted">{t('careeros.career.impact.snapshot', 'submitted snapshot — unchanged')}</span>}
                        </span>
                        {!artifact.snapshot && (
                            <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toApplication(artifact.applicationId, SECTION_FOR[artifact.kind] ?? 'cv'))}>
                                {t('careeros.career.impact.reviewDraft', 'Review draft')}
                            </Button>
                        )}
                    </li>
                ))}
                {resumeIds.map((resumeId) => (
                    <li key={resumeId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-panel px-3 py-2">
                        <span className="text-sm text-content-primary">{t('careeros.career.impact.cv', 'CV built from this fact')}</span>
                        <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toCvEdit(resumeId))}>{t('careeros.career.impact.openCv', 'Open CV')}</Button>
                    </li>
                ))}
                {loadError && <li className="text-[13px] text-status-warning">{t('careeros.career.impact.partial', 'Some affected drafts could not be listed; they are still marked out of date.')}</li>}
            </ul>
            <div className="mt-3">
                <Button variant="quiet" size="sm" onClick={onDismiss}>{t('btn.close', 'Close')}</Button>
            </div>
        </section>
    );
};

export default ImpactBanner;
