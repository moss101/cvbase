import { assert, assertEquals, assertRejects } from 'jsr:@std/assert';
import { enforceRateLimit, type RateLimitClient } from './rateLimit.ts';
import { HttpError } from './respond.ts';

// In-memory stand-in for the `rate_limit_events` table that understands the
// exact supabase-js query chains rateLimit.ts issues.

interface Row { user_id: string; bucket: string; created_at: string }
interface Filter { op: 'eq' | 'gte' | 'lt'; key: keyof Row; value: string }

class FakeQuery {
  private op: 'select' | 'insert' | 'delete' = 'select';
  private head = false;
  private filters: Filter[] = [];
  private asc: boolean | null = null;
  private lim: number | null = null;
  private row: Row | null = null;

  constructor(private table: string, private store: { rows: Row[]; countError?: string; inserts: Row[] }) {}

  select(_cols: string, o?: { head?: boolean; count?: string }) { this.head = !!o?.head; return this; }
  eq(key: keyof Row, value: string) { this.filters.push({ op: 'eq', key, value }); return this; }
  gte(key: keyof Row, value: string) { this.filters.push({ op: 'gte', key, value }); return this; }
  lt(key: keyof Row, value: string) { this.filters.push({ op: 'lt', key, value }); return this; }
  order(_key: string, o: { ascending: boolean }) { this.asc = o.ascending; return this; }
  limit(n: number) { this.lim = n; return this; }
  insert(row: Row) { this.op = 'insert'; this.row = row; return this; }
  delete() { this.op = 'delete'; return this; }

  private matched(): Row[] {
    return this.store.rows.filter((r) =>
      this.filters.every((f) =>
        f.op === 'eq' ? r[f.key] === f.value : f.op === 'gte' ? r[f.key] >= f.value : r[f.key] < f.value
      )
    );
  }

  private exec(): unknown {
    assertEquals(this.table, 'rate_limit_events');
    if (this.op === 'insert') {
      this.store.rows.push(this.row!);
      this.store.inserts.push(this.row!);
      return { error: null };
    }
    if (this.op === 'delete') {
      const gone = new Set(this.matched());
      this.store.rows = this.store.rows.filter((r) => !gone.has(r));
      return { error: null };
    }
    if (this.store.countError) return { count: null, error: { message: this.store.countError } };
    let rows = this.matched();
    if (this.head) return { count: rows.length, error: null };
    if (this.asc !== null) rows = [...rows].sort((a, b) => (a.created_at < b.created_at ? -1 : 1) * (this.asc ? 1 : -1));
    if (this.lim !== null) rows = rows.slice(0, this.lim);
    return { data: rows, error: null };
  }

  then<R>(res: (v: unknown) => R, rej?: (e: unknown) => R): Promise<R> {
    return Promise.resolve().then(() => this.exec()).then(res, rej);
  }
}

function fakeClient(rows: Row[] = [], countError?: string) {
  const store = { rows, countError, inserts: [] as Row[] };
  const svc: RateLimitClient = { from: (table: string) => new FakeQuery(table, store) };
  return { svc, store };
}

const NOW = Date.parse('2026-09-02T12:00:00.000Z');
const at = (msAgo: number): string => new Date(NOW - msAgo).toISOString();
const ev = (msAgo: number, bucket = 'ai-suggest', user = 'u1'): Row => ({ user_id: user, bucket, created_at: at(msAgo) });
const MIN = 60_000;

Deno.test('under the limit: records the request and reports usage', async () => {
  const { svc, store } = fakeClient([ev(5 * MIN), ev(30 * MIN)]);
  const info = await enforceRateLimit(svc, 'u1', 'ai-suggest', { perHour: 60 }, NOW);
  assertEquals(info, { bucket: 'ai-suggest', perHour: 60, perMinute: undefined, usedThisHour: 3 });
  assertEquals(store.inserts, [{ user_id: 'u1', bucket: 'ai-suggest', created_at: at(0) }]);
});

Deno.test('at the hourly limit: 429 rate_limited with retryAfterSec from the oldest event in the window', async () => {
  const rows = [ev(50 * MIN), ev(20 * MIN), ev(2 * MIN)];
  const { svc, store } = fakeClient(rows);
  const err = await assertRejects(
    () => enforceRateLimit(svc, 'u1', 'ai-suggest', { perHour: 3 }, NOW),
    HttpError,
    'rate_limited',
  ) as HttpError;
  assertEquals(err.status, 429);
  assertEquals(err.extra?.limit, 3);
  assertEquals(err.extra?.window, '1h');
  assertEquals(err.extra?.bucket, 'ai-suggest');
  assertEquals(err.extra?.retryAfterSec, 10 * 60); // oldest was 50 min ago → free in 10 min
  assertEquals(store.inserts, []); // rejected requests are not recorded
});

Deno.test('events outside the trailing hour, other buckets and other users do not count', async () => {
  const { svc } = fakeClient([
    ev(61 * MIN), ev(120 * MIN), // too old
    ev(1 * MIN, 'ai-headshot'), // other bucket
    ev(1 * MIN, 'ai-suggest', 'u2'), // other user
  ]);
  const info = await enforceRateLimit(svc, 'u1', 'ai-suggest', { perHour: 1 }, NOW);
  assertEquals(info.usedThisHour, 1);
});

Deno.test('perMinute burst cap: 429 with a 1m window even when the hourly budget is fine', async () => {
  const { svc } = fakeClient([ev(10_000), ev(20_000), ev(30_000)]);
  const err = await assertRejects(
    () => enforceRateLimit(svc, 'u1', 'ai-suggest', { perHour: 60, perMinute: 3 }, NOW),
    HttpError,
  ) as HttpError;
  assertEquals(err.status, 429);
  assertEquals(err.extra?.window, '1m');
  assertEquals(err.extra?.limit, 3);
  assertEquals(err.extra?.retryAfterSec, 30); // oldest at -30s → free at +30s
  // Same events, minute cap of 4 → allowed
  const ok = await enforceRateLimit(fakeClient([ev(10_000), ev(20_000), ev(30_000)]).svc, 'u1', 'ai-suggest', { perHour: 60, perMinute: 4 }, NOW);
  assertEquals(ok.usedThisHour, 4);
});

Deno.test('retryAfterSec is at least 1 second and defaults to the window when no oldest row is found', async () => {
  const { svc } = fakeClient([ev(60 * MIN - 500)]); // about to fall out of the window
  const err = await assertRejects(() => enforceRateLimit(svc, 'u1', 'ai-suggest', { perHour: 1 }, NOW), HttpError) as HttpError;
  assertEquals(err.extra?.retryAfterSec, 1);
});

Deno.test('fails OPEN when the table cannot be counted (monthly metering still caps spend)', async () => {
  const { svc } = fakeClient([ev(1 * MIN), ev(2 * MIN), ev(3 * MIN)], 'relation "rate_limit_events" does not exist');
  const info = await enforceRateLimit(svc, 'u1', 'ai-suggest', { perHour: 1, perMinute: 1 }, NOW);
  assertEquals(info.usedThisHour, 1);
});

Deno.test('Elite is bounded too: the limiter has no plan concept, so a huge burst still trips', async () => {
  const rows = Array.from({ length: 5 }, (_, i) => ev(i * 1000, 'ai-headshot'));
  const { svc } = fakeClient(rows);
  const err = await assertRejects(() => enforceRateLimit(svc, 'u1', 'ai-headshot', { perHour: 5 }, NOW), HttpError) as HttpError;
  assertEquals(err.status, 429);
  assert(typeof err.extra?.retryAfterSec === 'number');
});
