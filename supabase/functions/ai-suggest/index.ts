import { withAiHandler, estimateTokens, type AiContext } from '../_shared/handler.ts';
import { HttpError } from '../_shared/respond.ts';
import { llmText, llmJsonMetered, ROUTED_MODEL_LABEL } from '../_shared/llm.ts';
import { sanitizeText, sanitizeDeep } from '../_shared/sanitize.ts';
import { type AiAnalysisResult, validateAtsCompliance, validateSectionResult, validateStringArray } from '../_shared/validate.ts';
import {
  ATS_SCHEMA, buildAtsCompliancePrompt, buildFieldTipPrompt, buildSuggestionPrompt, GENERATORS,
  PROMPT_VERSION, RequestSchema, type SectionName, sectionSpec, STRING_ARRAY, type SuggestRequest,
} from './prompts.ts';

// ai-suggest: every small metered AI helper the editor uses (bullet/summary/
// skill generators, field tips, free-form suggestion, section analysis, the
// 3-way "analyze" and the AI ATS-compliance check). One metered action per
// request; 'analyze' fans out to three model calls under that one action.

const ANALYZE_SECTIONS: SectionName[] = ['summary', 'experience', 'skills'];

/** JSON call with provider token accounting funnelled into ai_logs. */
async function json<T>(ctx: AiContext<unknown>, prompt: string, schema: unknown): Promise<T> {
  const r = await llmJsonMetered<T>(prompt, { schema });
  ctx.addTokens(r.tokens);
  return r.data;
}

/** Text call: the router's text path does not expose usage, so estimate chars/4. */
async function text(ctx: AiContext<unknown>, prompt: string): Promise<string> {
  const out = await llmText(prompt);
  ctx.addTokens(estimateTokens(prompt, out));
  return out;
}

async function analyze(ctx: AiContext<unknown>, resumeData: unknown, jd: string): Promise<AiAnalysisResult & { partial?: true; failed?: SectionName[] }> {
  const settled = await Promise.allSettled(ANALYZE_SECTIONS.map(async (section) => {
    const spec = sectionSpec(section, resumeData, jd);
    const label = `ai-suggest:analyze:${section}`;
    try {
      const r = await llmJsonMetered<unknown>(spec.prompt, { schema: spec.schema });
      ctx.addTokens(r.tokens);
      const out = validateSectionResult(section, r.data);
      await ctx.logSubCall(label, 'ok', r.tokens);
      return out;
    } catch (err) {
      await ctx.logSubCall(label, 'error');
      ctx.log('warn', { code: 'analyze_section_failed', section, detail: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }));

  const failed: SectionName[] = [];
  let merged: AiAnalysisResult = {};
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') merged = { ...merged, ...s.value };
    else failed.push(ANALYZE_SECTIONS[i]);
  });
  if (failed.length === ANALYZE_SECTIONS.length) {
    // Nothing usable: surface the first failure (a 503 llm_unavailable /
    // 502 bad_ai_output) so the handler refunds the action.
    const first = settled.find((s): s is PromiseRejectedResult => s.status === 'rejected');
    throw first?.reason ?? new HttpError(502, 'bad_ai_output');
  }
  return failed.length ? { ...merged, partial: true, failed } : merged;
}

async function run(ctx: AiContext<SuggestRequest>): Promise<unknown> {
  const { body } = ctx;
  ctx.setLogFunction(`ai-suggest:${body.kind}`);
  switch (body.kind) {
    case 'bullets':
    case 'summary':
    case 'skills': {
      const parsed = await json<unknown>(ctx, GENERATORS[body.kind](body.payload), STRING_ARRAY);
      return validateStringArray(parsed).map(sanitizeText).filter(Boolean);
    }
    case 'suggestion':
      return sanitizeText(await text(ctx, buildSuggestionPrompt(body.payload)));
    case 'fieldTip':
      return sanitizeText(await text(ctx, buildFieldTipPrompt(body.payload))).replace(/^["']|["']$/g, '').trim();
    case 'section': {
      const { section, resumeData, jobDescription } = body.payload;
      const spec = sectionSpec(section, resumeData, jobDescription);
      return sanitizeDeep(validateSectionResult(section, await json(ctx, spec.prompt, spec.schema)));
    }
    case 'analyze':
      return sanitizeDeep(await analyze(ctx, body.payload.resumeData, body.payload.jobDescription));
    case 'ats-compliance':
      return sanitizeDeep(validateAtsCompliance(await json(ctx, buildAtsCompliancePrompt(body.payload.resumeData), ATS_SCHEMA)));
  }
}

Deno.serve(withAiHandler('ai-suggest', {
  schema: RequestSchema,
  meter: 'aiActions',
  rateLimit: { perHour: 60, perMinute: 20 },
  model: ROUTED_MODEL_LABEL,
  promptVersion: PROMPT_VERSION,
}, async (ctx) => ({ kind: ctx.body.kind, result: await run(ctx) })));
