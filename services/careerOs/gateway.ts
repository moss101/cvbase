/**
 * Thin typed client for the career-gateway Edge Function (COS-026). Every
 * call is one registered tool bound to a durable receipt (`action_runs`)
 * through an idempotency key the CLIENT mints, so a retry after a dropped
 * connection returns the same receipt instead of repeating the work.
 *
 *   const key = newIdempotencyKey('start');
 *   const { run, result } = await runTool('start_application', { opportunityId }, { idempotencyKey: key });
 *
 * Tools with a confirmation policy answer with `confirmationRequired` first;
 * the UI shows its summary and calls `confirmTool` with the same input and
 * key. The server re-hashes the content, so an edited proposal is rejected
 * with `confirmation_mismatch` and must be proposed again.
 */
import { callFn, type FnError } from '../api';
import type { ActionRun, ActionType, ArtifactKind, InterviewType, OutcomeKind, PriorityBand } from './types';
import { rowToActionRun } from './mappers';
import {
  type CompareOpportunitiesResult,
  type ConfirmationRequired,
  type CreatePlanResult,
  type ExplainPrioritiesResult,
  type GatewayResponse,
  type GenerateArtifactResult,
  type InspectContextResult,
  mapCompareOpportunitiesResult,
  mapCreatePlanResult,
  mapExplainPrioritiesResult,
  mapGatewayResponse,
  mapGenerateArtifactResult,
  mapInspectContextResult,
  mapPrepareInterviewResult,
  mapRecordOutcomeResult,
  mapReportResultResult,
  mapRequestTailoringResult,
  mapResumeApplicationResult,
  mapReviewEvidenceResult,
  mapSaveArtifactResult,
  mapStartApplicationResult,
  type PrepareInterviewResult,
  type RecordOutcomeResult,
  type ReportResultResult,
  type RequestTailoringResult,
  type ResumeApplicationResult,
  type ReviewEvidenceResult,
  type SaveArtifactResult,
  type StartApplicationResult,
} from './gatewayMappers';

export const GATEWAY_FN = 'career-gateway';

export type GatewayErrorCode =
  | 'invalid_request' | 'feature_disabled' | 'unknown_tool' | 'not_found' | 'stale_context' | 'confirmation_required'
  | 'confirmation_mismatch' | 'confirmation_expired' | 'limit_reached' | 'run_in_progress' | 'result_not_found' | 'timeout'
  | 'llm_unavailable' | 'bad_ai_output' | 'rate_limited' | 'internal_error' | string;

/** A coded gateway failure. `run` is the receipt when the server got as far
 *  as recording one (so the UI can show what happened and offer retry). */
export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly status: number;
  readonly run: ActionRun | null;
  /** Current revisions on `stale_context`; issues on `invalid_request`. */
  readonly extra: Record<string, unknown>;
  constructor(err: FnError) {
    super(err.code ?? err.message);
    this.name = 'GatewayError';
    this.code = err.code ?? 'internal_error';
    this.status = err.status ?? 0;
    const extra = (err.extra && typeof err.extra === 'object' ? err.extra : {}) as Record<string, unknown>;
    this.run = extra.run && typeof extra.run === 'object' ? rowToActionRun(extra.run as Record<string, unknown>) : null;
    this.extra = extra;
  }
  get retryable(): boolean {
    return this.run?.retryable ?? (this.status >= 500 || this.code === 'llm_unavailable' || this.code === 'timeout' || this.code === 'rate_limited');
  }
}

export const isGatewayError = (e: unknown): e is GatewayError => e instanceof GatewayError;

// ---------------------------------------------------------------------------
// Tool inputs (mirror supabase/functions/career-gateway/tools.ts zod schemas)
// ---------------------------------------------------------------------------

export type ContextRefKind = 'goal' | 'campaign' | 'opportunity' | 'application' | 'document' | 'fact' | 'interview';
export type DestinationSpace = 'today' | 'career' | 'opportunities' | 'campaigns' | 'applications' | 'coach' | 'library';

export interface PlanActionInput {
  actionType: ActionType;
  title: string;
  reason?: string;
  contextRefs?: Partial<Record<ContextRefKind, { id: string; revision?: number }>>;
  destination: { space: DestinationSpace; id?: string; section?: string };
  priorityBand?: PriorityBand;
}

export interface ToolInputs {
  inspect_context: { goalId?: string; campaignId?: string; opportunityId?: string; applicationId?: string };
  explain_priorities: Record<string, never>;
  compare_opportunities: { opportunityIds: string[]; goalId?: string };
  start_application: { opportunityId: string; campaignId?: string };
  resume_application: { applicationId: string };
  request_tailoring: { applicationId: string; sourceResumeId: string; sourceResumeRevision: number; templateId?: string };
  report_result: { runId: string; result: { kind: 'prism' | 'artifact' | 'interview' | 'outcome' | 'application'; id: string; revision?: number } };
  review_evidence: { factIds?: string[]; applicationId?: string };
  prepare_interview: { applicationId: string; scheduledAt?: string; timeZone?: string; interviewType?: InterviewType };
  create_plan: { actions: PlanActionInput[] };
  record_outcome: { applicationId: string; kind: OutcomeKind; observedAt?: string; note?: string; details?: Record<string, string | number | boolean | null> };
  save_artifact: {
    applicationId: string; kind: ArtifactKind; artifactId?: string; title?: string; content: { text: string };
    provenance?: { factIds?: string[]; sourceRevisions?: Record<string, number | string> };
  };
  generate_artifact: { applicationId: string; kind: 'cover_letter' | 'linkedin'; factIds?: string[] };
}

export interface ToolResults {
  inspect_context: InspectContextResult;
  explain_priorities: ExplainPrioritiesResult;
  compare_opportunities: CompareOpportunitiesResult;
  start_application: StartApplicationResult;
  resume_application: ResumeApplicationResult;
  request_tailoring: RequestTailoringResult;
  report_result: ReportResultResult;
  review_evidence: ReviewEvidenceResult;
  prepare_interview: PrepareInterviewResult;
  create_plan: CreatePlanResult;
  record_outcome: RecordOutcomeResult;
  save_artifact: SaveArtifactResult;
  generate_artifact: GenerateArtifactResult;
}

export type ToolName = keyof ToolInputs;

const RESULT_MAPPERS: { [K in ToolName]: (raw: unknown) => ToolResults[K] } = {
  inspect_context: mapInspectContextResult,
  explain_priorities: mapExplainPrioritiesResult,
  compare_opportunities: mapCompareOpportunitiesResult,
  start_application: mapStartApplicationResult,
  resume_application: mapResumeApplicationResult,
  request_tailoring: mapRequestTailoringResult,
  report_result: mapReportResultResult,
  review_evidence: mapReviewEvidenceResult,
  prepare_interview: mapPrepareInterviewResult,
  create_plan: mapCreatePlanResult,
  record_outcome: mapRecordOutcomeResult,
  save_artifact: mapSaveArtifactResult,
  generate_artifact: mapGenerateArtifactResult,
};

export const TOOL_NAMES = Object.keys(RESULT_MAPPERS) as ToolName[];

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export interface RunToolOptions {
  /** 8–128 chars, minted per logical action with newIdempotencyKey(). */
  idempotencyKey: string;
  /** The career_actions row this run executes, when any. */
  actionId?: string;
  confirmation?: Pick<ConfirmationRequired, 'token' | 'contentHash'>;
  /** Revisions the UI acted on; a mismatch is `stale_context`. */
  contextRevisions?: Record<string, number | string>;
  requestId?: string;
}

const KEY_RE = /^[A-Za-z0-9._:#-]{8,128}$/;

/** `${prefix}:${uuid}` — unique per logical action, safe to persist locally
 *  so an interrupted flow can resume with the same key. */
export function newIdempotencyKey(prefix = 'run'): string {
  const clean = prefix.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40) || 'run';
  return `${clean}:${crypto.randomUUID()}`;
}

async function post<T>(body: Record<string, unknown>, mapResult: (raw: unknown) => T): Promise<GatewayResponse<T>> {
  try {
    const raw = await callFn<unknown>(GATEWAY_FN, body);
    return mapGatewayResponse(raw, mapResult);
  } catch (e) {
    if (e && typeof e === 'object' && ('code' in e || 'status' in e)) throw new GatewayError(e as FnError);
    throw e;
  }
}

/** Execute (or, with the same key, replay) one registered tool. */
export function runTool<K extends ToolName>(tool: K, input: ToolInputs[K], opts: RunToolOptions): Promise<GatewayResponse<ToolResults[K]>> {
  if (!KEY_RE.test(opts.idempotencyKey)) return Promise.reject(new Error('invalid idempotency key'));
  return post({
    tool,
    input,
    idempotencyKey: opts.idempotencyKey,
    ...(opts.actionId ? { actionId: opts.actionId } : {}),
    ...(opts.confirmation ? { confirmation: { token: opts.confirmation.token, contentHash: opts.confirmation.contentHash } } : {}),
    ...(opts.contextRevisions ? { contextRevisions: opts.contextRevisions } : {}),
    ...(opts.requestId ? { requestId: opts.requestId } : {}),
  }, RESULT_MAPPERS[tool]);
}

/** Second step of a confirmed tool: same tool/input/key plus the token the
 *  first step returned. */
export function confirmTool<K extends ToolName>(
  tool: K,
  input: ToolInputs[K],
  confirmation: Pick<ConfirmationRequired, 'token' | 'contentHash'>,
  opts: Omit<RunToolOptions, 'confirmation'>,
): Promise<GatewayResponse<ToolResults[K]>> {
  return runTool(tool, input, { ...opts, confirmation });
}

/** Cancel an active receipt. Completed side effects remain visible. */
export async function cancelRun(runId: string): Promise<ActionRun> {
  const res = await post({ tool: 'cancel_run', input: { runId }, idempotencyKey: newIdempotencyKey('cancel') }, () => undefined);
  return res.run;
}

/** Complete a running receipt (e.g. a request_tailoring run) by pointing it
 *  at the persisted owned result; the server verifies the row exists. */
export function reportResult(runId: string, result: ToolInputs['report_result']['result']): Promise<GatewayResponse<ReportResultResult>> {
  return runTool('report_result', { runId, result }, { idempotencyKey: newIdempotencyKey('report') });
}
