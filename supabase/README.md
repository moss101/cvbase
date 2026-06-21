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
| Inbucket (email) | http://127.0.0.1:54324 |

The local `anon` / `service_role` keys printed by `supabase status` are the
standard public **`supabase-demo`** dev keys — identical on every machine, not
secrets. `supabase_imgproxy` and `supabase_pooler` show as stopped; both are
optional (image transforms / connection pooler) and not required for local dev.

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
Server secrets (service role key, Stripe secret, Gemini key, webhook secret) live
ONLY in Supabase's secret store and the gitignored `.env.cvbase.local` — never in
the client bundle.
