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
    matchScore: { type: 'INTEGER' },
    critique: { type: 'ARRAY', items: { type: 'STRING' } },
    missingCompetencies: { type: 'ARRAY', items: { type: 'STRING' } },
    improvedCoverLetter: { type: 'STRING' },
  },
  required: ['matchScore', 'critique', 'missingCompetencies', 'improvedCoverLetter'],
};

const Body = z.object({
  coverLetterText: boundedText(1, CAPS.freeTextChars),
  jobDescription: boundedText(1, CAPS.jobDescriptionChars),
});

export function buildPrompt(coverLetterText: string, jobDescription: string): string {
  return `${INJECTION_RULE}\n` +
    `You are an elite Fortune 50 Hiring Partner. Compare the candidate's Cover Letter with the target Job Description.\n` +
    `${asData('cover_letter', coverLetterText, CAPS.freeTextChars)}\n\n${asData('job_description', jobDescription, CAPS.jobDescriptionChars)}\n\n` +
    `Requirements:\n` +
    `1. matchScore: a fit score (0-100).\n` +
    `2. critique: constructive bullets on tone, format (intro/hook/value/CTA), clarity, and keyword density.\n` +
    `3. missingCompetencies: critical role competencies the draft does not touch.\n` +
    `4. improvedCoverLetter: a polished, targeted rewrite preserving the candidate's details as placeholders (e.g. [Your Name]); never invent facts.\n` +
    `Respond as JSON matching the schema. No markdown.`;
}

Deno.serve(withAiHandler('ai-cover-letter', {
  schema: Body,
  feature: 'smartStudio',
  meter: 'aiActions',
  rateLimit: { perHour: 20 },
  model: ROUTED_MODEL_LABEL,
  promptVersion: 'v2',
}, async (ctx) => {
  const { coverLetterText, jobDescription } = ctx.body;
  const r = await llmJsonMetered<unknown>(buildPrompt(coverLetterText, jobDescription), { schema: SCHEMA });
  ctx.addTokens(r.tokens);
  const v = validateShape<{ matchScore: unknown; critique: unknown; missingCompetencies: unknown; improvedCoverLetter: string }>(
    r.data, { matchScore: 'number', critique: 'array', missingCompetencies: 'array', improvedCoverLetter: 'string' },
  );
  return sanitizeDeep({
    matchScore: clampScore(v.matchScore, 'matchScore'),
    critique: validateStringArray(v.critique, 'critique'),
    missingCompetencies: validateStringArray(v.missingCompetencies, 'missingCompetencies'),
    improvedCoverLetter: v.improvedCoverLetter,
  });
}));
