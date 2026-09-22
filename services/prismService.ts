import { callFn, streamFn, type FnError } from './api';
import type { ResumeData, TemplateId } from '../types';

// Thin client for the prism-tailor Edge Function (the PRISM agent pipeline).
// Every tailoring is a server-side run row (the trace id); the client only
// round-trips the runId. Streaming phases emit fixed human-readable stage
// lines, then a single done event with the payload.
//
// Application binding (Career OS): analyze may carry the application, the
// source resume + revision it tailors from, and an idempotency key so a
// retried start returns the same run (charged once). A stale source resume
// answers in-band `source_stale` until the user acknowledges it; finalize
// links the approved resume to the application server-side.

export interface PrismStageUpdate {
  stage: string;
  label: string;
}

export interface PrismQuestion {
  id: string;
  gapArea: string;
  question: string;
}

export interface PrismAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface PrismAnalyzeResult {
  runId: string;
  /** Empty when the gap analyst found no meaningful gaps — the wizard step
   *  is skipped entirely in that case. */
  questions: PrismQuestion[];
}

export interface PrismGenerateResult {
  runId: string;
  resume: ResumeData;
  atsScore: number;
  /** Non-empty when the writer↔critic loop capped out (or hit the spend
   *  budget): the issues the final ATS review could not resolve, surfaced to
   *  the user instead of looping. */
  unresolvedIssues: string[];
}

/** Stage the server emits once when a checkpoint write failed twice: the run
 *  keeps going, but a disconnect now restarts the current step. */
export const CHECKPOINT_DEGRADED_STAGE = 'checkpoint_degraded';

async function runPhase<T>(body: Record<string, unknown>, onStage: (u: PrismStageUpdate) => void): Promise<T> {
  let result: T | null = null;
  let errorCode: string | null = null;
  let errorExtra: unknown;
  await streamFn('prism-tailor', body, (event) => {
    if (event.type === 'stage' && typeof event.label === 'string') {
      onStage({ stage: String(event.stage ?? ''), label: event.label });
    } else if (event.type === 'done') {
      result = event.result as T;
    } else if (event.type === 'error') {
      errorCode = typeof event.error === 'string' ? event.error : 'internal_error';
      errorExtra = event.extra;
    }
  });
  if (errorCode || !result) {
    const err = new Error(errorCode ?? 'stream_ended_early') as FnError;
    err.code = errorCode ?? undefined;
    err.extra = errorExtra;
    throw err;
  }
  return result;
}

export interface PrismBinding {
  /** The application this tailoring belongs to (server validates ownership). */
  applicationId?: string;
  /** The resume the CV text came from, and the revision that was read. */
  sourceResumeId?: string;
  sourceResumeRevision?: number;
  /** Same key → same run, charged once (retries after a lost response). */
  idempotencyKey?: string;
}

export function analyzeGaps(
  input: { jdText: string; cvText: string; templateId: TemplateId } & PrismBinding,
  onStage: (u: PrismStageUpdate) => void,
): Promise<PrismAnalyzeResult> {
  return runPhase<PrismAnalyzeResult>({ phase: 'analyze', ...input }, onStage);
}

/** Starts OR resumes generation for a run — the server continues from the
 *  last checkpointed agent stage. When the run's source resume has moved on
 *  the server answers `source_stale` (FnError.code, `extra.currentRevision`)
 *  without generating; re-send with `acknowledgeStale: true` after the user
 *  reviews. */
export function generateResume(
  input: { runId: string; answers: PrismAnswer[]; acknowledgeStale?: boolean },
  onStage: (u: PrismStageUpdate) => void,
): Promise<PrismGenerateResult> {
  return runPhase<PrismGenerateResult>({ phase: 'generate', ...input }, onStage);
}

export interface PrismFinalizeInput {
  runId: string;
  resumeId: string;
  /** Links the approved resume to the application (current_resume_id,
   *  resumes.application_id/origin) before the run is completed. */
  applicationId?: string;
}

export interface PrismFinalizeResult {
  runId: string;
  status: 'completed';
  applicationId: string | null;
  resumeId: string;
}

/** Marks the run approved after the user's review: links the saved resume and
 *  wipes the run's personal text server-side (data minimization). Idempotent:
 *  repeating it for the same resume is a success. Accepts the original
 *  positional `(runId, resumeId)` form as well as `{ runId, resumeId,
 *  applicationId? }`. */
export function finalizeRun(input: PrismFinalizeInput): Promise<PrismFinalizeResult>;
export function finalizeRun(runId: string, resumeId: string): Promise<void>;
export function finalizeRun(
  inputOrRunId: PrismFinalizeInput | string,
  resumeId?: string,
): Promise<PrismFinalizeResult | void> {
  if (typeof inputOrRunId === 'string') {
    return callFn('prism-tailor', { phase: 'finalize', runId: inputOrRunId, resumeId }).then(() => undefined);
  }
  const { runId, resumeId: rid, applicationId } = inputOrRunId;
  return callFn<PrismFinalizeResult>('prism-tailor', {
    phase: 'finalize', runId, resumeId: rid, ...(applicationId ? { applicationId } : {}),
  });
}
