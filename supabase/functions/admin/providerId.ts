import type { ProviderId } from '../_shared/llm/types.ts';

/**
 * Runtime mirror of the `ProviderId` union.
 *
 * The union is a type and vanishes at runtime, so the write route needs a
 * value to check against. The two are pinned together in both directions:
 * `satisfies` rejects any entry that is not a `ProviderId`, and `Exhaustive`
 * fails to compile if a member of the union is missing from this list. Add a
 * provider to `types.ts` and `deno check` will point here.
 */
export const PROVIDER_IDS = [
  'deepseek',
  'kimi',
  'anthropic',
  'openai',
  'groq',
  'together',
  'openrouter',
  'mistral',
  'custom',
] as const satisfies readonly ProviderId[];

type Listed = (typeof PROVIDER_IDS)[number];
type Exhaustive = Exclude<ProviderId, Listed> extends never ? true : never;
const _exhaustive: Exhaustive = true;
void _exhaustive;

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value);
}
