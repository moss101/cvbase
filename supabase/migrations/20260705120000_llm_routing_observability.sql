-- LLM provider-routing observability: which provider/key-pool slot served
-- each PRISM agent call and whether a fallback was triggered (and why),
-- plus a provider-wide operational log for the 4 direct-caller AI functions.

-- prism_agent_logs: additive, backward-compatible columns ---------------------
alter table public.prism_agent_logs
  add column provider text,
  add column key_slot int,
  add column used_fallback boolean not null default false,
  add column fallback_reason text;

-- llm_call_logs ----------------------------------------------------------------
-- Global operational signal (how often fallback fires, which provider is
-- actually serving traffic) — not a per-request audit trail. No user_id or
-- function column: the shared _shared/llm/router.ts module has no caller
-- context, and threading one in would mean adding an argument to every
-- llmJson/llmText call site. Per-request/user attribution already exists via
-- ai_logs and the now-enriched prism_agent_logs above. Service-role only.
create table public.llm_call_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null default '',
  key_slot int,
  used_fallback boolean not null default false,
  fallback_reason text,
  tokens int not null default 0,
  status text not null default 'ok' check (status in ('ok', 'error')),
  latency_ms int not null default 0,
  created_at timestamptz not null default now()
);
create index llm_call_logs_created_at_idx on public.llm_call_logs (created_at desc);
alter table public.llm_call_logs enable row level security;
-- No policies: service_role only, same convention as prism_agent_logs.
