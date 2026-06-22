import { getSupabase } from '../supabase';
import { rowToSubscription } from './mappers';
import type { Subscription } from '../../types';

/** Read-only: the subscriptions table is written by Edge Functions / the Stripe
 *  webhook (service_role) in W4. Returns null until a subscription exists. */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await getSupabase().from('subscriptions')
    .select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return rowToSubscription((data ?? null) as Record<string, unknown> | null);
}
