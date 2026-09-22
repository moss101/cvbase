import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { stripe } from '../_shared/stripe.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// account-delete: irreversible. The caller must echo their own email in the
// body (`{ confirm }`) — the check is against the JWT's email, never the
// client's idea of it. Order matters:
//   1. cancel the live Stripe subscription (so nobody keeps paying for a
//      deleted account — a Stripe failure aborts the whole delete);
//   2. remove storage objects under headshots/{uid}/ (no FK links them to the
//      user, so nothing else would clean them up);
//   3. auth.admin.deleteUser — every user table cascades from auth.users
//      (see 20260901300000_account_lifecycle.sql for the audit).
// The Stripe customer record itself is kept: invoices and tax records must
// survive the account, and it carries no CV content.
//
// Delete-cascade audit, Career OS foundation (20260920100000_career_os_foundation.sql):
//   career_profiles, career_facts, career_fact_references, career_goals,
//   career_goal_revisions, opportunities, campaigns, campaign_opportunities,
//   application_artifacts, interview_sessions, application_outcomes,
//   opportunity_analyses, career_actions, action_runs, coach_conversations,
//   coach_messages, career_events, user_notifications, career_preferences,
//   career_scenarios, career_insights, career_migrations
//     -> user_id references auth.users (id) ON DELETE CASCADE (all 22)
//   prism_runs.application_id / source_resume_id, resumes.application_id,
//   job_applications.{opportunity_id,campaign_id,goal_id,current_resume_id}
//     -> same-owner composite FKs, ON DELETE SET NULL / CASCADE inside the
//        account; irrelevant once auth.users cascades everything.
// The list is not hand-maintained: account-export/export_test.ts parses the
// migration and fails if any `create table` lacks the cascade clause or is
// missing from _shared/careerTables.ts. No storage objects are introduced by
// Career OS, so step 2 is unchanged.

const HEADSHOT_BUCKET = 'headshots';

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

async function cancelStripeSubscription(svc: SupabaseClient, userId: string): Promise<boolean> {
  const { data: sub, error } = await svc.from('subscriptions')
    .select('stripe_subscription_id,status').eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError(500, 'delete_failed', { step: 'subscription_lookup' });
  const subscriptionId = sub?.stripe_subscription_id as string | null | undefined;
  if (!subscriptionId) return false;
  if (sub?.status === 'canceled') return false;
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    // Already gone / already canceled on Stripe's side: nothing left to stop.
    if (e.code === 'resource_missing' || /canceled subscription/i.test(e.message ?? '')) return false;
    console.error('account-delete: stripe cancel failed', e.message);
    throw new HttpError(502, 'stripe_cancel_failed');
  }
}

async function removeHeadshots(svc: SupabaseClient, userId: string): Promise<number> {
  const bucket = svc.storage.from(HEADSHOT_BUCKET);
  const pageSize = 1000;
  let removed = 0;
  // Always re-list from offset 0: each pass deletes what it finds.
  for (let guard = 0; guard < 100; guard++) {
    const { data, error } = await bucket.list(userId, { limit: pageSize, offset: 0 });
    if (error) throw new HttpError(500, 'delete_failed', { step: 'storage_list' });
    const paths = (data ?? []).filter((o) => o.id).map((o) => `${userId}/${o.name}`);
    if (paths.length === 0) break;
    const { error: rmError } = await bucket.remove(paths);
    if (rmError) throw new HttpError(500, 'delete_failed', { step: 'storage_remove' });
    removed += paths.length;
    if (paths.length < pageSize) break;
  }
  return removed;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));
    const confirm = normalizeEmail(body?.confirm);
    const email = normalizeEmail(user.email);
    if (!email || !confirm || confirm !== email) throw new HttpError(400, 'confirm_mismatch');

    const svc = serviceClient();
    const subscriptionCancelled = await cancelStripeSubscription(svc, user.id);
    const headshotsRemoved = await removeHeadshots(svc, user.id);

    const { error } = await svc.auth.admin.deleteUser(user.id);
    if (error) {
      console.error('account-delete: deleteUser failed', error.message);
      throw new HttpError(500, 'delete_failed', { step: 'auth_delete' });
    }

    return ok({ deleted: true, subscriptionCancelled, headshotsRemoved });
  } catch (err) {
    return fail(err);
  }
});
