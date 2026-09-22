# COS-001 — Runtime unknowns, fixtures and budgets

20 September 2026 · macOS arm64 · Node v26.5.1 · Deno 2.9.6 · Docker 28 · Supabase CLI 2.117.0 (via `npx supabase@latest`)

## Deployed schema, flags and clients

| Item | Finding | Evidence / limit |
| --- | --- | --- |
| Hosted project (`SUPABASE_PROJECT_REF` in `.env.cvbase.local`) | **UNKNOWN in this session.** A read-only `supabase migration list --db-url` against the hosted database was denied by the session permission policy ("Production Reads"). Last recorded state (memory, 2026-08-05): the then-existing migrations were pushed with `db push --db-url`; the September migrations (`20260901*`) and this program's `20260920100000_career_os_foundation.sql` have **not** been verified or applied on the hosted project. | Blocker for G7/production qualification; action: operator runs `npx supabase migration list --db-url …` and `db push --dry-run` |
| Feature flags | `prism` exists (`feature_flags`, hashed 0–99 bucket). `career_os` is added by the foundation migration as `enabled=true, rollout_pct=0` (nobody until an operator bumps the percentage). Local seed sets both to 100%. | [seed.sql](../../../supabase/seed.sql) |
| Old native clients | Android/iOS shells read `job_applications.status` with the five legacy values through `rowToJob`. No store release version list is recorded in the repository; `docs/MOBILE_RELEASE.md` describes the build procedure only. Compatibility window: any client built from commit `9d629cf` or earlier keeps working because the extension is additive and the stage↔status trigger keeps legacy values coherent. | [ADR §4](COS-003-schema-adr.md) |
| Provider configuration | `.env.cvbase.local` carries DeepSeek/Kimi keys and Gemini key (values not inspected). Live model calls are opt-in and cost-capped; deterministic suites use scripted models. | Not exercised in R0 |

## Local stack (the qualification environment for R0–R3)

`npx supabase@latest start -x studio,logflare,vector,imgproxy,pooler,supavisor` boots Postgres 15.8, GoTrue, PostgREST, Storage, Realtime, Mailpit and the Edge runtime on the documented ports (API 54321, DB 54322, Mailpit 54324). All 21 migrations apply from scratch (`db reset`). `psql` is not installed on the host; SQL evidence uses `docker exec -i supabase_db_cvbase_ psql -U postgres`. The repository smoke scripts under `supabase/tests/` assume `supabase` and `psql` on PATH; `scripts/career-os-local-env.sh` provides both as thin shims for this machine.

## Fixtures

| Fixture | Content | Where |
| --- | --- | --- |
| Populated existing user (J02) | primary resume with duplicate/near-duplicate experience, education, mixed-case skills; wishlist + applied tracker rows; one empty demo row | [migration-local.log](migration-local.log) (SQL transcript), `supabase/tests/career-os-migration-smoke.sh` |
| Two-owner isolation (J05/J09) | user A + user B; B attempts to reference A's opportunity by raw id | same |
| Guest/anonymous (J03) | localStorage builder draft + `smart-studio-jobs-v1` rows before sign-in | client tests in `lib/builder/__tests__` and `services/careerOs/__tests__` |
| Conflict (J07) | stale-revision update returns 0 rows | same log; repo tests |

No customer content is used; all fixtures are synthetic.

## Latency baseline and budgets

Measured on this machine (Apple silicon, Chromium in the desktop app's browser pane, Vite dev server, local Supabase) — a development profile, not a production device/network cohort. Numbers are recorded in [performance-baseline.md](performance-baseline.md) when the shell exists (COS-033). Provisional budgets to qualify against, set from these constraints rather than invented targets:

| Measure | Budget (dev profile) | Rationale |
| --- | --- | --- |
| Shell navigation between spaces (route change → content painted) | p95 ≤ 300 ms | No AI or document module may load on navigation |
| Context fetch for an application workspace | p95 ≤ 800 ms | Bounded repository queries, no N+1 |
| Today first paint without AI | ≤ 1.5 s after auth resolves | Must work without any AI call |
| AI first real stage (PRISM analyze, Coach reply) | first stage event ≤ 5 s | Actual server stage, not a spinner claim |
| Initial JS for `/app/today` | entry + shell ≤ 350 kB gzip; export/PDF chunks lazy | Build reports html2pdf as a lazy 283 kB gzip chunk |

## Telemetry destination, retention and cohorts

* Destination: `career_events` (versioned envelope in the user's own Supabase project; see ADR §7). Operational Sentry/AI logs remain separate.
* Retention: events 400 days; failed/cancelled receipts 90 days; PRISM text wiped at finalise (existing). Export/delete cover every new table.
* Cohort observation threshold (planning input for COS-031/COS-041): a cohort is observed for at least 14 days and ≥ 30 completed actions with zero invariant failures before expansion; retirement requires zero legacy-route hits from supported clients across one full observation window. Numbers are proposals until production telemetry exists.

## Unresolved

* Hosted schema/flag state (permission-blocked read).
* Real device latency on the native shells (sandbox WebViews cannot reach external HTTPS; local HTTP to the host may work and is tested in COS-032).
* Live model quality runs (opt-in, cost-capped; scripted models are used for all deterministic suites).
