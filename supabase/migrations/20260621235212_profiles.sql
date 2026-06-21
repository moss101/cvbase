-- profiles: one row per auth user. Snake_case columns map to the TS UserProfile.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  job_title text not null default '',
  industry text not null default '',
  experience_years text not null default '',
  bio text not null default '',
  care_specialties text[] not null default '{}',
  certifications text[] not null default '{}',
  availability text not null default '',
  licensed_state text not null default '',
  linkedin text not null default '',
  github text not null default '',
  portfolio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Auto-provision a profile whenever a new auth user is created (email OR OAuth).
-- Names come from sign-up metadata (email) or Google identity (given/family name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name',  new.raw_user_meta_data ->> 'family_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
