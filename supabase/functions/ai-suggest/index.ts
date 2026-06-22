import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { geminiText } from '../_shared/gemini.ts';
import { sanitizeText } from '../_shared/sanitize.ts';

// JSON-array-of-strings response schema (Gemini OpenAPI-style).
const STRING_ARRAY_SCHEMA = { type: 'ARRAY', items: { type: 'STRING' } };

const GENERATORS: Record<string, (p: Record<string, unknown>) => string> = {
  bullets: (p) =>
    `Generate 15-20 professional, achievement-oriented resume bullet points for the job title "${sanitizeText(p.jobTitle)}". ` +
    `Focus on action verbs and quantifiable results. Return a JSON array of strings.`,
  summary: (p) =>
    `Generate 4-5 distinct, professional, achievement-oriented resume summary paragraphs (3-4 sentences each) ` +
    `for the job title "${sanitizeText(p.jobTitle)}". Return a JSON array of strings.`,
  skills: (p) =>
    `Generate 15 highly relevant professional skills (hard and soft) related to: "${sanitizeText(p.context)}". ` +
    `Return a JSON array of strings.`,
};

// ai-suggest: metered AI text helpers. Currently the string[] generators
// (bullets/summary/skills); section/analyze/fieldTip are added in the client
// cutover step. Holds the Gemini key server-side; never returns mock data.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind ?? '');
    const payload = (body?.payload ?? {}) as Record<string, unknown>;
    const make = GENERATORS[kind];
    if (!make) throw new HttpError(400, 'unsupported_kind', { kind });

    await checkAndMeter(user.id, 'aiActions');

    const raw = await geminiText(make(payload), { schema: STRING_ARRAY_SCHEMA });
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(502, 'bad_ai_output');
    }
    const result = Array.isArray(parsed) ? parsed.map(sanitizeText).filter(Boolean) : [];

    await logAi(user.id, { function: 'ai-suggest', model: 'gemini-2.5-flash', promptVersion: 'v1', status: 'ok' });
    return ok({ kind, result });
  } catch (err) {
    if (userId) await logAi(userId, { function: 'ai-suggest', model: 'gemini-2.5-flash', status: 'error' });
    return fail(err);
  }
});
