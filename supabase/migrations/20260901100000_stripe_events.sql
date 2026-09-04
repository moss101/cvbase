-- Stripe webhook idempotency ledger.
--
-- Stripe delivers each event at least once (retries on any non-2xx, plus
-- occasional duplicate deliveries of a 2xx). stripe-webhook claims an event
-- by inserting its id here BEFORE touching `subscriptions`:
--
--   insert ok                              -> process, then set processed_at
--   unique violation, processed_at set     -> 200 {received:true, duplicate:true}
--   unique violation, processed_at null,
--     created_at within the last 5 min     -> 409 (another worker is mid-flight;
--                                             Stripe retries later)
--   unique violation, processed_at null,
--     created_at older than 5 min          -> the earlier worker died; re-claim
--                                             (compare-and-set on created_at)
--
-- A handler failure deletes the unprocessed claim so Stripe's next retry is
-- accepted immediately; the 5-minute window only matters for hard crashes.
create table if not exists public.stripe_events (
  id text primary key,                       -- Stripe event id (evt_...)
  type text not null,
  created_at timestamptz not null default now(),  -- when a worker claimed it
  processed_at timestamptz                   -- null until the handler finished
);

alter table public.stripe_events enable row level security;

-- ---------------------------------------------------------------------------
-- No policies at all — deliberately (same pattern as llm_providers).
-- Only the service_role webhook (which bypasses RLS) reads or writes this
-- table. Nothing in it is for the browser.
-- ---------------------------------------------------------------------------
