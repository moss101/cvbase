import { HttpError } from '../_shared/respond.ts';
import type { Db, Row } from './context.ts';
import { INTERRUPTED_AFTER_MS, isRetryable, type Revisions, type StoredConfirmation } from './policy.ts';

// =========================================================================
// Durable execution receipts (`action_runs`). One logical action = one
// receipt keyed by (user, idempotencyKey). The gateway is the only writer
// (service role); owners read/delete their own rows through RLS.
//
// Status transitions:
//   pending → running → completed | failed | cancelled
//   pending → waiting_confirmation → running → …
//   running (request_tailoring) stays running until the client reports the
//   PRISM result or reconcile() reads it from prism_runs.
//
// input_summary holds ids/revisions/counts/hashes only — never text.
// =========================================================================

export type RunStatus = 'pending' | 'running' | 'waiting_confirmation' | 'completed' | 'failed' | 'cancelled';

export interface RunUsage {
  kind?: 'aiActions' | 'atsScans';
  charged?: boolean;
  released?: boolean;
}

export interface ActionRunRow extends Row {
  id: string;
  user_id: string;
  action_id: string | null;
  tool: string;
  status: RunStatus;
  idempotency_key: string;
  attempt: number;
  request_id: string;
  actor: 'user' | 'coach' | 'system';
  context_revisions: Revisions;
  input_summary: Row;
  result_ref: Row | null;
  retryable: boolean;
  failure_code: string | null;
  confirmation: StoredConfirmation | null;
  usage: RunUsage;
  started_at: string | null;
  finished_at: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

const ACTIVE: RunStatus[] = ['pending', 'running', 'waiting_confirmation'];

export const isActive = (s: RunStatus): boolean => ACTIVE.includes(s);

async function unwrapRow<T>(q: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>, what: string): Promise<T> {
  const { data, error } = await q;
  if (error || !data) throw new HttpError(500, 'internal_error', { detail: `${what}: ${error?.message ?? 'no row'}` });
  return data;
}

export async function findRun(db: Db, userId: string, idempotencyKey: string): Promise<ActionRunRow | null> {
  const { data, error } = await db.from('action_runs').select('*')
    .eq('user_id', userId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (error) throw new HttpError(500, 'internal_error', { detail: `run lookup: ${error.message}` });
  return (data as ActionRunRow | null) ?? null;
}

export async function loadRun(db: Db, userId: string, runId: string): Promise<ActionRunRow | null> {
  const { data, error } = await db.from('action_runs').select('*').eq('id', runId).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'internal_error', { detail: `run load: ${error.message}` });
  return (data as ActionRunRow | null) ?? null;
}

export interface NewRun {
  userId: string;
  tool: string;
  idempotencyKey: string;
  requestId: string;
  actionId?: string;
  actor?: 'user' | 'coach' | 'system';
  contextRevisions?: Revisions;
  inputSummary: Row;
}

/** Create the pending receipt, or return the existing one when a concurrent
 *  call with the same key won the insert race (unique violation 23505). */
export async function createOrReuseRun(db: Db, run: NewRun): Promise<{ run: ActionRunRow; created: boolean }> {
  const existing = await findRun(db, run.userId, run.idempotencyKey);
  if (existing) return { run: existing, created: false };
  const { data, error } = await db.from('action_runs').insert({
    user_id: run.userId,
    tool: run.tool,
    status: 'pending',
    idempotency_key: run.idempotencyKey,
    attempt: 1,
    request_id: run.requestId,
    action_id: run.actionId ?? null,
    actor: run.actor ?? 'user',
    context_revisions: run.contextRevisions ?? {},
    input_summary: run.inputSummary,
    result_ref: null,
    retryable: false,
    failure_code: null,
    confirmation: null,
    usage: {},
  }).select('*').single();
  if (error?.code === '23505') {
    const raced = await findRun(db, run.userId, run.idempotencyKey);
    if (raced) return { run: raced, created: false };
  }
  if (error || !data) throw new HttpError(500, 'internal_error', { detail: `run create: ${error?.message ?? 'no row'}` });
  return { run: data as ActionRunRow, created: true };
}

export async function updateRun(db: Db, run: ActionRunRow, patch: Partial<ActionRunRow>): Promise<ActionRunRow> {
  return await unwrapRow<ActionRunRow>(
    db.from('action_runs').update(patch).eq('id', run.id).eq('user_id', run.user_id).select('*').single(),
    'run update',
  );
}

// Every state stamp takes the pipeline's clock (`at`) so the interrupted-run
// check compares like with like, in production and under a fake clock.
const iso = (at: number) => new Date(at).toISOString();

export const markRunning = (db: Db, run: ActionRunRow, patch: Partial<ActionRunRow> = {}, at: number = Date.now()) =>
  updateRun(db, run, { status: 'running', started_at: iso(at), failure_code: null, retryable: false, ...patch });

export const markWaiting = (db: Db, run: ActionRunRow, confirmation: StoredConfirmation) =>
  updateRun(db, run, { status: 'waiting_confirmation', confirmation });

export const markCompleted = (db: Db, run: ActionRunRow, resultRef: Row, usage: RunUsage, at: number = Date.now()) =>
  updateRun(db, run, { status: 'completed', result_ref: resultRef, usage, finished_at: iso(at), retryable: false, failure_code: null });

export function markFailed(db: Db, run: ActionRunRow, err: unknown, usage: RunUsage, at: number = Date.now()): Promise<ActionRunRow> {
  const code = err instanceof HttpError ? err.code : 'internal_error';
  return updateRun(db, run, {
    status: 'failed', failure_code: code, retryable: isRetryable(err), usage, finished_at: iso(at),
  });
}

export const markCancelled = (db: Db, run: ActionRunRow, at: number = Date.now()) =>
  updateRun(db, run, { status: 'cancelled', finished_at: iso(at), retryable: false });

/** A retry of a failed (or interrupted) receipt: bump attempt, reset outcome
 *  fields, keep the original created_at/idempotency binding. */
export const markRetry = (db: Db, run: ActionRunRow, requestId: string, contextRevisions: Revisions | undefined) =>
  updateRun(db, run, {
    status: 'pending', attempt: run.attempt + 1, request_id: requestId, failure_code: null, retryable: false,
    result_ref: null, confirmation: null, finished_at: null, started_at: null,
    ...(contextRevisions ? { context_revisions: contextRevisions } : {}),
  });

/** A `running` receipt whose worker never finished (deploy, crash, wall-clock
 *  limit) becomes a retryable `interrupted` failure instead of blocking the
 *  key forever. Side effects it may have caused are reconciled by the tool's
 *  prerequisites on retry (start_application is idempotent, artifacts are
 *  re-read, PRISM is looked up). */
export function isInterrupted(run: ActionRunRow, now: number): boolean {
  if (run.status !== 'running') return false;
  const started = new Date(run.started_at ?? run.updated_at).getTime();
  return Number.isFinite(started) && now - started > INTERRUPTED_AFTER_MS;
}

export const markInterrupted = (db: Db, run: ActionRunRow, at: number = Date.now()) =>
  updateRun(db, run, { status: 'failed', failure_code: 'interrupted', retryable: true, finished_at: iso(at) });

// -------------------------------------------------------------------------
// PRISM reconciliation for request_tailoring receipts
// -------------------------------------------------------------------------

/** The idempotency key the client hands to prism-tailor for this receipt.
 *  A retried receipt (attempt > 1) gets a derived key so the failed
 *  prism_runs row from the earlier attempt cannot collide with the retry. */
export function prismKeyFor(run: ActionRunRow): string {
  return run.attempt > 1 ? `${run.idempotency_key}#${run.attempt}` : run.idempotency_key;
}

/**
 * A request_tailoring receipt stays `running` while the client drives
 * prism-tailor with the receipt's PRISM key. Whenever the gateway sees such
 * a receipt it reads prism_runs (user, idempotency_key) and moves the
 * receipt to completed (with the tailored resume ref) or failed — so a
 * disconnected client is never mistaken for success or failure.
 */
export async function reconcileTailoring(db: Db, run: ActionRunRow, at: number = Date.now()): Promise<ActionRunRow> {
  if (run.tool !== 'request_tailoring' || run.status !== 'running') return run;
  const { data, error } = await db.from('prism_runs')
    .select('id,status,resume_id,application_id,error_code')
    .eq('user_id', run.user_id).eq('idempotency_key', prismKeyFor(run)).maybeSingle();
  if (error || !data) return run;
  const prism = data as { id: string; status: string; resume_id: string | null; application_id: string | null; error_code: string | null };
  if (prism.status === 'completed' && prism.resume_id) {
    return await markCompleted(db, run, {
      type: 'prism', runId: prism.id, resumeId: prism.resume_id, applicationId: prism.application_id ?? run.result_ref?.applicationId ?? null,
    }, run.usage ?? {}, at);
  }
  if (prism.status === 'failed') {
    return await updateRun(db, run, {
      status: 'failed', failure_code: 'prism_failed', retryable: true, finished_at: iso(at),
      result_ref: { ...(run.result_ref ?? {}), prismRunId: prism.id },
    });
  }
  return run;
}

// -------------------------------------------------------------------------
// Domain event (no text; ids/durations/booleans only)
// -------------------------------------------------------------------------

export async function emitActionExecuted(db: Db, run: ActionRunRow, ms: number, charged: boolean): Promise<void> {
  try {
    const { error } = await db.from('career_events').insert({
      user_id: run.user_id,
      event_name: 'coach_action_executed',
      schema_version: 1,
      subject_refs: { run: run.id, ...(run.action_id ? { action: run.action_id } : {}) },
      correlation_id: run.request_id,
      source: 'server',
      payload: { tool: run.tool, ms: Math.max(0, Math.round(ms)), charged, attempt: run.attempt },
      dedupe_key: `coach_action_executed:${run.id}:${run.attempt}`,
    });
    if (error && error.code !== '23505') console.error('career_events insert failed (non-fatal):', error.message);
  } catch (e) {
    console.error('career_events insert threw (non-fatal):', e);
  }
}
