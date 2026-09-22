import { useCallback, useMemo } from 'react';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import { track } from '../../../services/careerOs/careerEvents';
import type { ApplicationRecord } from '../../../services/careerOs/types';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useAsyncAction } from '../application/useAsyncAction';

/**
 * Start Application (REQ-17): idempotent per opportunity — the same key
 * returns the same application, so a double click or a retry never creates
 * a second record. An existing attempt is presented as "Open application";
 * applying again is an explicit new attempt linked to the previous one.
 */
export const startKey = (opportunityId: string, attempt?: number): string =>
    attempt && attempt > 1 ? `start:${opportunityId}:attempt:${attempt}` : `start:${opportunityId}`;

export interface StartApplicationState {
    attempts: ApplicationRecord[];
    latest: ApplicationRecord | null;
    loading: boolean;
    pending: boolean;
    error: unknown;
    /** Start (or re-apply). Resolves with the application, or null on failure. */
    start: (opts?: { reapply?: boolean; campaignId?: string | null; navigate?: boolean }) => Promise<ApplicationRecord | null>;
    openLatest: () => void;
    refresh: () => Promise<void>;
}

export function useStartApplication(opportunityId: string | null): StartApplicationState {
    const { userId, invalidate } = useCareerOs();
    const { navigate } = useNavigation();
    const query = useOwnedQuery(
        userId,
        opportunityId ? `applications:opportunity:${opportunityId}` : null,
        () => applicationRepo.listForOpportunity(userId as string, opportunityId as string),
    );
    const attempts = useMemo(() => query.data ?? [], [query.data]);
    const latest = attempts[0] ?? null;

    const [run, state] = useAsyncAction(async (opts: { reapply?: boolean; campaignId?: string | null; navigate?: boolean } = {}) => {
        if (!userId || !opportunityId) return;
        const reapply = opts.reapply === true && latest !== null;
        const attemptNo = reapply ? latest.attemptNo + 1 : 1;
        const app = await applicationRepo.start(userId, {
            opportunityId,
            campaignId: opts.campaignId ?? null,
            idempotencyKey: startKey(opportunityId, attemptNo),
            reapply,
        });
        invalidate('applications');
        invalidate('opportunit');
        invalidate('campaign');
        await track(userId, 'application_started', {
            subjectRefs: { application: app.id, opportunity: opportunityId },
            payload: { attemptNo: app.attemptNo, reapply },
            dedupeKey: `application_started:${app.id}`,
        });
        query.setData(reapply ? [app, ...attempts] : [app, ...attempts.filter((a) => a.id !== app.id)]);
        if (opts.navigate !== false) navigate(careerPath.toApplication(app.id, 'analysis'));
    });

    const start = useCallback(async (opts?: { reapply?: boolean; campaignId?: string | null; navigate?: boolean }) => {
        const ok = await run(opts ?? {});
        if (!ok) return null;
        return applicationRepo.listForOpportunity(userId as string, opportunityId as string).then((list) => list[0] ?? null).catch(() => null);
    }, [run, userId, opportunityId]);

    const openLatest = useCallback(() => {
        if (latest) navigate(careerPath.toApplication(latest.id, 'analysis'));
    }, [latest, navigate]);

    return { attempts, latest, loading: query.loading, pending: state.pending, error: state.error, start, openLatest, refresh: query.refresh };
}
