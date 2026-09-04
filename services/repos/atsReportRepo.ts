import { getSupabase } from '../supabase';
import type { AtsReport, JobAnalysis } from '../atsEngine';

// Client-side access to a user's OWN ats_reports rows. Rows are written only by
// the metered ats-analyze edge function (service role); reads and deletes go
// through RLS (auth.uid() = user_id).

export interface AtsReportSummary {
  id: string;
  resumeId: string | null;
  /** Full job description as scanned; null for a general health check. */
  jobDescription: string | null;
  /** Headline ATS compatibility score, 0-100 (null if the row predates scoring). */
  score: number | null;
  createdAt: string;
}

export interface StoredAtsReport extends AtsReportSummary {
  report: AtsReport;
  /** Only present when the function persisted the JD analysis alongside the report. */
  job: JobAnalysis | null;
}

const SUMMARY_COLUMNS = 'id,resume_id,job_description,score,created_at';

export function rowToAtsReportSummary(r: Record<string, unknown>): AtsReportSummary {
  return {
    id: String(r.id),
    resumeId: (r.resume_id as string | null) ?? null,
    jobDescription: (r.job_description as string | null) ?? null,
    score: typeof r.score === 'number' ? r.score : null,
    createdAt: String(r.created_at ?? ''),
  };
}

/** The `report` column is either the bare AtsReport or the whole
 *  `{ job, report }` payload ats-analyze returns; accept both. */
export function rowToStoredAtsReport(r: Record<string, unknown>): StoredAtsReport {
  const raw = (r.report ?? {}) as Record<string, unknown>;
  const nested = raw.report && typeof raw.report === 'object';
  return {
    ...rowToAtsReportSummary(r),
    report: (nested ? raw.report : raw) as AtsReport,
    job: nested ? ((raw.job as JobAnalysis | null) ?? null) : null,
  };
}

/** First non-empty line of a job description, trimmed for a list row. */
export function jdHeadline(jobDescription: string | null, max = 90): string {
  const line = (jobDescription ?? '').split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** Latest N reports, newest first (no report body — that's fetched on reopen). */
export async function listRecent(userId: string, limit = 10): Promise<AtsReportSummary[]> {
  const { data, error } = await getSupabase().from('ats_reports')
    .select(SUMMARY_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(rowToAtsReportSummary);
}

export async function getById(userId: string, id: string): Promise<StoredAtsReport | null> {
  const { data, error } = await getSupabase().from('ats_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToStoredAtsReport(data as Record<string, unknown>) : null;
}

export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from('ats_reports')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw error;
}
