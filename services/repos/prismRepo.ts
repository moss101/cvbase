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
}

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
  };
}

/** The most recent run the user can pick back up (abandoned wizard, pending
 *  review, or a failed run that checkpointing can resume). */
export async function getResumable(userId: string): Promise<PrismRunSummary | null> {
  const { data, error } = await getSupabase().from('prism_runs')
    .select('id,status,template_id,questions,answers,result,error_code,updated_at')
    .eq('user_id', userId)
    .in('status', ['awaiting_answers', 'review', 'failed'])
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
