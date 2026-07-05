import { llmJsonMetered } from '../_shared/llm.ts';
import type { ModelFn } from './model.ts';

/** Production ModelFn: routes through the provider-agnostic _shared/llm.ts
 *  (DeepSeek V4 Pro primary, Kimi K2.6 fallback) with token accounting and a
 *  hard per-call timeout. Only index.ts imports this file so tests never
 *  hit the network — they inject a scripted ModelFn instead. */
export const routedModel: ModelFn = async (prompt, schema, opts) => {
  const { data, tokens, provider, keySlot, usedFallback, fallbackReason } = await llmJsonMetered(prompt, {
    schema,
    system: opts?.system,
    model: opts?.model,
  });
  return { value: data, tokens, provider, keySlot, usedFallback, fallbackReason };
};
