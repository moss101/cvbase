import { getSupabase } from '../supabase';
import { rowToNotification, notificationToRow, type NotificationInput } from './mappers';
import { getOwned, rows } from './repoUtils';
import { NotFoundError, type UserNotification } from './types';

// In-app inbox. Information vs action_required is a first-class distinction;
// an action_required item links to a career action rather than duplicating it.

const TABLE = 'user_notifications';
const ENTITY = 'user_notification';

export async function list(userId: string, opts: { unreadOnly?: boolean; includeDismissed?: boolean; limit?: number } = {}): Promise<UserNotification[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (opts.unreadOnly) q = q.is('read_at', null);
  if (!opts.includeDismissed) q = q.is('dismissed_at', null);
  q = q.order('created_at', { ascending: false }).limit(Math.max(1, Math.min(opts.limit ?? 50, 200)));
  return (await rows(q)).map(rowToNotification);
}

export async function get(userId: string, id: string): Promise<UserNotification> {
  return rowToNotification(await getOwned(TABLE, ENTITY, userId, id));
}

async function stamp(userId: string, id: string, column: 'read_at' | 'dismissed_at'): Promise<UserNotification> {
  const { data, error } = await getSupabase().from(TABLE)
    .update({ [column]: new Date().toISOString() }).eq('user_id', userId).eq('id', id).select('*');
  if (error) throw error;
  const found = (data ?? []) as Record<string, unknown>[];
  if (found.length === 0) throw new NotFoundError(ENTITY, id);
  return rowToNotification(found[0]);
}

export const markRead = (userId: string, id: string) => stamp(userId, id, 'read_at');
export const dismiss = (userId: string, id: string) => stamp(userId, id, 'dismissed_at');

/** Idempotent per (user, dedupeKey): an existing notification is left untouched. */
export async function upsertByDedupeKey(userId: string, input: NotificationInput): Promise<UserNotification | null> {
  const { data, error } = await getSupabase().from(TABLE)
    .upsert(notificationToRow(input, userId), { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    .select('*');
  if (error) throw error;
  const found = (data ?? []) as Record<string, unknown>[];
  return found.length > 0 ? rowToNotification(found[0]) : null;
}
