-- PRISM ops alerting: threshold checks over prism_runs + prism_agent_logs and
-- a persisted alert log. Wire prism_alert_scan() to pg_cron (or an ops
-- script) every 5-15 minutes; each firing threshold inserts an ops_alerts row
-- exactly once per hour (dedup window) so the table is an actionable feed,
-- not noise. Alerts carry only aggregates — never CV/JD content.

create table public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  observed numeric not null,
  threshold numeric not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
alter table public.ops_alerts enable row level security;
-- No policies: service_role / operators only.

-- Threshold check. Returns currently-firing alerts (also usable ad hoc):
--   failure_rate  — failed runs / finished runs over the window
--   cost_spike    — average tokens per run over the window
--   spend_volume  — total tokens over the window (traffic-spike catch-all)
create or replace function public.prism_alert_check(
  p_window_minutes int default 60,
  p_min_runs int default 5,
  p_failure_rate_pct numeric default 25,
  p_avg_tokens_per_run numeric default 40000,
  p_total_tokens numeric default 500000
) returns table (kind text, observed numeric, threshold numeric, detail text)
language sql stable security definer set search_path = public as $$
  with recent as (
    select status, tokens_used
      from prism_runs
     where updated_at > now() - make_interval(mins => p_window_minutes)
  ), finished as (
    select count(*) filter (where status = 'failed')::numeric as failed,
           count(*) filter (where status in ('failed','review','completed'))::numeric as done,
           coalesce(avg(tokens_used), 0)::numeric as avg_tokens,
           coalesce(sum(tokens_used), 0)::numeric as total_tokens,
           count(*)::numeric as total
      from recent
  )
  select 'failure_rate', round(100 * failed / done, 1), p_failure_rate_pct,
         format('%s of %s finished runs failed in the last %s min', failed, done, p_window_minutes)
    from finished
   where done >= p_min_runs and 100 * failed / done >= p_failure_rate_pct
  union all
  select 'cost_spike', round(avg_tokens), p_avg_tokens_per_run,
         format('average %s tokens/run across %s runs in the last %s min', round(avg_tokens), total, p_window_minutes)
    from finished
   where total >= p_min_runs and avg_tokens >= p_avg_tokens_per_run
  union all
  select 'spend_volume', total_tokens, p_total_tokens,
         format('%s tokens total in the last %s min', total_tokens, p_window_minutes)
    from finished
   where total_tokens >= p_total_tokens;
$$;

-- Scanner: evaluates the checks and persists newly-firing alerts (1h dedup).
create or replace function public.prism_alert_scan()
returns int language plpgsql security definer set search_path = public as $$
declare inserted int := 0;
begin
  insert into ops_alerts (kind, observed, threshold, detail)
  select c.kind, c.observed, c.threshold, c.detail
    from prism_alert_check() c
   where not exists (
     select 1 from ops_alerts a
      where a.kind = c.kind and a.created_at > now() - interval '1 hour'
   );
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
