-- Per-call token split and cost on llm_call_logs.
--
-- `tokens` stays as the prompt + completion sum so existing dashboards keep
-- working; the new columns let cost be attributed correctly (output tokens
-- are 3-5x the price of input on every provider we route to). `cost_usd` is
-- an estimate from the price table in _shared/llm/config.ts (overridable via
-- the LLM_PRICES env var) and is NULL — never 0 — when the model has no
-- known price, so "unpriced" is distinguishable from "free".
--
-- `cached` marks a row served from llm_response_cache without a provider
-- call (tokens are 0 on those rows). Older rows keep NULLs for the new
-- token columns; only `cached` gets a default because it is a flag.

alter table public.llm_call_logs
  add column if not exists prompt_tokens int,
  add column if not exists completion_tokens int,
  add column if not exists cost_usd numeric(12, 6),
  add column if not exists cached boolean not null default false;

comment on column public.llm_call_logs.tokens is
  'prompt_tokens + completion_tokens (legacy total; 0 on cache hits)';
comment on column public.llm_call_logs.prompt_tokens is
  'Input tokens as reported by the provider usage block; NULL on rows written before this column existed';
comment on column public.llm_call_logs.completion_tokens is
  'Output tokens as reported by the provider usage block; NULL on rows written before this column existed';
comment on column public.llm_call_logs.cost_usd is
  'Estimated USD cost from the LLM_PRICES table; NULL when the model is unpriced (not 0)';
comment on column public.llm_call_logs.cached is
  'True when the response was served from llm_response_cache without a provider call';

-- Spend-by-provider/model over a window is the query this table exists for.
create index if not exists llm_call_logs_provider_model_created_idx
  on public.llm_call_logs (provider, model, created_at desc);
