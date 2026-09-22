import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Sparkles, X } from 'lucide-react';
import { useTranslation } from '../../../../services/translationService';
import * as applicationRepo from '../../../../services/careerOs/applicationRepo';
import * as artifactRepo from '../../../../services/careerOs/artifactRepo';
import * as factRepo from '../../../../services/careerOs/factRepo';
import * as resumeRepo from '../../../../services/repos/resumeRepo';
import { factLabel } from '../../../../services/careerOs/careerFacts';
import { track } from '../../../../services/careerOs/careerEvents';
import type { ApplicationArtifact, CareerFact, StaleReference } from '../../../../services/careerOs/types';
import type { PrismAnswer } from '../../../../services/prismService';
import type { StoredResume } from '../../../../services/repos/mappers';
import { careerPath, useNavigation } from '../../../NavigationProvider';
import { isResumeLimitError } from '../../../resumes/useResumeActions';
import { useOwnedQuery } from '../../data/useOwnedQuery';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { Button, DocumentCard, StatePanel } from '../../primitives';
import { FailureNotice } from '../FailureNotice';
import { Panel, PaneHeading, Select } from '../fields';
import { formatDate } from '../format';
import { useAsyncAction } from '../useAsyncAction';
import type { Workspace } from '../useApplicationWorkspace';

const PrismWizard = lazy(() => import('../../../prism/PrismWizard'));

/**
 * The application's CV (REQ-19): the linked tailored version as a document
 * card (open in the existing editor; DOCX export from its data; PDF export
 * needs the rendered preview, so it opens the editor), PRISM tailoring bound
 * to this application, the facts the person's PRISM answers introduced
 * (confirmable as career facts, never auto-added) and a "facts changed since
 * this draft" review when referenced facts moved on (COS-023). Submitted
 * snapshots stay read-only.
 */
interface StaleFactRow { reference: StaleReference; fact: CareerFact | null; artifact: ApplicationArtifact | null }

export const CvSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const { navigate } = useNavigation();
    const data = workspace.data;
    const app = data?.application ?? null;
    const [tailoring, setTailoring] = useState(false);
    const [sourceId, setSourceId] = useState<string>('');
    const [answersToReview, setAnswersToReview] = useState<PrismAnswer[]>([]);
    const [addedFacts, setAddedFacts] = useState<Set<string>>(new Set());

    const resumes = useOwnedQuery(userId, 'resumes:list', () => resumeRepo.list(userId as string));
    const source = useMemo<StoredResume | null>(() => {
        const list = resumes.data ?? [];
        return list.find((r) => r.id === sourceId) ?? list.find((r) => r.isPrimary) ?? list[0] ?? null;
    }, [resumes.data, sourceId]);
    useEffect(() => { if (source?.id && !sourceId) setSourceId(source.id); }, [source, sourceId]);

    // A CV made in the builder can back this application without PRISM:
    // a separate copy for this application (edits stay out of the source) or
    // the saved CV itself, linked as-is.
    const [linkId, setLinkId] = useState<string>('');
    const linkable = useMemo(() => (resumes.data ?? []).filter((r) => r.id && r.id !== app?.currentResumeId), [resumes.data, app?.currentResumeId]);
    const linkSource = useMemo<StoredResume | null>(
        () => linkable.find((r) => r.id === linkId) ?? linkable.find((r) => r.isPrimary) ?? linkable[0] ?? null,
        [linkable, linkId],
    );
    const [linkCv, linkState] = useAsyncAction(async (mode: 'copy' | 'link') => {
        if (!userId || !data || !linkSource?.id) return;
        const application = data.application;
        let resumeId = linkSource.id;
        if (mode === 'copy') {
            try {
                const copy = await resumeRepo.create(userId, {
                    title: `${linkSource.title} · ${application.company || application.jobTitle}`.slice(0, 120),
                    data: linkSource.data,
                    settings: linkSource.settings,
                    templateId: linkSource.templateId,
                    visibleSections: linkSource.visibleSections,
                    isPrimary: false,
                    applicationId: application.id,
                    origin: { kind: 'manual', source: 'application_copy', sourceResumeId: linkSource.id, sourceRevision: linkSource.revision ?? null },
                });
                if (!copy.id) return;
                resumeId = copy.id;
            } catch (err) {
                if (isResumeLimitError(err)) { navigate({ view: 'pricing' }); return; }
                throw err;
            }
        }
        const fresh = await applicationRepo.get(userId, application.id);
        await applicationRepo.update(userId, fresh.id, { currentResumeId: resumeId }, fresh.revision);
        invalidate('applications:');
        invalidate('resumes:');
        invalidate('library');
        await workspace.refresh();
        void resumes.refresh();
        setLinkId('');
        await track(userId, 'application_cv_linked', { subjectRefs: { application: application.id, resume: resumeId }, payload: { mode, replaced: Boolean(fresh.currentResumeId) } });
    });

    // Stale facts behind this application's drafts and CV (COS-023).
    const stale = useOwnedQuery(userId, app ? `stale:application:${app.id}:${app.currentResumeId ?? ''}` : null, async (): Promise<StaleFactRow[]> => {
        const refs = await factRepo.staleReferences(userId as string);
        const artifactIds = new Set((data?.artifacts ?? []).filter((a) => a.status !== 'snapshot').map((a) => a.id));
        const relevant = refs.filter((r) => (r.artifactKind === 'resume' && r.artifactId === app?.currentResumeId) || (r.artifactKind === 'application_artifact' && artifactIds.has(r.artifactId)));
        const facts = relevant.length ? await factRepo.list(userId as string, { status: 'any' }) : [];
        return relevant.map((reference) => ({ reference, fact: facts.find((f) => f.id === reference.factId) ?? null, artifact: (data?.artifacts ?? []).find((a) => a.id === reference.artifactId) ?? null }));
    }, [app?.id, app?.currentResumeId, data?.artifacts.length]);

    const staleArtifacts = useMemo(() => (data?.artifacts ?? []).filter((a) => a.stale && a.status !== 'snapshot'), [data?.artifacts]);
    const resumeStale = Boolean(data?.resume?.origin && (data.resume.origin as { stale?: boolean }).stale);

    const [markReviewed, reviewState] = useAsyncAction(async () => {
        if (!userId || !data) return;
        const targets = new Set<string>([...staleArtifacts.map((a) => a.id), ...(stale.data ?? []).filter((r) => r.artifact).map((r) => r.artifact?.id as string)]);
        let artifacts = data.artifacts;
        for (const id of targets) {
            const current = artifacts.find((a) => a.id === id);
            if (!current) continue;
            const next = await artifactRepo.save(userId, { id, stale: false, provenance: { ...current.provenance, sourceRevisions: { ...(current.provenance.sourceRevisions ?? {}), factsReviewedAt: new Date().toISOString() } } }, current.revision);
            artifacts = artifacts.map((a) => (a.id === id ? next : a));
            await track(userId, 'artifact_update_reviewed', { subjectRefs: { application: data.application.id, artifact: id }, payload: { kind: current.kind } });
        }
        const factIds = Array.from(new Set((stale.data ?? []).map((r) => r.reference.factId)));
        if (app?.currentResumeId && (stale.data ?? []).some((r) => r.reference.artifactKind === 'resume')) {
            await factRepo.addReferences(userId, (stale.data ?? []).filter((r) => r.reference.artifactKind === 'resume').map((r) => ({ factId: r.reference.factId, factRevision: r.reference.currentRevision, artifactKind: 'resume' as const, artifactId: r.reference.artifactId, artifactSection: `${r.reference.artifactSection}#reviewed` })));
            await track(userId, 'artifact_update_reviewed', { subjectRefs: { application: data.application.id, resume: app.currentResumeId }, payload: { facts: factIds.length } });
        }
        workspace.setArtifacts(artifacts);
        invalidate('stale:');
        await stale.refresh();
    });

    const [addFact, addFactState] = useAsyncAction(async (answer: PrismAnswer) => {
        if (!userId || !app) return;
        const isSkill = /\b(skill|tool|technolog|language|framework|certif)/i.test(answer.question);
        const fact = await factRepo.create(userId, {
            kind: isSkill ? 'skill' : 'achievement', title: answer.answer.slice(0, 120), organization: '', location: '', startDate: '', endDate: '',
            narrative: answer.answer, payload: { question: answer.question }, parentFactId: null, confirmationState: 'user_confirmed', verification: null,
            extractionConfidence: null, sourceKind: 'prism_answer', sourceRef: { ...(app.prismRunId ? { runId: app.prismRunId } : {}), section: 'prism_answer' },
            sourceFingerprint: null, legacyId: null, conflictGroup: null, reviewState: 'reviewed', status: 'active', sortOrder: 0,
        });
        setAddedFacts((s) => new Set(s).add(answer.questionId));
        invalidate('facts:');
        await track(userId, 'career_evidence_confirmed', { subjectRefs: { fact: fact.id, application: app.id }, payload: { kind: fact.kind, source: 'prism_answer' } });
    });

    const [exportDocx, exportState] = useAsyncAction(async () => {
        if (!data?.resume) return;
        // The DOCX engine is loaded only when asked for, so the workspace never pays for it.
        const { downloadResumeDocx } = await import('../../../../lib/export/resumeDocx');
        await downloadResumeDocx(data.resume.data, { settings: data.resume.settings, visibleSections: data.resume.visibleSections });
    });

    const onFinalized = async (resumeId: string, runId: string, answers: PrismAnswer[]) => {
        if (!userId || !data) return;
        setTailoring(false);
        setAnswersToReview(answers);
        try {
            // The server links current_resume_id at finalize; refresh shows it. If
            // that link is somehow missing, set it explicitly with the revision we hold.
            const fresh = await applicationRepo.get(userId, data.application.id);
            if (fresh.currentResumeId !== resumeId) await applicationRepo.update(userId, fresh.id, { currentResumeId: resumeId, prismRunId: runId }, fresh.revision);
        } catch { /* refresh below reports the truth */ }
        invalidate('applications:');
        invalidate('resumes:');
        await workspace.refresh();
        await track(userId, 'cv_tailored', { subjectRefs: { application: data.application.id, resume: resumeId, run: runId }, payload: { answers: answers.length }, dedupeKey: `cv_tailored:${runId}` });
    };

    if (!data || !app) return null;
    const jd = data.opportunity?.capturedContent ?? '';
    const canTailor = jd.trim().length >= 80 && source !== null && typeof source.revision === 'number';
    const submittedSnapshot = app.submissionSnapshot;
    const staleRows = stale.data ?? [];
    const hasStale = staleArtifacts.length > 0 || staleRows.length > 0 || resumeStale;

    return (
        <div className="space-y-4">
            {hasStale && (
                <StatePanel
                    kind="partial"
                    title={t('careeros.cv.staleTitle', 'Facts changed since this draft')}
                    description={t('careeros.cv.staleDescription', 'Career facts this CV or its drafts were built from have been edited. Compare the current facts below with what the documents say, then mark reviewed. Submitted snapshots are never changed.')}
                    action={{ label: t('careeros.cv.markReviewed', 'Mark reviewed'), onClick: () => { void markReviewed(); } }}
                >
                    {reviewState.error ? <FailureNotice error={reviewState.error} onReload={() => { void workspace.refresh(); }} onDismiss={reviewState.reset} className="mb-3" /> : null}
                    <ul className="space-y-2">
                        {staleRows.map((row) => (
                            <li key={row.reference.id} className="rounded-xl border border-border-default bg-surface-panel p-3 text-[13px]">
                                <p className="font-semibold text-content-primary">{row.fact ? factLabel(row.fact) : t('careeros.cv.factUnavailable', 'Fact no longer available')}</p>
                                <p className="text-content-secondary">
                                    {t('careeros.cv.staleRevision', 'Used at revision {old}; the fact is now at revision {new}.').replace('{old}', String(row.reference.factRevision)).replace('{new}', String(row.reference.currentRevision))}
                                    {' '}{row.reference.artifactKind === 'resume' ? t('careeros.cv.inCv', 'Referenced by the linked CV.') : t('careeros.cv.inArtifact', 'Referenced by {title}.').replace('{title}', row.artifact?.title || row.reference.artifactId)}
                                </p>
                                {row.fact && (
                                    <dl className="mt-1 grid gap-x-3 sm:grid-cols-[auto_1fr]">
                                        <dt className="text-content-muted">{t('careeros.cv.nowTitle', 'Now')}</dt>
                                        <dd className="text-content-primary">{row.fact.title}{row.fact.narrative ? ` — ${row.fact.narrative.replace(/<[^>]+>/g, '').slice(0, 200)}` : ''}{row.fact.status !== 'active' ? ` (${row.fact.status})` : ''}</dd>
                                        <dt className="text-content-muted">{t('careeros.cv.thenTitle', 'Then')}</dt>
                                        <dd className="text-content-secondary">{t('careeros.cv.previousNotStored', 'The earlier wording is not stored; compare with the document text.')}</dd>
                                    </dl>
                                )}
                            </li>
                        ))}
                        {staleArtifacts.filter((a) => !staleRows.some((r) => r.artifact?.id === a.id)).map((a) => (
                            <li key={a.id} className="rounded-xl border border-border-default bg-surface-panel p-3 text-[13px] text-content-secondary">{t('careeros.cv.staleArtifact', '{title} was flagged out of date.').replace('{title}', a.title || a.kind)}</li>
                        ))}
                    </ul>
                </StatePanel>
            )}

            <Panel as="section" aria-labelledby="cv-current">
                <PaneHeading id="cv-current" title={t('careeros.cv.title', 'Application CV')} description={t('careeros.cv.description', 'A separate version linked to this application. Edit it in the builder; export DOCX from here. PDF export renders the preview, so it opens in the editor.')} />
                <div className="mt-4">
                    {app.currentResumeId && data.resume === null ? (
                        <StatePanel kind="error" compact title={t('careeros.cv.unavailable', 'The linked CV is unavailable')} description={t('careeros.cv.unavailableDescription', 'It may have been deleted. Link another version explicitly — the primary CV is never substituted.')} onRetry={() => { void workspace.refresh(); }} />
                    ) : data.resume ? (
                        <DocumentCard
                            title={data.resume.title}
                            kind="cv"
                            status={submittedSnapshot?.resumeId === data.resume.id ? 'snapshot' : 'draft'}
                            stale={resumeStale}
                            updatedLabel={data.resume.updatedAt ? t('careeros.document.updated', 'Updated {date}').replace('{date}', formatDate(data.resume.updatedAt)) + (typeof data.resume.revision === 'number' ? ` · ${t('careeros.artifact.revision', 'rev {rev}').replace('{rev}', String(data.resume.revision))}` : '') : undefined}
                            applicationLabel={`${app.jobTitle} · ${app.company}`}
                            action={{ label: t('careeros.cv.openEditor', 'Open in editor'), onClick: () => navigate(careerPath.toCvEdit(data.resume?.id as string, { application: app.id })) }}
                            secondaryAction={{ label: t('careeros.cv.exportDocx', 'Export DOCX'), onClick: () => { void exportDocx(); }, loading: exportState.pending }}
                        />
                    ) : (
                        <StatePanel kind="empty" compact title={t('careeros.cv.noneTitle', 'No CV linked yet')} description={t('careeros.cv.noneDescriptionLink', 'Tailor one with PRISM below, or use a CV you already made in the builder.')} />
                    )}
                    {exportState.error ? <FailureNotice error={exportState.error} onDismiss={exportState.reset} className="mt-3" /> : null}
                    {linkable.length > 0 && (
                        <div className="mt-4 border-t border-border-default pt-4">
                            <p className="text-sm font-medium text-content-primary">{data.resume ? t('careeros.cv.useAnotherTitle', 'Use a different saved CV') : t('careeros.cv.useSavedTitle', 'Use a saved CV')}</p>
                            <p className="mt-0.5 text-[13px] text-content-secondary">{t('careeros.cv.useSavedDescription', 'A copy keeps edits for this application out of the original. Linking uses the CV itself, so edits show up everywhere it is used.')}</p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                                <Select
                                    className="sm:max-w-xs sm:flex-1"
                                    label={t('careeros.cv.savedCv', 'Saved CV')}
                                    options={linkable.map((r) => ({ value: r.id ?? '', label: `${r.title}${r.isPrimary ? ` · ${t('careeros.cv.primary', 'primary')}` : ''}` }))}
                                    value={linkSource?.id ?? ''}
                                    onChange={(event) => setLinkId(event.target.value)}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="secondary" size="sm" loading={linkState.pending} onClick={() => { void linkCv('copy'); }}>{t('careeros.cv.useCopy', 'Use a copy')}</Button>
                                    <Button variant="quiet" size="sm" disabled={linkState.pending} onClick={() => { void linkCv('link'); }}>{t('careeros.cv.linkAsIs', 'Link as-is')}</Button>
                                </div>
                            </div>
                            {linkState.error ? <FailureNotice error={linkState.error} onDismiss={linkState.reset} className="mt-3" /> : null}
                        </div>
                    )}
                    {submittedSnapshot && (
                        <p className="mt-3 text-xs text-content-muted">
                            {t('careeros.cv.submittedSnapshot', 'Submitted {date} with CV {id}{version}. That snapshot is read-only.').replace('{date}', formatDate(submittedSnapshot.confirmedAt)).replace('{id}', submittedSnapshot.resumeId ? submittedSnapshot.resumeId.slice(0, 8) : t('careeros.common.none', 'none')).replace('{version}', submittedSnapshot.resumeRevision !== null ? ` rev ${submittedSnapshot.resumeRevision}` : '')}
                        </p>
                    )}
                </div>
            </Panel>

            <Panel as="section" aria-labelledby="cv-tailor">
                <PaneHeading
                    id="cv-tailor"
                    title={t('careeros.cv.tailorTitle', 'Tailor with PRISM')}
                    description={t('careeros.cv.tailorDescription', 'Analyse the listing against a source CV, answer clarification questions, review every line, then approve. The result is linked to this application; the same start is charged once.')}
                    action={!tailoring ? (
                        <Button variant="primary" icon={<Sparkles size={14} />} onClick={() => setTailoring(true)} disabled={!canTailor}>{t('careeros.cv.tailor', 'Tailor with PRISM')}</Button>
                    ) : (
                        <Button variant="quiet" icon={<X size={14} />} onClick={() => setTailoring(false)}>{t('careeros.common.close', 'Close')}</Button>
                    )}
                />
                {resumes.error ? <StatePanel kind="error" compact className="mt-3" onRetry={() => { void resumes.refresh(); }} /> : null}
                {!tailoring && (
                    <div className="mt-3 max-w-sm">
                        <Select label={t('careeros.cv.source', 'Source CV')} options={(resumes.data ?? []).map((r) => ({ value: r.id ?? '', label: `${r.title}${r.isPrimary ? ` · ${t('careeros.cv.primary', 'primary')}` : ''}` }))} value={source?.id ?? ''} onChange={(event) => setSourceId(event.target.value)} hint={jd.trim().length < 80 ? t('careeros.cv.noJd', 'Tailoring needs the listing text on the linked opportunity.') : (resumes.data ?? []).length === 0 ? t('careeros.cv.noResumes', 'No saved CVs yet. Create one in the Library first.') : undefined} />
                    </div>
                )}
                {tailoring && source?.id && typeof source.revision === 'number' && (
                    <div className="mt-4 rounded-2xl border border-border-default bg-surface-canvas p-3 sm:p-5">
                        <Suspense fallback={<div role="status" className="flex items-center gap-2 text-sm text-content-secondary"><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{t('label.loading', 'Loading')}</div>}>
                            <PrismWizard
                                binding={{
                                    applicationId: app.id,
                                    jdText: jd,
                                    sourceResumeId: source.id,
                                    sourceResumeRevision: source.revision,
                                    idempotencyKey: `tailor:${app.id}:${source.id}:${source.revision}`,
                                    onFinalized: (resumeId, runId, answers) => { void onFinalized(resumeId, runId, answers); },
                                    onRunStarted: (runId) => { if (userId) void track(userId, 'cv_tailoring_started', { subjectRefs: { application: app.id, run: runId, resume: source.id as string }, payload: { sourceRevision: source.revision ?? 0 }, dedupeKey: `cv_tailoring_started:${runId}` }); },
                                }}
                            />
                        </Suspense>
                    </div>
                )}
            </Panel>

            {answersToReview.length > 0 && (
                <Panel as="section" aria-labelledby="cv-new-facts">
                    <PaneHeading id="cv-new-facts" title={t('careeros.cv.newFactsTitle', 'New facts introduced by your answers')} description={t('careeros.cv.newFactsDescription', 'PRISM only rewrites what your CV and answers say. Anything new you typed can become a career fact — confirmed by you, since you wrote it — so future documents can cite it.')} action={<Button size="sm" variant="quiet" onClick={() => setAnswersToReview([])}>{t('careeros.common.dismiss', 'Dismiss')}</Button>} />
                    {addFactState.error ? <FailureNotice error={addFactState.error} onDismiss={addFactState.reset} className="mt-3" /> : null}
                    <ul className="mt-3 space-y-2">
                        {answersToReview.map((a) => (
                            <li key={a.questionId} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border-default p-3 text-[13px]">
                                <span className="min-w-0 flex-1">
                                    <span className="block text-content-muted">{a.question}</span>
                                    <span className="block text-content-primary">{a.answer}</span>
                                </span>
                                {addedFacts.has(a.questionId) ? (
                                    <span className="text-status-success">{t('careeros.cv.factAdded', 'Added as a fact')}</span>
                                ) : (
                                    <Button size="sm" variant="secondary" onClick={() => { void addFact(a); }} loading={addFactState.pending}>{t('careeros.cv.addFact', 'Add as career fact')}</Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}
        </div>
    );
};

export default CvSection;
