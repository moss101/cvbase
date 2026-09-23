# COS-003 — Schema, ownership and extension decisions (ADR)

Status: ACCEPTED for R0 · 20 September 2026 · Implemented by [20260920100000_career_os_foundation.sql](../../../supabase/migrations/20260920100000_career_os_foundation.sql) · Applied and exercised on the local Supabase stack (Postgres 15.8), not on the hosted project.

This ADR closes the R0 decisions listed in PRD §10: canonical claim schema, tracker migration identity mapping, conflict policy, old-client compatibility, raw-source retention, product telemetry destination, action charging semantics. Performance budgets are recorded separately in [COS-001-runtime-discovery.md](COS-001-runtime-discovery.md).

## 1. Ownership matrix (one owner per concept)

| Concept | Owner table | Identity | Revision | Notes |
| --- | --- | --- | --- | --- |
| Account | `auth.users` / `profiles` | user id | — | unchanged |
| Career aggregate | `career_profiles` (pk = user id) | user id | `revision`, `facts_revision` | onboarding state, migration version |
| Career fact / achievement / evidence | `career_facts` | uuid; deterministic for legacy imports | `revision` | `confirmation_state`, `review_state`, provenance, tombstones (`status='deleted'`) |
| Claim → artifact edge | `career_fact_references` | (fact, artifact kind, artifact id, section) | `fact_revision` | drives "used in" and stale-draft detection |
| Goal | `career_goals` (+ `career_goal_revisions`) | uuid | `revision` snapshots | ≤ 1 primary active per user (partial unique index) |
| Opportunity | `opportunities` | uuid; `career_os_uuid('opportunity:legacy', app.id)` for tracker rows | `revision` | identity independent of application; merge is reversible via `merge_undo` |
| Campaign | `campaigns`, `campaign_opportunities` | uuid | `revision` | goal optional (legacy grouping), milestones jsonb |
| Application | `job_applications` (extended in place) | existing uuid kept | `revision` | additive `stage`, `closed_reason`, `attempt_no`, `previous_attempt_id`, `idempotency_key`, `goal_snapshot`, `submission_snapshot` |
| Application artifact | `application_artifacts` | uuid | `revision` | typed by `kind`; `status='snapshot'` rows are immutable submission copies |
| CV / document | `resumes`, `resume_versions` (existing) | existing uuid | `revision` (new) + `updated_at` | `application_id` and `origin` link tailored versions; no blob copies |
| PRISM run | `prism_runs` (existing) | existing uuid | — | `application_id`, `source_resume_id/revision`, `idempotency_key`, `action_run_id` |
| Interview | `interview_sessions` | uuid | `revision` | scheduled time + IANA zone; practice and feedback with citations |
| Outcome | `application_outcomes` | uuid | append-only, `supersedes_id` for corrections | source `user_reported` first |
| Fit analysis | `opportunity_analyses` | uuid | input revisions recorded, `stale` flag | ATS score is one signal; not hiring probability |
| Action | `career_actions` | uuid; `dedupe_key` unique per user | `revision` | lifecycle per context model |
| Action run / receipt | `action_runs` | uuid; `idempotency_key` unique per user | `revision` | server-written only (service role) |
| Conversation | `coach_conversations`, `coach_messages` | uuid | `revision` | context refs + citations; summaries carry `summary_source_ids` |
| Product event | `career_events` | uuid; optional `dedupe_key` | `schema_version` | no raw CV/JD/contact/salary text |
| Notification | `user_notifications` | uuid; `dedupe_key` | — | information vs action_required |
| Preferences | `career_preferences` (pk = user) | user id | `revision` | proactive opt-in, quiet hours, cap, checkpoint |
| Scenario | `career_scenarios` | uuid | `revision` | options, priorities, explicit assumptions |
| Insight | `career_insights` | uuid | `policy_version` | sample/denominator/missing/window recorded |
| Migration ledger | `career_migrations` | (user, migration, kind, old id) | — | restartable mapping with status/error |

Every reference between owned objects is a composite same-owner foreign key `(ref_id, user_id) → (id, user_id)`. Verified in SQL: a user cannot link another user's opportunity into a campaign or application even when supplying the raw id (FK violation), and `career_start_application` reports `opportunity_not_found` for foreign rows.

## 2. Canonical claim schema

* `confirmation_state ∈ {verified, user_confirmed, inferred, incomplete}`. `verified` is rejected by a CHECK unless `verification` carries `method`, `source` and `verifiedAt`. Imports (`source_kind = resume_import | legacy_import`) are always `inferred` + `review_state = candidate`. `extraction_confidence` is a separate numeric field, never a state.
* Conflict policy: contradictory candidates share a `conflict_group`; `review_state = conflict` until the user resolves; the losing fact becomes `status = withdrawn` (retained with provenance). Nothing merges silently.
* Dedupe: `source_fingerprint` (kind + normalised title/organisation/date) is unique per user; re-imports skip existing fingerprints, including tombstoned (`deleted`) facts so a deletion is honoured.
* Achievements are `kind = achievement` with `parent_fact_id` → experience and `payload {metric, unit, period}`.
* Specialised profile fields (`careSpecialties`, `licensedState`, `jobTitle`) become `kind = profile_field` facts with `payload {field, value}`; the `profiles` columns are untouched.

## 3. Tracker migration identity mapping

* One legacy `job_applications` row remains one application id. Each row with a company or role gets an opportunity `career_os_uuid('opportunity:legacy', app.id)` with `legacy_application_id`, `source_kind = tracker_migration`, empty `captured_content` (never reconstructed from the title). Rows with no company and no role (the anonymous demo defaults) are ledgered as `skipped`.
* `wishlist` rows project as saved opportunities with a dormant application shell (`stage = saved`); `career_start_application` activates the same shell (`stage = preparing`) rather than creating a copy. Verified: two calls return the same id; `p_reapply = true` creates attempt 2 linked by `previous_attempt_id`.
* `career_os_migrate_user` is transactional per user (advisory lock), deterministic and restartable; the second run reported `0` new opportunities/facts.

## 4. Old-client compatibility and status mapping

Legacy `status` stays the value old native clients read and write. Trigger `job_applications_sync_stage`:

| Legacy write (`status`) | Derived `stage` | New write (`stage`) | Derived `status` |
| --- | --- | --- | --- |
| wishlist | saved (keeps `preparing` if already set) | saved, preparing | wishlist |
| applied | submitted (keeps `response`) | submitted, response | applied |
| interview | interview | interview | interview |
| offer | final | final | offer |
| rejected | closed / `closed_reason = rejected` | closed | offer if `closed_reason = accepted`, else rejected |

`rejected` is never rewritten to a successful outcome; `withdrawn`/`archived` appear in the legacy "Archived / Rejected" column. Old clients never receive a value outside the five legacy statuses.

## 5. Concurrency, idempotency and charging

* Every mutable table has `revision`; the shared `career_os_touch` trigger bumps it. Clients send the revision they read (`update … eq('revision', n)`); zero affected rows is a conflict surfaced for review, never a silent overwrite. Verified in SQL (`UPDATE 0`).
* Idempotency keys are scoped `(user_id, idempotency_key)` on `job_applications`, `prism_runs` and `action_runs`. Concurrent starts serialise on `pg_advisory_xact_lock(user, opportunity)`.
* Charging: one logical action = one `consume_usage('aiActions')` at reservation time, refunded with `release_usage` when the failure is ours (existing `shouldRefund`). PRISM charges once at `analyze`; `generate`/`finalize` on the same run are unmetered; a retried analyze with the same `idempotency_key` returns the existing run and is not charged again. Receipts record `usage {kind, charged, released}` so a retry never double-charges. No second credits system.

## 6. Retention, export and deletion

* All new tables `on delete cascade` from `auth.users`; `account-delete` therefore covers them through `auth.admin.deleteUser`. `account-export` enumerates every table in §1 (verified by the export test).
* Raw source retention: `opportunities.captured_content` (user-pasted JD) is retained as user data and included in export; `prism_runs` text is still wiped at finalise/prune. `action_runs.input_summary` and `career_events.payload` hold ids/revisions/counts only.
* Pruning: `career_prune_events()` (400 days), `career_prune_runs()` (failed/cancelled receipts after 90 days; expired actions marked). Cron wiring is an operator action like the existing PRISM pruning.

## 7. Telemetry destination

Product events are persisted in `career_events` (versioned envelope: `event_name`, `schema_version`, `subject_refs`, `correlation_id`, `source`, `occurred_at`, `payload`, `dedupe_key`). This keeps ownership, deletion and export inside the existing Supabase model and separate from operational `ai_logs`/Sentry. An external sink can subscribe later without changing producers.

## 8. Alternatives considered

| Proposal | Alternative rejected | Why |
| --- | --- | --- |
| Extend `job_applications` | New `applications` table | Would create a second application identity and break tracker/export/mobile clients |
| Relational claim graph in Postgres | Graph/vector database | No measured query need; RLS and same-owner FKs already model the edges |
| `career_events` table | Third-party analytics SDK only | Deletion/export coverage and no-PII guarantee must live with the data owner |
| `action_runs` receipts | Reuse `prism_runs.checkpoint` for all tools | PRISM checkpoints are specialist state; general receipts need idempotency/confirmation/usage fields |
| Deterministic md5 ids for backfill | Random ids + ledger only | Deterministic ids make restarts safe even when the ledger write is the step that failed |
| Feature flag `career_os` in `feature_flags` | New rollout table | Same client/server cohort bucket as PRISM; operator-controlled |

## 9. Evidence

* Local apply: `npx supabase migration up --local` then `db reset` after the null-safe verification fix (see [migration-local.log](migration-local.log)).
* SQL exercise (transaction rolled back): migrate → restart (no duplicates) → idempotent start → reapply → stage/status mapping → same-owner rejections → primary uniqueness → goal revision snapshots → optimistic-concurrency `UPDATE 0` → client cannot insert `action_runs` (RLS). Transcript in [migration-local.log](migration-local.log).
