import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../../../services/translationService';
import * as applicationRepo from '../../../../services/careerOs/applicationRepo';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { Button } from '../../primitives';
import { ArtifactEditor } from '../ArtifactEditor';
import { FailureNotice } from '../FailureNotice';
import { Panel, PaneHeading, TextArea } from '../fields';
import { useAsyncAction } from '../useAsyncAction';
import type { Workspace } from '../useApplicationWorkspace';

/** Application notes: the legacy tracker `notes` field plus versioned note artifacts. */
export const NotesSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const app = workspace.data?.application ?? null;
    const [notes, setNotes] = useState<string | null>(null);
    useEffect(() => { setNotes(null); }, [app?.id, app?.revision]);

    const [save, saveState] = useAsyncAction(async () => {
        if (!userId || !app || notes === null) return;
        const next = await applicationRepo.update(userId, app.id, { notes }, app.revision);
        workspace.setApplication(next);
        invalidate('applications:');
        setNotes(null);
    });

    return (
        <div className="space-y-4">
            <Panel as="section" aria-labelledby="notes-legacy">
                <PaneHeading id="notes-legacy" title={t('careeros.notes.title', 'Application notes')} description={t('careeros.notes.description', 'The notes field the tracker has always had — one free-text box on the application itself.')} />
                <TextArea className="mt-3" label={t('careeros.notes.field', 'Notes')} rows={5} value={notes ?? app?.notes ?? ''} onChange={(event) => setNotes(event.target.value)} placeholder={t('smartStudio.tracker.notesPlaceholder', 'Include status check summaries, contact logs, or date schedules...')} />
                {saveState.error ? <FailureNotice error={saveState.error} onReload={() => { void workspace.refresh(); }} onDismiss={saveState.reset} className="mt-3" /> : null}
                <div className="mt-3 flex justify-end">
                    <Button variant="primary" onClick={() => { void save(); }} loading={saveState.pending} disabled={notes === null || notes === (app?.notes ?? '')}>{t('careeros.common.save', 'Save')}</Button>
                </div>
            </Panel>
            <ArtifactEditor
                workspace={workspace}
                kind="note"
                heading={t('careeros.notes.artifactTitle', 'Working notes')}
                description={t('careeros.notes.artifactDescription', 'Longer notes kept as a versioned document with this application.')}
                fieldLabel={t('careeros.notes.artifactField', 'Working notes')}
            />
        </div>
    );
};

export default NotesSection;
