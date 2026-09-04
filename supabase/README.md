# CVBase — Supabase backend

This directory holds the database schema (migrations), Edge Functions, and local
dev config for the CVBase backend.

## Prerequisites
- Docker running
- Supabase CLI (`supabase --version` ≥ 2.22)

## Local development
```bash
supabase start      # boots Postgres/Auth/Storage/Edge runtime in Docker
supabase status     # prints local API URL + anon/service keys (LOCAL dev values)
supabase stop       # stops the stack
```
`supabase start` prints a local `API URL` (http://127.0.0.1:54321) and a local
`anon key`. Those are **local-only dev values**, safe to paste into a local
`.env` — they are NOT the cloud project's secrets.

### Verified local endpoints (W0)
The stack was booted and verified on 2026-06-22. Local URLs (stable across runs):

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit (email) | http://127.0.0.1:54324 |

The local `anon` / `service_role` keys printed by `supabase status` are the
standard public **`supabase-demo`** dev keys — identical on every machine, not
secrets. `supabase_imgproxy` and `supabase_pooler` show as stopped; both are
optional (image transforms / connection pooler) and not required for local dev.

### Auth smoke test (W1)
With the stack running, `bash supabase/tests/w1-auth-smoke.sh` exercises the full
auth flow end-to-end: email-confirmation enforcement, the `on_auth_user_created`
profile trigger, Mailpit email delivery, sign-in, RLS isolation, and profile
read/write through a user JWT.

## Stripe billing (W4)
Three edge functions: `stripe-checkout` (starts a Checkout Session), `stripe-portal`
(Customer Portal) and `stripe-webhook` — the **only** writer of `subscriptions`.

Subscribe the Stripe webhook endpoint to: `checkout.session.completed`,
`customer.subscription.created|updated|deleted|paused|resumed|trial_will_end`,
`invoice.paid`, `invoice.payment_failed`.

How the webhook stays correct under Stripe's delivery model:
- **At-least-once delivery** — every event id is claimed in `stripe_events` before
  any work. A redelivery of a processed event answers `200 {received:true,duplicate:true}`;
  a claim still in flight answers `409` (Stripe retries); a claim older than 5 min with
  no `processed_at` is assumed dead and re-claimed. A handler failure releases the claim.
- **Out-of-order delivery** — `subscriptions.stripe_event_created` stores the
  `event.created` of the last applied event; `apply_stripe_subscription(...)` is a
  compare-and-set upsert that ignores older events (`200 {received:true,stale:true}`).
  NULL patch fields leave stored values untouched, so `invoice.*` events only flip
  `status` (+ period dates on `invoice.paid`).
- **Missing `metadata.user_id`** (dashboard/portal-created subscriptions) — the user is
  resolved from `subscriptions.stripe_customer_id`; if that fails the event is logged
  and acknowledged (`{unresolved:true}`) rather than retried forever.
- `checkout.session.completed` retrieves the subscription to fill period dates.

`stripe-checkout` uses an idempotency key of `user:plan:cycle:minute` (double-clicks
collapse to one session), finds an existing customer by `metadata.user_id` before
creating one (per-user idempotency key), and sends `allow_promotion_codes`. Set
`STRIPE_AUTOMATIC_TAX=1` (with Stripe Tax enabled on the account) to add
`automatic_tax` + `customer_update.address=auto`.

Resume limits are enforced server-side by the `resumes_enforce_limit` trigger
(`resume_limit_for(plan_id)` mirrors `PLANS[].limits.resumes`; `effective_plan_for(uuid)`
mirrors the 21-day `past_due` grace in `_shared/entitlement.ts`). An insert over the
limit fails with PostgREST 400 / `P0001` and message `resume_limit_reached`.

Smoke: `bash supabase/tests/w4-billing-smoke.sh` (covers duplicate, dunning,
out-of-order and resume-limit steps). Unit tests:
`deno test --node-modules-dir=none supabase/functions/stripe-webhook/ supabase/functions/stripe-checkout/`.

## Account export / deletion (W8)
`account-export` and `account-delete` back Settings → Your data; contracts,
cascade audit and the exclusion list are in `docs/DATA.md`. Smoke:
`bash supabase/tests/w8-account-lifecycle-smoke.sh` (needs `supabase start` and
`supabase functions serve --env-file .env.cvbase.local --no-verify-jwt`).

## Migrations
```bash
supabase migration new <name>     # create a migration file
supabase db reset                 # re-apply all migrations to the local db
```

## Edge Functions
```bash
supabase functions serve <name>   # run a function locally
supabase functions deploy <name>  # deploy to the linked cloud project
```

## Linking the cloud project (done at deploy time)
```bash
supabase link --project-ref zqwwtgohtjlrkraqheuw   # uses SUPABASE_DB_PASSWORD
supabase db push                                    # push migrations to cloud
supabase secrets set --env-file ../.env.cvbase.local  # push server secrets
```
Server secrets (service role key, Stripe secret, Gemini key, webhook secret, and
the DeepSeek/Kimi LLM routing vars — see `.env.example`) live ONLY in Supabase's
secret store and the gitignored `.env.cvbase.local` — never in the client bundle.
Provider/model/key changes take effect on the next `supabase secrets set` without
a code deploy or `supabase functions deploy`.
