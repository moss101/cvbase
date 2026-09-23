# COS-007 — Additive migration and lifecycle infrastructure (server side)

20–21 September 2026 · Local Supabase stack only (Postgres 15.8, GoTrue, PostgREST, Storage, supabase-edge-runtime 1.68.4) · Deno 2.9.6 · not applied to the hosted project.

Scope of this note: account-export / account-delete coverage of every Career OS table, the coverage guard that ties the export to the migration, and the two smoke scripts that exercise `career_os_migrate_user`, `career_start_application`, two-owner RLS, the rollback read, export and delete against the real local stack. The schema itself is [COS-003](COS-003-schema-adr.md).

## What changed

| File | Change |
| --- | --- |
| [supabase/functions/_shared/careerTables.ts](../../../supabase/functions/_shared/careerTables.ts) | **New.** The single list of the 22 user-owned Career OS tables (`table`, export `section`, `columns`, `single` for the user-keyed `career_profiles` / `career_preferences`), `PRISM_RUN_COLUMNS` (now with `application_id, source_resume_id, source_resume_revision, idempotency_key`; still no `jd_text` / `cv_text` / `checkpoint` / drafts / results), and the migration-parsing helpers (`createdTables`, `tableBody`, `cascadesFromAuthUsers`). |
| [supabase/functions/account-export/export.ts](../../../supabase/functions/account-export/export.ts) | **New.** `assembleExport(svc, user)` + `exportResponse(doc)`: the previous assembly moved out of the request handler and extended with one section per Career OS table. `version` bumped 1 → 2. All ten legacy sections are unchanged in shape and order. |
| [supabase/functions/account-export/index.ts](../../../supabase/functions/account-export/index.ts) | Thinned to auth → `assembleExport` → `exportResponse`. |
| [supabase/functions/account-export/export_test.ts](../../../supabase/functions/account-export/export_test.ts) | **New.** 7 tests: migration coverage, delete-cascade audit, PRISM column policy, and the assembly against a fake service client (every section present, owner-scoped selects, empty account, failing table, headshot signing + attachment headers). |
| [supabase/functions/account-delete/index.ts](../../../supabase/functions/account-delete/index.ts) | Comment-only: delete-cascade audit block listing the 22 tables and the same-owner links. No code change was needed — every new table's `user_id` is `references auth.users (id) on delete cascade` (asserted by the test below), so `auth.admin.deleteUser` covers them. Career OS adds no storage objects. |
| [supabase/tests/career-os-migration-smoke.sh](../../../supabase/tests/career-os-migration-smoke.sh) | **New.** Restartable migration, idempotent start, reapply, two-owner RLS, rollback read (flag off) — real stack. |
| [supabase/tests/career-os-lifecycle-smoke.sh](../../../supabase/tests/career-os-lifecycle-smoke.sh) | **New.** One row in every Career OS table → real `account-export` on the local edge runtime → delete → zero rows. |

### Export sections (version 2)

`careerProfile` (object), `careerFacts`, `careerFactReferences`, `careerGoals`, `careerGoalRevisions`, `opportunities`, `campaigns`, `campaignOpportunities`, `applicationArtifacts`, `interviewSessions`, `applicationOutcomes`, `opportunityAnalyses`, `careerActions`, `actionRuns`, `coachConversations`, `coachMessages`, `careerEvents`, `userNotifications`, `careerPreferences` (object), `careerScenarios`, `careerInsights`, `careerMigrations` — every column (`*`), ordered by `created_at`, owner-scoped with the service client. Per ADR §6 all of it is user data, including `opportunities.captured_content` (pasted JD). Exclusions stay what they were: Stripe identifiers and PRISM run bodies.

### The coverage guard

`export_test.ts` parses `supabase/migrations/20260920100000_career_os_foundation.sql`:

* `createdTables(sql)` finds every `create table public.<name> (` (22) and the test asserts set equality with `CAREER_OS_TABLES` — a table added to the migration without an export section fails the suite, and so does a section without a table.
* For each created table, `tableBody` isolates the column list and `cascadesFromAuthUsers` requires `user_id uuid (not null|primary key) references auth.users (id) on delete cascade`. The parser is checked against a negative sample so it cannot pass vacuously.
* `career-os-lifecycle-smoke.sh` re-derives the same list with `grep` and fails on drift, so the smoke cannot silently skip a new table either.

Reading the SQL needs `--allow-read`; without it exactly those two tests fail with `NotCapable`, the other five still run.

## Commands and results

### Deno unit tests

```
deno test --allow-env --allow-read --node-modules-dir=none supabase/functions/account-export/ supabase/functions/_shared/
```
```
coverage: every `create table public.…` in the foundation migration is in CAREER_OS_TABLES (and nothing extra) ... ok
delete-cascade audit: every new table's user_id references auth.users (id) on delete cascade ... ok
PRISM export columns carry the binding but never the run bodies ... ok
assembly: every section key is present (legacy + all Career OS tables), version 2, owner-scoped selects ... ok
assembly: an empty account still carries every section (null objects, empty lists) ... ok
assembly: a failing Career OS table fails the whole export with the table named ... ok
assembly: headshot objects get signed urls; the response is a dated JSON attachment ... ok
ok | 110 passed | 0 failed        (7 export + 103 pre-existing _shared)
```
Combined with prism-tailor (see COS-013): `ok | 182 passed | 0 failed`.

```
deno check --node-modules-dir=none supabase/functions/prism-tailor/index.ts supabase/functions/account-export/index.ts supabase/functions/account-delete/index.ts
Check … account-export/index.ts / account-delete/index.ts / prism-tailor/index.ts   (clean)
```

### Migration smoke (real local stack)

```
source scripts/career-os-local-env.sh && bash supabase/tests/career-os-migration-smoke.sh
```
```
PASS: two users + tokens
PASS: primary resume seeded
PASS: wishlist + applied tracker rows seeded
PASS: legacy wishlist write derives stage=saved
PASS: legacy applied write derives stage=submitted
PASS: first migrate mapped 2 opportunities + facts: {"facts": 5, "skipped": 0, "version": 1, "opportunities": 2}
PASS: second migrate is a no-op: {"facts": 0, "skipped": 0, "version": 1, "opportunities": 0}
PASS: exactly 2 opportunities after two runs
PASS: third run adds no facts (5)
PASS: migration ledger rows recorded
PASS: wishlist application keeps its id and now has opportunity_id=370f7417-e151-b91d-049a-0d57c5f4e5fd
PASS: opportunity id is deterministic from the legacy application id
PASS: imported facts are inferred candidates, never verified
PASS: start activates the same wishlist application (preparing wishlist 1)
PASS: stage=preparing, legacy status stays wishlist
PASS: second start returns the same application id
PASS: still one application for the opportunity
PASS: reapply creates attempt 2 linked to attempt 1
PASS: B cannot start A's opportunity (opportunity_not_found)
PASS: B sees none of A's opportunities
PASS: B sees none of A's career_facts
PASS: A sees its 2 opportunities
PASS: A sees its 5 facts
PASS: B cannot update A's opportunity
PASS: stage write derives legacy status (interview)
PASS: career_os flag flipped off (was true,100)
PASS: legacy tracker read: only the five legacy statuses; new writes visible (interview, wishlist, attempt 2)
PASS: career_os_reconcile_legacy touched 3 applications
PASS: post-switch write survives rollback reconciliation
PASS: legacy status write during rollback derives stage=final
PASS: career_os flag restored (true,100)
----
CAREER OS MIGRATION SMOKE: ALL PASS
```

What each block proves against the acceptance criteria:

* *Partial imports restart with same IDs and no duplicate artifacts* — `career_os_migrate_user` called three times: run 2 and 3 report `0` new opportunities/facts, `opportunities` count stays 2, `career_facts` stays 5; the wishlist application keeps its `id` and gains `opportunity_id = career_os_uuid('opportunity:legacy', id)`.
* *Idempotent start* — `POST /rest/v1/rpc/career_start_application` with the user JWT twice returns the same application id (the dormant wishlist shell activated to `stage=preparing`, `status` still `wishlist`); `p_reapply=true` yields `attempt_no=2` with `previous_attempt_id` = attempt 1; B gets `opportunity_not_found` for A's opportunity.
* *Two-owner RLS* — B reads zero `opportunities` / `career_facts`, B's PATCH on A's opportunity does not land.
* *Rollback retains post-switch writes; legacy reads remain usable* — a `stage=interview` write made through the new model, then `feature_flags.career_os.enabled=false`: `GET /rest/v1/job_applications?select=id,status` returns only the five legacy statuses and the new write is visible as `interview`; `career_os_reconcile_legacy` keeps it; a legacy `status=offer` write during rollback derives `stage=final`; the flag is restored to its prior value.

### Lifecycle smoke (real local stack)

```
source scripts/career-os-local-env.sh && bash supabase/tests/career-os-lifecycle-smoke.sh
```
```
PASS: script covers all 22 tables the migration creates
PASS: user + token
PASS: one row seeded in every Career OS table (22/22)
PASS: account-export -> 200
PASS: export is an attachment
PASS: export v2: every Career OS section present and populated; PRISM binding columns exported, run bodies not
SUBSTITUTED: account-delete cannot boot on the local runtime (no STRIPE_SECRET_KEY: {"code":"WORKER_ERROR","message":"Function exited due to an error (please check logs)"}); deleting via the auth admin API instead
PASS: auth admin DELETE /admin/users/{id} -> 200 (substitute for account-delete)
PASS: auth user removed
PASS: every Career OS + legacy table has zero rows for the user after delete
----
CAREER OS LIFECYCLE SMOKE: ALL PASS
```

**Actually run vs substituted.**

* `account-export` — **run for real**: the local edge runtime container (`supabase_edge_runtime_cvbase_`) bind-mounts `supabase/functions` with `policy = oneshot`, so the repository code served the request (`POST http://127.0.0.1:54321/functions/v1/account-export` with the user JWT). The response was checked for `version == 2`, every one of the 22 sections present and populated (object for the two user-keyed tables, exactly one owned row for the rest), the ten legacy sections, `resumes[0].application_id`/`origin`, `prismRuns[0].{application_id, source_resume_id, source_resume_revision, idempotency_key}`, `jobApplications[0].prism_run_id`, and that the seeded `SECRET-JD-TEXT` / `SECRET-CV-TEXT` run bodies appear nowhere in the document.
* `account-delete` — **substituted**: the function's `_shared/stripe.ts` constructs the Stripe client at import time and throws `Neither apiKey nor config.authenticator provided` when `STRIPE_SECRET_KEY` is absent, and the local runtime container carries no Stripe secret (its env is the CLI's default set). The worker therefore cannot boot (HTTP 500 `WORKER_ERROR`; runtime log: `runtime has escaped from the event loop unexpectedly … _shared/stripe.ts:4:23`). The script detects exactly that response and instead issues the call the function itself makes, `DELETE /auth/v1/admin/users/{id}` with the service-role key (`auth.admin.deleteUser`), then asserts zero rows for the user in all 22 Career OS tables plus `prism_runs`, `resumes`, `job_applications`, `profiles`. The confirm-mismatch (400) branch of `account-delete` is only exercised when the function boots (the w8 smoke covers it with `functions serve --env-file`). The cascade guarantee itself is the same in both paths because it is the database's, which is also why the migration-parsing test above is the durable evidence.

Note on the environment: during this session the edge runtime container had exited (255) while the rest of the stack was restarted; `docker start supabase_edge_runtime_cvbase_` brought it back and `GET /functions/v1/health` answered `{"ok":true,…}` before the smoke was run.

## Not verified here

* Hosted project: nothing was applied or read there (unchanged from COS-001/COS-003).
* `account-delete` end-to-end on the local runtime with a Stripe key (needs `supabase functions serve --env-file .env.cvbase.local`); the delete path was exercised through the identical admin API call instead.
* `npm run typecheck` currently fails only on `App.tsx` importing `./components/careeros/CareerShell`, which another task is adding in parallel; no error is reported in the files of this task.
