import { useCallback, useMemo } from 'react';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import type { GoalPatch } from '../../../services/careerOs/mappers';
import type { CareerGoal, GoalInput } from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery, type OwnedQuery } from '../data/useOwnedQuery';

/**
 * Goals list plus the mutations every goal surface shares. A revision to a
 * goal marks the fit analyses computed against it stale and invalidates the
 * shared caches; historical application snapshots are never touched.
 */
export const GOALS_KEY = 'goals';

export interface GoalsQuery extends OwnedQuery<CareerGoal[]> {
    active: CareerGoal[];
    archived: CareerGoal[];
    primary: CareerGoal | null;
}

export const useGoals = (): GoalsQuery => {
    const { userId } = useCareerOs();
    const query = useOwnedQuery<CareerGoal[]>(userId, userId ? GOALS_KEY : null, () => goalRepo.list(userId as string, 'any'));
    const all = query.data ?? [];
    const active = useMemo(() => all.filter((g) => g.status === 'active'), [all]);
    const archived = useMemo(() => all.filter((g) => g.status === 'archived'), [all]);
    const primary = useMemo(() => active.find((g) => g.isPrimary) ?? null, [active]);
    return { ...query, active, archived, primary };
};

export interface GoalMutations {
    /** Creates the goal; makes it primary when the account has none. */
    create: (input: GoalInput) => Promise<CareerGoal>;
    update: (goal: CareerGoal, patch: GoalPatch) => Promise<CareerGoal>;
    setPrimary: (goal: CareerGoal) => Promise<CareerGoal>;
    archive: (goal: CareerGoal) => Promise<CareerGoal>;
}

export const useGoalMutations = (): GoalMutations => {
    const { userId, invalidate } = useCareerOs();

    const requireUser = useCallback((): string => {
        if (!userId) throw new Error('signed_out');
        return userId;
    }, [userId]);

    const afterRevision = useCallback(async (uid: string, goal: CareerGoal) => {
        try { await analysisRepo.markStaleForGoal(uid, goal.id); } catch (err) { captureException(err, { context: 'career-goal-stale' }); }
        invalidate();
    }, [invalidate]);

    const create = useCallback(async (input: GoalInput) => {
        const uid = requireUser();
        let goal = await goalRepo.create(uid, input);
        const primary = await goalRepo.getPrimary(uid);
        if (!primary) goal = await goalRepo.setPrimary(uid, goal.id, goal.revision);
        void emit(uid, buildEvent('career_goal_created', { subjectRefs: { goal: goal.id }, payload: { primary: goal.isPrimary, priorities: goal.priorities.length, constraints: goal.constraints.length } }));
        invalidate();
        return goal;
    }, [requireUser, invalidate]);

    const update = useCallback(async (goal: CareerGoal, patch: GoalPatch) => {
        const uid = requireUser();
        const saved = await goalRepo.update(uid, goal.id, patch, goal.revision);
        void emit(uid, buildEvent('career_goal_updated', { subjectRefs: { goal: saved.id }, payload: { revision: saved.revision, change: 'edited' } }));
        await afterRevision(uid, saved);
        return saved;
    }, [requireUser, afterRevision]);

    const setPrimary = useCallback(async (goal: CareerGoal) => {
        const uid = requireUser();
        const saved = await goalRepo.setPrimary(uid, goal.id, goal.revision);
        void emit(uid, buildEvent('career_goal_updated', { subjectRefs: { goal: saved.id }, payload: { revision: saved.revision, change: 'primary' } }));
        await afterRevision(uid, saved);
        return saved;
    }, [requireUser, afterRevision]);

    const archive = useCallback(async (goal: CareerGoal) => {
        const uid = requireUser();
        const saved = await goalRepo.archive(uid, goal.id, goal.revision);
        void emit(uid, buildEvent('career_goal_updated', { subjectRefs: { goal: saved.id }, payload: { revision: saved.revision, change: 'archived' } }));
        await afterRevision(uid, saved);
        return saved;
    }, [requireUser, afterRevision]);

    return useMemo(() => ({ create, update, setPrimary, archive }), [create, update, setPrimary, archive]);
};
