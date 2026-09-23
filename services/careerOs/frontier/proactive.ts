/**
 * Opted-in proactive assistance (REQ-10, COS-037). Decides — deterministically
 * and only when the user has consented — which candidate actions may be
 * surfaced as reminders in a run, honouring quiet hours in the user's time
 * zone, the daily cap, dismissals and dedupe. A late reminder says it is late
 * instead of pretending it was delivered on time. Nothing is scheduled by
 * this module; it plans one run and the caller persists the result and a
 * checkpoint so a disconnected or repeated run cannot deliver twice.
 */
import type { CareerAction, CareerPreferences, UserNotification } from '../types';

export const PROACTIVE_POLICY_VERSION = 'proactive-1.0.0';

export type ActionCandidate = Omit<CareerAction, 'id' | 'revision' | 'createdAt' | 'updatedAt'>;

export interface ProactiveRunInput {
  now: Date;
  preferences: CareerPreferences;
  candidates: ActionCandidate[];
  existingActions: CareerAction[];
  existingNotifications: UserNotification[];
  /** Notifications created today (user's local day) — enforced cap. */
  createdTodayCount: number;
}

export interface ProactiveRunPlan {
  policyVersion: string;
  enabled: boolean;
  quietHours: boolean;
  nextEligibleAt: string | null;
  create: Array<{ candidate: ActionCandidate; notification: Omit<UserNotification, 'id' | 'createdAt' | 'readAt' | 'dismissedAt' | 'actionId'> & { late: boolean } }>;
  skipped: Array<{ dedupeKey: string; reason: 'disabled' | 'quiet_hours' | 'cap' | 'dismissed' | 'duplicate' | 'trigger_off' | 'not_actionable' }>;
}

/** Local hour (0–23) and minute in an IANA time zone; falls back to UTC. */
export function localTime(now: Date, timeZone: string): { hour: number; minute: number; day: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
    const hour = Number(get('hour')) % 24;
    return { hour, minute: Number(get('minute')), day: `${get('year')}-${get('month')}-${get('day')}` };
  } catch {
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes(), day: now.toISOString().slice(0, 10) };
  }
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

/** True when `now` falls inside the quiet window (which may wrap midnight). */
export function inQuietHours(now: Date, prefs: CareerPreferences): boolean {
  if (!prefs.quietHours) return false;
  const { hour, minute } = localTime(now, prefs.timeZone || 'UTC');
  const cur = hour * 60 + minute;
  const start = toMinutes(prefs.quietHours.start);
  const end = toMinutes(prefs.quietHours.end);
  if (start === end) return false;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

/** Next moment outside quiet hours, in UTC ISO, or null when not in quiet hours. */
export function nextEligible(now: Date, prefs: CareerPreferences): string | null {
  if (!inQuietHours(now, prefs) || !prefs.quietHours) return null;
  // Walk forward in 15-minute steps (bounded to 48h) until the window ends;
  // this handles DST transitions because each step is re-evaluated in zone.
  const step = 15 * 60 * 1000;
  for (let t = now.getTime() + step; t <= now.getTime() + 48 * 60 * 60 * 1000; t += step) {
    const d = new Date(t);
    if (!inQuietHours(d, prefs)) return d.toISOString();
  }
  return null;
}

const TRIGGER_FOR: Partial<Record<CareerAction['actionType'], keyof CareerPreferences['triggers']>> = {
  PREPARE_INTERVIEW: 'interview',
  FOLLOW_UP_APPLICATION: 'followUp',
  REVIEW_IMPORT: 'staleImport',
  RESOLVE_CONFLICT: 'staleImport',
  IMPROVE_ACHIEVEMENT: 'evidenceGap',
  UPDATE_SKILL: 'evidenceGap',
};

/**
 * Deadline recorded on the candidate (interview or follow-up), if any. Rule
 * candidates from careerActions carry it as `ranking.deadlineAt`; other
 * producers may pass `inputRevisions.dueAt`. Never inferred.
 */
function dueAt(c: ActionCandidate): string | null {
  const ranking = (c as ActionCandidate & { ranking?: { deadlineAt?: string | null } }).ranking;
  if (ranking && typeof ranking.deadlineAt === 'string') return ranking.deadlineAt;
  const due = c.inputRevisions['dueAt'];
  return typeof due === 'string' ? due : null;
}

/**
 * Plans a proactive run. At most `dailyActionCap - createdTodayCount`
 * reminders, only for enabled triggers, never for dismissed actions with the
 * same material inputs, never twice for the same dedupe key.
 */
export function planProactiveRun(input: ProactiveRunInput): ProactiveRunPlan {
  const { now, preferences: prefs } = input;
  const plan: ProactiveRunPlan = {
    policyVersion: PROACTIVE_POLICY_VERSION,
    enabled: prefs.proactiveEnabled && !!prefs.consentAt,
    quietHours: false,
    nextEligibleAt: null,
    create: [],
    skipped: [],
  };
  if (!plan.enabled) {
    plan.skipped = input.candidates.map((c) => ({ dedupeKey: c.dedupeKey, reason: 'disabled' }));
    return plan;
  }
  if (inQuietHours(now, prefs)) {
    plan.quietHours = true;
    plan.nextEligibleAt = nextEligible(now, prefs);
    plan.skipped = input.candidates.map((c) => ({ dedupeKey: c.dedupeKey, reason: 'quiet_hours' }));
    return plan;
  }

  const existingByKey = new Map(input.existingActions.map((a) => [a.dedupeKey, a]));
  const notified = new Set(input.existingNotifications.map((n) => n.dedupeKey));
  let budget = Math.max(0, prefs.dailyActionCap - input.createdTodayCount);

  // Deadline-first, then dedupe key for stability.
  const ordered = [...input.candidates].sort((a, b) => {
    const da = dueAt(a); const db = dueAt(b);
    if (da && db) return da.localeCompare(db);
    if (da) return -1;
    if (db) return 1;
    return a.dedupeKey.localeCompare(b.dedupeKey);
  });

  for (const c of ordered) {
    const trigger = TRIGGER_FOR[c.actionType];
    if (!trigger) { plan.skipped.push({ dedupeKey: c.dedupeKey, reason: 'not_actionable' }); continue; }
    if (!prefs.triggers[trigger]) { plan.skipped.push({ dedupeKey: c.dedupeKey, reason: 'trigger_off' }); continue; }
    const existing = existingByKey.get(c.dedupeKey);
    if (existing && (existing.status === 'DISMISSED' || existing.status === 'COMPLETED')) {
      plan.skipped.push({ dedupeKey: c.dedupeKey, reason: 'dismissed' }); continue;
    }
    const notificationKey = `proactive:${c.dedupeKey}`;
    if (notified.has(notificationKey)) { plan.skipped.push({ dedupeKey: c.dedupeKey, reason: 'duplicate' }); continue; }
    if (budget <= 0) { plan.skipped.push({ dedupeKey: c.dedupeKey, reason: 'cap' }); continue; }
    budget -= 1;
    const due = dueAt(c);
    const late = !!due && new Date(due).getTime() < now.getTime();
    plan.create.push({
      candidate: c,
      notification: {
        kind: 'action_required',
        title: c.title,
        body: late
          ? `${c.reason} This reminder is late: it was due ${new Date(due as string).toISOString().slice(0, 10)}.`
          : c.reason,
        dedupeKey: notificationKey,
        late,
      },
    });
  }
  return plan;
}
