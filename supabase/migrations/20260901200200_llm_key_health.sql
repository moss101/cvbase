-- Cross-isolate API-key health for the router's key pool (_shared/llm/keyPool.ts).
--
-- Key cooldowns (a 401/402 → long cooldown, a 429 → short one) live in an
-- in-memory map inside each edge isolate, so every cold start walks the pool
-- from key 0 and re-discovers a dead key the expensive way. This table lets a
-- fresh isolate skip keys another isolate has already found to be on
-- cooldown. It is consulted strictly best-effort: a missing table, a failed
-- read or a racing write never affects a call, and an expired row is simply
-- ignored. No key material is stored — only the pool index.

create table if not exists public.llm_key_health (
  -- Matches ProviderId in _shared/llm/types.ts.
  provider_id text not null,
  -- Position in the provider's api_keys pool, not the key itself.
  key_index int not null check (key_index >= 0),
  cooldown_until timestamptz not null,
  -- FailureKind that set the cooldown ('auth', 'balance', 'rate_limit').
  reason text not null default '',
  updated_at timestamptz not null default now(),
  primary key (provider_id, key_index)
);

create index if not exists llm_key_health_cooldown_until_idx
  on public.llm_key_health (cooldown_until);

alter table public.llm_key_health enable row level security;
-- No policies: service_role only (same convention as llm_providers). The
-- rows reveal which pool slots are failing, which is an operational signal
-- that has no business being readable from a browser.
