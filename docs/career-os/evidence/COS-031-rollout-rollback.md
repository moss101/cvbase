# COS-031 — Existing-user rollout and rollback qualification (local verdict)

21 September 2026 · Local Supabase stack only. The hosted project's schema state could not be read in this session (permission policy denied the read) and no deployment was authorised, so every statement below is a **local** verdict. Production rollout (G7) is not claimed.

## Verdict

| Acceptance criterion | Verdict | Basis |
| --- | --- | --- |
| Populated old / native / guest fixtures retain ids, content, history and preferences | PASS (local) | J02 migrated account: 3 tracker rows → 3 opportunities keeping the same `job_applications.id`; primary CV opened unchanged in the builder and on the native iOS build; profile fields projected as `user_confirmed` facts while `profiles` columns stay untouched. J03 guest: anonymous keys claimed only after explicit confirmation; primary untouched. `career-os-migration-smoke.sh`: migrate ×3 → no duplicates, ledger `skipped` for empty demo rows ([final-verification.log](final-verification.log)). |
| Account export / delete cover every new object; partial migration keeps originals available | PASS (local) | `account-export` v2 exports all 22 Career OS tables (coverage guard in `export_test.ts`, live in `career-os-lifecycle-smoke.sh`); cascade delete verified to zero rows in every Career OS and legacy table. Migration is transactional per user (advisory lock) and restartable; the legacy rows are never rewritten, only linked (`legacy_application_id`). |
| Rollback after new writes preserves those writes; supported old-client window documented | PASS (local) | Smoke: with the flag off, a post-switch write (new application through `career_start_application`) survives `career_os_reconcile_legacy`, and a legacy `status` write during rollback is reflected through the `job_applications_sync_stage` trigger. Old-client window: the five legacy statuses remain the only values an old client reads or writes (ADR [COS-003 §4](COS-003-schema-adr.md)); no native release is required for the schema, so the supported window is "every shipped native client" until COS-041 retires a route. |

## Rollback procedure (verified locally)

1. `update public.feature_flags set enabled = false where flag = 'career_os'` (or `rollout_pct = 0`). The client `isFlagEnabled` gate hides the six-space shell on the next load; legacy dashboard tabs and `/builder` keep working (they never depended on the new tables).
2. `select public.career_os_reconcile_legacy(<user>)` (or for all migrated users) projects Career OS stages back onto legacy `status` — a no-op where the trigger already kept them in sync.
3. No table is dropped. The migration is additive; every new table cascades from `auth.users`. Re-enabling the flag resumes where the user left off (`career_migrations.migration_version` unchanged).

Migration/rollback logs: [migration-local.log](migration-local.log) (initial `db reset`), [final-verification.log](final-verification.log) (smoke scripts on the final code).

## Gaps that keep this at a local verdict

* Hosted schema drift is unknown: the memory note that earlier migrations were never applied to the hosted project means the foundation migration must be applied through the normal migration path after a hosted schema read, not assumed.
* `account-delete` cannot boot locally without a Stripe key; the lifecycle smoke substitutes the auth admin delete, which exercises the same cascade but not the function's own path.
* Native rollback (flag off while the app is open) was not exercised on the simulator; the web flag-off path was.
* Observation-window metrics for COS-041 (route usage, old-client share) do not exist because nothing has run in production.
