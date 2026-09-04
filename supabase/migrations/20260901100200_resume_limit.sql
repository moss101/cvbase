-- Server-side resume limit.
--
-- The client already hides the "new resume" button at the plan limit
-- (canCreateResume in services/subscriptionService.ts), but nothing stopped a
-- direct PostgREST insert. This trigger makes the limit real: a BEFORE INSERT
-- on public.resumes raises `resume_limit_reached` when the user is at/over
-- their plan's allowance.
--
-- How the error reaches the client: PostgREST maps a P0001 RAISE to
-- HTTP 400 {"code":"P0001","message":"resume_limit_reached",...}; supabase-js
-- surfaces that as a PostgrestError, which services/repos/resumeRepo.ts
-- rethrows, so callers can match `err.message === 'resume_limit_reached'`.

-- Per-plan allowance (-1 = unlimited). MUST stay in sync with
-- PLANS[].limits.resumes in services/subscriptionService.ts
-- (free: 1, pro: -1, elite: -1).
create or replace function public.resume_limit_for(plan_id text)
returns int
language sql
immutable
as $$
  select case plan_id
    when 'pro'   then -1
    when 'elite' then -1
    else 1
  end;
$$;

comment on function public.resume_limit_for(text) is
  'Resumes allowed per plan (-1 = unlimited). Mirrors PLANS[].limits.resumes in services/subscriptionService.ts.';

-- The plan a user is currently entitled to, derived from `subscriptions`:
--   active / trialing                                   -> plan_id
--   past_due with current_period_end in the last 21 days -> plan_id (grace)
--   anything else / no row                                -> 'free'
-- Keep the grace rule aligned with supabase/functions/_shared/entitlement.ts.
create or replace function public.effective_plan_for(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select s.plan_id
    from public.subscriptions s
    where s.user_id = p_user
      and (
        s.status in ('active', 'trialing')
        or (
          s.status = 'past_due'
          and s.current_period_end is not null
          and s.current_period_end >= now() - interval '21 days'
        )
      )
  ), 'free');
$$;

revoke all on function public.effective_plan_for(uuid) from public, anon, authenticated;
grant execute on function public.effective_plan_for(uuid) to service_role;

-- BEFORE INSERT guard. SECURITY DEFINER so the count and the plan lookup are
-- not subject to the caller's RLS (service_role inserts from edge functions
-- and the owner's own inserts both see the same truth).
create or replace function public.enforce_resume_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  cnt int;
begin
  -- An upsert of an existing row (resumeRepo.upsertPrimary sends the id) is
  -- an update in disguise: it never adds a resume, so it is never limited.
  if new.id is not null and exists (select 1 from public.resumes r where r.id = new.id) then
    return new;
  end if;

  lim := public.resume_limit_for(public.effective_plan_for(new.user_id));
  if lim < 0 then
    return new;
  end if;

  -- Serialize concurrent inserts for this user so two parallel creates
  -- cannot both read count = 0 and both pass a limit of 1.
  perform pg_advisory_xact_lock(hashtext('resume_limit'), hashtext(new.user_id::text));

  select count(*) into cnt from public.resumes r where r.user_id = new.user_id;
  if cnt >= lim then
    raise exception using
      errcode = 'P0001',
      message = 'resume_limit_reached',
      detail  = format('plan allows %s resume(s), user has %s', lim, cnt),
      hint    = 'upgrade';
  end if;

  return new;
end;
$$;

drop trigger if exists resumes_enforce_limit on public.resumes;
create trigger resumes_enforce_limit
  before insert on public.resumes
  for each row execute function public.enforce_resume_limit();
