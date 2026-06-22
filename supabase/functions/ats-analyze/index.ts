import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { parseResumeText, parseFromResumeData, runAtsAnalysis, analyzeJobDescription } from '../../../lib/ats/index.ts';

// ats-analyze: the ONE metered ATS scan. Runs the deterministic engine
// server-side (no AI) and increments the user's monthly ats_scans counter.
// Accepts EITHER structured resumeData (best fidelity) or raw resumeText.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));
    const resumeText = body?.resumeText;
    const resumeData = body?.resumeData;
    const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : null;
    if (!resumeData && (typeof resumeText !== 'string' || resumeText.trim().length === 0)) {
      throw new HttpError(400, 'missing_resume');
    }

    await checkAndMeter(user.id, 'atsScans');

    const parsed = resumeData ? parseFromResumeData(resumeData) : parseResumeText(resumeText);
    const job = jobDescription && jobDescription.trim().length >= 80 ? analyzeJobDescription(jobDescription) : null;
    const report = runAtsAnalysis(parsed, job);

    await logAi(user.id, { function: 'ats-analyze', model: 'deterministic', status: 'ok' });
    return ok({ job, report });
  } catch (err) {
    return fail(err);
  }
});
