import { z } from 'npm:zod@3.24.1';
import { withAiHandler } from '../_shared/handler.ts';
import { llmJsonMetered, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { clampScore, validateShape, validateStringArray } from '../_shared/validate.ts';
import { sanitizeDeep } from '../_shared/sanitize.ts';
import { asData, INJECTION_RULE } from '../_shared/injection.ts';
import { boundedText, CAPS } from '../_shared/body.ts';

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

const Body = z.object({
  targetRole: boundedText(1, 200),
  headline: z.string().max(500).default(''),
  about: z.string().max(CAPS.freeTextChars).default(''),
});

export function buildPrompt(targetRole: string, headline: string, about: string): string {
  const profile = `Headline: ${headline.trim() || 'None provided'}\nAbout: ${about.trim() || 'None provided'}`;
  return `${INJECTION_RULE}\n` +
    `You are an expert Executive LinkedIn Personal Brand Architect. Review the candidate's current LinkedIn ` +
    `profile (below) against their target role (below).\n` +
    `${asData('target_role', targetRole)}\n${asData('linkedin_profile', profile, CAPS.freeTextChars)}\n` +
    `Requirements:\n` +
    `1. linkedinScore: a LinkedIn Search-Optimization score (0-100).\n` +
    `2. headlineSuggestions: 3 tailored, recruiter-stopping headlines using rich keywords separated by pipes.\n` +
    `3. aboutSuggestion: rewrite the About in a compelling first-person voice; use placeholders like [X] for metrics not provided.\n` +
    `4. experienceTips: concrete tips to maximize recruiter inbound.\n` +
    `5. searchVisibilityFeedback: why search scrapers might overlook this profile.\n` +
    `Respond as JSON matching the schema. No markdown.`;
}

Deno.serve(withAiHandler('ai-linkedin', {
  schema: Body,
  feature: 'smartStudio',
  meter: 'aiActions',
  rateLimit: { perHour: 20 },
  model: ROUTED_MODEL_LABEL,
  promptVersion: 'v2',
}, async (ctx) => {
  const { targetRole, headline, about } = ctx.body;
  const r = await llmJsonMetered<unknown>(buildPrompt(targetRole, headline, about), { schema: SCHEMA });
  ctx.addTokens(r.tokens);
  const v = validateShape<{
    linkedinScore: unknown; headlineSuggestions: unknown; aboutSuggestion: string;
    experienceTips: unknown; searchVisibilityFeedback: string;
  }>(r.data, {
    linkedinScore: 'number', headlineSuggestions: 'array', aboutSuggestion: 'string',
    experienceTips: 'array', searchVisibilityFeedback: 'string',
  });
  return sanitizeDeep({
    linkedinScore: clampScore(v.linkedinScore, 'linkedinScore'),
    headlineSuggestions: validateStringArray(v.headlineSuggestions, 'headlineSuggestions'),
    aboutSuggestion: v.aboutSuggestion,
    experienceTips: validateStringArray(v.experienceTips, 'experienceTips'),
    searchVisibilityFeedback: v.searchVisibilityFeedback,
  });
}));
