-- W8 account lifecycle: persisted ATS reports and AI headshots, the missing
-- profiles updated_at trigger, and the hot-path indexes that the
-- account-export / account-delete functions and the dashboard lists lean on.
--
-- Delete-cascade audit (everything a user owns must go when auth.users does):
--   profiles, resumes, resume_versions, job_applications, subscriptions,
--   usage_counters, prism_runs, prism_line_flags   -> auth.users ON DELETE CASCADE
--   prism_agent_logs                                -> prism_runs ON DELETE CASCADE
--   ats_reports, headshots (this migration)          -> auth.users ON DELETE CASCADE
--   ai_logs.user_id, admin_audit_log.actor_id        -> ON DELETE SET NULL (deliberate:
--                                                       operational/audit rows outlive
--                                                       the account, with no identity)
-- Storage objects under headshots/{uid}/ are not FK-linked; account-delete
-- removes them explicitly before calling auth.admin.deleteUser.

-- ats_reports ------------------------------------------------------------
-- One row per metered ats-analyze scan. Written only by the edge function
-- (service role); users can list, reopen and delete their own reports.
create table public.ats_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid null references public.resumes (id) on delete set null,
  job_description text,
  report jsonb not null,
  score int,
  created_at timestamptz default now()
);
create index ats_reports_user_created_idx on public.ats_reports (user_id, created_at desc);
alter table public.ats_reports enable row level security;
create policy "ats_reports_select_own" on public.ats_reports
  for select using (auth.uid() = user_id);
create policy "ats_reports_delete_own" on public.ats_reports
  for delete using (auth.uid() = user_id);
-- No insert/update policies: only the service-role edge function writes.

-- headshots ---------------------------------------------------------------
-- Index of the private storage objects ai-headshot produces, so exports and
-- the profile picker can list them without walking the bucket.
create table public.headshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz default now()
);
create index headshots_user_created_idx on public.headshots (user_id, created_at desc);
alter table public.headshots enable row level security;
create policy "headshots_select_own" on public.headshots
  for select using (auth.uid() = user_id);
create policy "headshots_delete_own" on public.headshots
  for delete using (auth.uid() = user_id);
-- No insert/update policies: only the service-role edge function writes.

-- profiles: updated_at was declared but never maintained -------------------
-- Fires after profiles_protect_is_admin (alphabetical BEFORE UPDATE order),
-- so the pinned is_admin value is what gets timestamped.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Hot-path indexes ------------------------------------------------------
-- Dashboard "recently edited", version history per resume, per-user AI log
-- lookups (export / support), and the line-flag export by owner.
create index if not exists resumes_user_updated_idx
  on public.resumes (user_id, updated_at desc);
create index if not exists resume_versions_user_resume_created_idx
  on public.resume_versions (user_id, resume_id, created_at desc);
create index if not exists ai_logs_user_created_idx
  on public.ai_logs (user_id, created_at desc);
create index if not exists prism_line_flags_user_id_idx
  on public.prism_line_flags (user_id);
