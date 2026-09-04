# Admin panel

A narrow admin surface for the things the Supabase dashboard handles badly:
live LLM provider routing, an operational view (alerts, LLM calls, PRISM runs,
per-user usage), a health probe, and an audit trail. User and subscription
*editing* is deliberately not here — Studio already does that well, and every
extra write path is another thing to secure.

## Granting admin

There is **no in-app path to becoming an admin**. `profiles.is_admin` is pinned
by a trigger (`protect_is_admin`) that silently reverts any change made by a
non-`service_role` caller, so a user cannot grant it to themselves through the
API even though they can otherwise update their own profile row.

Grant it from the SQL editor:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

Revoke the same way. Because the flag is only settable out-of-band, a
compromised admin session cannot mint more admins.

## The security model

Three layers, each doing one job:

1. **`llm_providers` has no RLS policies at all.** Not "admins can read" — none.
   The table holds provider API keys, and any select policy would let a stolen
   admin session pull every key straight out of PostgREST. Only `service_role`,
   which bypasses RLS, can read it.
2. **The `admin` Edge Function is the only way in.** It re-reads
   `profiles.is_admin` with the service-role client on *every* request rather
   than trusting the caller's JWT, which can be stale after a demotion.
3. **Keys are write-only.** They can be set and replaced from the panel, and
   come back only as masked previews (`sk-p••••1f9c`). There is no code path
   that returns a plaintext key to a browser.

The panel hiding itself from non-admins is cosmetic. The function is what
refuses them — it returns the same `403 not_admin` whether the caller is a
non-admin or has no profile at all, so it cannot be used to enumerate accounts.

## LLM provider routing

The router prefers rows in `llm_providers` and falls back to the environment
variables when the table is empty or unreachable — so applying the migration
changes nothing until you add a row, and a database problem can never be the
reason a generation fails.

| Field | Notes |
| --- | --- |
| `provider_id` | Matches `ProviderId` in `_shared/llm/types.ts`. Use `custom` for a host that isn't one of the built-ins. |
| `dialect` | The wire format to speak: `openai` (chat-completions) or `anthropic` (Messages API). When set, the router picks the adapter **by dialect, not by provider id** — so `custom` (or any built-in id pointed at an aggregator) can talk Anthropic's API. A provider with no adapter for its id and no dialect fails fast with `500 llm_config_error` rather than falling back. The env equivalent is `<PREFIX>_DIALECT` (e.g. `CUSTOM_LLM_DIALECT=anthropic`). |
| `base_url` / `model_full` / `model_lite` | Blank inherits the built-in default for that provider. `base_url` must pass the SSRF check below or the row is skipped with a warning. |
| `api_keys` | Pooled round-robin. **Blank on save keeps the stored keys** — so editing a model doesn't require retyping secrets. |
| `role` | `primary`, `fallback`, or `off`. At most one of each, enforced by partial unique indexes rather than by the UI, so two concurrent saves can't both win. |

Saving takes effect on the next generation — no redeploy. That is the whole
point of the table.

### Adding a provider that isn't built in

Set `provider_id` to `custom`, pick the dialect, and give it a base URL, model
and key. Any OpenAI-compatible endpoint works with no code change; an
Anthropic-compatible one needs only `dialect = anthropic`.

### Base URL validation (`LLM_ALLOWED_HOSTS`)

The router POSTs an API key to whatever `base_url` a row holds, so a
compromised admin session must not be able to point it at the cloud metadata
endpoint or an attacker's host. `validateProviderBaseUrl` in
`_shared/llm/config.ts` enforces, for every row read from the table:

- `https` only, no credentials in the URL;
- no `localhost`, `*.local`, `*.internal`, `metadata.google.internal`;
- no loopback, private (RFC 1918, CGNAT), link-local (`169.254/16`,
  `fe80::/10`), unique-local or IPv4-mapped IPv6 addresses;
- when `LLM_ALLOWED_HOSTS` is set (comma-separated; `example.com` also
  matches its subdomains), the host must be on that list.

A row that fails is **skipped with a warning** and the provider's env
defaults apply — a bad save degrades to "no override", it never breaks
routing. The `admin` function can call the same export to reject a bad URL at
save time with a 400. Env-supplied base URLs are trusted as deployment config
and are not checked.

### Config cache

Rows are cached in-memory for `LLM_CONFIG_CACHE_TTL_MS` (20 s) per isolate;
env values are never cached and are re-read on every call. After a write in
the same isolate call `invalidateLlmConfigCache()`; other isolates converge
within 20 s, which is also the longest a rotated key can still be used.

### Retries and backoff

Per key: one attempt plus `LLM_RETRIES_PER_KEY` retries on transient errors
(default `2`, so 3 attempts), with full-jitter exponential backoff from
`LLM_BACKOFF_BASE_MS` (default `800`, capped at 10 s). Auth, balance and
rate-limit errors rotate to the next key immediately. Only a fully exhausted
primary pool falls back to the fallback provider.

Key cooldowns are also written to `llm_key_health` (best-effort, no key
material, service-role only) so a cold isolate skips a slot another isolate
already found dead. A missing table is harmless.

## Cost and usage

Every routed call writes one `llm_call_logs` row with `prompt_tokens`,
`completion_tokens`, `tokens` (the sum) and `cost_usd`. Gemini calls
(`_shared/gemini.ts`, headshot + PDF extraction) are metered into the same
table under provider `gemini` even though they bypass the router.

Cost comes from the price table in `_shared/llm/config.ts` (USD per 1M
tokens, matched by exact model id then longest prefix). Those seed numbers go
stale; override or extend them without a deploy via `LLM_PRICES`:

```bash
supabase secrets set LLM_PRICES='{"deepseek-v4-pro":{"in":0.55,"out":2.19},"my-model":{"in":1,"out":3}}'
```

An unpriced model logs `cost_usd = NULL`, never `0`, so a missing price is
visible rather than counted as free.

```sql
select provider, model, count(*), sum(tokens) tokens, sum(cost_usd) usd
from public.llm_call_logs
where created_at > now() - interval '7 days'
group by 1, 2 order by usd desc nulls last;
```

## Response cache

Off by default. A caller opts in per call — `llmJson(prompt, schema, system,
{ cache: { ttlSec: 3600 } })`, or the same option on `llmText` /
`llmJsonMetered` — and only then is `llm_response_cache` consulted or
written. The key is a sha256 over provider/model, system + user prompt and the
normalised output schema, so a prompt edit, model swap or schema change never
serves a stale shape. Hits log a `cached = true` row with zero tokens and
return `cached: true` to the caller.

Expired rows are deleted by `llm_cache_prune()` (service-role only); the ops
scheduling task already calls it when the function exists. The table has RLS
on and no policies: cached responses can contain a user's resume text.

## Structured-output failures

When a provider answers but its tool-call JSON is malformed, the router makes
exactly one repair pass (code fences, surrounding prose, trailing commas).
Anything worse is a `502 bad_ai_output` (`SchemaViolationError`) — it is
**not** a reason to call the fallback provider, since a second call would only
spend tokens re-rolling the dice.

## Routes

All under `/functions/v1/admin/`, all behind the admin gate, JSON in and out
(`{ data }` on success, `{ error: <code> }` on failure). Unknown paths are
`404 unknown_admin_route`; there is no wildcard.

| Method + path | Returns |
| --- | --- |
| `GET stats` | `{ users, admins, providers }` |
| `GET providers` | Provider rows with `key_count` + `key_previews`; never `api_keys` |
| `POST providers` | Upsert by `provider_id`. `provider_id` must be a member of `ProviderId` (`400 invalid_provider_id` otherwise); omit `api_keys` to keep stored keys; `409 role_already_assigned` if the role is taken |
| `POST providers/delete` | `{ deleted }` — body `{ provider_id }`, same validation |
| `GET users?q=&limit=&offset=` | `{ users, total }`. `q` is a UUID (exact id) or an email prefix; wildcards are neutralised. **Audited** as `users.list` |
| `GET users/<uuid>/usage` | `{ user, subscription, usage[], resumes, prism, ai_calls_30d[] }` — counts and statuses only, never CV/JD text. **Audited** as `users.usage` |
| `GET audit?limit=` | Newest `admin_audit_log` rows |
| `GET ops/alerts?limit=` | Newest `ops_alerts` rows (`kind`, `observed`, `threshold`, `detail`) |
| `GET ops/llm-calls` | Last 24 h of `llm_call_logs`: `{ window_hours, since, sampled, truncated, providers[], recent[] }`. `providers[]` is the per-provider roll-up (calls, errors, error rate, fallbacks, tokens, avg/p95/max latency, models); `recent[]` the newest 50 rows |
| `GET ops/prism-runs?limit=` | `{ runs[], last_24h: { total, failed } }` — run metadata only (`status`, `template_id`, `tokens_used`, `error_code`) |

`limit`/`offset` are clamped server-side (users 200, alerts/runs 200, audit
500). The 24 h LLM window reads at most 5 000 rows; past that `truncated` is
true and the roll-up is a sample of the newest rows.

## Health probe

`GET /functions/v1/health` is the one **unauthenticated** function
(`verify_jwt = false` in `supabase/config.toml`; pass `--no-verify-jwt` if
deploying it by hand). It answers

```json
{ "ok": true, "version": "<APP_VERSION or unversioned>", "db": "ok", "llm": 2, "ts": "…" }
```

with `200` when the database responds and `503` when it does not. `llm` is a
count of providers holding at least one key — zero is reported, not treated
as an outage, because the site, auth and export still work without it. The
body never carries error messages, table names or key material, so it is safe
to point an uptime monitor at. The admin Overview tab's Health card polls the
same URL, so what the admin sees is what the monitor sees.

## Scheduled jobs

Migration `20260901400000_ops_scheduling.sql` creates `ops_prune_logs()` and
schedules three pg_cron jobs (names are stable, so re-running replaces rather
than duplicates):

| Job | Schedule | Does |
| --- | --- | --- |
| `prism_alert_scan` | every 10 min | Threshold scan → `ops_alerts` (1 h dedup inside) |
| `prism_prune_runs` | 03:10 UTC | Wipes stale run text, deletes old failed runs |
| `ops_prune_logs` | 03:30 UTC | `ai_logs`, `llm_call_logs`, `prism_agent_logs` older than 90 d; `admin_audit_log` older than 365 d; calls `llm_cache_prune()` only if that function exists |

**pg_cron is optional at migration time.** If the extension is not available
or cannot be created, the migration raises a NOTICE, still creates the
functions, and skips the schedules — nothing fails.

On **hosted Supabase** the extension has to be enabled once, by hand:
Dashboard → Database → Extensions → enable `pg_cron`. Then either re-run the
migration (`supabase db push` will not re-apply an already-applied file, so
paste the `do $$ … $$` block from the migration into the SQL editor) and check:

```sql
select jobname, schedule, active from cron.job order by jobname;
select jobname, status, start_time from cron.job_run_details
  join cron.job using (jobid) order by start_time desc limit 20;
```

Until pg_cron is on, the Alerts tab stays empty and the log tables grow
unbounded — `select public.ops_prune_logs();` can be run by hand meanwhile.

## Audit log

Every provider write, and every read of user data (`users.list`,
`users.usage`), records actor, action, target and a redacted detail blob. It
is append-only: admins can read it, and there are no insert/update/delete
policies, so entries can only be written by the edge function via
`service_role` and cannot be edited or forged from a client. Key values are
never recorded — only a count of how many were replaced; a user search
records the query (an id or email prefix) and how many rows came back.

## Deploying

```bash
supabase db push
```

```bash
supabase functions deploy admin
```

## Verifying

CI runs the same commands; locally:

```bash
deno check --node-modules-dir=none supabase/functions/admin/index.ts supabase/functions/_shared/llm.ts supabase/functions/_shared/llm/router.ts
deno test --allow-env --node-modules-dir=none supabase/functions/_shared/
```

Then exercise the gate directly — a non-admin token must get `403 not_admin`,
and `GET /admin/providers` must never return an `api_keys` field:

```bash
curl -s -H "Authorization: Bearer $NON_ADMIN_JWT" "$SUPABASE_URL/functions/v1/admin/providers"
```
