import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../../services/translationService';
import * as artifactRepo from '../../../../services/careerOs/artifactRepo';
import { track } from '../../../../services/careerOs/careerEvents';
import type { ApplicationArtifact } from '../../../../services/careerOs/types';
import { ConfirmDialog } from '../../../common/ConfirmDialog';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { Button, StatePanel, StatusChip } from '../../primitives';
import { FailureNotice } from '../FailureNotice';
import { Panel, PaneHeading, TextArea, TextInput } from '../fields';
import { useAsyncAction } from '../useAsyncAction';
import type { Workspace } from '../useApplicationWorkspace';

/**
 * Employer application questions (REQ-18): the questions an employer's form
 * asks, each with the answer you will submit. Explicitly not PRISM's
 * clarification questions — those feed CV tailoring and live in the CV
 * section. Each question is one `employer_question` artifact.
 */
const questionOf = (a: ApplicationArtifact): string => (typeof a.content.question === 'string' ? a.content.question : '');
const answerOf = (a: ApplicationArtifact): string => (typeof a.content.answer === 'string' ? a.content.answer : '');

const QuestionRow: React.FC<{ artifact: ApplicationArtifact; workspace: Workspace; onDelete: (a: ApplicationArtifact) => void }> = ({ artifact, workspace, onDelete }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [question, setQuestion] = useState(questionOf(artifact));
    const [answer, setAnswer] = useState(answerOf(artifact));
    const dirty = question !== questionOf(artifact) || answer !== answerOf(artifact);
    const locked = artifact.status === 'snapshot';

    const [save, saveState] = useAsyncAction(async (status: 'draft' | 'reviewed') => {
        if (!userId || !workspace.data) return;
        const saved = await artifactRepo.save(userId, { id: artifact.id, title: question.slice(0, 120), content: { question, answer }, plainText: answer, status, stale: false }, artifact.revision);
        workspace.setArtifacts([...workspace.data.artifacts.filter((a) => a.id !== saved.id), saved]);
        invalidate('applications:');
        await track(userId, 'application_artifact_saved', { subjectRefs: { application: saved.applicationId, artifact: saved.id }, payload: { kind: 'employer_question', status, revision: saved.revision } });
    });

    return (
        <li className="rounded-xl border border-border-default p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusChip label={{ draft: t('careeros.document.status.draft', 'Draft'), reviewed: t('careeros.document.status.reviewed', 'Reviewed'), snapshot: t('careeros.document.status.snapshot', 'Submitted snapshot') }[artifact.status]} tone={artifact.status === 'reviewed' ? 'success' : 'neutral'} />
                {!locked && <Button size="sm" variant="quiet" icon={<Trash2 size={14} />} onClick={() => onDelete(artifact)}>{t('careeros.common.delete', 'Delete')}</Button>}
            </div>
            <TextInput className="mt-3" label={t('careeros.questions.question', 'Employer question')} value={question} readOnly={locked} onChange={(event) => setQuestion(event.target.value)} />
            <TextArea className="mt-3" label={t('careeros.questions.answer', 'Your answer')} rows={4} value={answer} readOnly={locked} onChange={(event) => setAnswer(event.target.value)} />
            {saveState.error ? <FailureNotice error={saveState.error} onReload={() => { void workspace.refresh(); }} onDismiss={saveState.reset} className="mt-3" /> : null}
            {!locked && (
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => { void save('draft'); }} loading={saveState.pending} disabled={!dirty}>{t('careeros.common.save', 'Save')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => { void save('reviewed'); }} loading={saveState.pending} disabled={answer.trim().length === 0 || (!dirty && artifact.status === 'reviewed')}>{t('careeros.questions.markAnswered', 'Mark answer reviewed')}</Button>
                </div>
            )}
        </li>
    );
};

export const QuestionsSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [newQuestion, setNewQuestion] = useState('');
    const [deleting, setDeleting] = useState<ApplicationArtifact | null>(null);
    const questions = useMemo(() => (workspace.data?.artifacts ?? []).filter((a) => a.kind === 'employer_question').sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)), [workspace.data?.artifacts]);

    const [add, addState] = useAsyncAction(async () => {
        if (!userId || !workspace.data || !newQuestion.trim()) return;
        const created = await artifactRepo.save(userId, { applicationId: workspace.data.application.id, kind: 'employer_question', title: newQuestion.trim().slice(0, 120), content: { question: newQuestion.trim(), answer: '' }, plainText: '', source: 'user', status: 'draft' });
        workspace.setArtifacts([...workspace.data.artifacts, created]);
        invalidate('applications:');
        setNewQuestion('');
        await track(userId, 'application_artifact_saved', { subjectRefs: { application: created.applicationId, artifact: created.id }, payload: { kind: 'employer_question', status: 'draft', revision: created.revision } });
    });

    const [remove, removeState] = useAsyncAction(async (artifact: ApplicationArtifact) => {
        if (!userId || !workspace.data) return;
        await artifactRepo.remove(userId, artifact.id);
        workspace.setArtifacts(workspace.data.artifacts.filter((a) => a.id !== artifact.id));
        invalidate('applications:');
    });

    return (
        <div className="space-y-4">
            <Panel as="section" aria-labelledby="questions-heading">
                <PaneHeading id="questions-heading" title={t('careeros.questions.title', 'Employer questions')} description={t('careeros.questions.description', 'Questions from the employer\'s application form and the answers you will submit. These are separate from PRISM\'s clarification questions, which only shape your CV.')} />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <TextInput className="flex-1" label={t('careeros.questions.new', 'Add a question the employer asks')} value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder={t('careeros.questions.newPlaceholder', 'e.g. Why do you want to work here?')} />
                    <Button variant="primary" icon={<Plus size={14} />} onClick={() => { void add(); }} loading={addState.pending} disabled={!newQuestion.trim()}>{t('careeros.common.add', 'Add')}</Button>
                </div>
                {addState.error ? <FailureNotice error={addState.error} onDismiss={addState.reset} className="mt-3" /> : null}
                {removeState.error ? <FailureNotice error={removeState.error} onDismiss={removeState.reset} className="mt-3" /> : null}
            </Panel>
            {questions.length === 0 ? (
                <StatePanel kind="empty" compact title={t('careeros.questions.emptyTitle', 'No employer questions recorded')} description={t('careeros.questions.emptyDescription', 'Add them as you find them on the employer\'s form. Readiness counts them once they have a reviewed answer.')} />
            ) : (
                <ul className="space-y-3">
                    {questions.map((q) => <QuestionRow key={`${q.id}:${q.revision}`} artifact={q} workspace={workspace} onDelete={setDeleting} />)}
                </ul>
            )}
            <ConfirmDialog
                open={deleting !== null}
                title={t('careeros.questions.deleteTitle', 'Delete this question?')}
                description={t('careeros.questions.deleteDescription', 'The question and its answer are removed from this application.')}
                confirmLabel={t('careeros.common.delete', 'Delete')}
                destructive
                onCancel={() => setDeleting(null)}
                onConfirm={() => { const target = deleting; setDeleting(null); if (target) void remove(target); }}
            />
        </div>
    );
};

export default QuestionsSection;
