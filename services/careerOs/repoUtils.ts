/**
 * Shared query shapes for the Career OS repositories.
 *
 * Every owned read filters on `user_id`; every update carries the revision the
 * caller read and treats zero affected rows as a `ConflictError`. A missing or
 * foreign row is a `NotFoundError` — never a fallback to another record.
 */
import { getSupabase } from '../supabase';
import { ConflictError, NotFoundError } from './types';

type Row = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Standard 8-4-4-4-12 hex UUID shape (any version). */
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

/**
 * A malformed id can never name an owned row, so it is reported as NotFound
 * without touching the database (PostgREST would answer 400 for a bad uuid,
 * which is not a context state and would differ from a foreign id's 404).
 */
export function assertUuid(entity: string, id: string): void {
  if (!isUuid(id)) throw new NotFoundError(entity, id);
}

/** Unwrap a `{ data, error }` result and throw the PostgREST error if any. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T | null {
  if (result.error) throw result.error;
  return result.data;
}

/** Owned single-row read by `id`; throws NotFoundError for no row. */
export async function getOwned(table: string, entity: string, userId: string, id: string): Promise<Row> {
  assertUuid(entity, id);
  const { data, error } = await getSupabase().from(table)
    .select('*').eq('user_id', userId).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError(entity, id);
  return data as Row;
}

/** Owned single-row read for tables keyed by `user_id` (profiles, preferences). */
export async function getByUser(table: string, userId: string): Promise<Row | null> {
  const { data, error } = await getSupabase().from(table)
    .select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data as Row | null) ?? null;
}

/** Resolve a list query result to rows, throwing its error. */
export async function rows(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  const { data, error } = await query;
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Row[];
}

/**
 * Optimistic-concurrency update. The filter includes the expected revision,
 * so a stale writer affects zero rows and receives a ConflictError instead of
 * silently overwriting a newer version.
 */
export async function updateWithRevision(
  table: string, entity: string, userId: string, id: string, expectedRevision: number, patch: Row,
): Promise<Row> {
  assertUuid(entity, id);
  const { data, error } = await getSupabase().from(table)
    .update(patch)
    .eq('user_id', userId).eq('id', id).eq('revision', expectedRevision)
    .select('*');
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) throw new ConflictError(entity, id, expectedRevision);
  return rows[0];
}

/** Same as updateWithRevision for tables whose primary key is `user_id`. */
export async function updateByUserWithRevision(
  table: string, entity: string, userId: string, expectedRevision: number, patch: Row,
): Promise<Row> {
  const { data, error } = await getSupabase().from(table)
    .update(patch)
    .eq('user_id', userId).eq('revision', expectedRevision)
    .select('*');
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) throw new ConflictError(entity, userId, expectedRevision);
  return rows[0];
}

/** Insert one row and return it. */
export async function insertOne(table: string, row: Row): Promise<Row> {
  const { data, error } = await getSupabase().from(table).insert(row).select('*').single();
  if (error) throw error;
  return data as Row;
}

/** Owned delete by id. */
export async function deleteOwned(table: string, userId: string, id: string): Promise<void> {
  if (!isUuid(id)) return; // nothing owned can have this id
  const { error } = await getSupabase().from(table).delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}

/** Postgres unique-violation code, surfaced by PostgREST as `code`. */
export const isUniqueViolation = (err: unknown): boolean =>
  Boolean(err && typeof err === 'object' && (err as { code?: unknown }).code === '23505');

/** Strip `undefined` values (PostgREST would otherwise send them as nulls in some paths). */
export function compact(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) if (v !== undefined) out[k] = v;
  return out;
}
