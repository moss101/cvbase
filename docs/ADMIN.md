# Admin panel

A narrow admin surface for the things the Supabase dashboard handles badly:
live LLM provider routing and an audit trail. User and subscription *editing*
is deliberately not here — Studio already does that well, and every extra write
path is another thing to secure.

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
| `dialect` | `openai` (chat-completions) or `anthropic`. Anthropic speaks its own wire format. |
| `base_url` / `model_full` / `model_lite` | Blank inherits the built-in default for that provider. |
| `api_keys` | Pooled round-robin. **Blank on save keeps the stored keys** — so editing a model doesn't require retyping secrets. |
| `role` | `primary`, `fallback`, or `off`. At most one of each, enforced by partial unique indexes rather than by the UI, so two concurrent saves can't both win. |

Saving takes effect on the next generation — no redeploy. That is the whole
point of the table.

### Adding a provider that isn't built in

Set `provider_id` to `custom`, pick the dialect, and give it a base URL, model
and key. Any OpenAI-compatible endpoint works with no code change.

## Audit log

Every provider write records actor, action, target and a redacted detail blob.
It is append-only: admins can read it, and there are no insert/update/delete
policies, so entries can only be written by the edge function via
`service_role` and cannot be edited or forged from a client. Key values are
never recorded — only a count of how many were replaced.

## Deploying

```bash
supabase db push
```

```bash
supabase functions deploy admin
```

## Not verified

Deno is not installed on the machine this was written on, so
`supabase/functions` has no typecheck or test run behind it. Before trusting
the panel in production:

```bash
deno check supabase/functions/admin/index.ts supabase/functions/_shared/llm/**/*.ts
```

Then exercise the gate directly — a non-admin token must get `403 not_admin`,
and `GET /admin/providers` must never return an `api_keys` field:

```bash
curl -s -H "Authorization: Bearer $NON_ADMIN_JWT" "$SUPABASE_URL/functions/v1/admin/providers"
```
