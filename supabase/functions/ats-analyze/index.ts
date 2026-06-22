import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { parseResumeText, runFullAnalysis } from '../../../lib/ats/index.ts';

// ats-analyze: the ONE metered ATS scan. Runs the deterministic engine
// server-side (no AI) and increments the user's monthly ats_scans counter.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));
    const resumeText = body?.resumeText;
    const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : null;
    if (typeof resumeText !== 'string' || resumeText.trim().length === 0) {
      throw new HttpError(400, 'missing_resume_text');
    }

    await checkAndMeter(user.id, 'atsScans');

    const parsed = parseResumeText(resumeText);
    const { job, report } = runFullAnalysis(parsed, jobDescription);

    await logAi(user.id, { function: 'ats-analyze', model: 'deterministic', status: 'ok' });
    return ok({ job, report });
  } catch (err) {
    return fail(err);
  }
});
