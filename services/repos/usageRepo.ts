import { getSupabase } from '../supabase';
import { rowToUsage } from './mappers';
import type { UsageCounters } from '../../types';

/** Read-only: usage_counters is incremented by metered Edge Functions
 *  (service_role) in W3/W4. Returns zeroed counters when no row exists. */
export async function getUsage(userId: string, month: string): Promise<UsageCounters> {
  const { data, error } = await getSupabase().from('usage_counters')
    .select('*').eq('user_id', userId).eq('month', month).maybeSingle();
  if (error) throw error;
  return rowToUsage((data ?? null) as Record<string, unknown> | null, month);
}
