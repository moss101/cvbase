import { getSupabase } from '../supabase';
import type { PrismQuestion } from '../prismService';
import type { ResumeData } from '../../types';

// Client-side access to a user's OWN prism_runs rows. All reads/deletes go
// through RLS (auth.uid() = user_id); writes happen only in the edge function.

export interface PrismRunSummary {
  id: string;
  status: 'analyzing' | 'awaiting_answers' | 'generating' | 'review' | 'completed' | 'failed';
  templateId: string;
  questions: PrismQuestion[];
  answers: { questionId: string; question: string; answer: string }[];
  result: { resume: ResumeData; atsScore: number; unresolvedIssues: string[] } | null;
  errorCode: string | null;
  updatedAt: string;
  /** Application binding (null for standalone wizard runs; optional so
   *  fixtures built before the binding existed still type-check). */
  applicationId?: string | null;
  sourceResumeId?: string | null;
  sourceResumeRevision?: number | null;
  idempotencyKey?: string | null;
}

// One literal so supabase-js can type the selection (a concatenated string
// degrades to GenericStringError).
const RUN_COLUMNS =
  'id,status,template_id,questions,answers,result,error_code,updated_at,application_id,source_resume_id,source_resume_revision,idempotency_key';
const RESUMABLE_STATUSES = ['awaiting_answers', 'review', 'failed'];

function rowToRun(r: Record<string, unknown>): PrismRunSummary {
  return {
    id: String(r.id),
    status: r.status as PrismRunSummary['status'],
    templateId: String(r.template_id ?? 'classic'),
    questions: (r.questions as PrismQuestion[]) ?? [],
    answers: (r.answers as PrismRunSummary['answers']) ?? [],
    result: (r.result as PrismRunSummary['result']) ?? null,
    errorCode: (r.error_code as string) ?? null,
    updatedAt: String(r.updated_at ?? ''),
    applicationId: (r.application_id as string) ?? null,
    sourceResumeId: (r.source_resume_id as string) ?? null,
    sourceResumeRevision: typeof r.source_resume_revision === 'number' ? r.source_resume_revision : null,
    idempotencyKey: (r.idempotency_key as string) ?? null,
  };
}

/** The most recent STANDALONE run the user can pick back up (abandoned
 *  wizard, pending review, or a failed run that checkpointing can resume).
 *  Runs bound to an application are excluded: they belong to that
 *  application's workspace (getResumableForApplication), so the standalone
 *  banner never offers another surface's run. */
export async function getResumable(userId: string): Promise<PrismRunSummary | null> {
  const { data, error } = await getSupabase().from('prism_runs')
    .select(RUN_COLUMNS)
    .eq('user_id', userId)
    .is('application_id', null)
    .in('status', RESUMABLE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw error;
  return data ? rowToRun(data as Record<string, unknown>) : null;
}

/** The exact run to resume for one application — never another
 *  application's (scoped by application_id as well as owner). */
export async function getResumableForApplication(
  userId: string,
  applicationId: string,
): Promise<PrismRunSummary | null> {
  const { data, error } = await getSupabase().from('prism_runs')
    .select(RUN_COLUMNS)
    .eq('user_id', userId)
    .eq('application_id', applicationId)
    .in('status', RESUMABLE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw error;
  return data ? rowToRun(data as Record<string, unknown>) : null;
}

/** "Delete my data": removes every pipeline run (uploaded text, checkpoints,
 *  drafts, results) via RLS delete; agent telemetry cascades with the runs.
 *  Saved resumes in the document library are deleted separately by the user. */
export async function deleteAllRuns(userId: string): Promise<void> {
  const { error } = await getSupabase().from('prism_runs')
    .delete().eq('user_id', userId);
  if (error) throw error;
}

/** Remove a single dead run (e.g. the server answered `run_expired` on a
 *  resume attempt) so the "continue your run" banner stops re-offering it. */
export async function deleteRun(userId: string, runId: string): Promise<void> {
  const { error } = await getSupabase().from('prism_runs')
    .delete().eq('user_id', userId).eq('id', runId);
  if (error) throw error;
}

/** "This wasn't in my CV and I didn't say this" — the guardrail-improvement
 *  signal from the review screen. Stores only the flagged line, never the CV. */
export async function flagLine(
  userId: string,
  runId: string | null,
  section: string,
  lineText: string,
): Promise<void> {
  const { error } = await getSupabase().from('prism_line_flags')
    .insert({ user_id: userId, run_id: runId, section, line_text: lineText.slice(0, 500) });
  if (error) throw error;
}

/** Feature-flag check (mirrors the server gate: enabled + rollout bucket). */
export async function isPrismEnabled(userId: string | null): Promise<boolean> {
  const { data } = await getSupabase().from('feature_flags')
    .select('enabled,rollout_pct').eq('flag', 'prism').maybeSingle();
  if (!data?.enabled) return false;
  if (!userId) return false;
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100) < (data.rollout_pct ?? 0);
}
