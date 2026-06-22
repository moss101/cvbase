import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter, requireFeature } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { geminiJson } from '../_shared/gemini.ts';
import { validateShape } from '../_shared/validate.ts';
import { sanitizeDeep } from '../_shared/sanitize.ts';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    linkedinScore: { type: 'INTEGER' },
    headlineSuggestions: { type: 'ARRAY', items: { type: 'STRING' } },
    aboutSuggestion: { type: 'STRING' },
    experienceTips: { type: 'ARRAY', items: { type: 'STRING' } },
    searchVisibilityFeedback: { type: 'STRING' },
  },
  required: ['linkedinScore', 'headlineSuggestions', 'aboutSuggestion', 'experienceTips', 'searchVisibilityFeedback'],
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const body = await req.json().catch(() => ({}));
    const headline = String(body?.headline ?? '');
    const about = String(body?.about ?? '');
    const targetRole = String(body?.targetRole ?? '');
    if (!targetRole.trim()) throw new HttpError(400, 'missing_target_role');

    await requireFeature(user.id, 'smartStudio');
    await checkAndMeter(user.id, 'aiActions');

    const prompt =
      `You are an expert Executive LinkedIn Personal Brand Architect. Review these credentials against the target role.\n` +
      `Target Career Role: ${targetRole}\n` +
      `Current headline: ${headline || 'None provided'}\n` +
      `Current "About": ${about || 'None provided'}\n` +
      `Requirements:\n` +
      `1. linkedinScore: a LinkedIn Search-Optimization score (0-100).\n` +
      `2. headlineSuggestions: 3 tailored, recruiter-stopping headlines using rich keywords separated by pipes.\n` +
      `3. aboutSuggestion: rewrite the About in a compelling first-person voice; use placeholders like [X] for metrics not provided.\n` +
      `4. experienceTips: concrete tips to maximize recruiter inbound.\n` +
      `5. searchVisibilityFeedback: why search scrapers might overlook this profile.\n` +
      `Respond as JSON matching the schema. No markdown.`;

    const result = sanitizeDeep(
      validateShape(await geminiJson(prompt, SCHEMA), {
        linkedinScore: 'number', headlineSuggestions: 'array', aboutSuggestion: 'string',
        experienceTips: 'array', searchVisibilityFeedback: 'string',
      }),
    );
    await logAi(user.id, { function: 'ai-linkedin', model: 'gemini-2.5-flash', status: 'ok' });
    return ok(result);
  } catch (err) {
    if (userId) await logAi(userId, { function: 'ai-linkedin', model: 'gemini-2.5-flash', status: 'error' });
    return fail(err);
  }
});
