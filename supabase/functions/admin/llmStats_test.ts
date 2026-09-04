import { assertEquals } from 'jsr:@std/assert';
import { aggregateLlmCalls, type LlmCallRow } from './llmStats.ts';

const row = (over: Partial<LlmCallRow>): LlmCallRow => ({
  provider: 'deepseek',
  model: 'deepseek-chat',
  status: 'ok',
  latency_ms: 100,
  tokens: 10,
  used_fallback: false,
  ...over,
});

Deno.test('aggregateLlmCalls returns nothing for no rows', () => {
  assertEquals(aggregateLlmCalls([]), []);
});

Deno.test('aggregateLlmCalls rolls up counts, tokens, error rate and fallbacks per provider', () => {
  const stats = aggregateLlmCalls([
    row({ latency_ms: 100, tokens: 10 }),
    row({ latency_ms: 300, tokens: 20, status: 'error' }),
    row({ latency_ms: 200, tokens: 30, used_fallback: true }),
    row({ provider: 'kimi', model: 'kimi-k2', latency_ms: 50, tokens: 5 }),
  ]);

  assertEquals(stats.length, 2);
  const [deepseek, kimi] = stats;
  assertEquals(deepseek.provider, 'deepseek');
  assertEquals(deepseek.calls, 3);
  assertEquals(deepseek.ok, 2);
  assertEquals(deepseek.errors, 1);
  assertEquals(deepseek.error_rate_pct, 33.3);
  assertEquals(deepseek.fallback, 1);
  assertEquals(deepseek.tokens, 60);
  assertEquals(deepseek.avg_latency_ms, 200);
  assertEquals(deepseek.max_latency_ms, 300);
  assertEquals(deepseek.models, ['deepseek-chat']);

  assertEquals(kimi.provider, 'kimi');
  assertEquals(kimi.calls, 1);
  assertEquals(kimi.error_rate_pct, 0);
  assertEquals(kimi.avg_latency_ms, 50);
});

Deno.test('aggregateLlmCalls computes p95 from the sorted latencies', () => {
  const rows = Array.from({ length: 100 }, (_, i) => row({ latency_ms: i + 1 }));
  const [stats] = aggregateLlmCalls(rows);
  assertEquals(stats.p95_latency_ms, 95);
  assertEquals(stats.max_latency_ms, 100);
  assertEquals(stats.avg_latency_ms, 51);
});

Deno.test('aggregateLlmCalls orders busiest provider first, ties by name', () => {
  const stats = aggregateLlmCalls([
    row({ provider: 'zeta' }),
    row({ provider: 'alpha' }),
    row({ provider: 'kimi' }),
    row({ provider: 'kimi' }),
  ]);
  assertEquals(stats.map((s) => s.provider), ['kimi', 'alpha', 'zeta']);
});

Deno.test('aggregateLlmCalls tolerates missing or malformed fields', () => {
  const [stats] = aggregateLlmCalls([
    row({ provider: '', model: null, latency_ms: null, tokens: null }),
    row({ provider: '', model: '  ', latency_ms: -5, tokens: undefined }),
    row({ provider: '', model: 'm', latency_ms: 40, tokens: 7, status: 'weird' }),
  ]);
  assertEquals(stats.provider, 'unknown');
  assertEquals(stats.calls, 3);
  // Anything that is not `ok` counts as an error.
  assertEquals(stats.errors, 1);
  assertEquals(stats.tokens, 7);
  // Null and negative latencies are ignored, not averaged in as zero.
  assertEquals(stats.avg_latency_ms, 40);
  assertEquals(stats.p95_latency_ms, 40);
  assertEquals(stats.models, ['m']);
});

Deno.test('aggregateLlmCalls lists models most-used first', () => {
  const [stats] = aggregateLlmCalls([
    row({ model: 'lite' }),
    row({ model: 'full' }),
    row({ model: 'full' }),
  ]);
  assertEquals(stats.models, ['full', 'lite']);
});
