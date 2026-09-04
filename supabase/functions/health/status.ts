/**
 * Pure assembly of the health report, kept apart from the handler so the
 * status logic is testable without a database or Deno.serve.
 */

export interface HealthInputs {
  dbOk: boolean;
  /** Providers the router would actually route to (have at least one key). */
  llmConfigured: number;
  version: string;
  now?: Date;
}

export interface HealthReport {
  ok: boolean;
  version: string;
  db: 'ok' | 'fail';
  llm: number;
  ts: string;
}

/**
 * `ok` follows the database only. Zero configured LLM providers is a real
 * problem but not an outage — the site, auth and export all still work — so it
 * is reported as a number for the dashboard rather than flipping the probe.
 */
export function buildHealthReport(inputs: HealthInputs): { status: number; body: HealthReport } {
  const ok = inputs.dbOk;
  return {
    status: ok ? 200 : 503,
    body: {
      ok,
      version: inputs.version,
      db: inputs.dbOk ? 'ok' : 'fail',
      llm: Math.max(0, Math.floor(inputs.llmConfigured)),
      ts: (inputs.now ?? new Date()).toISOString(),
    },
  };
}

/** Count distinct providers that hold at least one key. */
export function countConfiguredProviders(
  providers: ReadonlyArray<{ id: string; apiKeys: readonly string[] }>,
): number {
  const ids = new Set<string>();
  for (const p of providers) {
    if (p.apiKeys.some((k) => k.trim() !== '')) ids.add(p.id);
  }
  return ids.size;
}
