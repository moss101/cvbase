-- Runtime-editable LLM provider configuration.
--
-- Moves what used to live only in `supabase secrets` into a table so the admin
-- panel can add and re-point providers without a deploy. The env vars remain
-- the fallback: an empty table means the router behaves exactly as before, so
-- this migration is safe to apply before any row exists.

create table if not exists public.llm_providers (
  id uuid primary key default gen_random_uuid(),
  -- Matches ProviderId in supabase/functions/_shared/llm/types.ts.
  provider_id text not null unique,
  -- Which wire format to speak: 'openai' (chat-completions) or 'anthropic'.
  dialect text not null default 'openai'
    check (dialect in ('openai', 'anthropic')),
  display_name text not null default '',
  base_url text not null default '',
  model_full text not null default '',
  model_lite text not null default '',
  -- Pooled round-robin keys. SECRET — see the RLS note below. Never selected
  -- into any client response; the admin function returns masked previews only.
  api_keys text[] not null default '{}',
  enabled boolean not null default true,
  -- 'primary' is tried first, 'fallback' second, 'off' is never routed to.
  role text not null default 'off'
    check (role in ('primary', 'fallback', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one primary and one fallback, enforced by the database rather than by
-- the admin UI, so a concurrent update cannot produce two primaries.
create unique index if not exists llm_providers_one_primary
  on public.llm_providers (role) where role = 'primary';
create unique index if not exists llm_providers_one_fallback
  on public.llm_providers (role) where role = 'fallback';

alter table public.llm_providers enable row level security;

-- ---------------------------------------------------------------------------
-- No policies at all — deliberately.
--
-- This table holds provider API keys. Any select policy, even one gated on
-- is_admin(), would let a compromised admin session exfiltrate every key
-- straight from PostgREST. Only service_role (which bypasses RLS) reads it:
-- the router reads it server-side, and the admin edge function returns masked
-- previews. There is no path from a browser to a plaintext key.
-- ---------------------------------------------------------------------------

create or replace function public.touch_llm_providers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists llm_providers_touch_updated_at on public.llm_providers;
create trigger llm_providers_touch_updated_at
  before update on public.llm_providers
  for each row execute function public.touch_llm_providers_updated_at();
