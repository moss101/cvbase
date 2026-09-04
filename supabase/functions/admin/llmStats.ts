/**
 * Per-provider roll-up of `llm_call_logs` rows. Pure: the route fetches the
 * window and hands the rows here, so the arithmetic is unit-testable and the
 * same function can be pointed at any slice of the table.
 */

export interface LlmCallRow {
  provider: string;
  model?: string | null;
  status: 'ok' | 'error' | string;
  latency_ms: number | null;
  tokens?: number | null;
  used_fallback?: boolean | null;
  fallback_reason?: string | null;
  key_slot?: number | null;
  created_at?: string;
}

export interface LlmProviderStats {
  provider: string;
  calls: number;
  ok: number;
  errors: number;
  /** errors / calls, rounded to one decimal, as a percentage. */
  error_rate_pct: number;
  fallback: number;
  tokens: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  max_latency_ms: number;
  /** Distinct models seen, most frequent first. */
  models: string[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function aggregateLlmCalls(rows: readonly LlmCallRow[]): LlmProviderStats[] {
  const byProvider = new Map<
    string,
    { latencies: number[]; ok: number; errors: number; fallback: number; tokens: number; models: Map<string, number> }
  >();

  for (const row of rows) {
    const provider = row.provider || 'unknown';
    let bucket = byProvider.get(provider);
    if (!bucket) {
      bucket = { latencies: [], ok: 0, errors: 0, fallback: 0, tokens: 0, models: new Map() };
      byProvider.set(provider, bucket);
    }
    if (row.status === 'ok') bucket.ok += 1;
    else bucket.errors += 1;
    if (row.used_fallback) bucket.fallback += 1;
    bucket.tokens += Number(row.tokens) || 0;
    // `Number(null)` is 0, which would drag the average down; only a real
    // non-negative measurement counts.
    const latency = row.latency_ms == null ? NaN : Number(row.latency_ms);
    if (Number.isFinite(latency) && latency >= 0) bucket.latencies.push(latency);
    const model = (row.model ?? '').trim();
    if (model) bucket.models.set(model, (bucket.models.get(model) ?? 0) + 1);
  }

  const stats: LlmProviderStats[] = [];
  for (const [provider, b] of byProvider) {
    const calls = b.ok + b.errors;
    const sorted = [...b.latencies].sort((x, y) => x - y);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    stats.push({
      provider,
      calls,
      ok: b.ok,
      errors: b.errors,
      error_rate_pct: calls === 0 ? 0 : Math.round((b.errors / calls) * 1000) / 10,
      fallback: b.fallback,
      tokens: b.tokens,
      avg_latency_ms: sorted.length === 0 ? 0 : Math.round(sum / sorted.length),
      p95_latency_ms: percentile(sorted, 95),
      max_latency_ms: sorted.length === 0 ? 0 : sorted[sorted.length - 1],
      models: [...b.models.entries()].sort((x, y) => y[1] - x[1]).map(([m]) => m),
    });
  }

  // Busiest provider first; ties by name so the output is stable.
  return stats.sort((x, y) => y.calls - x.calls || x.provider.localeCompare(y.provider));
}
