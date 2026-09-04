import { assertEquals } from 'jsr:@std/assert';
import { IN_FLIGHT_WINDOW_MS, dedupeAction, isUniqueViolation } from './dedupe.ts';

const now = new Date('2026-09-01T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

Deno.test('dedupeAction: no existing row -> process', () => {
  assertEquals(dedupeAction(null, now), 'process');
  assertEquals(dedupeAction(undefined, now), 'process');
});

Deno.test('dedupeAction: processed row -> duplicate', () => {
  assertEquals(dedupeAction({ processed_at: ago(1000), created_at: ago(2000) }, now), 'duplicate');
});

Deno.test('dedupeAction: unprocessed claim younger than 5 min -> in_flight', () => {
  assertEquals(dedupeAction({ processed_at: null, created_at: ago(IN_FLIGHT_WINDOW_MS - 1) }, now), 'in_flight');
  assertEquals(dedupeAction({ processed_at: null, created_at: ago(0) }, now), 'in_flight');
});

Deno.test('dedupeAction: unprocessed claim 5 min or older -> retry', () => {
  assertEquals(dedupeAction({ processed_at: null, created_at: ago(IN_FLIGHT_WINDOW_MS) }, now), 'retry');
  assertEquals(dedupeAction({ processed_at: null, created_at: ago(60 * 60 * 1000) }, now), 'retry');
});

Deno.test('dedupeAction: malformed created_at never wedges the event', () => {
  assertEquals(dedupeAction({ processed_at: null, created_at: 'garbage' }, now), 'retry');
});

Deno.test('isUniqueViolation matches only 23505', () => {
  assertEquals(isUniqueViolation({ code: '23505' }), true);
  assertEquals(isUniqueViolation({ code: '42P01' }), false);
  assertEquals(isUniqueViolation(null), false);
});
