import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { llmText, llmJson, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { sanitizeText, sanitizeDeep } from '../_shared/sanitize.ts';

const STRING_ARRAY = { type: 'ARRAY', items: { type: 'STRING' } };
const PASS_FEEDBACK = {
  type: 'OBJECT',
  properties: { pass: { type: 'BOOLEAN' }, feedback: { type: 'STRING' } },
  required: ['pass', 'feedback'],
};
const ATS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    overallScore: { type: 'INTEGER' },
    checks: {
      type: 'OBJECT',
      properties: {
        contactInfo: PASS_FEEDBACK, keywords: PASS_FEEDBACK, sectionHeaders: PASS_FEEDBACK,
        bulletPoints: PASS_FEEDBACK, fileFormat: PASS_FEEDBACK,
      },
      required: ['contactInfo', 'keywords', 'sectionHeaders', 'bulletPoints', 'fileFormat'],
    },
  },
  required: ['overallScore', 'checks'],
};

// Section-specific analysis prompt + schema (summary | experience | skills).
function sectionSpec(section: string, resumeData: unknown, jd: string): { prompt: string; schema: unknown } {
  const base = `You are an expert career coach and resume writer. Analyze the resume against the job description and return JSON matching the schema.`;
  const ctx = `\nJob Description:\n${jd}\n\nResume Data:\n${JSON.stringify(resumeData).slice(0, 12000)}`;
  if (section === 'summary') {
    return {
      prompt: `${base}\nRewrite the professional summary: compelling, action-oriented, targeted, strictly 3-4 sentences. Use [X] placeholders for metrics not provided. Put it in 'summarySuggestion'.${ctx}`,
      schema: { type: 'OBJECT', properties: { summarySuggestion: { type: 'STRING' } }, required: ['summarySuggestion'] },
    };
  }
  if (section === 'experience') {
    return {
      prompt: `${base}\nFor each experience item provide atsAnalysis (1-2 sentences on weaknesses) and improvedDescription (rewritten, achievement-oriented bullets with job keywords; use [X] for unprovided metrics). Put them in 'experienceSuggestions'.${ctx}`,
      schema: {
        type: 'OBJECT',
        properties: {
          experienceSuggestions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' }, jobTitle: { type: 'STRING' }, company: { type: 'STRING' },
                atsAnalysis: { type: 'STRING' }, improvedDescription: { type: 'STRING' },
              },
              required: ['id', 'jobTitle', 'company', 'atsAnalysis', 'improvedDescription'],
            },
          },
        },
        required: ['experienceSuggestions'],
      },
    };
  }
  if (section === 'skills') {
    return {
      prompt: `${base}\nIdentify 5-10 high-value keywords critical for the job but MISSING from the resume skills. Do not list skills already present. Put them in 'missingKeywords'.${ctx}`,
      schema: { type: 'OBJECT', properties: { missingKeywords: STRING_ARRAY }, required: ['missingKeywords'] },
    };
  }
  throw new HttpError(400, 'invalid_section', { section });
}

const GENERATORS: Record<string, (p: Record<string, unknown>) => string> = {
  bullets: (p) => `Generate 15-20 professional, achievement-oriented resume bullet points for the job title "${sanitizeText(p.jobTitle)}". Action verbs + quantifiable results; use [X] for metrics not given. Return a JSON array of strings.`,
  summary: (p) => `Generate 4-5 distinct professional resume summary paragraphs (3-4 sentences) for "${sanitizeText(p.jobTitle)}". Return a JSON array of strings.`,
  skills: (p) => `Generate 15 relevant professional skills (hard + soft) related to: "${sanitizeText(p.context)}". Return a JSON array of strings.`,
};

// ai-suggest: all metered AI text/structured helpers. Holds the Gemini key
// server-side; never returns mock data.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  const body = await req.json().catch(() => ({}));
  const kind = String(body?.kind ?? '');
  const payload = (body?.payload ?? {}) as Record<string, unknown>;
  try {
    const user = await getUser(req);
    userId = user.id;
    await checkAndMeter(user.id, 'aiActions');

    let result: unknown;
    if (GENERATORS[kind]) {
      const parsed = await llmJson<unknown>(GENERATORS[kind](payload), STRING_ARRAY);
      result = Array.isArray(parsed) ? parsed.map(sanitizeText).filter(Boolean) : [];
    } else if (kind === 'suggestion') {
      result = sanitizeText(await llmText(String(payload.prompt ?? '')));
    } else if (kind === 'fieldTip') {
      let p = `You are an expert resume writer. Give a specific, actionable 1-2 sentence pro-tip (under 30 words) for the "${sanitizeText(payload.fieldName)}" field in the "${sanitizeText(payload.section)}" section. Return ONLY the tip — no preamble, quotes, or markdown.`;
      if (typeof payload.currentValue === 'string' && payload.currentValue.length > 5) {
        p += `\nThe user is writing: "${sanitizeText(payload.currentValue)}". Tailor advice to refine/quantify it.`;
      }
      result = sanitizeText(await llmText(p)).replace(/^["']|["']$/g, '').trim();
    } else if (kind === 'section') {
      const spec = sectionSpec(String(payload.section ?? ''), payload.resumeData, String(payload.jobDescription ?? ''));
      result = sanitizeDeep(await llmJson(spec.prompt, spec.schema));
    } else if (kind === 'analyze') {
      const jd = String(payload.jobDescription ?? '');
      const [s, e, k] = await Promise.all(
        ['summary', 'experience', 'skills'].map((sec) => {
          const spec = sectionSpec(sec, payload.resumeData, jd);
          return llmJson<Record<string, unknown>>(spec.prompt, spec.schema).catch(() => ({}));
        }),
      );
      result = sanitizeDeep({ ...s, ...e, ...k });
    } else if (kind === 'ats-compliance') {
      const prompt = `You are an expert ATS analyzer. Evaluate the resume's ATS compliance. overallScore 0-100; for each check give a boolean pass and concise feedback. Resume Data:\n${JSON.stringify(payload.resumeData).slice(0, 12000)}`;
      result = sanitizeDeep(await llmJson(prompt, ATS_SCHEMA));
    } else {
      throw new HttpError(400, 'unsupported_kind', { kind });
    }

    await logAi(user.id, { function: 'ai-suggest', model: ROUTED_MODEL_LABEL, promptVersion: 'v1', status: 'ok' });
    return ok({ kind, result });
  } catch (err) {
    if (userId) await logAi(userId, { function: `ai-suggest:${kind}`, model: ROUTED_MODEL_LABEL, status: 'error' });
    return fail(err);
  }
});
