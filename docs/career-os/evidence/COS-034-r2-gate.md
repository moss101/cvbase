# COS-034 — Complete Career OS release gate (R2) — verdict

21 September 2026 · Same environment as [COS-018](COS-018-r1-qualification.md): local Supabase stack, Vite dev server, Chromium desktop/mobile emulation, native iOS build on the simulator, real accounts and writes; no LLM provider keys, no staging, no hosted access. This is the R2 gate record required by the release plan; it does **not** grant release permission.

## Overall verdict: R2 implemented and verified locally — NOT QUALIFIED for production

G1–G5 pass on the local stack. G6 is partial (screen-reader/axe evidence missing). G7 was not run (no approved staging/production-like environment, hosted schema unreadable in this session). No invariant failure remains open; what remains is un-run evidence, not a known defect.

## Gates

| Gate | Verdict | Evidence |
| --- | --- | --- |
| G1 Foundation | PASS (local) | [COS-001](COS-001-runtime-discovery.md), [COS-002](COS-002-persistence.md), [COS-003 ADR](COS-003-schema-adr.md), [COS-006/014/017](COS-006-014-017-domain-layer.md), [COS-007](COS-007-lifecycle.md) |
| G2 Shell | PASS (local) | [COS-004/005/008](COS-004-005-008-routes-tokens-shell.md); six spaces desktop, five entries mobile, cohort redirects, native back chain |
| G3 Core | PASS (local) | [COS-R2-surfaces](COS-R2-surfaces.md) rows COS-009/010/011/015/019/020/030; J01/J02/J10 live |
| G4 Execution | PASS (local) | [COS-R2-surfaces](COS-R2-surfaces.md) rows COS-012/013/016/021–027/029; J04 slice, J05, J06 live; gateway live script ([COS-026](COS-026-gateway.md)); board move/undo and the fact-correction impact drill performed live (synthetic fixture for the referenced drafts). |
| G5 Migration | PASS (local) | [COS-031](COS-031-rollout-rollback.md), smoke scripts in [final-verification.log](final-verification.log) |
| G6 Experience | PARTIAL | [COS-032/033](COS-032-033-experience-performance.md): mobile web 375/320, native iOS build, dark theme, every UX state, es/fr/de parity; screen-reader walkthrough and axe run not performed; large-text (Dynamic Type) not measured |
| G7 Production | NOT RUN | No approved staging/production-like environment; hosted schema read denied; no deployment authorised. Operator diagnosis path exists (`health`, receipts, `career_events`) but is unexercised in production. |

## Journeys

| Fixture | Status | Where |
| --- | --- | --- |
| J01 New user | PASS (live) | COS-018 |
| J02 Existing user | PASS (live) | COS-018 |
| J03 Anonymous transition | PASS (live; single second-account step covered by the two-owner RLS smoke rather than a second browser sign-in) | COS-018, migration smoke |
| J04 Full journey | PASS (live slice: same context ids from goal to outcome; PRISM reached the server and failed honestly without a provider; Coach abstained; submission snapshot immutable; completion receipts durable). The "improved recommendations" step is the deterministic re-rank after the recorded interview, not an outcome-learned policy (< 5 observations). | COS-018 |
| J05 Competing contexts | PASS (live, sequential; separate-tab concurrency not exercised) | COS-018 |
| J06 Failure/recovery | PASS for provider failure, quota gate, malformed ids, duplicate keys, interrupted onboarding; offline exercised via `navigator.onLine` panels; revoked-auth and interrupted-stream cases covered by function tests only | COS-018, COS-013, COS-026 |
| J07 Concurrency/migration | PASS (smoke: two-owner RLS, restartable migration, rollback with new writes); two-device concurrent edits covered by revision-conflict unit tests, not live | COS-031 |
| J08 Accessibility/mobile | PARTIAL (mobile web + native shell verified; keyboard palette verified; screen reader and large text not) | COS-032/033 |
| J09 AI trust | PASS for the deterministic layer (injected JD instruction not extracted; withdrawn facts never count; changed confirmation payload rejected 409; wrong-owner refs 404) — model-output trust untested without a provider | COS-026, heldout-eval-report.json |
| J10 Continuing career | PASS (live: the employed new user's Today offered "Capture a recent achievement" with a real reason; the achievement was captured with a metric and linked role, and the action completed from that durable fact on the next load; goal revision without applying was exercised in J02's goal edit) | COS-R2-surfaces (COS-019) |
| J11 Sparse outcomes | PASS (unit + held-out; not live beyond "inside the observation window") | COS-035/037, COS-040 |
| J12 Optional integration | N/A — COS-038 recorded a no-go; quiet hours/dedupe/disconnect exist for proactive reminders (tested) | COS-038 |

## Invariants (SOURCE_PRD) checked against the delivered code

* Ownership and same-owner links: RLS on all 22 tables; same-owner FK checks; client insert into server-owned `action_runs` denied (42501).
* Canonical context: one `resolveContext`; route subject wins; conflicting hints rewritten; caches keyed by account and document.
* Unsupported facts stay unconfirmed: candidates never feed fit as `supported`; PRISM grounding retained; Coach cites or abstains.
* Real execution progress: receipts (`action_runs`) written server-side; stage labels reflect execution; charging once per logical action with release on our failures.
* User control: submissions, outcomes and claims are user-confirmed; proactive assistance is opt-in with consent, quiet hours and caps; no background sending exists.
* Additive migration, export and deletion coverage, legacy compatibility, tested rollback (COS-031).

## Employed-user value (acceptance criterion 3)

J10 (live): without any application, Today offered "Capture a recent achievement" with a real reason (0 recorded achievements, linked to the primary goal); the person recorded it as a confirmed achievement with a metric, period, linked role and cited evidence; Career pulse moved to 11 of 11 confirmed facts; the action completed with a durable receipt and the activity feed explained both steps. No production or outcome claim is made.

## What would move this to QUALIFIED

1. G7 run on an approved staging or production-like environment after the hosted schema state is read and the foundation migration is applied through the normal path.
2. Screen-reader (VoiceOver/NVDA) walkthrough and an axe pass over the six spaces; large-text check on iOS.
3. A second-device concurrency drill (two sessions editing the same record).
4. One opt-in, cost-capped live-model session for PRISM, Coach and interview questions to confirm the grounded (non-abstain) paths.
