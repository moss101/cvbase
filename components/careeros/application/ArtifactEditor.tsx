import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, History, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import { track } from '../../../services/careerOs/careerEvents';
import type { ApplicationArtifact, ArtifactKind, ArtifactProvenance } from '../../../services/careerOs/types';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button, StatePanel, StatusChip } from '../primitives';
import { classifyAiError, panelKindFor } from './errors';
import { FailureNotice } from './FailureNotice';
import { Panel, PaneHeading, TextArea } from './fields';
import { formatDate } from './format';
import { useAsyncAction } from './useAsyncAction';
import type { Workspace } from './useApplicationWorkspace';

/**
 * A plain-text preparation artifact (cover letter, LinkedIn positioning)
 * with Save, Mark reviewed, optional Generate, version history and
 * "Snapshot for submission" (REQ-17/REQ-18). Saving updates the current
 * draft with its revision; generating creates a new AI-sourced draft so the
 * person's own text stays in the history; snapshots are immutable and
 * read-only. AI failures show the AI-unavailable or plan state and never
 * touch the draft.
 */
export interface GenerateResult {
    text: string;
    provenance?: ArtifactProvenance;
    /** Extra notes to show beneath the generated text (critique, tips). */
    notes?: string[];
}

export interface ArtifactEditorProps {
    workspace: Workspace;
    kind: Extract<ArtifactKind, 'cover_letter' | 'linkedin' | 'note'>;
    heading: string;
    description?: string;
    fieldLabel: string;
    placeholder?: string;
    /** Returns generated text from the current draft; omit to hide Generate. */
    generate?: (currentText: string) => Promise<GenerateResult>;
    generateLabel?: string;
    generateHint?: string;
}

export const artifactText = (a: ApplicationArtifact): string => (typeof a.content.text === 'string' ? a.content.text : a.plainText);

export const ArtifactEditor: React.FC<ArtifactEditorProps> = ({ workspace, kind, heading, description, fieldLabel, placeholder, generate, generateLabel, generateHint }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const data = workspace.data;
    const all = useMemo(() => (data?.artifacts ?? []).filter((a) => a.kind === kind).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [data?.artifacts, kind]);
    const current = useMemo(() => all.find((a) => a.status !== 'snapshot') ?? null, [all]);
    const [text, setText] = useState<string>('');
    const [dirty, setDirty] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [notes, setNotes] = useState<string[]>([]);

    useEffect(() => {
        if (!dirty) setText(current ? artifactText(current) : '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.id, current?.revision]);

    const applyArtifacts = (next: ApplicationArtifact) => {
        if (!data) return;
        workspace.setArtifacts([...data.artifacts.filter((a) => a.id !== next.id), next]);
        invalidate('applications:');
    };

    const emitSaved = (artifact: ApplicationArtifact, source: string) => (userId ? track(userId, 'application_artifact_saved', {
        subjectRefs: { application: artifact.applicationId, artifact: artifact.id },
        payload: { kind, source, status: artifact.status, revision: artifact.revision },
    }) : Promise.resolve());

    const [save, saveState] = useAsyncAction(async (status: 'draft' | 'reviewed' = 'draft') => {
        if (!userId || !data) return;
        const saved = current
            ? await artifactRepo.save(userId, { id: current.id, content: { ...current.content, text }, plainText: text, status, stale: false, ...(current.source !== 'user' && text !== artifactText(current) ? { source: 'user' as const } : {}) }, current.revision)
            : await artifactRepo.save(userId, { applicationId: data.application.id, kind, title: heading, content: { text }, plainText: text, source: 'user', status });
        applyArtifacts(saved);
        setDirty(false);
        await emitSaved(saved, 'user');
    });

    const [run, generateState] = useAsyncAction(async () => {
        if (!userId || !data || !generate) return;
        const result = await generate(text);
        const created = await artifactRepo.save(userId, {
            applicationId: data.application.id, kind, title: heading, content: { text: result.text }, plainText: result.text, source: 'ai', status: 'draft',
            provenance: { model: 'llm-routed', ...(result.provenance ?? {}) },
        });
        applyArtifacts(created);
        setNotes(result.notes ?? []);
        setText(result.text);
        setDirty(false);
        await emitSaved(created, 'ai');
    });

    const [snapshot, snapshotState] = useAsyncAction(async () => {
        if (!userId || !current) return;
        const snap = await artifactRepo.snapshot(userId, current.id);
        applyArtifacts(snap);
        await emitSaved(snap, 'snapshot');
    });

    const generateFailure = generateState.error ? classifyAiError(generateState.error) : null;
    const statusLabel = { draft: t('careeros.document.status.draft', 'Draft'), reviewed: t('careeros.document.status.reviewed', 'Reviewed'), snapshot: t('careeros.document.status.snapshot', 'Submitted snapshot') };
    const sourceLabel = { user: t('careeros.artifact.source.user', 'You'), ai: t('careeros.artifact.source.ai', 'AI'), prism: 'PRISM', coach: t('careeros.artifact.source.coach', 'Coach') };

    return (
        <div className="space-y-4">
            <Panel as="section" aria-labelledby={`artifact-${kind}`}>
                <PaneHeading
                    id={`artifact-${kind}`}
                    title={heading}
                    description={description}
                    action={
                        <div className="flex flex-wrap items-center gap-2">
                            {current && <StatusChip label={statusLabel[current.status]} tone={current.status === 'reviewed' ? 'success' : 'neutral'} announce />}
                            {current?.stale && <StatusChip label={t('careeros.document.stale', 'Out of date')} tone="warning" />}
                            {current?.source === 'ai' && <StatusChip label={t('careeros.artifact.aiDraft', 'AI draft — review before use')} tone="info" />}
                        </div>
                    }
                />
                <TextArea
                    className="mt-4"
                    label={fieldLabel}
                    rows={kind === 'note' ? 6 : 14}
                    value={text}
                    placeholder={placeholder}
                    onChange={(event) => { setText(event.target.value); setDirty(true); }}
                    hint={current ? t('careeros.artifact.savedAt', 'Saved {date} · revision {rev}').replace('{date}', formatDate(current.updatedAt, undefined, true)).replace('{rev}', String(current.revision)) : t('careeros.artifact.unsaved', 'Not saved yet')}
                />
                {notes.length > 0 && (
                    <div role="status" className="mt-3 rounded-xl bg-surface-canvas px-3.5 py-3 text-[13px] text-content-primary">
                        <p className="font-semibold">{t('careeros.artifact.generatedNotes', 'Notes from the generator')}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                    </div>
                )}
                {saveState.error ? <FailureNotice error={saveState.error} onReload={() => { void workspace.refresh(); }} onDismiss={saveState.reset} className="mt-3" /> : null}
                {snapshotState.error ? <FailureNotice error={snapshotState.error} onDismiss={snapshotState.reset} className="mt-3" /> : null}
                {generateFailure ? (
                    <StatePanel
                        kind={panelKindFor(generateFailure)}
                        compact
                        className="mt-3"
                        title={generateFailure === 'ai-unavailable' ? t('careeros.artifact.aiUnavailableTitle', 'Could not generate a draft right now') : undefined}
                        description={generateFailure === 'ai-unavailable' ? t('careeros.artifact.aiUnavailableDescription', 'Your text is unchanged. Keep writing, or try again later.') : generateFailure === 'denied' ? t('careeros.artifact.aiDenied', 'You have used the AI actions on your plan. Your text is unchanged.') : undefined}
                        secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: generateState.reset }}
                    />
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="primary" onClick={() => { void save('draft'); }} loading={saveState.pending} disabled={!dirty && current !== null}>
                        {t('careeros.common.save', 'Save')}
                    </Button>
                    <Button variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => { void save('reviewed'); }} loading={saveState.pending} disabled={text.trim().length === 0 || (current?.status === 'reviewed' && !dirty)}>
                        {t('careeros.artifact.markReviewed', 'Mark reviewed')}
                    </Button>
                    {generate && (
                        <Button variant="secondary" icon={<Sparkles size={14} />} onClick={() => { void run(); }} loading={generateState.pending}>
                            {generateLabel ?? t('careeros.artifact.generate', 'Generate with AI')}
                        </Button>
                    )}
                    {current && (
                        <Button variant="quiet" icon={<Camera size={14} />} onClick={() => { void snapshot(); }} loading={snapshotState.pending} disabled={dirty}>
                            {t('careeros.artifact.snapshot', 'Snapshot for submission')}
                        </Button>
                    )}
                </div>
                {generateHint && generate && <p className="mt-2 text-xs text-content-muted">{generateHint}</p>}
            </Panel>

            {all.length > 0 && (
                <Panel as="section" aria-labelledby={`history-${kind}`}>
                    <button type="button" id={`history-${kind}`} aria-expanded={historyOpen} onClick={() => setHistoryOpen((o) => !o)} className="tap-target flex w-full items-center gap-2 rounded text-left text-sm font-semibold text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                        <History size={16} aria-hidden="true" />
                        {t('careeros.artifact.history', 'Version history ({count})').replace('{count}', String(all.length))}
                    </button>
                    {historyOpen && (
                        <ol className="mt-3 divide-y divide-border-default">
                            {all.map((a) => (
                                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                    <span className="min-w-0 text-[13px] text-content-secondary">
                                        <span className="font-semibold text-content-primary">{formatDate(a.createdAt, undefined, true)}</span>
                                        {' · '}{statusLabel[a.status]}{' · '}{sourceLabel[a.source]}{' · '}{t('careeros.artifact.revision', 'rev {rev}').replace('{rev}', String(a.revision))}
                                        {a.status === 'snapshot' && <span className="ml-1 text-content-muted">({t('careeros.artifact.readOnly', 'read-only')})</span>}
                                    </span>
                                    {a.id !== current?.id && (
                                        <Button size="sm" variant="quiet" onClick={() => { setText(artifactText(a)); setDirty(true); }}>{t('careeros.artifact.restoreText', 'Copy text into editor')}</Button>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </Panel>
            )}
        </div>
    );
};

export default ArtifactEditor;
