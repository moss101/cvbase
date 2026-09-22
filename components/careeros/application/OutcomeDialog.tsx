import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import { applyOutcomeToStage, outcomeHistory } from '../../../services/careerOs/outcomes';
import { track } from '../../../services/careerOs/careerEvents';
import type { OutcomeKind, OutcomeObservation, ProductEventName } from '../../../services/careerOs/types';
import { Dialog } from '../../common/Dialog';
import { useCareerOs } from '../shell/CareerOsProvider';
import { Button } from '../primitives';
import { FailureNotice } from './FailureNotice';
import { Select, TextArea, TextInput } from './fields';
import { formatDate, todayIsoDate } from './format';
import { useAsyncAction } from './useAsyncAction';
import type { Workspace } from './useApplicationWorkspace';
import { useOutcomeKindLabel } from './sections/ActivitySection';

/**
 * Record an observed outcome (REQ-09/COS-025): response, interview, offer,
 * rejection, withdrawal, acceptance or "no response". Each is an
 * append-only observation with the date you observed it; the stage effect
 * is applied to the application. Correcting an earlier observation records
 * a correction pointing at it — history is never rewritten.
 */
export interface OutcomeDialogProps {
    open: boolean;
    workspace: Workspace;
    /** When set, the dialog records a correction of this observation. */
    correcting?: OutcomeObservation | null;
    onClose: () => void;
}

const KINDS: OutcomeKind[] = ['response', 'interview_scheduled', 'interview_completed', 'offer', 'rejected', 'withdrawn', 'accepted', 'no_response'];

const eventFor = (kind: OutcomeKind): ProductEventName => {
    switch (kind) {
        case 'offer': case 'accepted': return 'offer_recorded';
        case 'response': case 'interview_scheduled': case 'interview_completed': case 'no_response': return 'application_response_recorded';
        default: return 'career_outcome_recorded';
    }
};

export const OutcomeDialog: React.FC<OutcomeDialogProps> = ({ open, workspace, correcting = null, onClose }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const kindLabel = useOutcomeKindLabel();
    const [kind, setKind] = useState<OutcomeKind | 'retract'>('response');
    const [observedAt, setObservedAt] = useState(todayIsoDate());
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!open) return;
        setKind(correcting && correcting.kind !== 'correction' ? correcting.kind : 'response');
        setObservedAt(correcting ? correcting.observedAt.slice(0, 10) : todayIsoDate());
        setNote('');
    }, [open, correcting]);

    const [record, recordState] = useAsyncAction(async () => {
        if (!userId || !workspace.data) return;
        const app = workspace.data.application;
        const at = new Date(`${observedAt}T12:00:00`).toISOString();
        let observation: OutcomeObservation;
        if (correcting) {
            observation = await outcomeRepo.correct(userId, app.id, correcting.id, kind === 'retract' ? { note, correctedObservedAt: at } : { correctedKind: kind, correctedObservedAt: at, note });
        } else {
            observation = await outcomeRepo.record(userId, app.id, kind as OutcomeKind, { observedAt: at, note });
        }
        const outcomes = [...workspace.data.outcomes, observation];
        // Stage follows the latest standing observation (a correction re-derives it).
        const standing = outcomeHistory(outcomes).filter((e) => !e.superseded && !e.retracted && e.effectiveKind !== null);
        const last = standing[standing.length - 1];
        const effect = last ? applyOutcomeToStage(last.effectiveKind as OutcomeKind) : null;
        let nextApp = app;
        if (effect && (effect.stage !== app.stage || effect.closedReason !== app.closedReason)) {
            nextApp = await applicationRepo.update(userId, app.id, { stage: effect.stage, closedReason: effect.closedReason }, app.revision);
        }
        workspace.setData({ ...workspace.data, application: nextApp, outcomes });
        invalidate('applications:');
        invalidate('campaign');
        const recordedKind = kind === 'retract' ? 'correction' : kind;
        await track(userId, correcting ? 'career_outcome_recorded' : eventFor(recordedKind), { subjectRefs: { application: app.id, outcome: observation.id }, payload: { kind: recordedKind, correction: correcting !== null, stage: nextApp.stage } });
        onClose();
    });

    const options = KINDS.map((k) => ({ value: k, label: kindLabel(k) }));
    if (correcting) options.push({ value: 'retract' as OutcomeKind, label: t('careeros.outcome.retract', 'Retract (it did not happen)') });

    return (
        <Dialog
            open={open}
            onClose={recordState.pending ? () => undefined : onClose}
            title={correcting ? t('careeros.outcome.correctTitle', 'Correct an observation') : t('careeros.outcome.title', 'Record what happened')}
            panelClassName="max-w-md"
            footer={
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
                    <Button variant="quiet" onClick={onClose} disabled={recordState.pending}>{t('btn.cancel', 'Cancel')}</Button>
                    <Button variant="primary" onClick={() => { void record(); }} loading={recordState.pending}>{correcting ? t('careeros.outcome.saveCorrection', 'Save correction') : t('careeros.outcome.record', 'Record')}</Button>
                </div>
            }
        >
            {correcting && (
                <p className="mb-3 rounded-xl bg-surface-canvas px-3 py-2 text-[13px] text-content-secondary">
                    {t('careeros.outcome.correctingHint', 'Correcting "{kind}" observed {date}. The original stays in the history, marked superseded.').replace('{kind}', kindLabel(correcting.kind)).replace('{date}', formatDate(correcting.observedAt))}
                </p>
            )}
            <div className="space-y-4">
                <Select label={t('careeros.outcome.kindLabel', 'What happened?')} options={options} value={kind} onChange={(event) => setKind(event.target.value as OutcomeKind | 'retract')} hint={kind === 'no_response' ? t('careeros.outcome.noResponseHint', 'Records that nothing has arrived yet. The application stays where it is — silence is not a rejection.') : undefined} />
                <TextInput label={t('careeros.outcome.observedAt', 'Date observed')} type="date" value={observedAt} max={todayIsoDate()} onChange={(event) => setObservedAt(event.target.value)} />
                <TextArea label={t('careeros.outcome.note', 'Note')} optional={t('careeros.common.optional', 'optional')} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('careeros.outcome.notePlaceholder', 'What the employer said, who you spoke to…')} />
                {recordState.error ? <FailureNotice error={recordState.error} onReload={() => { void workspace.refresh(); }} onDismiss={recordState.reset} /> : null}
            </div>
        </Dialog>
    );
};

export default OutcomeDialog;
