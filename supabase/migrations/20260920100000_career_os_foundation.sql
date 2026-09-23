-- Career OS foundation (R0, COS-003/COS-007): additive schema for canonical
-- career facts, goals, opportunities, campaigns, application extensions,
-- preparation artifacts, interview sessions, outcome observations, the shared
-- action/receipt model, Coach conversations, domain events, the user inbox,
-- preferences, scenarios, outcome insights and the per-user migration ledger.
--
-- Invariants (docs/career-os/CAREER_OS_DOMAIN_MAP.md):
--   * Every owned row carries user_id; cross-object references use composite
--     same-owner foreign keys (child.ref_id, child.user_id) -> (parent.id,
--     parent.user_id) so a row can never point at another account's record.
--   * job_applications remains THE application authority. It is extended in
--     place; legacy status values stay readable and a trigger keeps the five
--     legacy statuses coherent with the additive `stage` column.
--   * Nothing here is destructive: no drops, no renames, no rewritten values.
--   * All new tables cascade from auth.users so account deletion covers them,
--     and account-export enumerates every table listed here.
--   * Optimistic concurrency: `revision` bumps on every update; clients send
--     the revision they read and treat 0 affected rows as a conflict.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Deterministic ids for migration mappings: the same legacy id always maps to
-- the same Career OS id, so a restarted backfill cannot create duplicates.
create or replace function public.career_os_uuid(p_namespace text, p_key text)
returns uuid language sql immutable strict as $$
  select md5(p_namespace || ':' || p_key)::uuid;
$$;

-- Bumps revision + updated_at on every UPDATE (optimistic concurrency).
create or replace function public.career_os_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.revision = coalesce(old.revision, 0) + 1;
  end if;
  return new;
end; $$;

-- Same-owner composite keys on the existing owners that new objects reference.
alter table public.resumes add constraint resumes_id_user_key unique (id, user_id);
alter table public.resume_versions add constraint resume_versions_id_user_key unique (id, user_id);
alter table public.job_applications add constraint job_applications_id_user_key unique (id, user_id);
alter table public.prism_runs add constraint prism_runs_id_user_key unique (id, user_id);
alter table public.ats_reports add constraint ats_reports_id_user_key unique (id, user_id);

-- ---------------------------------------------------------------------------
-- Career aggregate (extends the existing profile identity; id = user id)
-- ---------------------------------------------------------------------------
create table public.career_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  headline text not null default '',
  -- onboarding: {objective, step, importedResumeId, reviewedAt, goalId, completedAt, pausedAt}
  onboarding jsonb not null default '{}'::jsonb,
  migration_version int not null default 0,
  migrated_at timestamptz,
  -- hash over active fact ids + revisions; changes when any fact changes
  facts_revision text not null default '',
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger career_profiles_touch before update on public.career_profiles
  for each row execute function public.career_os_touch();
alter table public.career_profiles enable row level security;
create policy "career_profiles_select_own" on public.career_profiles for select using (auth.uid() = user_id);
create policy "career_profiles_insert_own" on public.career_profiles for insert with check (auth.uid() = user_id);
create policy "career_profiles_update_own" on public.career_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "career_profiles_delete_own" on public.career_profiles for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Career facts (reusable claims with provenance) and their references
-- ---------------------------------------------------------------------------
create table public.career_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'experience','education','skill','achievement','project','certification',
    'language','award','training','publication','volunteer','summary','profile_field','custom')),
  title text not null default '',
  organization text not null default '',
  location text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  narrative text not null default '',
  -- kind-specific fields: achievement {metric, unit, period}; project
  -- {technologies, link}; profile_field {field, value}; skill {level}
  payload jsonb not null default '{}'::jsonb,
  parent_fact_id uuid,
  confirmation_state text not null default 'inferred'
    check (confirmation_state in ('verified','user_confirmed','inferred','incomplete')),
  -- Verified requires all three; enforced below.
  verification jsonb,
  extraction_confidence numeric(4,3),
  source_kind text not null default 'manual'
    check (source_kind in ('manual','resume_import','legacy_import','prism_answer','coach','profile')),
  source_ref jsonb not null default '{}'::jsonb,
  source_fingerprint text,
  legacy_id text,
  conflict_group uuid,
  review_state text not null default 'reviewed'
    check (review_state in ('candidate','reviewed','conflict')),
  status text not null default 'active' check (status in ('active','withdrawn','deleted')),
  sort_order int not null default 0,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_facts_id_user_key unique (id, user_id),
  constraint career_facts_parent_same_owner
    foreign key (parent_fact_id, user_id) references public.career_facts (id, user_id) on delete set null (parent_fact_id),
  constraint career_facts_verified_requires_method check (
    confirmation_state <> 'verified'
    or (verification is not null and verification ? 'method' and verification ? 'source' and verification ? 'verifiedAt'))
);
-- Plain (non-partial) unique index: NULL fingerprints stay distinct, and a
-- plain index lets PostgREST upserts infer it with `on_conflict=user_id,source_fingerprint`.
create unique index career_facts_user_fingerprint_key
  on public.career_facts (user_id, source_fingerprint);
create index career_facts_user_kind_idx on public.career_facts (user_id, kind, status);
create index career_facts_conflict_idx on public.career_facts (user_id, conflict_group) where conflict_group is not null;
create trigger career_facts_touch before update on public.career_facts
  for each row execute function public.career_os_touch();
alter table public.career_facts enable row level security;
create policy "career_facts_select_own" on public.career_facts for select using (auth.uid() = user_id);
create policy "career_facts_insert_own" on public.career_facts for insert with check (auth.uid() = user_id);
create policy "career_facts_update_own" on public.career_facts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "career_facts_delete_own" on public.career_facts for delete using (auth.uid() = user_id);

-- Claim -> artifact edges ("used in" counts, change impact, stale drafts).
create table public.career_fact_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fact_id uuid not null,
  fact_revision int not null default 1,
  artifact_kind text not null check (artifact_kind in (
    'resume','resume_version','application_artifact','interview_session','coach_message','opportunity_analysis')),
  artifact_id uuid not null,
  artifact_section text not null default '',
  created_at timestamptz not null default now(),
  constraint career_fact_references_fact_same_owner
    foreign key (fact_id, user_id) references public.career_facts (id, user_id) on delete cascade,
  constraint career_fact_references_unique unique (fact_id, artifact_kind, artifact_id, artifact_section)
);
create index career_fact_references_artifact_idx on public.career_fact_references (user_id, artifact_kind, artifact_id);
alter table public.career_fact_references enable row level security;
create policy "cfr_select_own" on public.career_fact_references for select using (auth.uid() = user_id);
create policy "cfr_insert_own" on public.career_fact_references for insert with check (auth.uid() = user_id);
create policy "cfr_update_own" on public.career_fact_references for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cfr_delete_own" on public.career_fact_references for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Goals (versioned; at most one primary active goal per user)
-- ---------------------------------------------------------------------------
create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  role text not null default '',
  level text not null default '',
  industry text not null default '',
  location text not null default '',
  remote_preference text check (remote_preference in ('remote','hybrid','onsite','any')),
  comp_min numeric(14,2),
  comp_max numeric(14,2),
  comp_currency text check (comp_currency is null or char_length(comp_currency) = 3),
  comp_period text check (comp_period in ('year','month','day','hour')),
  target_date date,
  target_employers text[] not null default '{}',
  -- [{id, kind:'hard'|'soft', text, field?, value?}]
  constraints jsonb not null default '[]'::jsonb,
  -- [{key, weight 0..1, label}]
  priorities jsonb not null default '[]'::jsonb,
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active','archived')),
  source text not null default 'user' check (source in ('user','suggested','onboarding')),
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_goals_id_user_key unique (id, user_id)
);
create unique index career_goals_one_primary_per_user
  on public.career_goals (user_id) where is_primary and status = 'active';
create index career_goals_user_status_idx on public.career_goals (user_id, status);
create trigger career_goals_touch before update on public.career_goals
  for each row execute function public.career_os_touch();
alter table public.career_goals enable row level security;
create policy "career_goals_select_own" on public.career_goals for select using (auth.uid() = user_id);
create policy "career_goals_insert_own" on public.career_goals for insert with check (auth.uid() = user_id);
create policy "career_goals_update_own" on public.career_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "career_goals_delete_own" on public.career_goals for delete using (auth.uid() = user_id);

-- Every goal revision is snapshotted so applications can keep their
-- decision-time goal and recommendations can explain which revision they used.
create table public.career_goal_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  revision int not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint career_goal_revisions_same_owner
    foreign key (goal_id, user_id) references public.career_goals (id, user_id) on delete cascade,
  constraint career_goal_revisions_unique unique (goal_id, revision)
);
alter table public.career_goal_revisions enable row level security;
create policy "cgr_select_own" on public.career_goal_revisions for select using (auth.uid() = user_id);
create policy "cgr_insert_own" on public.career_goal_revisions for insert with check (auth.uid() = user_id);
create policy "cgr_delete_own" on public.career_goal_revisions for delete using (auth.uid() = user_id);

create or replace function public.career_goal_snapshot()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.career_goal_revisions (user_id, goal_id, revision, snapshot)
  values (new.user_id, new.id, new.revision, to_jsonb(new) - 'revision' - 'updated_at')
  on conflict (goal_id, revision) do nothing;
  return new;
end; $$;
create trigger career_goals_snapshot after insert or update on public.career_goals
  for each row execute function public.career_goal_snapshot();

-- ---------------------------------------------------------------------------
-- Opportunities (identity independent of applications)
-- ---------------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_type text not null default 'role' check (opportunity_type in ('role','project','path')),
  title text not null default '',
  company text not null default '',
  location text not null default '',
  remote_type text check (remote_type in ('remote','hybrid','onsite')),
  source_url text,
  source_kind text not null default 'manual'
    check (source_kind in ('paste','manual','tracker_migration','connector','coach')),
  captured_content text not null default '',
  content_fingerprint text,
  captured_at timestamptz not null default now(),
  -- The listing's own date if the user supplied it; null = unknown.
  source_date date,
  listing_status text not null default 'unknown' check (listing_status in ('open','closed','unknown')),
  status text not null default 'saved'
    check (status in ('saved','watching','applied','not_interested','archived')),
  comp_min numeric(14,2),
  comp_max numeric(14,2),
  comp_currency text check (comp_currency is null or char_length(comp_currency) = 3),
  comp_period text check (comp_period in ('year','month','day','hour')),
  -- Deterministically extracted requirement lines: [{id, text, kind}]
  requirements jsonb not null default '[]'::jsonb,
  legacy_application_id uuid,
  merged_into_id uuid,
  -- Snapshot of pre-merge associations so a merge can be reversed.
  merge_undo jsonb,
  not_interested_reason text,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_id_user_key unique (id, user_id),
  constraint opportunities_legacy_app_same_owner
    foreign key (legacy_application_id, user_id) references public.job_applications (id, user_id) on delete set null (legacy_application_id),
  constraint opportunities_merged_same_owner
    foreign key (merged_into_id, user_id) references public.opportunities (id, user_id) on delete set null (merged_into_id)
);
create unique index opportunities_legacy_application_key
  on public.opportunities (legacy_application_id) where legacy_application_id is not null;
create index opportunities_user_status_idx on public.opportunities (user_id, status, updated_at desc);
create index opportunities_user_fingerprint_idx on public.opportunities (user_id, content_fingerprint);
create trigger opportunities_touch before update on public.opportunities
  for each row execute function public.career_os_touch();
alter table public.opportunities enable row level security;
create policy "opportunities_select_own" on public.opportunities for select using (auth.uid() = user_id);
create policy "opportunities_insert_own" on public.opportunities for insert with check (auth.uid() = user_id);
create policy "opportunities_update_own" on public.opportunities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "opportunities_delete_own" on public.opportunities for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Campaigns (coordinate pursuit of one goal)
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid,
  name text not null default '',
  status text not null default 'active' check (status in ('active','paused','closed')),
  -- [{id, title, state:'todo'|'doing'|'done', dueDate?}]
  milestones jsonb not null default '[]'::jsonb,
  notes text not null default '',
  closed_reason text,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_id_user_key unique (id, user_id),
  constraint campaigns_goal_same_owner
    foreign key (goal_id, user_id) references public.career_goals (id, user_id) on delete set null (goal_id)
);
create index campaigns_user_status_idx on public.campaigns (user_id, status);
create trigger campaigns_touch before update on public.campaigns
  for each row execute function public.career_os_touch();
alter table public.campaigns enable row level security;
create policy "campaigns_select_own" on public.campaigns for select using (auth.uid() = user_id);
create policy "campaigns_insert_own" on public.campaigns for insert with check (auth.uid() = user_id);
create policy "campaigns_update_own" on public.campaigns for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "campaigns_delete_own" on public.campaigns for delete using (auth.uid() = user_id);

create table public.campaign_opportunities (
  campaign_id uuid not null,
  opportunity_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, opportunity_id),
  constraint campaign_opportunities_campaign_same_owner
    foreign key (campaign_id, user_id) references public.campaigns (id, user_id) on delete cascade,
  constraint campaign_opportunities_opportunity_same_owner
    foreign key (opportunity_id, user_id) references public.opportunities (id, user_id) on delete cascade
);
alter table public.campaign_opportunities enable row level security;
create policy "co_select_own" on public.campaign_opportunities for select using (auth.uid() = user_id);
create policy "co_insert_own" on public.campaign_opportunities for insert with check (auth.uid() = user_id);
create policy "co_delete_own" on public.campaign_opportunities for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- job_applications: additive extension (the application authority)
-- ---------------------------------------------------------------------------
alter table public.job_applications
  add column opportunity_id uuid,
  add column campaign_id uuid,
  add column goal_id uuid,
  add column goal_revision int,
  add column goal_snapshot jsonb,
  add column attempt_no int not null default 1,
  add column previous_attempt_id uuid,
  -- Additive stage detail. Legacy `status` stays authoritative for old
  -- clients; the sync trigger below keeps the two coherent.
  add column stage text check (stage in ('saved','preparing','submitted','response','interview','final','closed')),
  add column closed_reason text check (closed_reason in ('rejected','withdrawn','accepted','archived')),
  add column idempotency_key text,
  add column submitted_at timestamptz,
  -- {resumeId, resumeVersionId, resumeRevision, artifactIds[], confirmedAt}
  add column submission_snapshot jsonb,
  add column current_resume_id uuid,
  add column prism_run_id uuid,
  add column follow_up_at date,
  -- Cached readiness projection: {necessary:[], optional:[], incomplete:[], blocked:[]}
  add column readiness jsonb,
  add column revision int not null default 1,
  add constraint job_applications_opportunity_same_owner
    foreign key (opportunity_id, user_id) references public.opportunities (id, user_id) on delete set null (opportunity_id),
  add constraint job_applications_campaign_same_owner
    foreign key (campaign_id, user_id) references public.campaigns (id, user_id) on delete set null (campaign_id),
  add constraint job_applications_goal_same_owner
    foreign key (goal_id, user_id) references public.career_goals (id, user_id) on delete set null (goal_id),
  add constraint job_applications_previous_same_owner
    foreign key (previous_attempt_id, user_id) references public.job_applications (id, user_id) on delete set null (previous_attempt_id),
  add constraint job_applications_resume_same_owner
    foreign key (current_resume_id, user_id) references public.resumes (id, user_id) on delete set null (current_resume_id);
create unique index job_applications_idempotency_key
  on public.job_applications (user_id, idempotency_key) where idempotency_key is not null;
create index job_applications_opportunity_idx on public.job_applications (user_id, opportunity_id);
create index job_applications_campaign_idx on public.job_applications (user_id, campaign_id);

-- Legacy status <-> stage coherence. A write that only knows `status` (old
-- clients, the legacy board) derives `stage`; a write that changes `stage`
-- derives the compatible `status`. `rejected` is never rewritten to a success.
create or replace function public.job_applications_sync_stage()
returns trigger language plpgsql as $$
declare
  status_changed boolean := tg_op = 'INSERT' or new.status is distinct from old.status;
  stage_changed boolean := tg_op = 'INSERT' or new.stage is distinct from old.stage;
begin
  if new.stage is null or (status_changed and not stage_changed) then
    new.stage := case new.status
      when 'wishlist' then case when new.stage in ('preparing') then new.stage else 'saved' end
      when 'applied' then case when new.stage in ('submitted','response') then new.stage else 'submitted' end
      when 'interview' then 'interview'
      when 'offer' then case when new.stage = 'closed' and new.closed_reason = 'accepted' then new.stage else 'final' end
      when 'rejected' then 'closed'
      else 'saved' end;
    if new.stage = 'closed' and new.closed_reason is null then
      new.closed_reason := case when new.status = 'rejected' then 'rejected' else 'archived' end;
    end if;
  elsif stage_changed then
    new.status := case new.stage
      when 'saved' then 'wishlist'
      when 'preparing' then 'wishlist'
      when 'submitted' then 'applied'
      when 'response' then 'applied'
      when 'interview' then 'interview'
      when 'final' then 'offer'
      when 'closed' then case when new.closed_reason = 'accepted' then 'offer' else 'rejected' end
      else new.status end;
  end if;
  if new.stage <> 'closed' then new.closed_reason := null; end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.revision := coalesce(old.revision, 0) + 1; end if;
  return new;
end; $$;
drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_sync_stage before insert or update on public.job_applications
  for each row execute function public.job_applications_sync_stage();

-- Backfill stage for existing rows without rewriting status.
update public.job_applications set stage = null where stage is null;

-- Idempotent Start Application. Serialises concurrent starts per
-- (user, opportunity); returns the same application for repeated calls, and
-- activates a dormant legacy wishlist shell instead of creating a copy.
-- `p_reapply` creates an explicit new attempt linked to the previous one.
create or replace function public.career_start_application(
  p_opportunity_id uuid,
  p_campaign_id uuid default null,
  p_idempotency_key text default null,
  p_reapply boolean default false
) returns public.job_applications
language plpgsql security invoker set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_opp public.opportunities%rowtype;
  v_app public.job_applications%rowtype;
  v_goal public.career_goals%rowtype;
  v_campaign_goal uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text || ':' || p_opportunity_id::text));

  select * into v_opp from public.opportunities where id = p_opportunity_id and user_id = v_user;
  if not found then raise exception 'opportunity_not_found' using errcode = 'P0002'; end if;
  if p_campaign_id is not null then
    select goal_id into v_campaign_goal from public.campaigns where id = p_campaign_id and user_id = v_user;
    if not found then raise exception 'campaign_not_found' using errcode = 'P0002'; end if;
  end if;

  if p_idempotency_key is not null then
    select * into v_app from public.job_applications
      where user_id = v_user and idempotency_key = p_idempotency_key;
    if found then return v_app; end if;
  end if;

  select * into v_app from public.job_applications
    where user_id = v_user and opportunity_id = p_opportunity_id
    order by attempt_no desc, created_at desc limit 1;

  if found and not p_reapply then
    if v_app.stage = 'saved' then
      update public.job_applications
        set stage = 'preparing',
            campaign_id = coalesce(campaign_id, p_campaign_id),
            idempotency_key = coalesce(idempotency_key, p_idempotency_key)
        where id = v_app.id returning * into v_app;
    end if;
    return v_app;
  end if;
  if p_reapply and not found then p_reapply := false; end if;

  -- Decision-time goal snapshot: campaign goal, else primary goal, else none.
  select * into v_goal from public.career_goals
    where user_id = v_user and status = 'active'
      and id = coalesce(v_campaign_goal, (select id from public.career_goals where user_id = v_user and is_primary and status = 'active' limit 1))
    limit 1;

  insert into public.job_applications (
    user_id, company, role, url, status, stage, opportunity_id, campaign_id,
    goal_id, goal_revision, goal_snapshot, attempt_no, previous_attempt_id, idempotency_key)
  values (
    v_user, v_opp.company, v_opp.title, v_opp.source_url, 'wishlist', 'preparing', p_opportunity_id, p_campaign_id,
    v_goal.id, v_goal.revision, case when v_goal.id is null then null else to_jsonb(v_goal) end,
    case when p_reapply then v_app.attempt_no + 1 else 1 end,
    case when p_reapply then v_app.id else null end,
    p_idempotency_key)
  returning * into v_app;

  update public.opportunities set status = 'applied'
    where id = p_opportunity_id and user_id = v_user and status in ('saved','watching');
  return v_app;
end; $$;
grant execute on function public.career_start_application(uuid, uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Application preparation artifacts (cover letter, questions, notes, ...)
-- ---------------------------------------------------------------------------
create table public.application_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null,
  kind text not null check (kind in (
    'role_analysis','cover_letter','employer_question','linkedin','networking_note','note','interview_story','submission')),
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  -- Plain text projection for search snippets and exports (no HTML).
  plain_text text not null default '',
  source text not null default 'user' check (source in ('user','ai','prism','coach')),
  status text not null default 'draft' check (status in ('draft','reviewed','snapshot')),
  snapshot_of uuid,
  -- {factIds: [], sourceRevisions: {}}
  provenance jsonb not null default '{}'::jsonb,
  stale boolean not null default false,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_artifacts_id_user_key unique (id, user_id),
  constraint application_artifacts_app_same_owner
    foreign key (application_id, user_id) references public.job_applications (id, user_id) on delete cascade
);
create index application_artifacts_app_idx on public.application_artifacts (user_id, application_id, kind);
create trigger application_artifacts_touch before update on public.application_artifacts
  for each row execute function public.career_os_touch();
alter table public.application_artifacts enable row level security;
create policy "aa_select_own" on public.application_artifacts for select using (auth.uid() = user_id);
create policy "aa_insert_own" on public.application_artifacts for insert with check (auth.uid() = user_id);
create policy "aa_update_own" on public.application_artifacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "aa_delete_own" on public.application_artifacts for delete using (auth.uid() = user_id);

-- Application-linked resumes (tailored versions) and PRISM run binding.
alter table public.resumes
  add column application_id uuid,
  -- {kind:'prism'|'copy'|'manual', runId?, sourceResumeId?, sourceRevision?}
  add column origin jsonb,
  add column revision int not null default 1,
  add constraint resumes_application_same_owner
    foreign key (application_id, user_id) references public.job_applications (id, user_id) on delete set null (application_id);
create index resumes_application_idx on public.resumes (user_id, application_id) where application_id is not null;
drop trigger if exists resumes_set_updated_at on public.resumes;
create trigger resumes_touch before update on public.resumes
  for each row execute function public.career_os_touch();

alter table public.prism_runs
  add column application_id uuid,
  add column source_resume_id uuid,
  add column source_resume_revision int,
  add column idempotency_key text,
  add column action_run_id uuid,
  add constraint prism_runs_application_same_owner
    foreign key (application_id, user_id) references public.job_applications (id, user_id) on delete set null (application_id),
  add constraint prism_runs_source_resume_same_owner
    foreign key (source_resume_id, user_id) references public.resumes (id, user_id) on delete set null (source_resume_id);
create unique index prism_runs_idempotency_key
  on public.prism_runs (user_id, idempotency_key) where idempotency_key is not null;
create index prism_runs_application_idx on public.prism_runs (user_id, application_id, updated_at desc) where application_id is not null;

-- ---------------------------------------------------------------------------
-- Interview sessions and outcome observations
-- ---------------------------------------------------------------------------
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null,
  scheduled_at timestamptz,
  time_zone text,
  interview_type text not null default 'unknown'
    check (interview_type in ('phone','video','onsite','panel','technical','case','unknown')),
  -- [{id, theme, covered:boolean, sourceRequirementId?}]
  themes jsonb not null default '[]'::jsonb,
  story_fact_ids uuid[] not null default '{}',
  -- [{id, question, theme, answer, feedback:{strengths[],gaps[],citations[]}|null, answeredAt}]
  practice jsonb not null default '[]'::jsonb,
  readiness jsonb not null default '{}'::jsonb,
  self_reported_result text,
  recruiter_feedback text,
  status text not null default 'planned' check (status in ('planned','prepared','completed','cancelled')),
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interview_sessions_id_user_key unique (id, user_id),
  constraint interview_sessions_app_same_owner
    foreign key (application_id, user_id) references public.job_applications (id, user_id) on delete cascade
);
create index interview_sessions_app_idx on public.interview_sessions (user_id, application_id, scheduled_at);
create trigger interview_sessions_touch before update on public.interview_sessions
  for each row execute function public.career_os_touch();
alter table public.interview_sessions enable row level security;
create policy "is_select_own" on public.interview_sessions for select using (auth.uid() = user_id);
create policy "is_insert_own" on public.interview_sessions for insert with check (auth.uid() = user_id);
create policy "is_update_own" on public.interview_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "is_delete_own" on public.interview_sessions for delete using (auth.uid() = user_id);

create table public.application_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null,
  kind text not null check (kind in (
    'submitted','response','interview_scheduled','interview_completed','offer','rejected','withdrawn','accepted','no_response','correction')),
  observed_at timestamptz not null default now(),
  source text not null default 'user_reported' check (source in ('user_reported','system','connector')),
  details jsonb not null default '{}'::jsonb,
  supersedes_id uuid,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint application_outcomes_id_user_key unique (id, user_id),
  constraint application_outcomes_app_same_owner
    foreign key (application_id, user_id) references public.job_applications (id, user_id) on delete cascade,
  constraint application_outcomes_supersedes_same_owner
    foreign key (supersedes_id, user_id) references public.application_outcomes (id, user_id) on delete set null (supersedes_id)
);
create index application_outcomes_app_idx on public.application_outcomes (user_id, application_id, observed_at desc);
alter table public.application_outcomes enable row level security;
create policy "ao_select_own" on public.application_outcomes for select using (auth.uid() = user_id);
create policy "ao_insert_own" on public.application_outcomes for insert with check (auth.uid() = user_id);
create policy "ao_update_own" on public.application_outcomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ao_delete_own" on public.application_outcomes for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Fit analyses (versioned projections over opportunity + goal + facts)
-- ---------------------------------------------------------------------------
create table public.opportunity_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null,
  goal_id uuid,
  application_id uuid,
  opportunity_revision int not null,
  goal_revision int,
  facts_revision text not null default '',
  -- Hash of the listing inputs the fit was computed from (captured content +
  -- requirement ids), so a non-material opportunity update (status, merge
  -- bookkeeping) does not mark the analysis stale while a changed listing does.
  input_fingerprint text not null default '',
  engine_version text not null default '',
  -- {supported:[{requirementId,text,evidence:[factId]}], partial:[], missing:[], unknown:[]}
  qualification jsonb not null default '{}'::jsonb,
  -- {factors:[{key,label,verdict:'aligned'|'tension'|'unknown',detail}], constraints:[...], missing:[]}
  direction jsonb not null default '{}'::jsonb,
  ats_score int,
  hidden_by_constraint jsonb,
  stale boolean not null default false,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint opportunity_analyses_opp_same_owner
    foreign key (opportunity_id, user_id) references public.opportunities (id, user_id) on delete cascade,
  constraint opportunity_analyses_goal_same_owner
    foreign key (goal_id, user_id) references public.career_goals (id, user_id) on delete set null (goal_id),
  constraint opportunity_analyses_app_same_owner
    foreign key (application_id, user_id) references public.job_applications (id, user_id) on delete cascade
);
create index opportunity_analyses_opp_idx on public.opportunity_analyses (user_id, opportunity_id, computed_at desc);
alter table public.opportunity_analyses enable row level security;
create policy "oa_select_own" on public.opportunity_analyses for select using (auth.uid() = user_id);
create policy "oa_insert_own" on public.opportunity_analyses for insert with check (auth.uid() = user_id);
create policy "oa_update_own" on public.opportunity_analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "oa_delete_own" on public.opportunity_analyses for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Actions (shared queue for Today and Coach) and durable run receipts
-- ---------------------------------------------------------------------------
create table public.career_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_type text not null check (action_type in (
    'REVIEW_OPPORTUNITY','IMPROVE_ACHIEVEMENT','PREPARE_INTERVIEW','TAILOR_CV','FOLLOW_UP_APPLICATION',
    'UPDATE_SKILL','START_CAMPAIGN','REVIEW_PROFILE','COMPARE_ROLES','START_APPLICATION','RECORD_OUTCOME',
    'REVIEW_IMPORT','SET_GOAL','REVIEW_TAILORING','RESOLVE_CONFLICT','CAPTURE_ACHIEVEMENT')),
  title text not null,
  reason text not null default '',
  evidence_refs jsonb not null default '[]'::jsonb,
  priority_band text not null default 'soon' check (priority_band in ('now','soon','later')),
  -- {goal?:{id,revision}, campaign?, opportunity?, application?, document?, fact?}
  context_refs jsonb not null default '{}'::jsonb,
  input_revisions jsonb not null default '{}'::jsonb,
  source text not null default 'rule' check (source in ('rule','coach','user_reported','outcome_policy','proactive')),
  rule_version text not null default '',
  status text not null default 'READY' check (status in (
    'PROPOSED','READY','IN_PROGRESS','WAITING_FOR_USER','FAILED','COMPLETED','DISMISSED','EXPIRED')),
  dedupe_key text not null,
  destination jsonb not null default '{}'::jsonb,
  estimated_effort text,
  effort_source text,
  confidence numeric(4,3),
  snoozed_until timestamptz,
  expires_at timestamptz,
  dismissed_at timestamptz,
  completed_at timestamptz,
  completion_source text check (completion_source in ('durable_receipt','user_reported')),
  result_ref jsonb,
  last_error jsonb,
  resurfaced_reason text,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_actions_id_user_key unique (id, user_id),
  constraint career_actions_dedupe_key unique (user_id, dedupe_key)
);
create index career_actions_user_status_idx on public.career_actions (user_id, status, priority_band);
create trigger career_actions_touch before update on public.career_actions
  for each row execute function public.career_os_touch();
alter table public.career_actions enable row level security;
create policy "ca_select_own" on public.career_actions for select using (auth.uid() = user_id);
create policy "ca_insert_own" on public.career_actions for insert with check (auth.uid() = user_id);
create policy "ca_update_own" on public.career_actions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ca_delete_own" on public.career_actions for delete using (auth.uid() = user_id);

-- Server-owned execution receipts. Written by the action gateway (service
-- role); owners can read and delete their own receipts.
create table public.action_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_id uuid,
  tool text not null,
  status text not null default 'pending' check (status in (
    'pending','running','waiting_confirmation','completed','failed','cancelled')),
  idempotency_key text not null,
  attempt int not null default 1,
  request_id text not null default '',
  actor text not null default 'user' check (actor in ('user','coach','system')),
  context_revisions jsonb not null default '{}'::jsonb,
  -- Sanitised input summary: ids/revisions/counts only, never raw text.
  input_summary jsonb not null default '{}'::jsonb,
  result_ref jsonb,
  retryable boolean not null default false,
  failure_code text,
  -- {token, contentHash, destination, expiresAt, confirmedAt}
  confirmation jsonb,
  -- {kind, charged:boolean, released:boolean}
  usage jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint action_runs_id_user_key unique (id, user_id),
  constraint action_runs_idempotency_key unique (user_id, idempotency_key),
  constraint action_runs_action_same_owner
    foreign key (action_id, user_id) references public.career_actions (id, user_id) on delete set null (action_id)
);
create index action_runs_user_status_idx on public.action_runs (user_id, status, updated_at desc);
create trigger action_runs_touch before update on public.action_runs
  for each row execute function public.career_os_touch();
alter table public.action_runs enable row level security;
create policy "ar_select_own" on public.action_runs for select using (auth.uid() = user_id);
create policy "ar_delete_own" on public.action_runs for delete using (auth.uid() = user_id);
-- No client insert/update: the gateway edge function writes with service role.

-- ---------------------------------------------------------------------------
-- Coach conversations and messages
-- ---------------------------------------------------------------------------
create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  -- {goal?:{id,revision}, campaign?, opportunity?, application?}
  context_refs jsonb not null default '{}'::jsonb,
  summary text not null default '',
  summary_source_ids jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','archived')),
  last_message_at timestamptz,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_conversations_id_user_key unique (id, user_id)
);
create index coach_conversations_user_idx on public.coach_conversations (user_id, status, last_message_at desc);
create trigger coach_conversations_touch before update on public.coach_conversations
  for each row execute function public.career_os_touch();
alter table public.coach_conversations enable row level security;
create policy "cc_select_own" on public.coach_conversations for select using (auth.uid() = user_id);
create policy "cc_insert_own" on public.coach_conversations for insert with check (auth.uid() = user_id);
create policy "cc_update_own" on public.coach_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cc_delete_own" on public.coach_conversations for delete using (auth.uid() = user_id);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant','tool','system')),
  content text not null default '',
  -- [{kind:'fact'|'goal'|'opportunity'|'application'|'artifact', id, label}]
  citations jsonb not null default '[]'::jsonb,
  -- [{tool, input, confirmationRequired, actionRunId?}]
  proposals jsonb not null default '[]'::jsonb,
  action_run_id uuid,
  abstained boolean not null default false,
  created_at timestamptz not null default now(),
  constraint coach_messages_conversation_same_owner
    foreign key (conversation_id, user_id) references public.coach_conversations (id, user_id) on delete cascade,
  constraint coach_messages_run_same_owner
    foreign key (action_run_id, user_id) references public.action_runs (id, user_id) on delete set null (action_run_id)
);
create index coach_messages_conversation_idx on public.coach_messages (user_id, conversation_id, created_at);
alter table public.coach_messages enable row level security;
create policy "cm_select_own" on public.coach_messages for select using (auth.uid() = user_id);
create policy "cm_insert_own" on public.coach_messages for insert with check (auth.uid() = user_id);
create policy "cm_delete_own" on public.coach_messages for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Product/domain events (versioned envelope, no private text) and inbox
-- ---------------------------------------------------------------------------
create table public.career_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null,
  schema_version int not null default 1,
  subject_refs jsonb not null default '{}'::jsonb,
  correlation_id text not null default '',
  source text not null default 'client' check (source in ('client','server')),
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text,
  created_at timestamptz not null default now(),
  constraint career_events_dedupe_key unique (user_id, dedupe_key)
);
create index career_events_user_time_idx on public.career_events (user_id, occurred_at desc);
create index career_events_name_idx on public.career_events (event_name, occurred_at desc);
alter table public.career_events enable row level security;
create policy "ce_select_own" on public.career_events for select using (auth.uid() = user_id);
create policy "ce_insert_own" on public.career_events for insert with check (auth.uid() = user_id);
create policy "ce_delete_own" on public.career_events for delete using (auth.uid() = user_id);

-- Retention: product events older than 400 days are pruned (documented in
-- docs/career-os/evidence/COS-003-schema-adr.md); call from pg_cron/ops.
create or replace function public.career_prune_events()
returns void language sql security definer set search_path = public as $$
  delete from public.career_events where occurred_at < now() - interval '400 days';
$$;

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('information','action_required')),
  title text not null,
  body text not null default '',
  action_id uuid,
  dedupe_key text not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_notifications_dedupe_key unique (user_id, dedupe_key),
  constraint user_notifications_action_same_owner
    foreign key (action_id, user_id) references public.career_actions (id, user_id) on delete cascade
);
create index user_notifications_user_idx on public.user_notifications (user_id, created_at desc);
alter table public.user_notifications enable row level security;
create policy "un_select_own" on public.user_notifications for select using (auth.uid() = user_id);
create policy "un_insert_own" on public.user_notifications for insert with check (auth.uid() = user_id);
create policy "un_update_own" on public.user_notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "un_delete_own" on public.user_notifications for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Preferences (proactive assistance consent), scenarios, insights
-- ---------------------------------------------------------------------------
create table public.career_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  proactive_enabled boolean not null default false,
  consent_at timestamptz,
  time_zone text not null default 'UTC',
  -- {start:'22:00', end:'07:00'} local time; null = no quiet hours
  quiet_hours jsonb,
  daily_action_cap int not null default 3 check (daily_action_cap between 0 and 20),
  -- {interview:boolean, followUp:boolean, staleImport:boolean, evidenceGap:boolean}
  triggers jsonb not null default '{}'::jsonb,
  last_proactive_run_at timestamptz,
  -- {lastEvaluatedRevision, lastRunId}
  checkpoint jsonb not null default '{}'::jsonb,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger career_preferences_touch before update on public.career_preferences
  for each row execute function public.career_os_touch();
alter table public.career_preferences enable row level security;
create policy "cp_select_own" on public.career_preferences for select using (auth.uid() = user_id);
create policy "cp_insert_own" on public.career_preferences for insert with check (auth.uid() = user_id);
create policy "cp_update_own" on public.career_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cp_delete_own" on public.career_preferences for delete using (auth.uid() = user_id);

create table public.career_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  kind text not null default 'goals' check (kind in ('goals','offers','mixed')),
  -- [{id, label, refs:{goalId?, opportunityId?, applicationId?}, inputs:{...}}]
  options jsonb not null default '[]'::jsonb,
  -- [{key, weight, label}]
  priorities jsonb not null default '[]'::jsonb,
  -- [{id, optionId?, text, source:'user'}]
  assumptions jsonb not null default '[]'::jsonb,
  result jsonb,
  revision int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index career_scenarios_user_idx on public.career_scenarios (user_id, updated_at desc);
create trigger career_scenarios_touch before update on public.career_scenarios
  for each row execute function public.career_os_touch();
alter table public.career_scenarios enable row level security;
create policy "cs_select_own" on public.career_scenarios for select using (auth.uid() = user_id);
create policy "cs_insert_own" on public.career_scenarios for insert with check (auth.uid() = user_id);
create policy "cs_update_own" on public.career_scenarios for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cs_delete_own" on public.career_scenarios for delete using (auth.uid() = user_id);

create table public.career_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  statement text not null,
  cohort jsonb not null default '{}'::jsonb,
  sample_size int not null default 0,
  denominator int not null default 0,
  missing_outcomes int not null default 0,
  observation_window jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  policy_version text not null default '',
  status text not null default 'active' check (status in ('active','stale','revoked')),
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index career_insights_user_idx on public.career_insights (user_id, status, computed_at desc);
alter table public.career_insights enable row level security;
create policy "ci_select_own" on public.career_insights for select using (auth.uid() = user_id);
create policy "ci_insert_own" on public.career_insights for insert with check (auth.uid() = user_id);
create policy "ci_update_own" on public.career_insights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ci_delete_own" on public.career_insights for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Per-user migration ledger (restartable backfill, old -> new mappings)
-- ---------------------------------------------------------------------------
create table public.career_migrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  migration text not null,
  item_kind text not null,
  old_id text not null,
  new_id uuid,
  status text not null default 'done' check (status in ('pending','done','failed','skipped')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_migrations_unique unique (user_id, migration, item_kind, old_id)
);
alter table public.career_migrations enable row level security;
create policy "cmg_select_own" on public.career_migrations for select using (auth.uid() = user_id);
create policy "cmg_delete_own" on public.career_migrations for delete using (auth.uid() = user_id);

-- Expand/backfill for one user. Idempotent and restartable: deterministic ids
-- plus the ledger make a repeated call a no-op. Never touches legacy values,
-- never infers employers/outcomes from demo data (rows with company AND role
-- both empty are skipped), never marks an imported fact as verified.
create or replace function public.career_os_migrate_user(p_user uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_version constant int := 1;
  v_app record;
  v_opp_id uuid;
  v_resume record;
  v_item jsonb;
  v_fact_id uuid;
  v_facts int := 0;
  v_opps int := 0;
  v_skipped int := 0;
  v_idx int;
  v_profile record;
begin
  if p_user is null or (auth.uid() is not null and auth.uid() <> p_user) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('career_os_migrate:' || p_user::text));

  insert into public.career_profiles (user_id) values (p_user) on conflict (user_id) do nothing;

  -- 1. Legacy tracker rows -> opportunities (same application id kept).
  for v_app in
    select * from public.job_applications where user_id = p_user and opportunity_id is null
  loop
    if coalesce(v_app.company, '') = '' and coalesce(v_app.role, '') = '' then
      insert into public.career_migrations (user_id, migration, item_kind, old_id, status, error)
        values (p_user, 'career_os_v1', 'job_application', v_app.id::text, 'skipped', 'empty_company_and_role')
        on conflict do nothing;
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_opp_id := public.career_os_uuid('opportunity:legacy', v_app.id::text);
    insert into public.opportunities (
      id, user_id, title, company, source_url, source_kind, captured_content, captured_at,
      status, legacy_application_id, listing_status)
    values (
      v_opp_id, p_user, coalesce(v_app.role, ''), coalesce(v_app.company, ''), v_app.url, 'tracker_migration', '',
      v_app.created_at,
      case when v_app.status = 'wishlist' then 'saved' when v_app.status = 'rejected' then 'archived' else 'applied' end,
      v_app.id, 'unknown')
    on conflict (id) do nothing;
    update public.job_applications set opportunity_id = v_opp_id
      where id = v_app.id and user_id = p_user and opportunity_id is null;
    insert into public.career_migrations (user_id, migration, item_kind, old_id, new_id, status)
      values (p_user, 'career_os_v1', 'job_application', v_app.id::text, v_opp_id, 'done')
      on conflict (user_id, migration, item_kind, old_id) do update set new_id = excluded.new_id, status = 'done', updated_at = now();
    v_opps := v_opps + 1;
  end loop;

  -- 2. Candidate facts from the primary resume (unconfirmed, provenance kept).
  select * into v_resume from public.resumes where user_id = p_user and is_primary limit 1;
  if found then
    for v_item in select * from jsonb_array_elements(coalesce(v_resume.data -> 'experience', '[]'::jsonb)) loop
      v_fact_id := public.career_os_uuid('fact:experience:' || v_resume.id::text, coalesce(v_item ->> 'id', md5(v_item::text)));
      insert into public.career_facts (id, user_id, kind, title, organization, location, start_date, end_date, narrative,
        confirmation_state, source_kind, source_ref, source_fingerprint, legacy_id, review_state)
      values (v_fact_id, p_user, 'experience', coalesce(v_item ->> 'jobTitle', ''), coalesce(v_item ->> 'company', ''),
        coalesce(v_item ->> 'location', ''), coalesce(v_item ->> 'startDate', ''), coalesce(v_item ->> 'endDate', ''),
        coalesce(v_item ->> 'description', ''), 'inferred', 'legacy_import',
        jsonb_build_object('resumeId', v_resume.id, 'section', 'experience'),
        md5('experience|' || lower(coalesce(v_item ->> 'jobTitle', '')) || '|' || lower(coalesce(v_item ->> 'company', '')) || '|' || coalesce(v_item ->> 'startDate', '')),
        v_item ->> 'id', 'candidate')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end loop;
    for v_item in select * from jsonb_array_elements(coalesce(v_resume.data -> 'education', '[]'::jsonb)) loop
      v_fact_id := public.career_os_uuid('fact:education:' || v_resume.id::text, coalesce(v_item ->> 'id', md5(v_item::text)));
      insert into public.career_facts (id, user_id, kind, title, organization, location, start_date, end_date, narrative,
        confirmation_state, source_kind, source_ref, source_fingerprint, legacy_id, review_state)
      values (v_fact_id, p_user, 'education', coalesce(v_item ->> 'degree', ''), coalesce(v_item ->> 'school', ''),
        coalesce(v_item ->> 'location', ''), coalesce(v_item ->> 'startDate', ''), coalesce(v_item ->> 'endDate', ''),
        coalesce(v_item ->> 'description', ''), 'inferred', 'legacy_import',
        jsonb_build_object('resumeId', v_resume.id, 'section', 'education'),
        md5('education|' || lower(coalesce(v_item ->> 'degree', '')) || '|' || lower(coalesce(v_item ->> 'school', ''))),
        v_item ->> 'id', 'candidate')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end loop;
    v_idx := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_resume.data -> 'skills', '[]'::jsonb)) loop
      v_idx := v_idx + 1;
      if jsonb_typeof(v_item) <> 'string' or trim(v_item #>> '{}') = '' then continue; end if;
      v_fact_id := public.career_os_uuid('fact:skill:' || v_resume.id::text, lower(trim(v_item #>> '{}')));
      insert into public.career_facts (id, user_id, kind, title, confirmation_state, source_kind, source_ref,
        source_fingerprint, review_state, sort_order)
      values (v_fact_id, p_user, 'skill', trim(v_item #>> '{}'), 'inferred', 'legacy_import',
        jsonb_build_object('resumeId', v_resume.id, 'section', 'skills'),
        md5('skill|' || lower(trim(v_item #>> '{}'))), 'candidate', v_idx)
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end loop;
    for v_item in select * from jsonb_array_elements(coalesce(v_resume.data -> 'projects', '[]'::jsonb)) loop
      v_fact_id := public.career_os_uuid('fact:project:' || v_resume.id::text, coalesce(v_item ->> 'id', md5(v_item::text)));
      insert into public.career_facts (id, user_id, kind, title, start_date, end_date, narrative, payload,
        confirmation_state, source_kind, source_ref, source_fingerprint, legacy_id, review_state)
      values (v_fact_id, p_user, 'project', coalesce(v_item ->> 'name', ''), coalesce(v_item ->> 'startDate', ''),
        coalesce(v_item ->> 'endDate', ''), coalesce(v_item ->> 'description', ''),
        jsonb_build_object('technologies', coalesce(v_item ->> 'technologies', ''), 'link', coalesce(v_item ->> 'link', '')),
        'inferred', 'legacy_import', jsonb_build_object('resumeId', v_resume.id, 'section', 'projects'),
        md5('project|' || lower(coalesce(v_item ->> 'name', ''))), v_item ->> 'id', 'candidate')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end loop;
    for v_item in select * from jsonb_array_elements(coalesce(v_resume.data -> 'certifications', '[]'::jsonb)) loop
      v_fact_id := public.career_os_uuid('fact:certification:' || v_resume.id::text, coalesce(v_item ->> 'id', md5(v_item::text)));
      insert into public.career_facts (id, user_id, kind, title, end_date, narrative, payload,
        confirmation_state, source_kind, source_ref, source_fingerprint, legacy_id, review_state)
      values (v_fact_id, p_user, 'certification', coalesce(v_item ->> 'name', ''), coalesce(v_item ->> 'expiryDate', ''),
        coalesce(v_item ->> 'description', ''), jsonb_build_object('number', coalesce(v_item ->> 'number', '')),
        'inferred', 'legacy_import', jsonb_build_object('resumeId', v_resume.id, 'section', 'certifications'),
        md5('certification|' || lower(coalesce(v_item ->> 'name', ''))), v_item ->> 'id', 'candidate')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end loop;
    if coalesce(v_resume.data #>> '{summary,professionalSummary}', '') <> '' then
      v_fact_id := public.career_os_uuid('fact:summary', v_resume.id::text);
      insert into public.career_facts (id, user_id, kind, title, narrative, confirmation_state, source_kind, source_ref,
        source_fingerprint, review_state)
      values (v_fact_id, p_user, 'summary', 'Professional summary', v_resume.data #>> '{summary,professionalSummary}',
        'inferred', 'legacy_import', jsonb_build_object('resumeId', v_resume.id, 'section', 'summary'),
        md5('summary|' || v_resume.id::text), 'candidate')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end if;
    insert into public.career_migrations (user_id, migration, item_kind, old_id, new_id, status)
      values (p_user, 'career_os_v1', 'resume_facts', v_resume.id::text, null, 'done')
      on conflict (user_id, migration, item_kind, old_id) do update set status = 'done', updated_at = now();
  end if;

  -- 3. Specialised legacy profile fields are preserved as profile_field facts.
  select * into v_profile from public.profiles where id = p_user;
  if found then
    if coalesce(v_profile.job_title, '') <> '' then
      insert into public.career_facts (id, user_id, kind, title, payload, confirmation_state, source_kind, source_ref, source_fingerprint, review_state)
      values (public.career_os_uuid('fact:profile', p_user::text || ':job_title'), p_user, 'profile_field', 'Current title',
        jsonb_build_object('field', 'jobTitle', 'value', v_profile.job_title), 'user_confirmed', 'profile',
        jsonb_build_object('profile', true), md5('profile|job_title'), 'reviewed')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end if;
    if coalesce(array_length(v_profile.care_specialties, 1), 0) > 0 then
      insert into public.career_facts (id, user_id, kind, title, payload, confirmation_state, source_kind, source_ref, source_fingerprint, review_state)
      values (public.career_os_uuid('fact:profile', p_user::text || ':care_specialties'), p_user, 'profile_field', 'Care specialties',
        jsonb_build_object('field', 'careSpecialties', 'value', to_jsonb(v_profile.care_specialties)), 'user_confirmed', 'profile',
        jsonb_build_object('profile', true), md5('profile|care_specialties'), 'reviewed')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end if;
    if coalesce(v_profile.licensed_state, '') <> '' then
      insert into public.career_facts (id, user_id, kind, title, payload, confirmation_state, source_kind, source_ref, source_fingerprint, review_state)
      values (public.career_os_uuid('fact:profile', p_user::text || ':licensed_state'), p_user, 'profile_field', 'Licensed state',
        jsonb_build_object('field', 'licensedState', 'value', v_profile.licensed_state), 'user_confirmed', 'profile',
        jsonb_build_object('profile', true), md5('profile|licensed_state'), 'reviewed')
      on conflict do nothing;
      if found then v_facts := v_facts + 1; end if;
    end if;
  end if;

  update public.career_profiles
    set migration_version = greatest(migration_version, v_version), migrated_at = coalesce(migrated_at, now())
    where user_id = p_user;

  return jsonb_build_object('version', v_version, 'opportunities', v_opps, 'facts', v_facts, 'skipped', v_skipped);
end; $$;
revoke all on function public.career_os_migrate_user(uuid) from public, anon;
grant execute on function public.career_os_migrate_user(uuid) to authenticated, service_role;

-- Rollback reconciliation: after switching a cohort back to the legacy UI, make
-- every legacy-readable projection reflect writes made through the new model
-- (stage -> status, opportunity company/title -> tracker company/role). New
-- rows are retained; nothing is deleted.
create or replace function public.career_os_reconcile_legacy(p_user uuid default auth.uid())
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int := 0;
begin
  if p_user is null or (auth.uid() is not null and auth.uid() <> p_user) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.job_applications a
    set company = case when coalesce(a.company, '') = '' then o.company else a.company end,
        role = case when coalesce(a.role, '') = '' then o.title else a.role end,
        url = coalesce(a.url, o.source_url),
        stage = a.stage
    from public.opportunities o
    where a.user_id = p_user and o.id = a.opportunity_id and o.user_id = p_user;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;
revoke all on function public.career_os_reconcile_legacy(uuid) from public, anon;
grant execute on function public.career_os_reconcile_legacy(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Feature flag: Career OS cohort rollout (client shell + server gateway share
-- the same flag). Off by default; the local seed enables it for development.
-- ---------------------------------------------------------------------------
insert into public.feature_flags (flag, enabled, rollout_pct)
  values ('career_os', true, 0)
  on conflict (flag) do nothing;

-- ---------------------------------------------------------------------------
-- Retention helper for stale receipts and expired actions.
-- ---------------------------------------------------------------------------
create or replace function public.career_prune_runs()
returns void language sql security definer set search_path = public as $$
  delete from public.action_runs
   where status in ('failed','cancelled') and updated_at < now() - interval '90 days';
  update public.career_actions set status = 'EXPIRED'
   where status in ('PROPOSED','READY') and expires_at is not null and expires_at < now();
$$;
