import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as interviewRepo from '../../../services/careerOs/interviewRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as actionRepo from '../../../services/careerOs/actionRepo';
import * as notificationRepo from '../../../services/careerOs/notificationRepo';
import * as preferencesRepo from '../../../services/careerOs/preferencesRepo';
import { computeCandidateActions, type ActionCandidate } from '../../../services/careerOs/careerActions';
import { localTime, planProactiveRun, type ActionCandidate as PlannerCandidate, type ProactiveRunPlan } from '../../../services/careerOs/frontier/proactive';
import type { CareerAction, CareerPreferences, UserNotification } from '../../../services/careerOs/types';

/**
 * The client-side proactive run (COS-037). Reminders are generated when the
 * person opens CVBase or presses "Run reminders now" — there is no
 * background delivery — so the run is deterministic, bounded by the daily
 * cap, silent inside quiet hours and idempotent: actions and notifications
 * are upserted by dedupe key and the preferences row records a checkpoint
 * with the revision it read, so a repeated or interrupted run cannot deliver
 * twice.
 */
export type SkipReason = ProactiveRunPlan['skipped'][number]['reason'];

export interface ProactiveRunSummary {
    ranAt: string;
    enabled: boolean;
    quietHours: boolean;
    nextEligibleAt: string | null;
    candidates: number;
    created: number;
    /** Planned creations whose notification already existed (dedupe held). */
    duplicates: number;
    skipped: Partial<Record<SkipReason, number>>;
    policyVersion: string;
}

export interface ProactiveDeps {
    loadCandidates: (userId: string, now: Date, preferences: CareerPreferences) => Promise<ActionCandidate[]>;
    listActions: (userId: string) => Promise<CareerAction[]>;
    listNotifications: (userId: string) => Promise<UserNotification[]>;
    upsertActions: (userId: string, candidates: ActionCandidate[]) => Promise<actionRepo.UpsertResult>;
    upsertNotification: typeof notificationRepo.upsertByDedupeKey;
    updatePreferences: typeof preferencesRepo.update;
}

/** The same durable inputs Today feeds the rules, without the PRISM run scan (not needed for reminder triggers). */
export async function loadCandidates(userId: string, now: Date, preferences: CareerPreferences): Promise<ActionCandidate[]> {
    const [goal, facts, opportunities, applications, interviews, analyses, outcomes] = await Promise.all([
        goalRepo.getPrimary(userId), factRepo.list(userId), opportunityRepo.list(userId, 'all'), applicationRepo.list(userId),
        interviewRepo.list(userId), analysisRepo.listLatest(userId), outcomeRepo.list(userId),
    ]);
    return computeCandidateActions({ now, goal, facts, opportunities, applications, interviews, analyses, prismRuns: [], artifacts: [], outcomes, preferences });
}

export const defaultProactiveDeps: ProactiveDeps = {
    loadCandidates,
    listActions: (userId) => actionRepo.list(userId),
    listNotifications: (userId) => notificationRepo.list(userId, { includeDismissed: true, limit: 200 }),
    upsertActions: (userId, candidates) => actionRepo.upsertByDedupeKey(userId, candidates),
    upsertNotification: notificationRepo.upsertByDedupeKey,
    updatePreferences: preferencesRepo.update,
};

/** Proactive notifications created on the user's local day. */
export function countCreatedToday(notifications: UserNotification[], now: Date, timeZone: string): number {
    const today = localTime(now, timeZone).day;
    return notifications.filter((n) => n.dedupeKey.startsWith('proactive:') && localTime(new Date(n.createdAt), timeZone).day === today).length;
}

/** The planner reads the persisted shape plus the rule's ranking (for the confirmed deadline). */
export const toPlannerCandidate = (c: ActionCandidate): PlannerCandidate & { ranking: ActionCandidate['ranking'] } =>
    ({ ...actionRepo.toActionInput(c), ranking: c.ranking });

export function summarise(plan: ProactiveRunPlan, created: number, duplicates: number, candidates: number, ranAt: Date): ProactiveRunSummary {
    const skipped: Partial<Record<SkipReason, number>> = {};
    for (const s of plan.skipped) skipped[s.reason] = (skipped[s.reason] ?? 0) + 1;
    return {
        ranAt: ranAt.toISOString(), enabled: plan.enabled, quietHours: plan.quietHours, nextEligibleAt: plan.nextEligibleAt,
        candidates, created, duplicates, skipped, policyVersion: plan.policyVersion,
    };
}

export async function runProactiveNow(
    userId: string, preferences: CareerPreferences, deps: ProactiveDeps = defaultProactiveDeps, now: Date = new Date(),
): Promise<{ summary: ProactiveRunSummary; preferences: CareerPreferences }> {
    const [candidates, existingActions, existingNotifications] = await Promise.all([
        deps.loadCandidates(userId, now, preferences), deps.listActions(userId), deps.listNotifications(userId),
    ]);
    const byDedupeKey = new Map(candidates.map((c) => [c.dedupeKey, c]));
    const plan = planProactiveRun({
        now, preferences, candidates: candidates.map(toPlannerCandidate), existingActions, existingNotifications,
        createdTodayCount: countCreatedToday(existingNotifications, now, preferences.timeZone || 'UTC'),
    });

    let created = 0;
    let duplicates = 0;
    if (plan.create.length > 0) {
        const rules = plan.create.map((c) => byDedupeKey.get(c.candidate.dedupeKey)).filter((c): c is ActionCandidate => Boolean(c));
        const upsert = await deps.upsertActions(userId, rules);
        const byKey = new Map<string, CareerAction>(existingActions.map((a) => [a.dedupeKey, a]));
        for (const a of [...upsert.inserted, ...upsert.resurfaced]) byKey.set(a.dedupeKey, a);
        for (const item of plan.create) {
            const action = byKey.get(item.candidate.dedupeKey) ?? null;
            const { late: _late, ...notification } = item.notification;
            const row = await deps.upsertNotification(userId, { ...notification, actionId: action?.id ?? null });
            if (row) created += 1; else duplicates += 1;
        }
    }

    const summary = summarise(plan, created, duplicates, candidates.length, now);
    const updated = await deps.updatePreferences(userId, {
        lastProactiveRunAt: summary.ranAt,
        checkpoint: {
            ...preferences.checkpoint,
            lastRunAt: summary.ranAt, created, duplicates, skipped: summary.skipped, candidates: candidates.length,
            quietHours: plan.quietHours, nextEligibleAt: plan.nextEligibleAt, policyVersion: plan.policyVersion,
        },
    }, preferences.revision);
    return { summary, preferences: updated };
}
