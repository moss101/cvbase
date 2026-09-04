import { z } from 'npm:zod@3.24.1';
import { withAiHandler } from '../_shared/handler.ts';
import { llmJsonMetered, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { validateEach, validateShape, validateStringArray } from '../_shared/validate.ts';
import { sanitizeDeep } from '../_shared/sanitize.ts';
import { asJsonData, INJECTION_RULE } from '../_shared/injection.ts';
import { CAPS, resumeDataSchema } from '../_shared/body.ts';

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

const Body = z.object({ resumeData: resumeDataSchema() });

export function buildPrompt(resumeData: unknown): string {
  return `${INJECTION_RULE}\n` +
    `You are an elite Executive Career Coach and Talent Analytics Partner. Analyze the candidate's trajectory ` +
    `from their resume and identify roles/industries they are best qualified for.\n` +
    `${asJsonData('resume_data', resumeData, CAPS.resumeDataChars)}\n\n` +
    `Requirements:\n` +
    `1. currentLevel (e.g. Entry-Level, Mid-Level, Senior, Lead, Executive, Career Pivoter).\n` +
    `2. suggestedTitles: 3 titles with industry, matchScore (0-100), and a rationale grounded in the resume.\n` +
    `3. suggestedIndustries: 2-3 with whyQualifies and growthOutlook.\n` +
    `4. skillGapsAndLeverages: 3-5 with type ('leverage' or 'acquire'), importance ('Critical'/'Recommended'/'Nice-to-have'), description.\n` +
    `5. strategicTrajectoryPlan: 4 actionable steps. Ground everything in the provided resume; never invent employers or facts.\n` +
    `Respond as JSON matching the schema. No markdown.`;
}

Deno.serve(withAiHandler('ai-trajectory', {
  schema: Body,
  feature: 'smartStudio',
  meter: 'aiActions',
  rateLimit: { perHour: 20 },
  model: ROUTED_MODEL_LABEL,
  promptVersion: 'v2',
}, async (ctx) => {
  const r = await llmJsonMetered<unknown>(buildPrompt(ctx.body.resumeData), { schema: SCHEMA });
  ctx.addTokens(r.tokens);
  const v = validateShape<Record<string, unknown>>(r.data, {
    currentLevel: 'string', suggestedTitles: 'array', suggestedIndustries: 'array',
    skillGapsAndLeverages: 'array', strategicTrajectoryPlan: 'array',
  });
  return sanitizeDeep({
    currentLevel: v.currentLevel,
    suggestedTitles: validateEach(v.suggestedTitles, { title: 'string', industry: 'string', matchScore: 'number', rationale: 'string' }, 'suggestedTitles'),
    suggestedIndustries: validateEach(v.suggestedIndustries, { industryName: 'string', whyQualifies: 'string', growthOutlook: 'string' }, 'suggestedIndustries'),
    skillGapsAndLeverages: validateEach(v.skillGapsAndLeverages, { skillName: 'string', type: 'string', importance: 'string', description: 'string' }, 'skillGapsAndLeverages'),
    strategicTrajectoryPlan: validateStringArray(v.strategicTrajectoryPlan, 'strategicTrajectoryPlan'),
  });
}));
