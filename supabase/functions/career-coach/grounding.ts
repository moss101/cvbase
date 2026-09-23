import { sanitizeText } from '../_shared/sanitize.ts';
import type { ContextBundle } from '../career-gateway/context.ts';
import { getTool } from '../career-gateway/tools.ts';

// =========================================================================
// Deterministic grounding of a Coach answer. The model's JSON is treated as
// a draft: citations must name items in the bundle, proposals must name a
// proposable registered tool with an input that passes that tool's zod
// schema, and numeric claims that do not appear anywhere in the context get
// a visible caveat. Nothing here calls a model; it is the same guard the
// tests exercise with scripted output.
// =========================================================================

export interface RawCoachReply {
  reply?: unknown;
  citations?: unknown;
  proposals?: unknown;
  abstained?: unknown;
  abstainReason?: unknown;
}

export interface GroundedCitation {
  kind: string;
  id: string;
  label: string;
}

export interface GroundedProposal {
  tool: string;
  input: Record<string, unknown>;
  confirmationRequired: boolean;
  summary: string;
}

export interface GroundedReply {
  reply: string;
  citations: GroundedCitation[];
  proposals: GroundedProposal[];
  abstained: boolean;
  abstainReason: string | null;
  /** Counts of what was dropped, for logs (no text). */
  dropped: { citations: number; proposals: number };
  caveat: boolean;
}

export const NUMERIC_CAVEAT = ' (Note: figures in this reply are not from your records; treat them as unverified.)';

const MAX_REPLY_CHARS = 4000;
const MAX_PROPOSALS = 5;

/** Percentages and currency amounts in free text: "40%", "$95,000", "€80k",
 *  "120,000 USD". Plain counts ("3 roles") are not claims worth caveating. */
export function numericClaims(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?%/g)) out.push(`${normalizeNumber(m[1])}%`);
  for (const m of text.matchAll(/[$€£]\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m)?\b/gi)) out.push(normalizeNumber(m[1], m[2]));
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(k|m)?\s?(?:usd|eur|gbp|chf|dollars|euros|pounds)\b/gi)) out.push(normalizeNumber(m[1], m[2]));
  return out;
}

function normalizeNumber(raw: string, suffix?: string): string {
  const base = parseFloat(raw.replace(/,/g, ''));
  if (!Number.isFinite(base)) return raw;
  const mult = suffix?.toLowerCase() === 'k' ? 1e3 : suffix?.toLowerCase() === 'm' ? 1e6 : 1;
  return String(base * mult);
}

function contextNumbers(bundle: ContextBundle): Set<string> {
  const corpus = JSON.stringify(bundle.items.map((i) => i.data)) + '\n' + bundle.untrusted.opportunityContent;
  const set = new Set<string>();
  for (const m of corpus.matchAll(/(\d[\d,]*(?:\.\d+)?)\s?(%|k|m)?/gi)) {
    const n = normalizeNumber(m[1], m[2] && m[2] !== '%' ? m[2] : undefined);
    set.add(n);
    if (m[2] === '%') set.add(`${n}%`);
    set.add(normalizeNumber(m[1]));
  }
  return set;
}

export function groundReply(raw: RawCoachReply, bundle: ContextBundle): GroundedReply {
  const known = new Map(bundle.items.map((i) => [i.cid, i]));
  const dropped = { citations: 0, proposals: 0 };

  const citations: GroundedCitation[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(raw.citations) ? raw.citations : []) {
    const kind = typeof (c as { kind?: unknown })?.kind === 'string' ? (c as { kind: string }).kind : '';
    const id = typeof (c as { id?: unknown })?.id === 'string' ? (c as { id: string }).id : '';
    const cid = `${kind}:${id}`;
    const item = known.get(cid);
    if (!item || seen.has(cid)) { dropped.citations++; continue; }
    seen.add(cid);
    citations.push({ kind: item.kind, id: item.id, label: item.label });
  }

  const proposals: GroundedProposal[] = [];
  for (const p of Array.isArray(raw.proposals) ? raw.proposals : []) {
    if (proposals.length >= MAX_PROPOSALS) { dropped.proposals++; continue; }
    const name = typeof (p as { tool?: unknown })?.tool === 'string' ? (p as { tool: string }).tool : '';
    const tool = getTool(name);
    if (!tool || !tool.proposable) { dropped.proposals++; continue; }
    let input: unknown = (p as { input?: unknown }).input;
    const inputJson = (p as { inputJson?: unknown }).inputJson;
    if (input === undefined && typeof inputJson === 'string') {
      try { input = JSON.parse(inputJson); } catch { dropped.proposals++; continue; }
    }
    const parsed = tool.input.safeParse(input ?? {});
    if (!parsed.success) { dropped.proposals++; continue; }
    proposals.push({
      tool: tool.name,
      input: parsed.data as Record<string, unknown>,
      // Conditional policies (save_artifact) are resolved by the gateway at
      // execution time; the client treats them as "may ask".
      confirmationRequired: tool.confirmation !== 'none',
      summary: sanitizeText((p as { summary?: unknown }).summary).slice(0, 300),
    });
  }

  let reply = sanitizeText(raw.reply).slice(0, MAX_REPLY_CHARS);
  let caveat = false;
  if (reply) {
    const claims = numericClaims(reply);
    if (claims.length) {
      const allowed = contextNumbers(bundle);
      if (claims.some((c) => !allowed.has(c))) {
        caveat = true;
        reply += NUMERIC_CAVEAT;
      }
    }
  }
  const abstained = raw.abstained === true || !reply;
  const abstainReason = abstained ? (sanitizeText(raw.abstainReason).slice(0, 300) || (reply ? null : 'empty_reply')) : null;
  return { reply, citations, proposals, abstained, abstainReason, dropped, caveat };
}
