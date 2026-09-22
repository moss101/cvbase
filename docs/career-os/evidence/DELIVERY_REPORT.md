# CVBase Career OS — delivery report

21 September 2026 · Orchestrator: Claude Opus 5 session with parallel implementation agents · Working tree on `main` (uncommitted; nothing pushed, nothing deployed).

## 1. What shipped (behaviour)

**Six-space Career OS behind the `career_os` feature flag** (`components/careeros/**`, 143 files; `services/careerOs/**`, 56 files; three new edge functions; one additive migration). The existing React/Vite/Supabase/Capacitor stack, PRISM, ATS, templates, builder, exports, auth and billing are reused, not replaced; legacy routes still resolve and the enabled cohort is redirected (`LEGACY_TO_CAREER`) except Smart Studio and settings/billing/admin.

| Space | Delivered |
| --- | --- |
| Today | Orientation from owned records, ranked rule actions (`rules-1.0.0`) with reasons/evidence chips and durable completion from persisted results, checklist pulse (counts, no score), active campaigns (never auto-created), outcome insights with sample sizes, proactive reminders (opt-in), recent activity, anonymous-draft claim dialog, one-time introduction for accounts with history |
| Career | Overview, Experience, Achievements, Skills, Education, Evidence (review queue, conflicts, verification), Goals (structured goals, primary, revisions, scenario comparison), Profile; CV/profile import to candidate facts; correction impact banner over affected drafts (snapshots immutable) |
| Opportunities | Paste import with editable guesses and retained captured content, saved views, freshness from recorded dates, qualification fit (cited confirmed facts) separated from goal-direction fit and from the ATS keyword score, unknowns stay unknown, start application (idempotent RPC, decision-time goal snapshot) |
| Campaigns | Explicit campaigns toward a goal, milestones, observed funnel, application board (Earlier/Later + undo, no drag requirement), target opportunities, relationship notes; application workspace with Role analysis, CV (existing builder + PRISM bound to the application), Cover letter, Questions, LinkedIn, Networking, Interview prep, Notes, Activity; readiness checklist; user-recorded submission snapshot, responses and outcomes with provenance |
| Coach | One persistent, context-scoped Coach (`career-coach`) that cites owned facts or abstains; typed action gateway (`career-gateway`, 13 tools + cancel) with confirmation tokens, server-written receipts and once-per-action charging with release on our failures |
| Library | CVs (existing manager/builder), reports, headshots, cover letters, stories, evidence; template gallery; document detail with associations |
| Utilities | Cmd/Ctrl-K palette with grouped owned search, actionable inbox, settings (proactive assistance consent/quiet hours/caps, integrations no-go record), admin kept operator-only |

**Frontier (R3):** outcome-informed insights with uncertainty and correction handling, goal/offer scenario comparison over recorded vs assumed vs unknown inputs, opted-in proactive reminders (no scheduler, no sending), held-out evaluation harness. Optional connectors: assessed, **no-go** for this release; manual import retained.

**Data:** `supabase/migrations/20260920100000_career_os_foundation.sql` — 22 additive tables (all cascade from `auth.users`, RLS, same-owner FKs, revisions), additive columns on `job_applications`/`resumes`/`prism_runs`, `career_start_application`, `career_os_migrate_user`, `career_os_reconcile_legacy`, stage↔legacy-status trigger, prune functions; `account-export` v2 covers every table.

**Localization:** 1 411 new `careeros.*` keys in en/es/fr/de with a parity test.

**Pre-existing modules (22 Sep follow-up):** every module the old dashboard rendered now lives in the shell — Smart Studio at `/app/library/studio`, the resume manager's create/duplicate/rename/delete on Library CV cards (shared hook), the dashboard home cards as Today's "Documents & tools" panel, Career resources linked to `/resources`, builder CVs usable for applications without PRISM — and a pre-existing crash where any toast took the app down was fixed. See [LEGACY-INTEGRATION.md](LEGACY-INTEGRATION.md).

## 2. Verification results

Final run on the current tree ([final-verification.log](final-verification.log)):

| Check | Result |
| --- | --- |
| `npm run typecheck` | clean |
| `npx vitest run` | 63 files / 667 tests pass (after the legacy-module integration) |
| `deno test` (11 function/shared suites) | 272 pass; `deno check` on all 18 function entries |
| `node scripts/generate-theme-css.mjs` | 181/181 contrast gates, 575 tokens per theme |
| `career-os-migration-smoke.sh` | ALL PASS (migrate ×3 no duplicates, idempotent start, reapply, two-owner RLS, flag-off legacy reads, rollback keeps post-switch writes) |
| `career-os-lifecycle-smoke.sh` | ALL PASS (22/22 tables exported; cascade delete to zero rows — delete via auth admin because `account-delete` needs a Stripe key locally) |
| `scripts/career-os-eval.ts` | 15/15 held-out cases (deterministic engines) |
| `scripts/career_os_plan.py --check` | PASS, views and graphs synchronized |

Live on the local stack (real sign-in, real writes, no provider keys): J01, J02, J03, J04 (slice), J05, J06, J07 (smoke), J08 (mobile web + native iOS simulator), J09 (deterministic layer), J10 — see [COS-018](COS-018-r1-qualification.md), [COS-R2-surfaces](COS-R2-surfaces.md), [COS-032/033](COS-032-033-experience-performance.md), [COS-034](COS-034-r2-gate.md). Defects found and fixed during qualification are listed in COS-018 (14 items, including the two found in the final drills).

Distinguish: **mocked/unit** (vitest, Deno fakes), **live local integration** (browser + edge runtime + Postgres), **production qualification** (not run).

## 3. Migration and rollback readiness

* Additive only; applied locally with `db reset` and by the smoke scripts. Rollback = flag off (+ optional `career_os_reconcile_legacy`); no table drop; new writes survive; old clients keep the five legacy statuses ([COS-031](COS-031-rollout-rollback.md), [ADR](COS-003-schema-adr.md)).
* Export/delete coverage guarded by `export_test.ts` (fails if a table is added without a section).
* **Hosted project untouched.** Its schema state could not be read (permission denied); the memory note that earlier migrations were never applied there means the foundation migration must go through the normal migration path after a hosted schema read.

## 4. Remaining blockers (need authority or resources not available here)

1. **G7 production qualification** — approved staging/production-like environment, hosted schema read and deployment authority.
2. **Live-model review (G8 usefulness, latency, cost)** — one opt-in, cost-capped session for PRISM/Coach/interview with a human reviewer; all AI paths here were exercised through their honest unavailable/abstain states.
3. **Screen-reader/axe pass and iOS large text** — G6 stays PARTIAL until run.
4. **`account-delete` locally** — cannot boot without a Stripe key; cascade verified via the auth admin API.
5. **Connectors** — no-go recorded; COS-039 blocked; COS-041 (retirement) blocked on production observation.

Known, not blocking: Today issues ~34 owned queries (consolidation candidate); rule reason texts are English data; separate-tab concurrency not drilled.

## 5. Links

* Orchestrator: [tasks.md](../../../tasks.md) · manifest [plan.json](../plan.json) · ledger [CAREER_OS_ACCEPTANCE_LEDGER.md](../CAREER_OS_ACCEPTANCE_LEDGER.md) · graphs [GRAPHS.md](../GRAPHS.md)
* Gates: [COS-018 R1](COS-018-r1-qualification.md) · [COS-031 rollout](COS-031-rollout-rollback.md) · [COS-034 R2](COS-034-r2-gate.md) · [COS-040 G8](COS-040-g8-verdict.md) · [COS-038 connectors](COS-038-connector-assessment.md)
* Implementation evidence: [COS-001](COS-001-runtime-discovery.md) · [COS-002](COS-002-persistence.md) · [COS-003](COS-003-schema-adr.md) · [COS-004/005/008](COS-004-005-008-routes-tokens-shell.md) · [COS-006/014/017](COS-006-014-017-domain-layer.md) · [COS-007](COS-007-lifecycle.md) · [COS-013](COS-013-prism-binding.md) · [COS-026](COS-026-gateway.md) · [COS-R2 surfaces](COS-R2-surfaces.md) · [COS-032/033](COS-032-033-experience-performance.md) · [COS-035–037](COS-035-037-frontier-logic.md) · [held-out report](heldout-eval-report.json) · [final verification](final-verification.log)
