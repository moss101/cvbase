-- Per-user sliding-window rate limiting for the AI Edge Functions
-- (_shared/rateLimit.ts). One append-only row per accepted request; the
-- limiter counts rows per (user, bucket) in the trailing hour/minute.
--
-- Monthly metering (usage_counters) bounds total spend; this bounds burst
-- rate so a runaway client or a stolen token cannot drain a month's quota
-- (or an Elite user's unlimited quota) in seconds. Rows older than a day are
-- pruned opportunistically by the limiter itself.
create table public.rate_limit_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_user_bucket_created_idx
  on public.rate_limit_events (user_id, bucket, created_at);

alter table public.rate_limit_events enable row level security;
-- No policies: service_role only (bypasses RLS). Clients never read or write
-- their own limiter rows.
