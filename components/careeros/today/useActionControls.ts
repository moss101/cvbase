import { useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import { ConflictError, type CareerAction } from '../../../services/careerOs/types';
import { DAY_MS } from '../../../services/careerOs/util';
import { captureException } from '../../../lib/monitoring';
import { useNavigation } from '../../NavigationProvider';
import { destinationToRoute } from '../career/factFormat';

/**
 * One action's lifecycle controls, shared by Today's next-action panel and the
 * full queue: Begin marks it in progress and opens its destination (never
 * completes it), snooze and dismiss persist with the revision precondition,
 * and "I did this elsewhere" records a user-reported completion.
 */
export interface ActionControls {
    busy: boolean;
    error: string | null;
    begin: () => Promise<void>;
    dismiss: () => Promise<void>;
    snooze: (days: number) => Promise<void>;
    reportDone: () => Promise<void>;
}

export function useActionControls(userId: string, action: CareerAction, onChanged: () => void): ActionControls {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = async (work: () => Promise<unknown>) => {
        setBusy(true);
        setError(null);
        try {
            await work();
            onChanged();
        } catch (err) {
            if (err instanceof ConflictError) { setError(t('careeros.today.action.conflict', 'This action changed elsewhere. The list has been refreshed.')); onChanged(); }
            else { captureException(err, { context: 'today-action' }); setError(t('careeros.today.action.failed', 'That could not be saved. The action is unchanged.')); }
        } finally {
            setBusy(false);
        }
    };

    const begin = async () => {
        const route = destinationToRoute(action.destination);
        setBusy(true);
        setError(null);
        try {
            if (action.status === 'READY') {
                await actionRepo.start(userId, action.id, action.revision);
                void emit(userId, buildEvent('recommendation_accepted', { subjectRefs: { action: action.id }, payload: { actionType: action.actionType, source: action.source, rule: action.ruleVersion || null } }));
                onChanged();
            }
        } catch (err) {
            // A stale revision or an invalid transition must not block the person from reaching the work.
            if (!(err instanceof ConflictError)) captureException(err, { context: 'today-action-start' });
            onChanged();
        } finally {
            setBusy(false);
            navigate(route);
        }
    };

    const dismiss = () => run(async () => {
        await actionRepo.dismiss(userId, action.id, action.revision);
        void emit(userId, buildEvent('recommendation_dismissed', { subjectRefs: { action: action.id }, payload: { actionType: action.actionType, source: action.source } }));
    });

    const snooze = (days: number) => run(async () => {
        const until = new Date(Date.now() + days * DAY_MS);
        until.setHours(8, 0, 0, 0);
        await actionRepo.snooze(userId, action.id, action.revision, until.toISOString());
    });

    const reportDone = () => run(async () => {
        try {
            await actionRepo.complete(userId, action.id, action.revision, { resultRef: { reportedAt: new Date().toISOString() }, completionSource: 'user_reported' });
        } catch (err) {
            // Rows not yet READY cannot complete in place; record the report on its own.
            if (!(err instanceof Error) || !err.message.startsWith('invalid_transition')) throw err;
            await actionRepo.recordUserReported(userId, { actionType: action.actionType, title: action.title, contextRefs: action.contextRefs, evidenceRefs: action.evidenceRefs, destination: action.destination, subjectId: action.id, resultRef: { actionId: action.id } });
            await actionRepo.dismiss(userId, action.id, action.revision);
        }
        void emit(userId, buildEvent('career_action_completed', { subjectRefs: { action: action.id }, payload: { actionType: action.actionType, completionSource: 'user_reported', goalLinked: Boolean(action.contextRefs.goal) } }));
    });

    return { busy, error, begin, dismiss, snooze, reportDone };
}
