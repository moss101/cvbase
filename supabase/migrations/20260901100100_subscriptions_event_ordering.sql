-- Out-of-order webhook protection + customer lookup for `subscriptions`.
--
-- Stripe does not guarantee delivery order: a retried `customer.subscription.
-- updated` from before a cancellation can arrive after the `.deleted` event and
-- silently resurrect the plan. We remember the `created` timestamp of the last
-- event applied to each row and only accept events that are not older.

alter table public.subscriptions
  add column if not exists stripe_event_created bigint;

comment on column public.subscriptions.stripe_event_created is
  'Stripe event.created (unix seconds) of the last webhook event applied. Older events are ignored by apply_stripe_subscription().';

-- The webhook resolves a user from the Stripe customer id when
-- subscription.metadata.user_id is missing (e.g. subscriptions created from
-- the Stripe dashboard or the Customer Portal).
create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

-- Atomic compare-and-set upsert used by stripe-webhook (the ONLY writer of
-- `subscriptions`). Semantics:
--   * inserts the row if the user has none;
--   * otherwise updates it only when p_event_created >= stripe_event_created
--     (a null stored value always accepts);
--   * a NULL patch field leaves the stored value unchanged, so invoice events
--     can flip `status` without knowing the plan or period dates.
-- Returns true when the row was written, false when the event was stale.
-- The insert ... on conflict do update ... where form is a single statement,
-- so two concurrent deliveries cannot interleave read/compare/write.
create or replace function public.apply_stripe_subscription(
  p_user uuid,
  p_event_created bigint,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_plan_id text default null,
  p_cycle text default null,
  p_status text default null,
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  insert into public.subscriptions as s (
    user_id, stripe_customer_id, stripe_subscription_id, plan_id, cycle, status,
    current_period_start, current_period_end, cancel_at_period_end, stripe_event_created
  ) values (
    p_user, p_stripe_customer_id, p_stripe_subscription_id,
    coalesce(p_plan_id, 'free'), coalesce(p_cycle, 'monthly'), coalesce(p_status, 'active'),
    p_current_period_start, p_current_period_end, coalesce(p_cancel_at_period_end, false),
    p_event_created
  )
  on conflict (user_id) do update set
    stripe_customer_id     = coalesce(p_stripe_customer_id, s.stripe_customer_id),
    stripe_subscription_id = coalesce(p_stripe_subscription_id, s.stripe_subscription_id),
    plan_id                = coalesce(p_plan_id, s.plan_id),
    cycle                  = coalesce(p_cycle, s.cycle),
    status                 = coalesce(p_status, s.status),
    current_period_start   = coalesce(p_current_period_start, s.current_period_start),
    current_period_end     = coalesce(p_current_period_end, s.current_period_end),
    cancel_at_period_end   = coalesce(p_cancel_at_period_end, s.cancel_at_period_end),
    stripe_event_created   = p_event_created
  where s.stripe_event_created is null or p_event_created >= s.stripe_event_created;

  get diagnostics n = row_count;
  return n > 0;
end;
$$;

-- Only the service_role (the webhook) may apply Stripe state; never the client.
revoke all on function public.apply_stripe_subscription(uuid, bigint, text, text, text, text, text, timestamptz, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription(uuid, bigint, text, text, text, text, text, timestamptz, timestamptz, boolean)
  to service_role;
