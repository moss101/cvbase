import { getSupabase } from '../supabase';
import { rowToEvent, eventToRow, type ProductEventInput } from './mappers';
import { rows } from './repoUtils';
import type { ProductEvent, ProductEventName } from './types';

// Product/domain events with a versioned envelope. Payloads hold ids,
// revisions, counts and timings only — the redaction lives in careerEvents.ts
// and this repository never widens what it is given.

const TABLE = 'career_events';

/** Insert one event; a repeated `dedupeKey` for the same user is silently ignored. */
export async function insert(userId: string, event: ProductEventInput): Promise<void> {
  const row = eventToRow(event, userId);
  const query = event.dedupeKey
    ? getSupabase().from(TABLE).upsert(row, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    : getSupabase().from(TABLE).insert(row);
  const { error } = await query;
  if (error) throw error;
}

/**
 * Newest events for the Today activity feed. Only genuine persisted events
 * are returned; `names` narrows to the milestone events worth showing.
 */
export async function listRecent(userId: string, limit = 20, names?: readonly ProductEventName[]): Promise<ProductEvent[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (names && names.length > 0) q = q.in('event_name', [...names]);
  q = q.order('occurred_at', { ascending: false }).limit(Math.max(1, Math.min(limit, 100)));
  return (await rows(q)).map(rowToEvent);
}

/** Count of events by name in a window (cohort denominators). */
export async function listBetween(userId: string, from: string, to: string, names?: readonly ProductEventName[]): Promise<ProductEvent[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId).gte('occurred_at', from).lt('occurred_at', to);
  if (names && names.length > 0) q = q.in('event_name', [...names]);
  q = q.order('occurred_at', { ascending: true });
  return (await rows(q)).map(rowToEvent);
}
