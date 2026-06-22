import { HttpError } from './respond.ts';

type Kind = 'string' | 'number' | 'boolean' | 'array' | 'object';

/**
 * Minimal structural check on AI output: every required key must be present with
 * the right primitive/array/object type. Throws 502 `bad_ai_output` on mismatch
 * so callers fail loud instead of returning malformed data to the client.
 */
export function validateShape<T>(value: unknown, required: Record<string, Kind>): T {
  if (!value || typeof value !== 'object') throw new HttpError(502, 'bad_ai_output');
  const v = value as Record<string, unknown>;
  for (const [key, kind] of Object.entries(required)) {
    const actual = v[key];
    const okType =
      kind === 'array' ? Array.isArray(actual)
        : kind === 'object' ? actual !== null && typeof actual === 'object' && !Array.isArray(actual)
          : typeof actual === kind;
    if (!okType) throw new HttpError(502, 'bad_ai_output', { field: key });
  }
  return value as T;
}
