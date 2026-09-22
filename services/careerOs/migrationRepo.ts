import { getSupabase } from '../supabase';
import { rowToMigration, type MigrationEntry } from './mappers';
import { rows } from './repoUtils';

// Read-only view of the per-user migration ledger (old id -> new id mappings
// with status). Writes happen inside the server-side backfill function.

const TABLE = 'career_migrations';

export async function list(userId: string, migration?: string): Promise<MigrationEntry[]> {
  let q = getSupabase().from(TABLE).select('*').eq('user_id', userId);
  if (migration) q = q.eq('migration', migration);
  q = q.order('created_at', { ascending: true });
  return (await rows(q)).map(rowToMigration);
}

/** The Career OS id a legacy record was mapped to, or null when not (yet) migrated. */
export async function mappedId(userId: string, migration: string, itemKind: string, oldId: string): Promise<string | null> {
  const { data, error } = await getSupabase().from(TABLE)
    .select('new_id,status').eq('user_id', userId).eq('migration', migration).eq('item_kind', itemKind).eq('old_id', oldId).maybeSingle();
  if (error) throw error;
  const row = data as { new_id?: unknown; status?: unknown } | null;
  return row && row.status === 'done' && typeof row.new_id === 'string' ? row.new_id : null;
}
