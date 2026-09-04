-- Opt-in LLM response cache (see _shared/llm/cache.ts).
--
-- `key` is a sha256 over provider/model, system + user prompt, and the
-- normalised output schema, so a prompt edit, a model swap or a schema change
-- never serves a stale shape. `response` is the router's own
-- `{ content?, data? }` payload. Nothing is written unless a caller passes
-- `cache: { ttlSec }`, so applying this migration changes no behaviour.
--
-- Rows outlive their TTL until pruned: reads check `expires_at` themselves,
-- and `llm_cache_prune()` deletes the expired ones. The ops scheduling
-- migration (20260901400000) already calls it when it exists; there is no
-- pg_cron on this project, so it is invoked from that ops task.

create table if not exists public.llm_response_cache (
  key text primary key,
  model text not null default '',
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists llm_response_cache_expires_at_idx
  on public.llm_response_cache (expires_at);

alter table public.llm_response_cache enable row level security;
-- No policies: cached responses can contain a user's resume text, and the
-- key is not user-scoped, so only service_role (which bypasses RLS) may
-- touch this table. The router reads and writes it server-side.

create or replace function public.llm_cache_prune()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  removed bigint;
begin
  delete from public.llm_response_cache where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function public.llm_cache_prune() from public, anon, authenticated;
grant execute on function public.llm_cache_prune() to service_role;

comment on function public.llm_cache_prune() is
  'Deletes expired llm_response_cache rows; returns the number removed. service_role only.';
