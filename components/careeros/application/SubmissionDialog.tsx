import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as versionRepo from '../../../services/repos/versionRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { SubmissionLockedError } from '../../../services/careerOs/applicationRepo';
import type { SubmissionSnapshot } from '../../../services/careerOs/types';
import type { StoredVersion } from '../../../services/repos/mappers';
import { Dialog } from '../../common/Dialog';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, StatePanel } from '../primitives';
import { FailureNotice } from './FailureNotice';
import { Checkbox, Select, TextArea, TextInput } from './fields';
import { formatDate, todayIsoDate } from './format';
import { useAsyncAction } from './useAsyncAction';
import type { Workspace } from './useApplicationWorkspace';

/**
 * "Record submission" (REQ-18/COS-025): the person confirms they sent the
 * application, with the method, the exact CV version and the artifacts
 * included. The record is immutable; a second one must explicitly
 * supersede the first (the earlier snapshot is kept verbatim). Opening the
 * employer site never records anything.
 */
export interface SubmissionDialogProps {
    open: boolean;
    workspace: Workspace;
    onClose: () => void;
}

const METHODS: SubmissionSnapshot['method'][] = ['employer_site', 'export', 'email', 'other'];

export const SubmissionDialog: React.FC<SubmissionDialogProps> = ({ open, workspace, onClose }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const data = workspace.data;
    const [method, setMethod] = useState<SubmissionSnapshot['method']>('employer_site');
    const [confirmedDate, setConfirmedDate] = useState(todayIsoDate());
    const [versionId, setVersionId] = useState('');
    const [versions, setVersions] = useState<StoredVersion[] | null>(null);
    const [included, setIncluded] = useState<Set<string>>(new Set());
    const [note, setNote] = useState('');
    const [supersede, setSupersede] = useState(false);

    const artifacts = useMemo(() => (data?.artifacts ?? []).filter((a) => a.status !== 'snapshot' && a.kind !== 'role_analysis' && a.kind !== 'submission'), [data?.artifacts]);
    const hasPrevious = Boolean(data?.application.submissionSnapshot);

    useEffect(() => {
        if (!open) return;
        setMethod('employer_site'); setConfirmedDate(todayIsoDate()); setVersionId(''); setNote(''); setSupersede(false);
        setIncluded(new Set(artifacts.filter((a) => a.status === 'reviewed').map((a) => a.id)));
        setVersions(null);
        const resumeId = data?.application.currentResumeId;
        if (userId && resumeId) versionRepo.listForResume(userId, resumeId).then(setVersions).catch(() => setVersions([]));
        else setVersions([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const [record, recordState] = useAsyncAction(async () => {
        if (!userId || !data) return;
        const app = data.application;
        const confirmedAt = new Date(`${confirmedDate}T12:00:00`).toISOString();
        const snapshotIds: string[] = [];
        for (const id of included) {
            const snap = await artifactRepo.snapshot(userId, id);
            snapshotIds.push(snap.id);
        }
        const snapshot: SubmissionSnapshot = {
            resumeId: app.currentResumeId,
            resumeVersionId: versionId || null,
            resumeRevision: data.resume?.revision ?? null,
            artifactIds: snapshotIds,
            confirmedAt,
            method,
        };
        const next = await applicationRepo.recordSubmission(userId, app.id, snapshot, app.revision, { supersede });
        const observation = await outcomeRepo.record(userId, app.id, 'submitted', { observedAt: confirmedAt, note, details: { method, artifacts: snapshotIds.length, superseded: supersede } });
        await track(userId, 'application_submitted', { subjectRefs: { application: app.id, outcome: observation.id }, payload: { method, artifacts: snapshotIds.length, hasResume: app.currentResumeId !== null, supersede }, dedupeKey: `application_submitted:${app.id}:${next.revision}` });
        invalidate('applications:');
        invalidate('campaign');
        await workspace.refresh();
        onClose();
    });

    const locked = recordState.error instanceof SubmissionLockedError;

    return (
        <Dialog
            open={open}
            onClose={recordState.pending ? () => undefined : onClose}
            title={t('careeros.submission.title', 'Record submission')}
            panelClassName="max-w-lg max-h-[92vh]"
            bodyClassName="overflow-y-auto"
            footer={
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
                    <Button variant="quiet" onClick={onClose} disabled={recordState.pending}>{t('btn.cancel', 'Cancel')}</Button>
                    <Button variant="primary" onClick={() => { void record(); }} loading={recordState.pending} disabled={!data || (hasPrevious && !supersede)}>{t('careeros.submission.confirm', 'I sent this application')}</Button>
                </div>
            }
        >
            <p className="text-[13px] text-content-secondary">{t('careeros.submission.description', 'Only you can mark an application as sent. This records the time, the CV version and the artifacts you included, exactly as they are now.')}</p>
            {hasPrevious && data?.application.submissionSnapshot && (
                <StatePanel kind="partial" compact className="mt-3" title={t('careeros.submission.alreadyRecorded', 'A submission was already recorded on {date}').replace('{date}', formatDate(data.application.submissionSnapshot.confirmedAt))} description={t('careeros.submission.supersedeHint', 'Recording another keeps the earlier record and marks it superseded. Tick the box below to confirm.')}>
                    <Checkbox label={t('careeros.submission.supersede', 'Supersede the earlier submission record')} checked={supersede} onChange={setSupersede} />
                </StatePanel>
            )}
            <div className="mt-4 space-y-4">
                <Select label={t('careeros.submission.method', 'How did you submit?')} options={METHODS.map((m) => ({ value: m, label: { employer_site: t('careeros.submission.method.employerSite', 'On the employer site'), export: t('careeros.submission.method.export', 'Exported documents'), email: t('careeros.submission.method.email', 'By email'), other: t('careeros.submission.method.other', 'Other') }[m] }))} value={method} onChange={(event) => setMethod(event.target.value as SubmissionSnapshot['method'])} />
                <TextInput label={t('careeros.submission.date', 'Date sent')} type="date" value={confirmedDate} max={todayIsoDate()} onChange={(event) => setConfirmedDate(event.target.value)} />
                <div>
                    <p className="text-[13px] font-semibold text-content-primary">{t('careeros.submission.cv', 'CV version')}</p>
                    {data?.resume ? (
                        <>
                            <p className="mt-1 text-[13px] text-content-secondary">{data.resume.title}{typeof data.resume.revision === 'number' ? ` · ${t('careeros.artifact.revision', 'rev {rev}').replace('{rev}', String(data.resume.revision))}` : ''}</p>
                            {versions === null ? <p className="mt-1 text-xs text-content-muted">{t('careeros.state.loading.title', 'Loading')}…</p> : versions.length > 0 && (
                                <Select className="mt-2" label={t('careeros.submission.versionLabel', 'Saved snapshot label')} optional={t('careeros.common.optional', 'optional')} options={[{ value: '', label: t('careeros.submission.currentVersion', 'Current (no saved snapshot)') }, ...versions.map((v) => ({ value: v.id ?? '', label: `${v.label} · ${formatDate(v.createdAt)}` }))]} value={versionId} onChange={(event) => setVersionId(event.target.value)} />
                            )}
                        </>
                    ) : (
                        <p className="mt-1 text-[13px] text-status-warning">{data?.application.currentResumeId ? t('careeros.submission.resumeUnavailable', 'The linked CV could not be loaded; the record will keep its id.') : t('careeros.submission.noResume', 'No CV is linked to this application. You can still record the submission.')}</p>
                    )}
                </div>
                <div>
                    <p className="text-[13px] font-semibold text-content-primary">{t('careeros.submission.artifacts', 'Artifacts included')}</p>
                    {artifacts.length === 0 ? (
                        <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.submission.noArtifacts', 'No preparation artifacts to include.')}</p>
                    ) : (
                        <ul className="mt-1 space-y-1">
                            {artifacts.map((a) => (
                                <li key={a.id}><Checkbox label={`${a.title || a.kind} (${a.kind.replace('_', ' ')})`} hint={a.status === 'reviewed' ? t('careeros.document.status.reviewed', 'Reviewed') : t('careeros.document.status.draft', 'Draft')} checked={included.has(a.id)} onChange={(on) => setIncluded((s) => { const next = new Set(s); if (on) next.add(a.id); else next.delete(a.id); return next; })} /></li>
                            ))}
                        </ul>
                    )}
                </div>
                <TextArea label={t('careeros.outcome.note', 'Note')} optional={t('careeros.common.optional', 'optional')} rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
                {recordState.error ? (
                    locked
                        ? <StatePanel kind="error" compact title={t('careeros.submission.lockedTitle', 'A submission record already exists')} description={t('careeros.submission.lockedDescription', 'Tick "Supersede" to record a new one; the earlier record is kept.')} secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: recordState.reset }} />
                        : <FailureNotice error={recordState.error} onReload={() => { void workspace.refresh(); }} onDismiss={recordState.reset} />
                ) : null}
            </div>
        </Dialog>
    );
};

export default SubmissionDialog;
