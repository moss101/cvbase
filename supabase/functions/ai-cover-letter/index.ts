import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter, requireFeature } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { llmJson, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { validateShape } from '../_shared/validate.ts';
import { sanitizeDeep } from '../_shared/sanitize.ts';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    matchScore: { type: 'INTEGER' },
    critique: { type: 'ARRAY', items: { type: 'STRING' } },
    missingCompetencies: { type: 'ARRAY', items: { type: 'STRING' } },
    improvedCoverLetter: { type: 'STRING' },
  },
  required: ['matchScore', 'critique', 'missingCompetencies', 'improvedCoverLetter'],
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const body = await req.json().catch(() => ({}));
    const coverLetterText = String(body?.coverLetterText ?? '');
    const jobDescription = String(body?.jobDescription ?? '');
    if (!coverLetterText.trim() || !jobDescription.trim()) throw new HttpError(400, 'missing_inputs');

    await requireFeature(user.id, 'smartStudio');
    await checkAndMeter(user.id, 'aiActions');

    const prompt =
      `You are an elite Fortune 50 Hiring Partner. Compare the candidate's Cover Letter with the target Job Description.\n` +
      `Cover Letter:\n${coverLetterText}\n\nJob Description:\n${jobDescription}\n\n` +
      `Requirements:\n` +
      `1. matchScore: a fit score (0-100).\n` +
      `2. critique: constructive bullets on tone, format (intro/hook/value/CTA), clarity, and keyword density.\n` +
      `3. missingCompetencies: critical role competencies the draft does not touch.\n` +
      `4. improvedCoverLetter: a polished, targeted rewrite preserving the candidate's details as placeholders (e.g. [Your Name]); never invent facts.\n` +
      `Respond as JSON matching the schema. No markdown.`;

    const result = sanitizeDeep(
      validateShape(await llmJson(prompt, SCHEMA), {
        matchScore: 'number', critique: 'array', missingCompetencies: 'array', improvedCoverLetter: 'string',
      }),
    );
    await logAi(user.id, { function: 'ai-cover-letter', model: ROUTED_MODEL_LABEL, status: 'ok' });
    return ok(result);
  } catch (err) {
    if (userId) await logAi(userId, { function: 'ai-cover-letter', model: ROUTED_MODEL_LABEL, status: 'error' });
    return fail(err);
  }
});
