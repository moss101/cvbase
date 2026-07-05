// =========================================================================
// Deterministic anti-echo scrub. The prompts already tell every agent not to
// quote instruction-shaped text from the JD/CV (INJECTION_RULE), but that is
// model behavior and therefore stochastic — the same attack document
// sometimes gets echoed and sometimes not. This layer makes the guarantee
// deterministic:
//
//   1. Split each source document into sentences and classify the
//      instruction-shaped ones (imperatives addressed at the assistant,
//      system-probe phrasing) with a fixed pattern list.
//   2. Collect word bigrams that occur in instruction-shaped sentences and
//      NOWHERE else in the document — the attack-specific vocabulary.
//      Bigrams shared with legitimate sentences survive, so ordinary resume
//      language is never scrubbed just for sitting next to an attack.
//   3. Replace those bigrams (case/whitespace-insensitive) with [removed] in
//      every string field of a pipeline output object.
//
// Fail-safe direction: a false positive redacts a two-word phrase that only
// ever appeared inside an instruction-shaped sentence — mild degradation,
// never fabrication.
// =========================================================================

const INSTRUCTION_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(prior|previous|above|earlier)\b/i,
  /\byou\s+are\s+now\b/i,
  /\bsystem\s*(instruction|prompt|directive)\b/i,
  /\bevaluation\s+mode\b/i,
  /\b(report|state|say|declare)\s+that\s+this\b/i,
  /\bset\s+(every|all)\s+scores?\b/i,
  /\bdo\s+not\s+ask\b/i,
  /\bappend\s+["'“”]/i,
  /\bprint\s+(the\s+)?(full\s+)?system\b/i,
  /\bapi\s+keys?\b/i,
  /\breveal\b.*\b(data|prompt|key|user)/i,
  /\bother\s+users?\b/i,
  /\bmark\s+(all|every)\b.*\bexpert\b/i,
  /\bperfect\s+match\b/i,
  /\btask\s+for\s+the\s+(assistant|model|ai)\b/i,
];

const isInstructionShaped = (sentence: string): boolean =>
  INSTRUCTION_PATTERNS.some((p) => p.test(sentence));

const sentencesOf = (text: string): string[] =>
  text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

/** Light plural canonicalization so "API keys" (document) still matches an
 *  echoed "API key" (output) — singular/plural is the one word-form drift
 *  observed in practice; anything fancier risks over-matching. */
const canonToken = (w: string): string =>
  w.length >= 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;

const wordsOf = (text: string): string[] =>
  (text.toLowerCase().match(/[a-z0-9][a-z0-9'/-]*/g) ?? []).map(canonToken);

function bigramsOf(text: string): Set<string> {
  const words = wordsOf(text);
  const out = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) out.add(`${words[i]} ${words[i + 1]}`);
  return out;
}

/** Bigrams unique to instruction-shaped sentences across the given sources. */
export function suspiciousBigrams(sources: string[]): Set<string> {
  const suspicious = new Set<string>();
  const legit = new Set<string>();
  for (const source of sources) {
    for (const sentence of sentencesOf(source)) {
      const target = isInstructionShaped(sentence) ? suspicious : legit;
      for (const bg of bigramsOf(sentence)) target.add(bg);
    }
  }
  for (const bg of legit) suspicious.delete(bg);
  return suspicious;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function scrubString(value: string, bigrams: Set<string>): string {
  let out = value;
  for (const bg of bigrams) {
    const [w1, w2] = bg.split(' ');
    // Words in the set are canonicalized (singular) — allow the plural form
    // in the output text so either drift direction is caught.
    out = out.replace(new RegExp(`${escapeRe(w1)}(?:e?s)?\\s+${escapeRe(w2)}(?:e?s)?`, 'gi'), '[removed]');
  }
  // Collapse runs produced by adjacent scrubbed bigrams.
  return out.replace(/(\[removed\]\s*)+/g, '[removed] ').trim();
}

/** Recursively scrub every string field of a pipeline output value. */
export function scrubEcho<T>(value: T, bigrams: Set<string>): T {
  if (bigrams.size === 0) return value;
  if (typeof value === 'string') return scrubString(value, bigrams) as T;
  if (Array.isArray(value)) return value.map((v) => scrubEcho(v, bigrams)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubEcho(v, bigrams);
    return out as T;
  }
  return value;
}
