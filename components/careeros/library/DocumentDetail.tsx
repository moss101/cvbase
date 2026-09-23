import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import { track } from '../../../services/careerOs/careerEvents';
import type { ApplicationArtifact, ApplicationRecord, ApplicationSection, ArtifactKind, CareerFact } from '../../../services/careerOs/types';
import { Button, Pill, Skeleton, StatePanel, StatusChip } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { classifyError } from '../application/errors';
import { applicationLabel, dateLabel } from './libraryFormat';

/**
 * `/app/library/documents/:id` — a read-only view of one application
 * artifact: title, kind, the stored plain text, provenance fact chips and
 * the snapshot badge, with a link to the section it belongs to. Editing
 * stays in the application workspace, which owns the artifact's revision.
 */
const SECTION_FOR: Partial<Record<ArtifactKind, ApplicationSection>> = {
    cover_letter: 'cover-letter', employer_question: 'questions', linkedin: 'linkedin', networking_note: 'networking',
    note: 'notes', interview_story: 'interview', role_analysis: 'analysis', submission: 'activity',
};

const KIND_LABEL: Record<ArtifactKind, [string, string]> = {
    role_analysis: ['careeros.artifact.kind.roleAnalysis', 'Role analysis'],
    cover_letter: ['careeros.document.kind.coverLetter', 'Cover letter'],
    employer_question: ['careeros.artifact.kind.employerQuestion', 'Employer question'],
    linkedin: ['careeros.artifact.kind.linkedin', 'LinkedIn'],
    networking_note: ['careeros.artifact.kind.networkingNote', 'Networking note'],
    note: ['careeros.artifact.kind.note', 'Note'],
    interview_story: ['careeros.document.kind.story', 'Interview story'],
    submission: ['careeros.artifact.kind.submission', 'Submission copy'],
};

export const DocumentDetail: React.FC<{ documentId: string }> = ({ documentId }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId } = useCareerOs();
    const [artifact, setArtifact] = useState<ApplicationArtifact | null>(null);
    const [application, setApplication] = useState<ApplicationRecord | null>(null);
    const [facts, setFacts] = useState<CareerFact[]>([]);
    const [error, setError] = useState<unknown>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        setArtifact(null);
        setError(null);
        (async () => {
            const row = await artifactRepo.get(userId, documentId);
            if (cancelled) return;
            setArtifact(row);
            void track(userId, 'library_asset_opened', { subjectRefs: { asset: row.id, application: row.applicationId }, payload: { kind: 'document', artifactKind: row.kind } });
            const [app, allFacts] = await Promise.all([
                applicationRepo.get(userId, row.applicationId).catch(() => null),
                row.provenance.factIds && row.provenance.factIds.length > 0 ? factRepo.list(userId, { status: 'any' }).catch(() => [] as CareerFact[]) : Promise.resolve([] as CareerFact[]),
            ]);
            if (cancelled) return;
            setApplication(app);
            setFacts(allFacts.filter((f) => row.provenance.factIds?.includes(f.id)));
        })().catch((err: unknown) => { if (!cancelled) setError(err); });
        return () => { cancelled = true; };
    }, [userId, documentId, attempt]);

    if (error !== null) {
        const kind = classifyError(error);
        return (
            <StatePanel
                kind={kind === 'not_found' ? 'empty' : kind === 'offline' ? 'offline' : 'error'}
                title={kind === 'not_found' ? t('careeros.library.documentMissing', 'This document is not in your account') : undefined}
                description={kind === 'not_found' ? t('careeros.library.documentMissingDescription', 'It may have been deleted, or the link belongs to another account. Nothing else was opened.') : undefined}
                onRetry={kind === 'not_found' ? undefined : () => setAttempt((n) => n + 1)}
                action={{ label: t('careeros.library.backToLibrary', 'Back to Library'), onClick: () => navigate(careerPath.toLibrary()) }}
            />
        );
    }
    if (!artifact) {
        return (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
                <span className="sr-only">{t('label.loading', 'Loading')}</span>
                <Skeleton variant="title" width="50%" />
                <Skeleton variant="text" lines={6} />
            </div>
        );
    }

    const section = SECTION_FOR[artifact.kind] ?? 'analysis';
    const appLabel = applicationLabel(application);
    return (
        <article aria-labelledby="document-title" className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <div className="flex flex-wrap items-center gap-2">
                <Pill mono>{t(KIND_LABEL[artifact.kind][0], KIND_LABEL[artifact.kind][1])}</Pill>
                {artifact.status === 'snapshot' && <StatusChip label={t('careeros.document.status.snapshot', 'Submitted snapshot')} tone="info" />}
                {artifact.status === 'reviewed' && <StatusChip label={t('careeros.document.status.reviewed', 'Reviewed')} tone="success" />}
                {artifact.status === 'draft' && <StatusChip label={t('careeros.document.status.draft', 'Draft')} tone="neutral" />}
                {artifact.stale && <StatusChip label={t('careeros.document.stale', 'Out of date')} tone="warning" />}
                <Pill mono>{artifact.source}</Pill>
            </div>
            <h2 id="document-title" className="mt-2 text-xl font-semibold text-content-primary">{artifact.title || t(KIND_LABEL[artifact.kind][0], KIND_LABEL[artifact.kind][1])}</h2>
            {appLabel && <p className="mt-0.5 text-sm text-content-secondary">{t('careeros.document.forApplication', 'For {application}').replace('{application}', appLabel)}</p>}
            <p className="mt-1 text-xs text-content-muted">{t('careeros.library.updated', 'Updated {date}').replace('{date}', dateLabel(artifact.updatedAt))} · {t('careeros.library.revision', 'Revision {revision}').replace('{revision}', String(artifact.revision))}</p>

            {artifact.snapshotOf && (
                <p className="mt-3 text-[13px] text-content-secondary">{t('careeros.library.snapshotNote', 'This is an immutable copy taken at submission time. Later edits to the draft do not change it.')}</p>
            )}

            <section aria-label={t('careeros.library.documentText', 'Document text')} className="mt-4 whitespace-pre-wrap rounded-xl border border-border-default bg-surface-canvas p-4 text-[14px] leading-relaxed text-content-primary">
                {artifact.plainText || t('careeros.library.noText', 'No text is stored for this document yet.')}
            </section>

            <section aria-label={t('careeros.library.provenance', 'Provenance')} className="mt-4">
                <h3 className="text-[12px] font-medium text-content-muted">{t('careeros.library.provenance', 'Provenance')}</h3>
                {facts.length === 0 && (!artifact.provenance.factIds || artifact.provenance.factIds.length === 0) ? (
                    <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.library.noProvenance', 'No career facts are recorded as sources for this document.')}</p>
                ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                        {(artifact.provenance.factIds ?? []).map((id) => {
                            const fact = facts.find((f) => f.id === id);
                            return (
                                <li key={id}>
                                    <button type="button" onClick={() => navigate(careerPath.toCareer('evidence'))} className="tap-target inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-canvas px-2 py-1 text-[12px] text-content-primary hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                                        {fact ? `${fact.title || fact.kind}${fact.status !== 'active' ? ` (${fact.status})` : ''}` : t('careeros.library.factUnavailable', 'Fact {id}').replace('{id}', id.slice(0, 8))}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {artifact.provenance.model && <p className="mt-2 text-xs text-content-muted">{t('careeros.library.generatedWith', 'Generated with {model}').replace('{model}', artifact.provenance.model)}</p>}
            </section>

            <div className="mt-5">
                <Button variant="primary" trailingIcon={<ArrowRight size={16} strokeWidth={2} />} onClick={() => navigate(careerPath.toApplication(artifact.applicationId, section))}>
                    {t('careeros.library.openInWorkspace', 'Open in the application workspace')}
                </Button>
            </div>
        </article>
    );
};

export default DocumentDetail;
