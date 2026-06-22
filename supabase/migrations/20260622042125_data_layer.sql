-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- resumes ---------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My Resume',
  data jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  template_id text not null default 'default',
  visible_sections jsonb not null default '[]'::jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resumes_user_id_idx on public.resumes (user_id);
create unique index resumes_one_primary_per_user on public.resumes (user_id) where is_primary;
create trigger resumes_set_updated_at before update on public.resumes
  for each row execute function public.set_updated_at();
alter table public.resumes enable row level security;
create policy "resumes_select_own" on public.resumes for select using (auth.uid() = user_id);
create policy "resumes_insert_own" on public.resumes for insert with check (auth.uid() = user_id);
create policy "resumes_update_own" on public.resumes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resumes_delete_own" on public.resumes for delete using (auth.uid() = user_id);

-- resume_versions -------------------------------------------------------
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index resume_versions_resume_id_idx on public.resume_versions (resume_id);
alter table public.resume_versions enable row level security;
create policy "rv_select_own" on public.resume_versions for select using (auth.uid() = user_id);
create policy "rv_insert_own" on public.resume_versions for insert with check (auth.uid() = user_id);
create policy "rv_delete_own" on public.resume_versions for delete using (auth.uid() = user_id);

-- job_applications ------------------------------------------------------
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null default '',
  role text not null default '',
  status text not null default 'wishlist'
    check (status in ('wishlist','applied','interview','offer','rejected')),
  match_score int,
  url text,
  notes text,
  date_applied text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_applications_user_id_idx on public.job_applications (user_id);
create trigger job_applications_set_updated_at before update on public.job_applications
  for each row execute function public.set_updated_at();
alter table public.job_applications enable row level security;
create policy "ja_select_own" on public.job_applications for select using (auth.uid() = user_id);
create policy "ja_insert_own" on public.job_applications for insert with check (auth.uid() = user_id);
create policy "ja_update_own" on public.job_applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ja_delete_own" on public.job_applications for delete using (auth.uid() = user_id);

-- subscriptions (owner READ only; writes are service_role only) ----------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text not null default 'free' check (plan_id in ('free','pro','elite')),
  cycle text not null default 'monthly' check (cycle in ('monthly','yearly')),
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
alter table public.subscriptions enable row level security;
create policy "subs_select_own" on public.subscriptions for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only service_role (which bypasses RLS) writes.

-- usage_counters (owner READ only; writes are service_role only) ----------
create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  ats_scans int not null default 0,
  ai_actions int not null default 0,
  primary key (user_id, month)
);
alter table public.usage_counters enable row level security;
create policy "usage_select_own" on public.usage_counters for select using (auth.uid() = user_id);
-- No write policies: service_role only.

-- ai_logs (service_role ONLY — no client access at all) ------------------
create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  function text not null,
  model text,
  prompt_version text,
  token_estimate int,
  status text,
  created_at timestamptz not null default now()
);
alter table public.ai_logs enable row level security;
-- No policies at all: only service_role (bypasses RLS) can read/write.

-- Storage: private per-user headshots bucket ----------------------------
insert into storage.buckets (id, name, public) values ('headshots','headshots', false)
  on conflict (id) do nothing;
create policy "headshots_owner_rw" on storage.objects for all
  using (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text);
