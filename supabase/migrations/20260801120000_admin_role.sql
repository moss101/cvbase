-- Admin role, privilege-escalation guard, and the audit log.
--
-- Admin is a flag on profiles rather than a separate table: there is already
-- exactly one row per auth user with RLS on it, and a join table would add a
-- second place for the two to disagree.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- Privilege-escalation guard.
--
-- `profiles_update_own` (see 20260621235212_profiles.sql) lets a user update
-- their own row — which, with is_admin now living on that row, would let any
-- signed-in user grant themselves admin with a single PATCH. RLS policies
-- cannot restrict individual columns, so the column is pinned by a trigger
-- instead: a non-superuser update silently keeps the stored value.
--
-- Admin is therefore only grantable out-of-band (SQL console / service_role),
-- which is the intent — there is no in-app path to becoming an admin.
-- ---------------------------------------------------------------------------
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- `service_role` bypasses RLS and is the only caller allowed to change the
  -- flag. current_setting returns the PostgREST-supplied role for API calls.
  if current_setting('request.jwt.claims', true) is not null
     and coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role'
  then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_is_admin on public.profiles;
create trigger profiles_protect_is_admin
  before update on public.profiles
  for each row execute function public.protect_is_admin();

-- ---------------------------------------------------------------------------
-- Reusable predicate for admin-gated policies on other tables.
--
-- SECURITY DEFINER so it can read profiles regardless of the caller's own RLS,
-- STABLE so the planner can cache it per statement, and search_path pinned so a
-- caller cannot shadow `profiles` with a temp table.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log. Append-only: admins can read, nobody can update or delete through
-- the API (no policies for those commands), and writes go through the
-- service_role in the admin edge function so entries cannot be forged by a
-- client.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text not null default '',
  action text not null,
  target_type text not null default '',
  target_id text not null default '',
  -- Never store secrets here; the admin function redacts before writing.
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log_select_admin" on public.admin_audit_log
  for select using (public.is_admin());
-- No insert/update/delete policies: only service_role (which bypasses RLS) writes.

-- Admins may read every profile, in addition to the existing own-row policy.
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());
