/** Strip dangerous control characters (keeps tab/newline/CR) and trim. AI text
 *  fields enter the resume model as plain text; they are never rendered as raw
 *  HTML (W5 adds DOMPurify at the render sinks). */
export function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return '';
  // deno-lint-ignore no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/** Recursively sanitizeText every string in an object/array (AI result scrub). */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') return sanitizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map(sanitizeDeep) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitizeDeep(v);
    return out as T;
  }
  return value;
}

/** Defense-in-depth scrub of obviously-dangerous HTML constructs in AI output. */
export function sanitizeHtml(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}
