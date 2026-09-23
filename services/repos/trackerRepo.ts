import { getSupabase } from '../supabase';
import { rowToJob, jobToRow } from './mappers';
import { ConflictError, NotFoundError } from '../careerOs/types';
import type { JobApplication } from '../../types';

export async function list(userId: string): Promise<JobApplication[]> {
  const { data, error } = await getSupabase().from('job_applications')
    .select('*').eq('user_id', userId).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => rowToJob(d as Record<string, unknown>));
}

export async function get(userId: string, id: string): Promise<JobApplication | null> {
  const { data, error } = await getSupabase().from('job_applications')
    .select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data as Record<string, unknown>) : null;
}

export async function upsert(userId: string, job: JobApplication): Promise<JobApplication> {
  const { data, error } = await getSupabase().from('job_applications')
    .upsert(jobToRow(job, userId)).select('*').single();
  if (error) throw error;
  return rowToJob(data as Record<string, unknown>);
}

/** What a precondition-checked write returns (see resumeRepo.SavedRevision). */
export interface SavedJobRevision {
  id: string;
  revision: number | null;
  updatedAt: string | null;
}

/**
 * Patch one application. With `expectedRevision` the write only applies when
 * the row still carries that revision; zero affected rows is a
 * `ConflictError`, never a silent overwrite. Without a precondition zero rows
 * means the row is gone or not owned by this user (`NotFoundError`).
 */
export async function update(
  userId: string, id: string, patch: Partial<JobApplication>, expectedRevision?: number,
): Promise<SavedJobRevision> {
  let query = getSupabase().from('job_applications')
    .update(jobToRow({ ...patch, id: undefined }, userId)).eq('user_id', userId).eq('id', id);
  if (expectedRevision !== undefined) query = query.eq('revision', expectedRevision);
  const { data, error } = await query.select('id,revision,updated_at');
  if (error) throw error;
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) {
    if (expectedRevision !== undefined) throw new ConflictError('job_application', id, expectedRevision);
    throw new NotFoundError('job_application', id);
  }
  return {
    id: typeof row.id === 'string' ? row.id : id,
    revision: typeof row.revision === 'number' ? row.revision : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  };
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from('job_applications')
    .delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Per-record sync with a recoverable pending queue.
//
// SmartStudio used to upsert the whole array and delete removed rows in one
// Promise.all; a single failure left the cloud in an unknown partial state
// and the only trace was a toast. The helpers below compute the per-record
// diff, apply each record on its own, and keep whatever failed in a
// localStorage queue keyed by user so it is retried on the next load or the
// next save. The queue is a cache of intent, not an owner: `job_applications`
// remains the record of truth.
// ---------------------------------------------------------------------------

export type TrackerOp =
  | { kind: 'upsert'; job: JobApplication }
  | { kind: 'remove'; id: string };

export const pendingKey = (userId: string): string => `cvbase:tracker-pending:${userId}`;
export const importMapKey = (userId: string): string => `cvbase:tracker-import-map:${userId}`;

const opId = (op: TrackerOp): string => (op.kind === 'upsert' ? op.job.id : op.id);

const sameJob = (a: JobApplication, b: JobApplication): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The per-record operations that turn `prev` into `next`: new and changed
 *  rows become upserts, rows missing from `next` become removes. Unchanged
 *  rows produce nothing, so a status change on one card is one write. */
export function diffJobs(prev: JobApplication[], next: JobApplication[]): TrackerOp[] {
  const before = new Map(prev.map((j) => [j.id, j]));
  const after = new Set(next.map((j) => j.id));
  const ops: TrackerOp[] = [];
  for (const job of next) {
    const was = before.get(job.id);
    if (!was || !sameJob(was, job)) ops.push({ kind: 'upsert', job });
  }
  for (const job of prev) {
    if (!after.has(job.id)) ops.push({ kind: 'remove', id: job.id });
  }
  return ops;
}

/** Collapse lists of ops so each record appears once, later ops winning. */
export function mergeOps(...lists: TrackerOp[][]): TrackerOp[] {
  const byId = new Map<string, TrackerOp>();
  for (const ops of lists) for (const op of ops) { byId.delete(opId(op)); byId.set(opId(op), op); }
  return Array.from(byId.values());
}

/** Project queued ops onto a list, so a reload shows the user's intent even
 *  while the cloud has not accepted it yet. */
export function applyOpsLocally(jobs: JobApplication[], ops: TrackerOp[]): JobApplication[] {
  let out = jobs.slice();
  for (const op of ops) {
    if (op.kind === 'remove') { out = out.filter((j) => j.id !== op.id); continue; }
    const i = out.findIndex((j) => j.id === op.job.id);
    if (i === -1) out.push(op.job); else out[i] = op.job;
  }
  return out;
}

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
};
const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage unavailable — the next save recomputes the diff anyway */ }
};

export function readPending(userId: string): TrackerOp[] {
  const ops = readJson<unknown>(pendingKey(userId), []);
  if (!Array.isArray(ops)) return [];
  return ops.filter((op): op is TrackerOp =>
    !!op && typeof op === 'object' && ((op as TrackerOp).kind === 'upsert' || (op as TrackerOp).kind === 'remove'));
}

export function writePending(userId: string, ops: TrackerOp[]): void {
  if (ops.length === 0) {
    try { localStorage.removeItem(pendingKey(userId)); } catch { /* best-effort */ }
    return;
  }
  writeJson(pendingKey(userId), ops);
}

/** Apply ops one record at a time. Every op is attempted (a failure does not
 *  skip the rest); the ones that failed come back so they can be queued. */
export async function applyOps(userId: string, ops: TrackerOp[]): Promise<{ failed: TrackerOp[]; error: unknown }> {
  const failed: TrackerOp[] = [];
  let error: unknown = null;
  const results = await Promise.allSettled(ops.map((op) =>
    op.kind === 'upsert' ? upsert(userId, op.job) : remove(userId, op.id)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') { failed.push(ops[i]); error = error ?? r.reason; }
  });
  return { failed, error };
}

/** Retry whatever the queue holds; what still fails stays queued. */
export async function flushPending(userId: string): Promise<{ failed: TrackerOp[]; error: unknown }> {
  const pending = readPending(userId);
  if (pending.length === 0) return { failed: [], error: null };
  const result = await applyOps(userId, pending);
  writePending(userId, result.failed);
  return result;
}

/** Persist the difference between `prev` and `next`, retrying any earlier
 *  failures first. Failed records are queued (an older queued op for the
 *  same record is superseded by the newer intent). */
export async function syncJobs(
  userId: string, prev: JobApplication[], next: JobApplication[],
): Promise<{ failed: TrackerOp[]; error: unknown }> {
  const ops = mergeOps(readPending(userId), diffJobs(prev, next));
  if (ops.length === 0) { writePending(userId, []); return { failed: [], error: null }; }
  const result = await applyOps(userId, ops);
  writePending(userId, result.failed);
  return result;
}

/**
 * The anonymous tracker seeds itself with hard-coded example cards
 * (SmartStudio's `initializeDefaultJobs`). They must never be imported into
 * an account as if the user had created them. `JobApplication` carries no
 * sample flag (types.ts is owned elsewhere), so a default is recognised by
 * its fixed id + company pair — keep this list in step with SmartStudio.
 */
export const DEFAULT_SAMPLE_JOBS: ReadonlyArray<{ id: string; company: string }> = [
  { id: '1', company: 'Stripe' },
  { id: '2', company: 'Google Cloud Corp' },
  { id: '3', company: 'Salesforce' },
];

export function isDefaultSampleJob(job: Pick<JobApplication, 'id' | 'company'>): boolean {
  return DEFAULT_SAMPLE_JOBS.some((d) => d.id === job.id && d.company === job.company);
}

export function readImportMap(userId: string): Record<string, string> {
  const map = readJson<unknown>(importMapKey(userId), {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map as Record<string, string> : {};
}

/**
 * One-time import of the device's anonymous tracker into an account whose
 * cloud tracker is empty. Sample rows are skipped; every imported row keeps
 * its local id → cloud id mapping in localStorage so running the import
 * again (partial failure, reload) never creates duplicates. Rows the cloud
 * rejects are queued for retry under the same cloud id.
 */
export async function importLocalJobs(
  userId: string, local: JobApplication[], newId: () => string = () => crypto.randomUUID(),
): Promise<{ imported: JobApplication[]; failed: TrackerOp[]; error: unknown }> {
  const map = readImportMap(userId);
  const imported: JobApplication[] = [];
  const ops: TrackerOp[] = [];
  for (const job of local) {
    if (isDefaultSampleJob(job)) continue;
    if (map[job.id]) continue; // already imported (or queued) on an earlier run
    const next = { ...job, id: newId() };
    map[job.id] = next.id;
    imported.push(next);
    ops.push({ kind: 'upsert', job: next });
  }
  if (ops.length === 0) return { imported: [], failed: [], error: null };
  // Record the mapping before the writes go out: a queued op carries the same
  // cloud id, so even a crash mid-import cannot produce a second copy.
  writeJson(importMapKey(userId), map);
  const result = await applyOps(userId, ops);
  writePending(userId, mergeOps(readPending(userId), result.failed));
  return { imported, ...result };
}
