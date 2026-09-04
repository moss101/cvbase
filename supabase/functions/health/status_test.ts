import { assertEquals } from 'jsr:@std/assert';
import { buildHealthReport, countConfiguredProviders } from './status.ts';

const now = new Date('2026-09-02T10:00:00.000Z');

Deno.test('buildHealthReport is 200 when the database answers', () => {
  const { status, body } = buildHealthReport({ dbOk: true, llmConfigured: 2, version: '1.2.3', now });
  assertEquals(status, 200);
  assertEquals(body, { ok: true, version: '1.2.3', db: 'ok', llm: 2, ts: '2026-09-02T10:00:00.000Z' });
});

Deno.test('buildHealthReport is 503 when the database does not', () => {
  const { status, body } = buildHealthReport({ dbOk: false, llmConfigured: 2, version: 'v', now });
  assertEquals(status, 503);
  assertEquals(body.ok, false);
  assertEquals(body.db, 'fail');
});

Deno.test('buildHealthReport keeps ok when no LLM provider is configured', () => {
  const { status, body } = buildHealthReport({ dbOk: true, llmConfigured: 0, version: 'v', now });
  assertEquals(status, 200);
  assertEquals(body.llm, 0);
});

Deno.test('buildHealthReport carries exactly the documented fields', () => {
  const { body } = buildHealthReport({ dbOk: true, llmConfigured: -3.7, version: 'v', now });
  assertEquals(Object.keys(body).sort(), ['db', 'llm', 'ok', 'ts', 'version']);
  assertEquals(body.llm, 0);
});

Deno.test('countConfiguredProviders counts distinct providers holding a key', () => {
  assertEquals(countConfiguredProviders([]), 0);
  assertEquals(
    countConfiguredProviders([
      { id: 'deepseek', apiKeys: ['k1', 'k2'] },
      { id: 'kimi', apiKeys: [''] },
      { id: 'deepseek', apiKeys: ['k3'] },
      { id: 'openai', apiKeys: ['  '] },
    ]),
    1,
  );
  assertEquals(
    countConfiguredProviders([
      { id: 'deepseek', apiKeys: ['k'] },
      { id: 'kimi', apiKeys: ['k'] },
    ]),
    2,
  );
});
