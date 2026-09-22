import { getSupabase } from '../supabase';
import { rowToAction, actionToRow, type ActionInput } from './mappers';
import { getOwned, insertOne, rows, updateWithRevision } from './repoUtils';
import { canTransition, isEligible, shouldResurface, subjectPrefix, type ActionCandidate } from './careerActions';
import { ConflictError, type ActionStatus, type ActionType, type CareerAction, type CompletionSource } from './types';

// The shared action queue for Today and Coach. Rules propose candidates; this
// repository owns status, dedupe, snooze, expiry and the completion receipt.

const TABLE = 'career_actions';
const ENTITY = 'career_action';

export async function list(userId: string, statuses?: ActionStatus[]): Promise<CareerAction[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (statuses && statuses.length > 0) q = q.in('status', statuses);
  q = q.order('created_at', { ascending: false });
  return (await rows(q)).map(rowToAction);
}

export async function get(userId: string, id: string): Promise<CareerAction> {
  return rowToAction(await getOwned(TABLE, ENTITY, userId, id));
}

/** READY/PROPOSED actions that are neither snoozed past `now` nor expired. */
export async function listEligible(userId: string, now: Date = new Date()): Promise<CareerAction[]> {
  const iso = now.toISOString();
  const found = await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId)
      .in('status', ['READY', 'PROPOSED'])
      .or(`snoozed_until.is.null,snoozed_until.lte.${iso}`)
      .or(`expires_at.is.null,expires_at.gt.${iso}`)
      .order('created_at', { ascending: true }),
  );
  // Re-check client-side so a clock skew between filters cannot leak an expired row.
  return found.map(rowToAction).filter((a) => isEligible(a, now));
}

/** Strip the rule-time fields that are not persisted. */
export function toActionInput(c: ActionCandidate, status: ActionStatus = 'READY'): ActionInput {
  const { subjectId: _s, materialInputs: _m, ranking: _r, ...rest } = c;
  return {
    ...rest,
    status,
    snoozedUntil: null,
    dismissedAt: null,
    completedAt: null,
    completionSource: null,
    resultRef: null,
    lastError: null,
    resurfacedReason: null,
  };
}

export interface UpsertResult {
  inserted: CareerAction[];
  resurfaced: CareerAction[];
  expired: string[];
  unchanged: number;
  /** Live rows whose display text (title, reason, evidence labels) the rules now word differently. */
  refreshed: string[];
}

const sameEvidence = (a: CareerAction['evidenceRefs'], b: CareerAction['evidenceRefs']): boolean =>
  a.length === b.length && a.every((r, i) => r.kind === b[i].kind && r.id === b[i].id && (r.label ?? '') === (b[i].label ?? ''));

/**
 * Reconcile rule candidates with the persisted queue by dedupe key:
 *  - same key already stored → left alone whatever its status (a DISMISSED
 *    row stays dismissed because nothing material changed);
 *  - new key with a DISMISSED sibling (same type + subject) → inserted READY
 *    with `resurfaced_reason` explaining which material input changed;
 *  - live siblings (READY/PROPOSED) whose key is no longer produced → EXPIRED.
 */
export async function upsertByDedupeKey(userId: string, candidates: ActionCandidate[]): Promise<UpsertResult> {
  const result: UpsertResult = { inserted: [], resurfaced: [], expired: [], unchanged: 0, refreshed: [] };
  // Every rule-sourced row is loaded: a live rule action whose key the rules
  // no longer produce must expire even when no candidate of its type remains
  // (e.g. the profile-basics nudge once facts exist). Coach/proactive rows
  // are never touched here.
  const ruleRows = (await rows(
    getSupabase().from(TABLE).select('*').eq('user_id', userId).eq('source', 'rule'),
  )).map(rowToAction);
  const prefixes = Array.from(new Set(candidates.map((c) => subjectPrefix(c.dedupeKey))));
  const existing = ruleRows.filter((a) => prefixes.includes(subjectPrefix(a.dedupeKey)));
  const byKey = new Map(existing.map((a) => [a.dedupeKey, a]));
  const liveKeys = new Set(candidates.map((c) => c.dedupeKey));

  for (const c of candidates) {
    const same = byKey.get(c.dedupeKey);
    if (same) {
      result.unchanged += 1;
      // Same inputs, so the same action — but a live row keeps the wording it
      // was first written with. Refresh the display text (never the status,
      // inputs or history) so a copy or formatting fix reaches existing rows.
      const live = same.status === 'READY' || same.status === 'PROPOSED';
      if (live && (same.title !== c.title || same.reason !== c.reason || !sameEvidence(same.evidenceRefs, c.evidenceRefs))) {
        try {
          await updateWithRevision(TABLE, ENTITY, userId, same.id, same.revision, { title: c.title, reason: c.reason, evidence_refs: c.evidenceRefs });
          result.refreshed.push(same.id);
        } catch (err) {
          if (!(err instanceof ConflictError)) throw err;
        }
      }
      continue;
    }
    const siblings = existing.filter((a) => subjectPrefix(a.dedupeKey) === subjectPrefix(c.dedupeKey));
    const dismissed = siblings.filter((a) => a.status === 'DISMISSED').sort((a, b) => (a.dismissedAt ?? '') < (b.dismissedAt ?? '') ? 1 : -1)[0];
    const decision = dismissed ? shouldResurface(dismissed, c) : { resurface: false, reason: null };
    const input = toActionInput(c);
    // Two concurrent loads (a second tab, React StrictMode) can race on the
    // same dedupe key: the unique index decides, and the loser treats the row
    // as already present rather than failing the whole queue.
    let inserted: CareerAction;
    try {
      inserted = rowToAction(await insertOne(TABLE, actionToRow({ ...input, resurfacedReason: decision.resurface ? decision.reason : null }, userId)));
    } catch (err) {
      if ((err as { code?: string })?.code === '23505') { result.unchanged += 1; continue; }
      throw err;
    }
    if (decision.resurface) result.resurfaced.push(inserted); else result.inserted.push(inserted);
  }

  const stale = ruleRows.filter((a) => (a.status === 'READY' || a.status === 'PROPOSED') && !liveKeys.has(a.dedupeKey));
  if (stale.length > 0) {
    const { data, error } = await getSupabase().from(TABLE)
      .update({ status: 'EXPIRED' }).eq('user_id', userId).in('id', stale.map((a) => a.id)).in('status', ['READY', 'PROPOSED']).select('id');
    if (error) throw error;
    result.expired = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  }
  return result;
}

async function transition(userId: string, id: string, expectedRevision: number, to: ActionStatus, patch: Record<string, unknown>, opts: { completionSource?: CompletionSource | null } = {}): Promise<CareerAction> {
  const current = await get(userId, id);
  if (!canTransition(current.status, to, opts)) throw new Error(`invalid_transition:${current.status}->${to}`);
  return rowToAction(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { status: to, ...patch }));
}

export const start = (userId: string, id: string, expectedRevision: number) =>
  transition(userId, id, expectedRevision, 'IN_PROGRESS', { last_error: null });

export const waitForUser = (userId: string, id: string, expectedRevision: number) =>
  transition(userId, id, expectedRevision, 'WAITING_FOR_USER', {});

export const resume = (userId: string, id: string, expectedRevision: number) =>
  transition(userId, id, expectedRevision, 'IN_PROGRESS', {});

/** Completion needs a durable receipt or an explicit user report — never a route open or HTTP 200. */
export const complete = (
  userId: string, id: string, expectedRevision: number,
  receipt: { resultRef: Record<string, unknown> | null; completionSource: CompletionSource },
) => transition(userId, id, expectedRevision, 'COMPLETED', {
  completed_at: new Date().toISOString(), completion_source: receipt.completionSource, result_ref: receipt.resultRef, last_error: null,
}, { completionSource: receipt.completionSource });

export const fail = (userId: string, id: string, expectedRevision: number, error: { code: string; retryable: boolean }) =>
  transition(userId, id, expectedRevision, 'FAILED', { last_error: { code: error.code, retryable: error.retryable, at: new Date().toISOString() } });

export const retry = (userId: string, id: string, expectedRevision: number) =>
  transition(userId, id, expectedRevision, 'READY', { last_error: null });

export const dismiss = (userId: string, id: string, expectedRevision: number) =>
  transition(userId, id, expectedRevision, 'DISMISSED', { dismissed_at: new Date().toISOString() });

export const expire = (userId: string, id: string, expectedRevision: number) =>
  transition(userId, id, expectedRevision, 'EXPIRED', {});

/** Snooze defers an eligible action; it is not completion and does not change status. */
export async function snooze(userId: string, id: string, expectedRevision: number, until: string): Promise<CareerAction> {
  if (Number.isNaN(Date.parse(until))) throw new Error('invalid_snooze_until');
  const current = await get(userId, id);
  if (current.status !== 'READY' && current.status !== 'PROPOSED') throw new Error(`invalid_transition:${current.status}->snooze`);
  return rowToAction(await updateWithRevision(TABLE, ENTITY, userId, id, expectedRevision, { snoozed_until: until }));
}

export interface UserReportedInput {
  actionType: ActionType;
  title: string;
  reason?: string;
  contextRefs?: CareerAction['contextRefs'];
  evidenceRefs?: CareerAction['evidenceRefs'];
  resultRef?: Record<string, unknown> | null;
  destination?: CareerAction['destination'];
  /** When set, ties the report to a subject so it counts once per subject. */
  subjectId?: string;
  completedAt?: string;
}

/** An externally completed activity the user records explicitly (source `user_reported`). */
export async function recordUserReported(userId: string, input: UserReportedInput): Promise<CareerAction> {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const subject = input.subjectId ?? 'career';
  const action: ActionInput = {
    actionType: input.actionType,
    title: input.title,
    reason: input.reason ?? 'Recorded by you as completed outside CVBase.',
    evidenceRefs: input.evidenceRefs ?? [],
    priorityBand: 'later',
    contextRefs: input.contextRefs ?? {},
    inputRevisions: {},
    source: 'user_reported',
    ruleVersion: '',
    status: 'COMPLETED',
    dedupeKey: `${input.actionType}:${subject}:user_reported:${completedAt}`,
    destination: input.destination ?? { space: 'today' },
    estimatedEffort: null,
    effortSource: null,
    confidence: null,
    snoozedUntil: null,
    expiresAt: null,
    dismissedAt: null,
    completedAt,
    completionSource: 'user_reported',
    resultRef: input.resultRef ?? null,
    lastError: null,
    resurfacedReason: null,
  };
  return rowToAction(await insertOne(TABLE, actionToRow(action, userId)));
}
