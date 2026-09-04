-- Ops scheduling: the retention and alerting functions that already existed
-- (prism_prune_runs, prism_alert_scan) were never wired to anything, so they
-- only ran when somebody remembered to. This migration adds one more pruner
-- for the operational log tables and schedules all three with pg_cron.
--
-- pg_cron is optional at migration time. A local stack that lacks it (or a
-- role that cannot create the extension) gets a NOTICE and everything else
-- in this file still applies — the functions are always created, only the
-- schedules are skipped. On hosted Supabase the extension has to be enabled
-- once in the dashboard (Database → Extensions → pg_cron); re-running this
-- migration afterwards, or pasting the DO block below into the SQL editor,
-- installs the jobs. See docs/ADMIN.md, "Scheduled jobs".

-- ---------------------------------------------------------------------------
-- ops_prune_logs(): trims the append-only operational tables.
--
--   ai_logs, llm_call_logs, prism_agent_logs   90 days
--   admin_audit_log                            365 days
--
-- Also calls llm_cache_prune() when that function exists (it is created by a
-- separate migration and may or may not be present on a given database), via
-- to_regproc so the reference is resolved at run time rather than at create
-- time. Returns the number of rows removed so an operator can eyeball the
-- cron.job_run_details output.
-- ---------------------------------------------------------------------------
create or replace function public.ops_prune_logs()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  removed bigint := 0;
  n bigint;
begin
  delete from public.ai_logs where created_at < now() - interval '90 days';
  get diagnostics n = row_count; removed := removed + n;

  delete from public.llm_call_logs where created_at < now() - interval '90 days';
  get diagnostics n = row_count; removed := removed + n;

  delete from public.prism_agent_logs where created_at < now() - interval '90 days';
  get diagnostics n = row_count; removed := removed + n;

  delete from public.admin_audit_log where created_at < now() - interval '365 days';
  get diagnostics n = row_count; removed := removed + n;

  -- Optional: the LLM response cache pruner lives in another migration.
  if to_regproc('public.llm_cache_prune') is not null then
    execute 'select public.llm_cache_prune()';
  end if;

  return removed;
end;
$$;

-- Never callable through PostgREST: only cron (as postgres) and operators.
revoke all on function public.ops_prune_logs() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schedules. Names are stable so re-running this block replaces rather than
-- duplicates the jobs.
--
--   prism_alert_scan   every 10 minutes   (feeds ops_alerts, 1h dedup inside)
--   prism_prune_runs   03:10 UTC nightly  (wipes stale run text, deletes old failures)
--   ops_prune_logs     03:30 UTC nightly  (the log tables above)
-- ---------------------------------------------------------------------------
do $$
declare
  job record;
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is not available on this server; skipping job schedules. '
                 'Enable it (hosted: Dashboard → Database → Extensions) and re-run '
                 'the schedule block from 20260901400000_ops_scheduling.sql.';
    return;
  end if;

  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron could not be enabled here (%); skipping job schedules.', sqlerrm;
    return;
  end;

  -- Drop any previous copies of our jobs so the schedule below is the only one.
  for job in
    select jobid from cron.job
     where jobname in ('prism_alert_scan', 'prism_prune_runs', 'ops_prune_logs')
  loop
    perform cron.unschedule(job.jobid);
  end loop;

  perform cron.schedule('prism_alert_scan', '*/10 * * * *', 'select public.prism_alert_scan()');
  perform cron.schedule('prism_prune_runs', '10 3 * * *',   'select public.prism_prune_runs()');
  perform cron.schedule('ops_prune_logs',   '30 3 * * *',   'select public.ops_prune_logs()');

  raise notice 'pg_cron jobs installed: prism_alert_scan (*/10), prism_prune_runs (03:10), ops_prune_logs (03:30)';
end;
$$;
