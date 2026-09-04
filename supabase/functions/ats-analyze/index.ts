import { z } from 'npm:zod@3.24.1';
import { withAiHandler } from '../_shared/handler.ts';
import { HttpError } from '../_shared/respond.ts';
import { boundedText, CAPS, resumeDataSchema } from '../_shared/body.ts';
import { parseResumeText, parseFromResumeData, runAtsAnalysis, analyzeJobDescription } from '../../../lib/ats/index.ts';

/** The deterministic engine does not put resumeData in a prompt, so it may be
 *  larger than the LLM cap; still bounded so a hostile body can't burn CPU. */
const ATS_RESUME_DATA_CHARS = 100_000;
const MIN_JD_CHARS = 80;

const Body = z.object({
  resumeData: resumeDataSchema(ATS_RESUME_DATA_CHARS).optional(),
  resumeText: boundedText(1, 40_000).optional(),
  jobDescription: z.string().max(CAPS.jobDescriptionChars).optional(),
  /** Optional link to the resume row the scan was run from. */
  resumeId: z.string().uuid().optional(),
}).refine((b) => Boolean(b.resumeData || b.resumeText), { message: 'resumeData or resumeText is required' });

// ats-analyze: the ONE metered ATS scan. Runs the deterministic engine
// server-side (no AI) and increments the user's monthly ats_scans counter.
// Accepts EITHER structured resumeData (best fidelity) or raw resumeText.
// Every scan is persisted to ats_reports so the user can reopen it later.
Deno.serve(withAiHandler('ats-analyze', {
  schema: Body,
  meter: 'atsScans',
  rateLimit: { perHour: 60 },
  model: 'deterministic',
  promptVersion: 'v1',
}, async (ctx) => {
  const { resumeData, resumeText, jobDescription, resumeId } = ctx.body;
  const parsed = resumeData ? parseFromResumeData(resumeData as never) : parseResumeText(resumeText ?? '');
  if (!parsed) throw new HttpError(400, 'invalid_request', { issues: [{ path: 'resume', message: 'could not parse resume' }] });
  const jd = jobDescription?.trim() ?? '';
  const job = jd.length >= MIN_JD_CHARS ? analyzeJobDescription(jd) : null;
  const report = runAtsAnalysis(parsed, job);

  // Persist (20260901300000_account_lifecycle.sql). The stored `report`
  // column carries the full `{ job, report }` payload (atsReportRepo accepts
  // both shapes). A missing table or insert failure is logged, not fatal —
  // the user still gets the scan they were metered for.
  let reportId: string | null = null;
  const ins = await ctx.svc.from('ats_reports').insert({
    user_id: ctx.userId,
    resume_id: resumeId ?? null,
    job_description: jd || null,
    report: { job, report },
    score: Number.isFinite(report.atsScore) ? Math.round(report.atsScore) : null,
  }).select('id').single();
  if (ins.error) ctx.log('warn', { code: 'ats_report_persist_failed', detail: ins.error.message });
  else reportId = (ins.data as { id: string } | null)?.id ?? null;

  ctx.log('info', { code: 'ats_scan', atsScore: report.atsScore, matchScore: report.matchScore, withJd: Boolean(job), reportId });
  return { job, report, reportId };
}));
