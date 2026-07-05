-- PRISM production hardening: checkpointed pipeline runs, per-agent telemetry,
-- user "not my words" line flags, and feature flags.

-- prism_runs ---------------------------------------------------------------
-- One row per tailoring run. The edge function (service role) owns writes and
-- checkpoints after every agent stage; users can read and delete their own
-- rows (RLS) but never write them directly. jd/cv text is wiped on completion
-- (data minimization) — only versions, telemetry, and the resume link remain.
create table public.prism_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'analyzing'
    check (status in ('analyzing','awaiting_answers','generating','review','completed','failed')),
  template_id text not null default 'classic',
  jd_text text,
  cv_text text,
  gap_analysis jsonb,
  questions jsonb,
  answers jsonb,
  -- Per-stage checkpoint: {context, draft, critique, iteration, best} so a
  -- crashed generate phase resumes from the last completed agent.
  checkpoint jsonb not null default '{}'::jsonb,
  result jsonb,
  resume_id uuid references public.resumes (id) on delete set null,
  error_code text,
  tokens_used int not null default 0,
  schema_version text not null default '',
  prompt_version text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prism_runs_user_id_idx on public.prism_runs (user_id, created_at desc);
create trigger prism_runs_set_updated_at before update on public.prism_runs
  for each row execute function public.set_updated_at();
alter table public.prism_runs enable row level security;
create policy "prism_runs_select_own" on public.prism_runs
  for select using (auth.uid() = user_id);
create policy "prism_runs_delete_own" on public.prism_runs
  for delete using (auth.uid() = user_id);
-- No insert/update policies: only the service-role edge function mutates runs.

-- prism_agent_logs -----------------------------------------------------------
-- Operator telemetry: latency/tokens/iteration per agent per run. The run id
-- is the trace id; NO CV/JD content is ever written here (PII redaction is
-- structural, not a filter). Service-role only — not user readable.
create table public.prism_agent_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.prism_runs (id) on delete cascade,
  agent text not null,
  model text not null default '',
  status text not null default 'ok' check (status in ('ok','error')),
  latency_ms int not null default 0,
  tokens int not null default 0,
  iteration int not null default 0,
  created_at timestamptz not null default now()
);
create index prism_agent_logs_run_id_idx on public.prism_agent_logs (run_id);
alter table public.prism_agent_logs enable row level security;
-- No policies: service_role only.

-- prism_line_flags -----------------------------------------------------------
-- "This wasn't in my CV and I didn't say this" reports from the review step.
-- The guardrail-improvement signal. Users insert their own; operators read
-- via service role.
create table public.prism_line_flags (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.prism_runs (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  section text not null default '',
  line_text text not null default '',
  created_at timestamptz not null default now()
);
create index prism_line_flags_run_id_idx on public.prism_line_flags (run_id);
alter table public.prism_line_flags enable row level security;
create policy "plf_insert_own" on public.prism_line_flags
  for insert with check (auth.uid() = user_id);
create policy "plf_select_own" on public.prism_line_flags
  for select using (auth.uid() = user_id);

-- feature_flags ---------------------------------------------------------------
-- Percentage rollout: a user is in when enabled AND (hashtext(user_id::text)
-- mod 100) < rollout_pct. Readable by everyone; written by operators only.
create table public.feature_flags (
  flag text primary key,
  enabled boolean not null default false,
  rollout_pct int not null default 0 check (rollout_pct between 0 and 100),
  updated_at timestamptz not null default now()
);
create trigger feature_flags_set_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();
alter table public.feature_flags enable row level security;
create policy "feature_flags_read_all" on public.feature_flags
  for select using (true);
-- Dev default: fully on locally. Production rollout is an operator action:
-- internal (enabled, 0% + allowlist via pct bump), percentage, then 100.
insert into public.feature_flags (flag, enabled, rollout_pct)
  values ('prism', true, 100)
  on conflict (flag) do nothing;

-- prune helper -----------------------------------------------------------------
-- Retention: wipe personal text from stale unfinished runs (>7 days) and
-- delete failed/abandoned rows older than 30 days. Call from pg_cron or an
-- ops script; also safe to run manually.
create or replace function public.prism_prune_runs()
returns void language sql security definer set search_path = public as $$
  update public.prism_runs
     set jd_text = null, cv_text = null, checkpoint = '{}'::jsonb
   where status not in ('completed')
     and updated_at < now() - interval '7 days';
  delete from public.prism_runs
   where status in ('failed')
     and updated_at < now() - interval '30 days';
$$;
