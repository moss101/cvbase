import type { AggregatedContext, ResumeDraft } from './schemas.ts';

// =========================================================================
// Deterministic hallucination check: every checkable factual claim in a
// writer draft must be traceable to the aggregated context (the pipeline's
// single source of truth). Runs BOTH as a runtime guard inside the critic
// stage and as the automated check over the golden set — a prompt change
// that loosens the writer's grounding fails here, not in a manual review.
//
// Checked claim classes (high signal, low false-positive):
//   numbers   — every numeric quantity in summary/bullets must exist in the
//               context (value-compared, so "2k" matches "2,000")
//   companies — experience entries must match context workHistory companies
//   titles    — experience titles must match the context title for that company
//   skills    — every listed skill's significant words must trace to the
//               context, tolerating simple word-form variation (analyses vs
//               analysis, modeling vs model — see canonicalizeToken below)
//   certs     — certifications must appear in the context, exact match (a
//               fuzzy-matched credential name is a bigger risk than a
//               paraphrased skill label, so this stays strict)
//   languages — languages must appear in the context
// Prose adjectives are deliberately not checked (unverifiable), which is why
// the LLM critic's unsupported_claim review still runs alongside this.
// =========================================================================

export interface GroundingViolation {
  kind: 'number' | 'company' | 'title' | 'skill' | 'certification' | 'language';
  claim: string;
  where: string;
  /** A specific correction when one can be derived from context (currently:
   *  years-of-experience claims, checked against the deterministic
   *  totalYearsExperience computed in graph.ts's aggregator node) — the
   *  repair re-prompt uses this instead of the generic "use only real facts"
   *  instruction when present, since telling the writer the exact right
   *  number converges much faster than telling it only that it was wrong. */
  suggestedFix?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// =========================================================================
// Skill-claim canonicalization. Exact substring matching (used for numbers,
// companies, titles, certifications, languages above) is too strict for
// skills: a writer legitimately paraphrasing "cohort analyses in pandas"
// into the skill "Cohort analysis" is restating a real fact, not inventing
// one. This is NOT a general-purpose stemmer (which can silently mangle
// unrelated words) — it's a short, explicit list of word-form variations
// common in resume/skill vocabulary. Each rule is independently named and
// testable; anything it doesn't recognize passes through unchanged, so an
// actually-unevidenced concept ("Experiment design" when the CV never
// mentions experiments or design) still has no match and is still flagged.
// =========================================================================

const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'and', 'in', 'for', 'with', 'to', 'on', 'or']);

/** Below this length we don't canonicalize at all — short words are more
 *  likely to collide into false matches than to need normalizing. */
const MIN_CANONICALIZE_LENGTH = 5;

function stripOneSuffix(word: string): string {
  if (word.length < MIN_CANONICALIZE_LENGTH) return word;
  // Irregular Latin/Greek plural: analysis/analyses, thesis/theses, crisis/crises.
  if (word.endsWith('is')) return word.slice(0, -2);
  if (word.endsWith('es') && !word.endsWith('ies')) return word.slice(0, -2);
  // "-ies" plural: companies -> company.
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  // Gerund/noun-from-verb: modeling -> model, engineering -> engineer.
  if (word.endsWith('ing')) return word.slice(0, -3);
  // Noun-from-verb "-ment": alignment -> align, deployment -> deploy.
  if (word.endsWith('ment')) return word.slice(0, -4);
  // Abstract-noun suffix: automation -> automat (collapses with "automate"-derived forms).
  if (word.endsWith('ions')) return word.slice(0, -4);
  if (word.endsWith('ion')) return word.slice(0, -3);
  // Regular plural / past tense.
  if (word.endsWith('ed')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Strips suffixes to a fixpoint so stacked forms compose: "alignments" →
 *  "alignment" → "align" lands on the same root "aligned" does. Both sides
 *  of a comparison run the same deterministic function, so aggressive
 *  stripping stays symmetric and can't create one-sided mismatches. */
function canonicalizeToken(word: string): string {
  let cur = word;
  for (;;) {
    const next = stripOneSuffix(cur);
    if (next === cur) return cur;
    cur = next;
  }
}

function tokenSet(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(words.map(canonicalizeToken));
}

/** A skill is evidenced when every one of its significant words (stopwords
 *  excluded) canonicalizes to something present in the context corpus —
 *  not a whole-phrase match, so word order/connectors don't matter, but
 *  every real concept in the claim still has to trace to a real fact.
 *  Parenthetical qualifiers ("Playwright (exploring)") are meta-commentary,
 *  not skill concepts, so they're stripped before matching — the writer
 *  prompt forbids them outright, this just keeps a stray one from failing an
 *  otherwise-evidenced skill. */
function skillEvidenced(skill: string, corpusTokens: Set<string>): boolean {
  const bare = skill.replace(/\([^)]*\)/g, ' ');
  const words = (bare.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOPWORDS.has(w));
  if (words.length === 0) return false;
  return words.every((w) => corpusTokens.has(canonicalizeToken(w)));
}

/** Extract numeric values from text: "40,000" → 40000, "2k" → 2000, "95%" →
 *  95, "1.5m" → 1500000. Bare 4-digit years count too (dates are facts).
 *  Two terminator branches instead of a bare \b: a k/m/b multiplier only
 *  counts when it ends the word ("2k msgs", never the "m" of "messages"),
 *  while a plain number just can't split digits — so a unit glued to the
 *  number ("200GB/day") still yields 200, or a source fact written without a
 *  space would fail to license the same figure written with one ("200 GB"). */
function numbersIn(text: string): number[] {
  const out: number[] = [];
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(?:(k|m|b)(?![a-z\d])|(?!\d))/gi;
  for (const m of text.matchAll(re)) {
    const base = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(base)) continue;
    const mult = m[2]?.toLowerCase() === 'k' ? 1e3 : m[2]?.toLowerCase() === 'm' ? 1e6 : m[2]?.toLowerCase() === 'b' ? 1e9 : 1;
    out.push(base * mult);
    if (mult !== 1) out.push(base); // "2k msgs" may be sourced as plain "2k"
  }
  return out;
}

function contextCorpus(context: AggregatedContext): string {
  return norm(JSON.stringify(context));
}

function contextNumbers(context: AggregatedContext): Set<number> {
  return new Set(numbersIn(JSON.stringify(context)));
}

export function checkGrounding(
  draft: ResumeDraft,
  context: AggregatedContext,
): { ok: boolean; violations: GroundingViolation[] } {
  const violations: GroundingViolation[] = [];
  const corpus = contextCorpus(context);
  const known = contextNumbers(context);
  const inCorpus = (s: string) => corpus.includes(norm(s));
  const corpusTokens = tokenSet(corpus);

  // Matches only when THIS number sits next to a years word ("7+ years",
  // "7 years of") — testing the whole line would mis-attach the years
  // suggestion to unrelated figures sharing a sentence with one.
  const isYearsClaim = (text: string, n: number) =>
    new RegExp(`\\b${n}\\s*\\+?\\s*years?\\b`, 'i').test(text.replace(/,/g, ''));
  const checkNumbers = (text: string, where: string) => {
    for (const n of numbersIn(text)) {
      if (!known.has(n)) {
        const suggestedFix = isYearsClaim(text, n)
          ? `This should state ${context.totalYearsExperience} total years of experience ` +
            `(CONTEXT.totalYearsExperience), not ${n} — use that exact figure, or omit the ` +
            'figure if years of experience isn\'t relevant to this line.'
          : undefined;
        violations.push({
          kind: 'number', claim: String(n), where: `${where}: "${text.slice(0, 80)}"`, suggestedFix,
        });
      }
    }
  };

  checkNumbers(draft.professionalSummary, 'summary');
  for (const exp of draft.experience) {
    const home = context.workHistory.find((w) => norm(w.company) === norm(exp.company));
    if (!home) {
      violations.push({ kind: 'company', claim: exp.company, where: 'experience' });
    } else if (norm(home.title) !== norm(exp.jobTitle)) {
      violations.push({ kind: 'title', claim: exp.jobTitle, where: `experience @ ${exp.company}` });
    }
    for (const bullet of exp.bullets) checkNumbers(bullet, `bullet @ ${exp.company}`);
  }
  for (const skill of draft.skills) {
    if (!skillEvidenced(skill, corpusTokens)) {
      violations.push({
        kind: 'skill', claim: skill, where: 'skills',
        suggestedFix: `"${skill}" isn't evidenced anywhere in CONTEXT — remove it, or replace it with a ` +
          'skill directly evidenced by a CONTEXT.workHistory fact or CONTEXT.skills entry.',
      });
    }
  }
  for (const cert of draft.certifications) {
    if (!inCorpus(cert)) violations.push({ kind: 'certification', claim: cert, where: 'certifications' });
  }
  for (const lang of draft.languages) {
    // "German (Native)" ↔ "German - Native": compare the language word only.
    const word = lang.split(/[(\-–:]/)[0];
    if (!inCorpus(word)) violations.push({ kind: 'language', claim: lang, where: 'languages' });
  }
  return { ok: violations.length === 0, violations };
}
