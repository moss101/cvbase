import type { z } from 'npm:zod@3.24.1';
import { HttpError } from '../_shared/respond.ts';

/**
 * A structured-output model call: prompt + zod schema → parsed value plus
 * token count (for the per-run spend budget), plus provider-routing
 * provenance for telemetry. Production routes through DeepSeek/Kimi (see
 * model_router.ts); tests inject a scripted fn. Kept as an injected
 * dependency so graph.ts never touches a provider SDK/fetch directly. The
 * provenance fields are optional so a scripted test ModelFn returning just
 * {value, tokens} still satisfies the type.
 */
export type ModelFn = (
  prompt: string,
  schema: z.ZodTypeAny,
  opts?: { system?: string; model?: string },
) => Promise<{
  value: unknown;
  tokens: number;
  provider?: string;
  keySlot?: number;
  usedFallback?: boolean;
  fallbackReason?: string;
}>;

export interface AgentResult<T> {
  data: T;
  tokens: number;
  provider?: string;
  keySlot?: number;
  usedFallback?: boolean;
  fallbackReason?: string;
}

/**
 * Run one agent turn with the schema enforced twice: at generation time
 * (forced tool-call JSON Schema, derived from this same zod schema — see
 * _shared/llm/schemaAdapter.ts) and after (zod). Invalid output is never
 * passed through — one repair re-prompt with the validation errors, then a
 * loud 502 `bad_ai_output` (same convention as _shared/validate.ts).
 */
export async function runAgent<T>(
  model: ModelFn,
  agent: string,
  prompt: string,
  zodSchema: z.ZodType<T>,
  opts: { system?: string; model?: string } = {},
): Promise<AgentResult<T>> {
  const first = await model(prompt, zodSchema, opts);
  const parsed = zodSchema.safeParse(first.value);
  if (parsed.success) {
    return {
      data: parsed.data, tokens: first.tokens, provider: first.provider,
      keySlot: first.keySlot, usedFallback: first.usedFallback, fallbackReason: first.fallbackReason,
    };
  }

  const errors = parsed.error.issues
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  const repairPrompt =
    `${prompt}\n\nYour previous response failed schema validation: ${errors}. ` +
    `Return corrected JSON that strictly matches the required schema.`;
  const second = await model(repairPrompt, zodSchema, opts);
  const reparsed = zodSchema.safeParse(second.value);
  if (reparsed.success) {
    return {
      data: reparsed.data, tokens: first.tokens + second.tokens, provider: second.provider,
      keySlot: second.keySlot, usedFallback: second.usedFallback, fallbackReason: second.fallbackReason,
    };
  }

  throw new HttpError(502, 'bad_ai_output', { agent });
}
