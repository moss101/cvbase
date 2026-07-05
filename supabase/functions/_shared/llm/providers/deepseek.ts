import type { ProviderCall } from '../types.ts';
import { callOpenAiCompatible } from './openAiCompatible.ts';

/** baseUrl comes from config.ts (DEEPSEEK_BASE_URL, defaulting to the
 *  official DeepSeek platform) — overridable if your keys are actually from
 *  an aggregator (Together, Fireworks, DeepInfra, OpenRouter, ...) that
 *  fronts deepseek-v4-pro/-flash under a different host. */
export function deepseekCall(baseUrl: string): ProviderCall {
  return (opts) => callOpenAiCompatible('deepseek', baseUrl, opts);
}
