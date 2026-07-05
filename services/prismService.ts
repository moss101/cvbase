import { callFn, streamFn, type FnError } from './api';
import type { ResumeData, TemplateId } from '../types';

// Thin client for the prism-tailor Edge Function (the PRISM agent pipeline).
// Every tailoring is a server-side run row (the trace id); the client only
// round-trips the runId. Streaming phases emit fixed human-readable stage
// lines, then a single done event with the payload.

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

async function runPhase<T>(body: Record<string, unknown>, onStage: (u: PrismStageUpdate) => void): Promise<T> {
  let result: T | null = null;
  let errorCode: string | null = null;
  await streamFn('prism-tailor', body, (event) => {
    if (event.type === 'stage' && typeof event.label === 'string') {
      onStage({ stage: String(event.stage ?? ''), label: event.label });
    } else if (event.type === 'done') {
      result = event.result as T;
    } else if (event.type === 'error') {
      errorCode = typeof event.error === 'string' ? event.error : 'internal_error';
    }
  });
  if (errorCode || !result) {
    const err = new Error(errorCode ?? 'stream_ended_early') as FnError;
    err.code = errorCode ?? undefined;
    throw err;
  }
  return result;
}

export function analyzeGaps(
  input: { jdText: string; cvText: string; templateId: TemplateId },
  onStage: (u: PrismStageUpdate) => void,
): Promise<PrismAnalyzeResult> {
  return runPhase<PrismAnalyzeResult>({ phase: 'analyze', ...input }, onStage);
}

/** Starts OR resumes generation for a run — the server continues from the
 *  last checkpointed agent stage. */
export function generateResume(
  input: { runId: string; answers: PrismAnswer[] },
  onStage: (u: PrismStageUpdate) => void,
): Promise<PrismGenerateResult> {
  return runPhase<PrismGenerateResult>({ phase: 'generate', ...input }, onStage);
}

/** Marks the run approved after the user's review: links the saved resume and
 *  wipes the run's personal text server-side (data minimization). */
export function finalizeRun(runId: string, resumeId: string): Promise<void> {
  return callFn('prism-tailor', { phase: 'finalize', runId, resumeId }).then(() => undefined);
}
