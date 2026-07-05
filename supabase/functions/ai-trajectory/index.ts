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
    currentLevel: { type: 'STRING' },
    suggestedTitles: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' }, industry: { type: 'STRING' },
          matchScore: { type: 'INTEGER' }, rationale: { type: 'STRING' },
        },
        required: ['title', 'industry', 'matchScore', 'rationale'],
      },
    },
    suggestedIndustries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          industryName: { type: 'STRING' }, whyQualifies: { type: 'STRING' }, growthOutlook: { type: 'STRING' },
        },
        required: ['industryName', 'whyQualifies', 'growthOutlook'],
      },
    },
    skillGapsAndLeverages: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          skillName: { type: 'STRING' }, type: { type: 'STRING' },
          importance: { type: 'STRING' }, description: { type: 'STRING' },
        },
        required: ['skillName', 'type', 'importance', 'description'],
      },
    },
    strategicTrajectoryPlan: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['currentLevel', 'suggestedTitles', 'suggestedIndustries', 'skillGapsAndLeverages', 'strategicTrajectoryPlan'],
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const body = await req.json().catch(() => ({}));
    const resumeData = body?.resumeData;
    if (!resumeData || typeof resumeData !== 'object') throw new HttpError(400, 'missing_resume_data');

    await requireFeature(user.id, 'smartStudio');
    await checkAndMeter(user.id, 'aiActions');

    const prompt =
      `You are an elite Executive Career Coach and Talent Analytics Partner. Analyze the candidate's trajectory ` +
      `from their resume and identify roles/industries they are best qualified for.\n` +
      `Candidate Resume Data:\n${JSON.stringify(resumeData).slice(0, 12000)}\n\n` +
      `Requirements:\n` +
      `1. currentLevel (e.g. Entry-Level, Mid-Level, Senior, Lead, Executive, Career Pivoter).\n` +
      `2. suggestedTitles: 3 titles with industry, matchScore (0-100), and a rationale grounded in the resume.\n` +
      `3. suggestedIndustries: 2-3 with whyQualifies and growthOutlook.\n` +
      `4. skillGapsAndLeverages: 3-5 with type ('leverage' or 'acquire'), importance ('Critical'/'Recommended'/'Nice-to-have'), description.\n` +
      `5. strategicTrajectoryPlan: 4 actionable steps. Ground everything in the provided resume; never invent employers or facts.\n` +
      `Respond as JSON matching the schema. No markdown.`;

    const result = sanitizeDeep(
      validateShape(await llmJson(prompt, SCHEMA), {
        currentLevel: 'string', suggestedTitles: 'array', suggestedIndustries: 'array',
        skillGapsAndLeverages: 'array', strategicTrajectoryPlan: 'array',
      }),
    );
    await logAi(user.id, { function: 'ai-trajectory', model: ROUTED_MODEL_LABEL, status: 'ok' });
    return ok(result);
  } catch (err) {
    if (userId) await logAi(userId, { function: 'ai-trajectory', model: ROUTED_MODEL_LABEL, status: 'error' });
    return fail(err);
  }
});
