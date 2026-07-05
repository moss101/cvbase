// =========================================================================
// Deterministic (no LLM) total-years-of-experience computation from
// AggregatedContext.workHistory date ranges. Exists because the writer has
// no other ground truth for this extremely common resume-summary claim —
// without it, the model must estimate/derive a number itself on every call,
// which is exactly the kind of arithmetic-under-instruction task an LLM can
// drift on (observed live: a writer stated the JD's "5+ years" requirement
// instead of the CV's actual tenure). The computed value is merged into
// AggregatedContext (see graph.ts's aggregator node) so it's both handed to
// the writer as authoritative AND traceable by the deterministic grounding
// checker (grounding.ts), which only recognizes numbers present in context.
//
// Approximation, by design: source dates are freeform strings at year-level
// granularity (no guarantee of month/day precision), so this returns whole
// years. Overlapping/concurrent roles are merged rather than summed, so a
// candidate with two simultaneous jobs isn't credited double the calendar
// time.
// =========================================================================

const PRESENT_WORDS = /\b(present|current|now|ongoing)\b/i;

/** Extracts a plausible year from a freeform date string. "Present"/"Current"/
 *  "Now"/"Ongoing" resolve to this year; otherwise the first 19xx/20xx
 *  sequence found. Returns null when nothing plausible is present. */
function parseYear(dateStr: string): number | null {
  if (PRESENT_WORDS.test(dateStr)) return new Date().getFullYear();
  const match = dateStr.match(/(19|20)\d{2}/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function computeTotalYearsExperience(
  workHistory: { startDate: string; endDate: string }[],
): number {
  const intervals = workHistory
    .map((w) => ({ start: parseYear(w.startDate), end: parseYear(w.endDate) }))
    .filter((iv): iv is { start: number; end: number } => iv.start !== null && iv.end !== null)
    .map((iv) => ({ start: Math.min(iv.start, iv.end), end: Math.max(iv.start, iv.end) }))
    .sort((a, b) => a.start - b.start);

  if (intervals.length === 0) return 0;

  let totalYears = 0;
  let curStart = intervals[0].start;
  let curEnd = intervals[0].end;
  for (let i = 1; i < intervals.length; i++) {
    const iv = intervals[i];
    if (iv.start <= curEnd) {
      curEnd = Math.max(curEnd, iv.end);
    } else {
      totalYears += curEnd - curStart;
      curStart = iv.start;
      curEnd = iv.end;
    }
  }
  totalYears += curEnd - curStart;
  return totalYears;
}
