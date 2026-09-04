/**
 * Lenient JSON parsing for model output.
 *
 * Forced tool-calling gives us a JSON *string* from the provider, and in
 * practice that string is occasionally not quite JSON: wrapped in a ```json
 * fence, prefixed with a sentence, or carrying a trailing comma. Those are
 * mechanical faults, not semantic ones, so one repair pass is worth doing
 * before declaring the output unusable. Anything past that is a
 * SchemaViolationError in the caller — never a reason to call another
 * provider, because a second call would only re-roll the dice at full cost.
 */

/** Strips a leading/trailing markdown code fence (``` or ```json). */
function stripFences(s: string): string {
  const m = /^\s*```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?\s*```\s*$/.exec(s);
  return m ? m[1] : s;
}

/** Keeps the substring from the first `{`/`[` to the matching last `}`/`]`,
 *  dropping any prose the model put around the value. */
function extractJsonSpan(s: string): string {
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  let start: number;
  if (firstObj === -1 && firstArr === -1) return s;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  const close = s[start] === '{' ? '}' : ']';
  const end = s.lastIndexOf(close);
  return end > start ? s.slice(start, end + 1) : s;
}

/** Removes commas directly before a closing bracket/brace (outside strings). */
function stripTrailingCommas(s: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ',') {
      // Look past whitespace for a closer.
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      if (s[j] === '}' || s[j] === ']') continue; // drop the comma
    }
    out += ch;
  }
  return out;
}

/** The single repair pass: fences → outer prose → trailing commas. */
export function repairJsonText(raw: string): string {
  return stripTrailingCommas(extractJsonSpan(stripFences(raw))).trim();
}

export class JsonRepairError extends Error {
  constructor(message: string, public raw: string) {
    super(message);
    this.name = 'JsonRepairError';
  }
}

/**
 * `JSON.parse` with exactly one repair attempt. Returns the parsed value or
 * throws JsonRepairError (the caller wraps it in SchemaViolationError with
 * provider context). A `null`/empty input is treated as `{}` only when
 * `emptyAsObject` is set — the router does this for tool arguments, since an
 * omitted argument string means "no fields", not "no result".
 */
export function parseJsonLenient(raw: string | undefined | null, opts: { emptyAsObject?: boolean } = {}): unknown {
  const text = (raw ?? '').trim();
  if (!text) {
    if (opts.emptyAsObject) return {};
    throw new JsonRepairError('empty output where JSON was required', '');
  }
  try {
    return JSON.parse(text);
  } catch {
    // fall through to the one repair attempt
  }
  const repaired = repairJsonText(text);
  try {
    return JSON.parse(repaired);
  } catch (e) {
    throw new JsonRepairError(
      `output is not valid JSON even after repair: ${e instanceof Error ? e.message : String(e)}`,
      text,
    );
  }
}
