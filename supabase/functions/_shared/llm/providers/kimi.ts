import type { ProviderCall } from '../types.ts';
import { callOpenAiCompatible } from './openAiCompatible.ts';

/** baseUrl comes from config.ts (KIMI_BASE_URL, defaulting to the official
 *  Moonshot platform) — overridable for an aggregator-hosted Kimi K2.6. */
export function kimiCall(baseUrl: string): ProviderCall {
  return (opts) => callOpenAiCompatible('kimi', baseUrl, opts);
}
