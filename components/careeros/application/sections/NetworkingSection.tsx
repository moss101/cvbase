import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../../services/translationService';
import * as artifactRepo from '../../../../services/careerOs/artifactRepo';
import * as applicationRepo from '../../../../services/careerOs/applicationRepo';
import { track } from '../../../../services/careerOs/careerEvents';
import type { ApplicationArtifact } from '../../../../services/careerOs/types';
import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { Button, StatePanel, StatusChip } from '../../primitives';
import { FailureNotice } from '../FailureNotice';
import { Panel, PaneHeading, TextArea, TextInput } from '../fields';
import { formatDate } from '../format';
import { useAsyncAction } from '../useAsyncAction';
import type { Workspace } from '../useApplicationWorkspace';

/**
 * Private relationship notes (REQ-18): who you know, how, what was said, a
 * follow-up date and a reviewed draft message. No contact is ever inferred
 * and nothing is sent — the draft is yours to copy and send yourself. The
 * follow-up date is also written to the application so Today can remind you.
 */
interface NoteContent { contactName: string; relationship: string; note: string; followUpAt: string; draftMessage: string }

const contentOf = (a: ApplicationArtifact): NoteContent => ({
    contactName: typeof a.content.contactName === 'string' ? a.content.contactName : '',
    relationship: typeof a.content.relationship === 'string' ? a.content.relationship : '',
    note: typeof a.content.note === 'string' ? a.content.note : '',
    followUpAt: typeof a.content.followUpAt === 'string' ? a.content.followUpAt : '',
    draftMessage: typeof a.content.draftMessage === 'string' ? a.content.draftMessage : '',
});

const NoteCard: React.FC<{ artifact: ApplicationArtifact; workspace: Workspace; onDelete: (a: ApplicationArtifact) => void }> = ({ artifact, workspace, onDelete }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [value, setValue] = useState<NoteContent>(contentOf(artifact));
    const initial = contentOf(artifact);
    const dirty = JSON.stringify(value) !== JSON.stringify(initial);
    const locked = artifact.status === 'snapshot';

    const [save, saveState] = useAsyncAction(async (status: 'draft' | 'reviewed') => {
        if (!userId || !workspace.data) return;
        const app = workspace.data.application;
        const saved = await artifactRepo.save(userId, { id: artifact.id, title: value.contactName || value.relationship || t('careeros.networking.untitled', 'Relationship note'), content: { ...value }, plainText: value.note, status, stale: false }, artifact.revision);
        let nextApp = app;
        if (value.followUpAt && value.followUpAt !== (app.followUpAt ?? '').slice(0, 10)) {
            nextApp = await applicationRepo.update(userId, app.id, { followUpAt: value.followUpAt }, app.revision);
        }
        workspace.setData({ ...workspace.data, application: nextApp, artifacts: [...workspace.data.artifacts.filter((a) => a.id !== saved.id), saved] });
        invalidate('applications:');
        await track(userId, 'application_artifact_saved', { subjectRefs: { application: saved.applicationId, artifact: saved.id }, payload: { kind: 'networking_note', status, revision: saved.revision, hasFollowUp: Boolean(value.followUpAt) } });
    });

    const field = <K extends keyof NoteContent>(key: K) => ({ value: value[key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue((v) => ({ ...v, [key]: event.target.value })), readOnly: locked });

    return (
        <li className="rounded-xl border border-border-default p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusChip label={artifact.status === 'reviewed' ? t('careeros.networking.reviewedDraft', 'Reviewed draft — you send it yourself') : { draft: t('careeros.document.status.draft', 'Draft'), snapshot: t('careeros.document.status.snapshot', 'Submitted snapshot'), reviewed: '' }[artifact.status]} tone={artifact.status === 'reviewed' ? 'success' : 'neutral'} />
                {!locked && <Button size="sm" variant="quiet" icon={<Trash2 size={14} />} onClick={() => onDelete(artifact)}>{t('careeros.common.delete', 'Delete')}</Button>}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextInput label={t('careeros.networking.contact', 'Contact name')} optional={t('careeros.common.optional', 'optional')} {...field('contactName')} />
                <TextInput label={t('careeros.networking.relationship', 'Relationship')} placeholder={t('careeros.networking.relationshipPlaceholder', 'e.g. former colleague, recruiter')} {...field('relationship')} />
                <TextInput label={t('careeros.networking.followUp', 'Follow up on')} type="date" hint={t('careeros.networking.followUpHint', 'Also sets the application\'s follow-up date for Today.')} {...field('followUpAt')} />
            </div>
            <TextArea className="mt-3" label={t('careeros.networking.note', 'Private note')} rows={3} {...field('note')} />
            <TextArea className="mt-3" label={t('careeros.networking.draft', 'Draft message (reviewed draft — you send it yourself)')} rows={4} hint={t('careeros.networking.draftHint', 'CVBase never sends messages or looks up contacts. Copy this into the channel you choose.')} {...field('draftMessage')} />
            {saveState.error ? <FailureNotice error={saveState.error} onReload={() => { void workspace.refresh(); }} onDismiss={saveState.reset} className="mt-3" /> : null}
            {!locked && (
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => { void save('draft'); }} loading={saveState.pending} disabled={!dirty}>{t('careeros.common.save', 'Save')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => { void save('reviewed'); }} loading={saveState.pending} disabled={!dirty && artifact.status === 'reviewed'}>{t('careeros.networking.markReviewed', 'Mark draft reviewed')}</Button>
                </div>
            )}
        </li>
    );
};

export const NetworkingSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [deleting, setDeleting] = useState<ApplicationArtifact | null>(null);
    const notes = useMemo(() => (workspace.data?.artifacts ?? []).filter((a) => a.kind === 'networking_note').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [workspace.data?.artifacts]);
    const app = workspace.data?.application;

    const [add, addState] = useAsyncAction(async () => {
        if (!userId || !workspace.data) return;
        const created = await artifactRepo.save(userId, { applicationId: workspace.data.application.id, kind: 'networking_note', title: t('careeros.networking.untitled', 'Relationship note'), content: { contactName: '', relationship: '', note: '', followUpAt: '', draftMessage: '' }, plainText: '', source: 'user', status: 'draft' });
        workspace.setArtifacts([...workspace.data.artifacts, created]);
        invalidate('applications:');
    });
    const [remove, removeState] = useAsyncAction(async (artifact: ApplicationArtifact) => {
        if (!userId || !workspace.data) return;
        await artifactRepo.remove(userId, artifact.id);
        workspace.setArtifacts(workspace.data.artifacts.filter((a) => a.id !== artifact.id));
        invalidate('applications:');
    });

    return (
        <div className="space-y-4">
            <Panel as="section" aria-labelledby="networking-heading">
                <PaneHeading id="networking-heading" title={t('careeros.networking.title', 'Networking')} description={t('careeros.networking.description', 'Private relationship notes, follow-up dates and reviewed drafts. Contacts are only the ones you write down; nothing is sent from here.')} action={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { void add(); }} loading={addState.pending}>{t('careeros.networking.add', 'Add note')}</Button>} />
                {app?.followUpAt && <p className="mt-3 text-[13px] text-content-secondary">{t('careeros.application.followUp', 'Follow up {date}').replace('{date}', formatDate(app.followUpAt))}</p>}
                {addState.error ? <FailureNotice error={addState.error} onDismiss={addState.reset} className="mt-3" /> : null}
                {removeState.error ? <FailureNotice error={removeState.error} onDismiss={removeState.reset} className="mt-3" /> : null}
            </Panel>
            {notes.length === 0 ? (
                <StatePanel kind="empty" compact title={t('careeros.networking.emptyTitle', 'No relationship notes yet')} description={t('careeros.networking.emptyDescription', 'Record people you know at the company, what you discussed and when to follow up.')} />
            ) : (
                <ul className="space-y-3">{notes.map((n) => <NoteCard key={`${n.id}:${n.revision}`} artifact={n} workspace={workspace} onDelete={setDeleting} />)}</ul>
            )}
            <ConfirmDialog open={deleting !== null} title={t('careeros.networking.deleteTitle', 'Delete this note?')} confirmLabel={t('careeros.common.delete', 'Delete')} destructive onCancel={() => setDeleting(null)} onConfirm={() => { const target = deleting; setDeleting(null); if (target) void remove(target); }} />
        </div>
    );
};

export default NetworkingSection;
