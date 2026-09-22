# CVBase Career OS — implementation orchestrator

Generated from [plan.json](docs/career-os/plan.json) · 2026-09-22

Start here to select and execute the next bounded task. [PRD](PRD.md) defines the product; [graphs](docs/career-os/GRAPHS.md) explain the system and dependencies; [acceptance ledger](docs/career-os/CAREER_OS_ACCEPTANCE_LEDGER.md) tracks requirement evidence. The repository audit is verified. Career OS runtime work has not begun.

## Operating loop

1. Read the task, parent requirements, source files and inherited contract. Search again before extending code.
2. Select an eligible task; record the actual implementer and intended write scope in its work notes. Functional owners below are roles, not assigned people.
3. Close any task-local schema/API/UX unknowns. Split oversized work into child tasks in the manifest before coding; preserve dependency and requirement edges.
4. Mark IN_PROGRESS; implement the smallest complete slice using existing capabilities. Do not combine unrelated rewrites.
5. Verify the task-specific acceptance criteria, inherited quality contract and affected legacy paths. Record real evidence, including failures and unresolved limits.
6. Mark IMPLEMENTED when code exists, VERIFIED when relevant checks pass, QUALIFIED only after its acceptance gate. Update the manifest and regenerate views.
7. If a parent assumption fails, stop dependent work, revise the parent contract, update edges/acceptance and resume from the corrected plan.

Dependencies require VERIFIED or QUALIFIED. A task with missing runtime/schema evidence must first resolve that discovery; dependency eligibility alone is not implementation readiness. BLOCKED requires a specific blocker. No date or completion is inferred from code presence. External release, payment, submission or messaging authority is not granted by task status.

```bash
python3 scripts/career_os_plan.py --next
python3 scripts/career_os_plan.py --check
# After editing plan.json intentionally:
python3 scripts/career_os_plan.py --write
# If diagram sources or styles changed (requires mmdc on PATH):
python3 scripts/render_career_os_graphs.py
python3 scripts/career_os_plan.py --check
```

Edit task records in `docs/career-os/plan.json`; this file, the acceptance ledger, source crosswalk and task DAG are generated together. Architecture/domain/sequence graphs are authored contracts and must be reconciled manually when those contracts change.

## Eligible next tasks

No eligible planned tasks; inspect in-progress work or explicit blockers.

## Release boundaries

| Release | Outcome | Gate |
| --- | --- | --- |
| R0 | Reliable existing data, canonical contracts/context, migration framework and shell | Foundation evidence in COS-018 |
| R1 | Goal → imported opportunity → application → reviewed PRISM CV → return from Today | COS-018 |
| R2 | Full six-space Career OS through Coach, interview, outcome, Library and onboarding | COS-034 |
| R3 | Outcome learning, scenarios and opted-in proactive work | COS-040 |
| Optional integration | One permitted read-only source | COS-038 decision then COS-039 evidence |
| Retirement | Remove superseded presentation after observation/rollback evidence | COS-041 |

The DAG encodes prerequisite order, not elapsed-time estimates. It permits independent work when dependencies and write scopes allow; it does not auto-delegate. Do not wait for optional connectors to qualify R1/R2. Full Career OS completion is not claimed at the R1 slice.

## Task board

| Task | Work | Release | Priority | Status | Dependencies |
| --- | --- | --- | --- | --- | --- |
| [COS-000](tasks.md#cos-000) | Repository audit and planning authority | R0 | P0 | VERIFIED | None |
| [COS-001](tasks.md#cos-001) | Close runtime unknowns and establish fixtures/budgets | R0 | P0 | VERIFIED | COS-000 |
| [COS-002](tasks.md#cos-002) | Repair document identity, cache scoping and sync conflicts | R0 | P0 | VERIFIED | COS-000 |
| [COS-003](tasks.md#cos-003) | Finalize schema, ownership and extension decisions | R0 | P0 | VERIFIED | COS-000 |
| [COS-004](tasks.md#cos-004) | Implement canonical route contracts and compatibility parsing | R0 | P0 | VERIFIED | COS-003 |
| [COS-005](tasks.md#cos-005) | Extend semantic tokens and shared Career OS primitives | R0 | P0 | VERIFIED | COS-000 |
| [COS-006](tasks.md#cos-006) | Build canonical context projection and invalidation | R0 | P0 | VERIFIED | COS-002, COS-003 |
| [COS-007](tasks.md#cos-007) | Implement additive migration and lifecycle infrastructure | R0 | P0 | VERIFIED | COS-001, COS-002, COS-003 |
| [COS-008](tasks.md#cos-008) | Compose six-space shell for desktop and mobile | R0 | P1 | VERIFIED | COS-004, COS-005, COS-006 |
| [COS-009](tasks.md#cos-009) | Import and review canonical career facts | R1 | P1 | VERIFIED | COS-006, COS-007 |
| [COS-010](tasks.md#cos-010) | Create reusable goals and primary-goal selection | R1 | P1 | VERIFIED | COS-009 |
| [COS-011](tasks.md#cos-011) | Persist imported opportunities and saved views | R1 | P1 | VERIFIED | COS-006, COS-007 |
| [COS-012](tasks.md#cos-012) | Extend existing application persistence and start flow | R1 | P0 | VERIFIED | COS-011, COS-007 |
| [COS-013](tasks.md#cos-013) | Bind PRISM to application and harden durable recovery | R1 | P0 | VERIFIED | COS-002, COS-012 |
| [COS-014](tasks.md#cos-014) | Implement shared action rules and lifecycle | R1 | P1 | VERIFIED | COS-006, COS-010, COS-012 |
| [COS-015](tasks.md#cos-015) | Deliver Today using real context and actions | R1 | P1 | VERIFIED | COS-008, COS-014 |
| [COS-016](tasks.md#cos-016) | Compose the first application workspace with existing CV engine | R1 | P1 | VERIFIED | COS-008, COS-012, COS-013 |
| [COS-017](tasks.md#cos-017) | Add product events and privacy-safe measurements | R1 | P1 | VERIFIED | COS-001, COS-003 |
| [COS-018](tasks.md#cos-018) | Qualify the connected application slice | R1 | P0 | VERIFIED | COS-007, COS-010, COS-011, COS-013, COS-015, COS-016, COS-017 |
| [COS-019](tasks.md#cos-019) | Complete Career evidence and progression surfaces | R2 | P1 | VERIFIED | COS-008, COS-009, COS-010 |
| [COS-020](tasks.md#cos-020) | Deliver qualification and career-direction fit | R2 | P1 | VERIFIED | COS-010, COS-011, COS-019 |
| [COS-021](tasks.md#cos-021) | Build campaign milestones and application board | R2 | P1 | VERIFIED | COS-008, COS-010, COS-012 |
| [COS-022](tasks.md#cos-022) | Persist all application preparation artifacts | R2 | P1 | VERIFIED | COS-016, COS-020 |
| [COS-023](tasks.md#cos-023) | Track factual changes across generated assets | R2 | P1 | VERIFIED | COS-019, COS-013, COS-022 |
| [COS-024](tasks.md#cos-024) | Implement evidence-based interview preparation | R2 | P1 | VERIFIED | COS-016, COS-019 |
| [COS-025](tasks.md#cos-025) | Record submission, responses and outcomes with provenance | R2 | P1 | VERIFIED | COS-017, COS-021, COS-022, COS-024 |
| [COS-026](tasks.md#cos-026) | Implement the typed Coach action gateway | R2 | P0 | VERIFIED | COS-014, COS-013, COS-021, COS-022, COS-024, COS-025 |
| [COS-027](tasks.md#cos-027) | Build one persistent contextual Coach | R2 | P1 | VERIFIED | COS-008, COS-026, COS-021 |
| [COS-028](tasks.md#cos-028) | Consolidate Library and asset relationships | R2 | P1 | VERIFIED | COS-008, COS-022, COS-024 |
| [COS-029](tasks.md#cos-029) | Add command search and actionable inbox | R2 | P1 | VERIFIED | COS-014, COS-017, COS-027, COS-028 |
| [COS-030](tasks.md#cos-030) | Deliver resumable onboarding and existing-user introduction | R2 | P1 | VERIFIED | COS-018, COS-019, COS-015 |
| [COS-031](tasks.md#cos-031) | Qualify existing-user rollout and rollback | R2 | P0 | VERIFIED | COS-007, COS-018, COS-027, COS-028, COS-030 |
| [COS-032](tasks.md#cos-032) | Qualify mobile, accessibility, localization and visual states | R2 | P1 | VERIFIED | COS-027, COS-028, COS-029, COS-030 |
| [COS-033](tasks.md#cos-033) | Qualify performance, provider failure and cost controls | R2 | P1 | VERIFIED | COS-001, COS-018, COS-026, COS-029 |
| [COS-034](tasks.md#cos-034) | Qualify the complete Career OS release | R2 | P0 | BLOCKED | COS-019, COS-020, COS-021, COS-022, COS-023, COS-024, COS-025, COS-027, COS-028, COS-029, COS-030, COS-031, COS-032, COS-033 |
| [COS-035](tasks.md#cos-035) | Add outcome-informed recommendations with uncertainty | R3 | P1 | IMPLEMENTED | COS-025, COS-034 |
| [COS-036](tasks.md#cos-036) | Build goal and offer scenario comparison | R3 | P1 | IMPLEMENTED | COS-020, COS-025, COS-034 |
| [COS-037](tasks.md#cos-037) | Add opted-in proactive plans and reminders | R3 | P1 | IMPLEMENTED | COS-029, COS-035, COS-034 |
| [COS-038](tasks.md#cos-038) | Assess optional market and personal-data connectors | R3 | P2 | IMPLEMENTED | COS-034 |
| [COS-039](tasks.md#cos-039) | Implement one qualified read-only connector | R3 optional | P2 | BLOCKED | COS-038, COS-037 |
| [COS-040](tasks.md#cos-040) | Qualify frontier intelligence against held-out cases | R3 | P1 | IMPLEMENTED | COS-035, COS-036, COS-037, COS-038 |
| [COS-041](tasks.md#cos-041) | Retire only qualified legacy surfaces | Retirement | P1 | BLOCKED | COS-031, COS-034 |

## Inherited task contracts

Every task inherits all five fields below from its named profile; its specific acceptance criteria and tests add to them. This avoids repeating identical requirements while preserving the source PRD task contract. Data ownership, API, legacy impact and source evidence are specified per task.

<a id="discovery-contract"></a>
### Discovery contract

- **Ui states:** Document observed states and UNKNOWN runtime coverage; no UI changes required.
- **Responsive:** Inventory desktop, mobile web and native differences.
- **Accessibility:** Record unverified behaviors; do not claim WCAG compliance from source alone.
- **Analytics:** Record existing telemetry and missing measurements; do not emit customer events.
- **Evidence required:** Decision/audit artifact, exact source references, commands/results and unresolved questions.

<a id="foundation-contract"></a>
### Foundation contract

- **Ui states:** Consumers must distinguish loading, partial, conflict, unavailable, permission, quota, offline and retryable error.
- **Responsive:** Contract usable by desktop and mobile/native consumers; no layout coupling.
- **Accessibility:** Expose structured status/error/recovery labels for accessible consumers; no visual-only status.
- **Analytics:** Versioned domain events after durable changes; no raw CV/JD/PII in telemetry.
- **Evidence required:** Implementation revision, targeted unit/integration results, same-owner and failure fixtures, migration/lifecycle result where persistence changes.

<a id="workflow-contract"></a>
### Workflow contract

- **Ui states:** First use, populated, loading, partial, empty, error/retry, offline/degraded, permission/plan denied, AI unavailable and large history.
- **Responsive:** Desktop/tablet/mobile; 320px reflow; native back/keyboard/safe area where applicable.
- **Accessibility:** Keyboard, visible focus, labeled controls, announced status, readable charts and non-drag alternatives; both themes and reduced motion.
- **Analytics:** Emit meaningful progression events only after durable changes; include subject/revision/correlation IDs without private text.
- **Evidence required:** Implementation revision, functional/context tests, real-shaped fixtures, screenshots of major states, accessibility checks and API receipt where applicable.

<a id="qualification-contract"></a>
### Qualification contract

- **Ui states:** Exercise all PRD states through complete new/existing/guest journeys, not only isolated happy-path screens.
- **Responsive:** Mobile/tablet/desktop and iOS/Android back/keyboard/share behavior.
- **Accessibility:** Automated checks plus manual keyboard/screen-reader evidence; no blanket claim from token tests.
- **Analytics:** Verify event payloads, dedupe, cohort denominators and operational diagnosis; no raw private content.
- **Evidence required:** Named fixture runs, implementation/environment revisions, API/migration receipts, visual/a11y/performance results and explicit gate verdict.

## Task specifications

<a id="cos-000"></a>
### COS-000 — Repository audit and planning authority

**VERIFIED · R0 · P0 · Product / architecture · discovery**

**Parent requirements:** REQ-01, REQ-02, REQ-03, REQ-25, REQ-35; source workstreams WS-00, WS-01, WS-02. **Dependencies:** None. **Inherited contract:** [discovery](#discovery-contract).

**Purpose:** Establish evidence-backed reuse decisions and an executable planning index.

**Existing implementation discovered:** Routes, repositories, PRISM, styles, CI and supplied authority inspected.

**Files/modules:** [App.tsx](App.tsx), [components/NavigationProvider.tsx](components/NavigationProvider.tsx), [types.ts](types.ts), [supabase/migrations](supabase/migrations), [docs/career-os/CURRENT_PRODUCT_MAP.md](docs/career-os/CURRENT_PRODUCT_MAP.md).

**Data ownership:** Documentation only.

**API dependencies:** No runtime API calls.

**Acceptance criteria:**

- Every discovered route/capability mapped; source PRD retained.
- Requirements, tasks and DAG cross-validate; baseline commands recorded.

**Tests:** Plan checker; local typecheck, 254 Vitest tests, 212 Deno tests and build.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Historical notes retain content with current-authority pointers.

**Recorded evidence:** [docs/career-os/CURRENT_PRODUCT_MAP.md](docs/career-os/CURRENT_PRODUCT_MAP.md), [docs/career-os/evidence/BASELINE.md](docs/career-os/evidence/BASELINE.md), [docs/career-os/evidence/plan-check.log](docs/career-os/evidence/plan-check.log)

<a id="cos-001"></a>
### COS-001 — Close runtime unknowns and establish fixtures/budgets

**VERIFIED · R0 · P0 · Platform / QA · discovery**

**Parent requirements:** REQ-05, REQ-27, REQ-28, REQ-32, REQ-35; source workstreams WS-00, WS-16. **Dependencies:** COS-000. **Inherited contract:** [discovery](#discovery-contract).

**Purpose:** Make deployment, data volume and rollout assumptions verifiable.

**Existing implementation discovered:** Local suites pass; deployed migrations, flags, latency and customer fixtures UNKNOWN.

**Files/modules:** [docs/GO_LIVE.md](docs/GO_LIVE.md), [docs/MOBILE_RELEASE.md](docs/MOBILE_RELEASE.md), [supabase/tests](supabase/tests), [lib/monitoring.ts](lib/monitoring.ts), [scripts/career-os-local-env.sh](scripts/career-os-local-env.sh).

**Data ownership:** Sanitized fixture metadata; never commit customer content or secrets.

**API dependencies:** Read-only approved environment checks; health and local Supabase smoke scripts.

**Acceptance criteria:**

- Record deployed schema/flags and supported old native versions.
- Create populated/guest/conflict fixtures; record device/network latency baseline and numerical release budgets.
- Select telemetry destination, data-retention policy and cohort observation thresholds.

**Tests:** Run local-stack smoke suite only after its environment safety preconditions; benchmark critical paths.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Keep current production behavior while facts are gathered.

**Recorded evidence:** [docs/career-os/evidence/COS-001-runtime-discovery.md](docs/career-os/evidence/COS-001-runtime-discovery.md)

<a id="cos-002"></a>
### COS-002 — Repair document identity, cache scoping and sync conflicts

**VERIFIED · R0 · P0 · Frontend / data · implementation**

**Parent requirements:** REQ-02, REQ-05, REQ-19, REQ-26; source workstreams WS-05, WS-14. **Dependencies:** COS-000. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Make context-bound editing safe before adding shared contexts.

**Existing implementation discovered:** Mapper drops updatedAt; missing requested resume falls back to primary; shared browser keys and full-array tracker writes.

**Files/modules:** [lib/builder/usePersistence.ts](lib/builder/usePersistence.ts), [services/repos/mappers.ts](services/repos/mappers.ts), [services/repos/resumeRepo.ts](services/repos/resumeRepo.ts), [components/ResumeBuilder.tsx](components/ResumeBuilder.tsx), [components/SmartStudio.tsx](components/SmartStudio.tsx), [lib/builder/draftCache.ts](lib/builder/draftCache.ts).

**Data ownership:** Existing resumes/job_applications remain owners; scoped drafts are recoverable caches.

**API dependencies:** resumeRepo and trackerRepo; additive revision/precondition support.

**Acceptance criteria:**

- Missing resume ID never loads a different CV.
- Account/document scoped cache and explicit anonymous claim preserve unsaved drafts.
- Concurrent/stale saves surface conflicts; failed tracker writes remain recoverable after reload.

**Tests:** Targeted persistence/account-switch/missing-ID/two-device and partial-write tests.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Migrate old cache keys through an explicit non-destructive adapter.

**Recorded evidence:** [docs/career-os/evidence/COS-002-persistence.md](docs/career-os/evidence/COS-002-persistence.md)

<a id="cos-003"></a>
### COS-003 — Finalize schema, ownership and extension decisions

**VERIFIED · R0 · P0 · Domain / platform · design**

**Parent requirements:** REQ-01, REQ-02, REQ-06, REQ-14, REQ-15, REQ-16, REQ-25, REQ-27, REQ-28, REQ-35; source workstreams WS-01, WS-05. **Dependencies:** COS-000. **Inherited contract:** [discovery](#discovery-contract).

**Purpose:** Turn proposed aggregate ownership into implementable migration contracts.

**Existing implementation discovered:** Profile and CV JSON overlap; tracker lacks career relationships; no goals/campaigns/conversation owner.

**Files/modules:** [docs/career-os/CAREER_OS_DOMAIN_MAP.md](docs/career-os/CAREER_OS_DOMAIN_MAP.md), [supabase/migrations](supabase/migrations), [services/profileMapping.ts](services/profileMapping.ts), [services/repos/mappers.ts](services/repos/mappers.ts), [supabase/migrations/20260920100000_career_os_foundation.sql](supabase/migrations/20260920100000_career_os_foundation.sql).

**Data ownership:** One Career aggregate, existing application/CV IDs, additive claim/goal/opportunity relationships.

**API dependencies:** Define RLS/RPC or repository boundaries using existing Supabase.

**Acceptance criteria:**

- ADR specifies exact models, same-owner constraints, revisions, retention/export/delete and indexes.
- Every new subsystem has alternatives/reuse rationale and owner.
- Define old-client compatibility, status mapping and metering semantics with no second application/credits system.

**Tests:** Schema prototype/fixture review and ownership matrix; no production migrations.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Preserve specialized profile fields, historical snapshots and tracker status values.

**Recorded evidence:** [docs/career-os/evidence/COS-003-schema-adr.md](docs/career-os/evidence/COS-003-schema-adr.md), [docs/career-os/evidence/migration-local.log](docs/career-os/evidence/migration-local.log)

<a id="cos-004"></a>
### COS-004 — Implement canonical route contracts and compatibility parsing

**VERIFIED · R0 · P0 · Frontend architecture · implementation**

**Parent requirements:** REQ-02, REQ-03, REQ-05, REQ-23; source workstreams WS-02, WS-05. **Dependencies:** COS-003. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Make nested context deep links round-trip before screen rollout.

**Existing implementation discovered:** Existing navigation owns history/native back but parser only supports two segments.

**Files/modules:** [components/NavigationProvider.tsx](components/NavigationProvider.tsx), [components/common/__tests__/navigationRoutes.test.ts](components/common/__tests__/navigationRoutes.test.ts), [App.tsx](App.tsx), [vercel.json](vercel.json).

**Data ownership:** URLs own subject IDs and section; data remains repository-owned.

**API dependencies:** Context ID resolution; no private text in URLs.

**Acceptance criteria:**

- All IA route families round-trip with validated IDs and next continuation.
- Disabled/unimplemented destinations retain legacy fallback; no unconditional redirect to missing screens.
- Application relations outrank inconsistent query hints; not-found and permission states work.

**Tests:** Route ledger tests, malformed URLs, auth continuation and back-stack tests.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Keep preview query contract and standalone/guest builder flows.

**Recorded evidence:** [docs/career-os/evidence/COS-004-005-008-routes-tokens-shell.md](docs/career-os/evidence/COS-004-005-008-routes-tokens-shell.md)

<a id="cos-005"></a>
### COS-005 — Extend semantic tokens and shared Career OS primitives

**VERIFIED · R0 · P0 · Design / frontend · implementation**

**Parent requirements:** REQ-29, REQ-30, REQ-31; source workstreams WS-03, WS-16. **Dependencies:** COS-000. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Establish reusable surface foundations with existing visual language.

**Existing implementation discovered:** Role-split generated colors, dialogs/toast/sheets and adjustable text already exist.

**Files/modules:** [scripts/generate-theme-css.mjs](scripts/generate-theme-css.mjs), [tailwind.config.js](tailwind.config.js), [styles/theme.css](styles/theme.css), [components/common](components/common), [components/mobile](components/mobile), [components/careeros/primitives](components/careeros/primitives).

**Data ownership:** Presentation only; components consume typed projections.

**API dependencies:** No new service.

**Acceptance criteria:**

- Semantic aliases build through current generator; document and marketing exceptions retained.
- Action/evidence/context/fit primitives cover common states without page-local token systems.
- Keyboard, contrast and reduced-motion checked in both themes.

**Tests:** Token generator checks and focused component/visual/a11y verification.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Adapt existing primitives; do not re-theme CV output.

**Recorded evidence:** [docs/career-os/evidence/COS-004-005-008-routes-tokens-shell.md](docs/career-os/evidence/COS-004-005-008-routes-tokens-shell.md)

<a id="cos-006"></a>
### COS-006 — Build canonical context projection and invalidation

**VERIFIED · R0 · P0 · Domain / frontend · implementation**

**Parent requirements:** REQ-02, REQ-04, REQ-25, REQ-26; source workstreams WS-05. **Dependencies:** COS-002, COS-003. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Resolve one owned context consistently across all consumers.

**Existing implementation discovered:** Current providers are feature/account-specific; contexts and cache projections are absent.

**Files/modules:** [components/AuthProvider.tsx](components/AuthProvider.tsx), [services/api.ts](services/api.ts), [services/repos](services/repos), [types.ts](types.ts), [services/careerOs/careerContext.ts](services/careerOs/careerContext.ts).

**Proposed modules (not yet implemented):** `services/careerContext.ts`, `components/CareerContextProvider.tsx`.

**Data ownership:** Server owns refs/revisions; provider owns selection and cache state.

**API dependencies:** Existing repositories plus schema-approved same-owner context queries.

**Acceptance criteria:**

- Context resolver validates ownership/relationships and projects minimal data.
- Stale revisions invalidate fit/actions; account switch clears sensitive context.
- Partial/missing data is typed; unsaved drafts cannot override persisted relationships silently.

**Tests:** Two-user/two-application projection, revocation, stale-context and invalidation tests.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Adapter wraps existing models before consumers migrate.

**Recorded evidence:** [docs/career-os/evidence/COS-006-014-017-domain-layer.md](docs/career-os/evidence/COS-006-014-017-domain-layer.md)

<a id="cos-007"></a>
### COS-007 — Implement additive migration and lifecycle infrastructure

**VERIFIED · R0 · P0 · Data / platform · implementation**

**Parent requirements:** REQ-05, REQ-25, REQ-28, REQ-35; source workstreams WS-14. **Dependencies:** COS-001, COS-002, COS-003. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Guarantee restartable mapping and access during migration.

**Existing implementation discovered:** Existing local imports and lifecycle exports cover current tables, not new objects.

**Files/modules:** [supabase/migrations](supabase/migrations), [supabase/functions/account-export/index.ts](supabase/functions/account-export/index.ts), [supabase/functions/account-delete/index.ts](supabase/functions/account-delete/index.ts), [services/repos/accountRepo.ts](services/repos/accountRepo.ts), [supabase/tests](supabase/tests), [supabase/functions/_shared/careerTables.ts](supabase/functions/_shared/careerTables.ts), [supabase/tests/career-os-migration-smoke.sh](supabase/tests/career-os-migration-smoke.sh), [supabase/tests/career-os-lifecycle-smoke.sh](supabase/tests/career-os-lifecycle-smoke.sh).

**Data ownership:** Original IDs/data authoritative until validated cutover; migration ledger owns mappings.

**API dependencies:** Same-owner DB constraints, lifecycle endpoints, compatibility adapters.

**Acceptance criteria:**

- Partial imports restart with same IDs and no duplicate artifacts.
- Every new owned record included in export/delete and relationship constraints.
- Rollback retains post-switch writes; legacy reads remain usable while projections fail.

**Tests:** Migration dry run, restart/rollback/content parity and two-owner RLS fixtures.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** No destructive schema contraction; guest/demo records require explicit provenance.

**Recorded evidence:** [docs/career-os/evidence/COS-007-lifecycle.md](docs/career-os/evidence/COS-007-lifecycle.md)

<a id="cos-008"></a>
### COS-008 — Compose six-space shell for desktop and mobile

**VERIFIED · R0 · P1 · Frontend · implementation**

**Parent requirements:** REQ-03, REQ-29, REQ-30, REQ-31; source workstreams WS-04. **Dependencies:** COS-004, COS-005, COS-006. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Expose one information architecture across platforms.

**Existing implementation discovered:** Dashboard and mobile shell duplicate feature-tab composition.

**Files/modules:** [App.tsx](App.tsx), [components/Dashboard.tsx](components/Dashboard.tsx), [components/mobile/DashboardMobile.tsx](components/mobile/DashboardMobile.tsx), [components/mobile/BottomTabBar.tsx](components/mobile/BottomTabBar.tsx), [lib/useMobileShell.ts](lib/useMobileShell.ts), [components/careeros/CareerShell.tsx](components/careeros/CareerShell.tsx).

**Data ownership:** Shared navigation descriptors; no new domain state in shell.

**API dependencies:** Context provider and feature flags with matching server gates.

**Acceptance criteria:**

- Six desktop spaces and five mobile entries; utilities/admin preserved.
- Shell renders without AI; placeholders are honest and incomplete features retain legacy routes.
- Native back, safe area, auth continuation and contextual breadcrumbs work.

**Tests:** Navigation integration and mobile shell fixtures.

**Analytics:** career_os_opened

**Legacy impact:** Retain legacy dashboard behind cohort flag until equivalent destinations qualify.

**Recorded evidence:** [docs/career-os/evidence/COS-004-005-008-routes-tokens-shell.md](docs/career-os/evidence/COS-004-005-008-routes-tokens-shell.md)

<a id="cos-009"></a>
### COS-009 — Import and review canonical career facts

**VERIFIED · R1 · P1 · Career / data · implementation**

**Parent requirements:** REQ-02, REQ-06, REQ-13, REQ-24; source workstreams WS-07, WS-13. **Dependencies:** COS-006, COS-007. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Create reusable career identity without silently promoting tailored text.

**Existing implementation discovered:** Parsing/profile fields and ResumeData provide import sources, but no claim provenance.

**Files/modules:** [services/resumeParser.ts](services/resumeParser.ts), [services/profileMapping.ts](services/profileMapping.ts), [components/UserProfileForm.tsx](components/UserProfileForm.tsx), [components/builder/MasterProfileSyncCard.tsx](components/builder/MasterProfileSyncCard.tsx), [lib/ats/resumeParse.ts](lib/ats/resumeParse.ts), [services/careerOs/careerFacts.ts](services/careerOs/careerFacts.ts), [services/careerOs/factRepo.ts](services/careerOs/factRepo.ts), [components/careeros/career/ImportPanel.tsx](components/careeros/career/ImportPanel.tsx), [components/careeros/career/ReviewQueue.tsx](components/careeros/career/ReviewQueue.tsx).

**Data ownership:** Career aggregate and versioned facts; source resume remains unchanged.

**API dependencies:** Approved career repositories and current parsing endpoints.

**Acceptance criteria:**

- Select/import source CV; preview candidate facts, resolve duplicates/contradictions and confirm.
- Imported claims are not Verified; missing/custom fields retained.
- Re-import and interrupted review are idempotent; account export includes reviewed facts.

**Tests:** Parsing/provenance/duplicate/conflict/import-resume fixtures.

**Analytics:** career_import_reviewed, career_profile_completed

**Legacy impact:** Legacy profile and primary CV remain readable during projection.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-010"></a>
### COS-010 — Create reusable goals and primary-goal selection

**VERIFIED · R1 · P1 · Career · implementation**

**Parent requirements:** REQ-02, REQ-14; source workstreams WS-07. **Dependencies:** COS-009. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Stop repeatedly asking for target role and constraints.

**Existing implementation discovered:** Target-role fields currently live independently in Smart Studio inputs.

**Files/modules:** [services/profileMapping.ts](services/profileMapping.ts), [components/UserProfileForm.tsx](components/UserProfileForm.tsx), [services/smartStudioService.ts](services/smartStudioService.ts), [services/careerOs/goalRepo.ts](services/careerOs/goalRepo.ts), [components/careeros/career/GoalForm.tsx](components/careeros/career/GoalForm.tsx), [components/careeros/career/GoalsView.tsx](components/careeros/career/GoalsView.tsx).

**Data ownership:** Versioned career_goals; optional primary per user.

**API dependencies:** Approved goal repository and context invalidation.

**Acceptance criteria:**

- Create/edit/archive goals with structured geography/compensation/time fields.
- At most one primary; no-goal and multiple-goal states supported.
- Goal revision invalidates derived recommendations without altering historical application snapshots.

**Tests:** Primary uniqueness, revision and context consumer integration tests.

**Analytics:** career_goal_created, career_goal_updated

**Legacy impact:** Suggest existing target-role values for review instead of auto-creating goals.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-011"></a>
### COS-011 — Persist imported opportunities and saved views

**VERIFIED · R1 · P1 · Opportunities / data · implementation**

**Parent requirements:** REQ-07, REQ-15; source workstreams WS-08. **Dependencies:** COS-006, COS-007. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Turn pasted JD and wishlist state into stable opportunity context.

**Existing implementation discovered:** JD local state and tracker URL/company/role are the only existing sources.

**Files/modules:** [components/SmartStudio.tsx](components/SmartStudio.tsx), [services/repos/trackerRepo.ts](services/repos/trackerRepo.ts), [services/atsEngine.ts](services/atsEngine.ts), [supabase/migrations](supabase/migrations), [services/careerOs/opportunityRepo.ts](services/careerOs/opportunityRepo.ts), [components/careeros/opportunities/ImportOpportunityDialog.tsx](components/careeros/opportunities/ImportOpportunityDialog.tsx), [components/careeros/opportunities/OpportunityList.tsx](components/careeros/opportunities/OpportunityList.tsx).

**Data ownership:** User-owned opportunity with captured source and optional legacy mapping.

**API dependencies:** Opportunity repository; existing ATS engine.

**Acceptance criteria:**

- Paste/manual import persists source, captured time and complete JD snapshot.
- Saved/watching/archive filters work; duplicate merge retains/reverses associations.
- For You accurately states imported-only coverage; missing or stale listing fields stay unknown.

**Tests:** Reload/source-freshness/dedupe/same-owner and wishlist migration fixtures.

**Analytics:** opportunity_saved, opportunity_reviewed

**Legacy impact:** Preserve wishlist application IDs through mapping.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-012"></a>
### COS-012 — Extend existing application persistence and start flow

**VERIFIED · R1 · P0 · Execution / data · implementation**

**Parent requirements:** REQ-02, REQ-16, REQ-17, REQ-18; source workstreams WS-09, WS-10. **Dependencies:** COS-011, COS-007. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Give every application one durable workspace identity.

**Existing implementation discovered:** Existing job_applications table and five statuses must remain authoritative.

**Files/modules:** [services/repos/trackerRepo.ts](services/repos/trackerRepo.ts), [services/repos/mappers.ts](services/repos/mappers.ts), [types.ts](types.ts), [supabase/migrations](supabase/migrations), [services/careerOs/applicationRepo.ts](services/careerOs/applicationRepo.ts), [components/careeros/opportunities/useStartApplication.ts](components/careeros/opportunities/useStartApplication.ts), [supabase/tests/career-os-migration-smoke.sh](supabase/tests/career-os-migration-smoke.sh).

**Data ownership:** Extend job_applications, attempt/revision and opportunity/campaign/artifact links.

**API dependencies:** Idempotent start/application mutation transaction; current trackerRepo.

**Acceptance criteria:**

- Repeated/concurrent Start Application returns same attempt; explicit reapply creates linked new attempt.
- Legacy wishlist activates existing shell; old status contract remains readable.
- Same-owner relations enforced; submission requires explicit record and artifact snapshot.

**Tests:** Concurrent-start, status compatibility, foreign-owner and submission fixtures.

**Analytics:** application_started, application_submitted

**Legacy impact:** No second application table or destructive status rewrite.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-013"></a>
### COS-013 — Bind PRISM to application and harden durable recovery

**VERIFIED · R1 · P0 · AI platform / execution · implementation**

**Parent requirements:** REQ-04, REQ-19, REQ-26, REQ-27, REQ-34; source workstreams WS-10. **Dependencies:** COS-002, COS-012. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Reuse specialist tailoring with the correct application and reliable receipts.

**Existing implementation discovered:** Staged graph/checkpoints/grounding exist; latest-run resume is user-wide and checkpoint writes can fail non-fatally.

**Files/modules:** [services/prismService.ts](services/prismService.ts), [services/repos/prismRepo.ts](services/repos/prismRepo.ts), [components/prism/PrismWizard.tsx](components/prism/PrismWizard.tsx), [supabase/functions/prism-tailor/index.ts](supabase/functions/prism-tailor/index.ts), [supabase/functions/prism-tailor/graph.ts](supabase/functions/prism-tailor/graph.ts), [supabase/functions/prism-tailor/handler.ts](supabase/functions/prism-tailor/handler.ts).

**Data ownership:** PRISM owns specialist state; application links source revisions/run/result resume.

**API dependencies:** Existing analyze/generate/finalize plus idempotency/charging integration.

**Acceptance criteria:**

- Resume exact application run; stale source revisions require review.
- Checkpoint/save/finalize failures reconcile before success; no duplicate resume/quota on retry.
- Grounding and capped writer behavior retained; stage labels reflect real execution.

**Tests:** Extend graph/wizard fixtures for interrupted persistence, finalize retry, two applications and quota rollback.

**Analytics:** cv_tailoring_started, cv_tailored

**Legacy impact:** Standalone PRISM remains reachable with current flags and entitlements.

**Recorded evidence:** [docs/career-os/evidence/COS-013-prism-binding.md](docs/career-os/evidence/COS-013-prism-binding.md), [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md)

<a id="cos-014"></a>
### COS-014 — Implement shared action rules and lifecycle

**VERIFIED · R1 · P1 · Intelligence / platform · implementation**

**Parent requirements:** REQ-04, REQ-08, REQ-10, REQ-12, REQ-26; source workstreams WS-06, WS-05. **Dependencies:** COS-006, COS-010, COS-012. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Give Today and Coach one explainable queue.

**Existing implementation discovered:** No canonical action/recommendation owner; existing completeness and application state are inputs.

**Files/modules:** [services/repos](services/repos), [services/profileCompleteness.ts](services/profileCompleteness.ts), [services/prismService.ts](services/prismService.ts), [services/careerOs/careerActions.ts](services/careerOs/careerActions.ts), [services/careerOs/actionRepo.ts](services/careerOs/actionRepo.ts).

**Proposed modules (not yet implemented):** `services/careerActions.ts`.

**Data ownership:** Actions own status/dedupe/snooze; subjects own outcome data.

**API dependencies:** Versioned rule engine, context validation and action repository.

**Acceptance criteria:**

- Deterministic rules emit reason/evidence/input revisions; normally top three eligible.
- Dedupe, dismissal, snooze and expiry survive reload; no random priority scores.
- Completion follows durable workflow receipt or explicit user-reported completion.

**Tests:** Ordering/dedupe/stale-input/no-data/expiry/completion invariants.

**Analytics:** recommendation_opened, recommendation_accepted, recommendation_dismissed

**Legacy impact:** Do not import default sample tracker events into real queues.

**Recorded evidence:** [docs/career-os/evidence/COS-006-014-017-domain-layer.md](docs/career-os/evidence/COS-006-014-017-domain-layer.md), [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-015"></a>
### COS-015 — Deliver Today using real context and actions

**VERIFIED · R1 · P1 · Frontend / intelligence · implementation**

**Parent requirements:** REQ-12, REQ-30, REQ-33; source workstreams WS-06. **Dependencies:** COS-008, COS-014. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Make the next useful career action obvious.

**Existing implementation discovered:** Dashboard currently reads local CV/ATS summary and feature entry points.

**Files/modules:** [components/Dashboard.tsx](components/Dashboard.tsx), [components/mobile/DashboardMobile.tsx](components/mobile/DashboardMobile.tsx), [services/profileCompleteness.ts](services/profileCompleteness.ts), [components/careeros/spaces/TodaySpace.tsx](components/careeros/spaces/TodaySpace.tsx), [components/careeros/today/useTodayData.ts](components/careeros/today/useTodayData.ts), [components/careeros/today/ActionQueue.tsx](components/careeros/today/ActionQueue.tsx), [components/careeros/today/WorkspaceShortcuts.tsx](components/careeros/today/WorkspaceShortcuts.tsx).

**Data ownership:** Read projection over Career/goals/actions; no separate priority logic.

**API dependencies:** Canonical context/action API; activity stub uses only genuine existing events.

**Acceptance criteria:**

- Orientation/action queue work with or without goal/AI; no fake momentum.
- Priority reasons inspectable; begin/resume correct destination with context.
- Empty/offline/large-history states preserve meaningful navigation.

**Tests:** Today integration, action destination and state/visual fixtures.

**Analytics:** career_action_completed

**Legacy impact:** Legacy home remains available during cohort migration.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log), [docs/career-os/evidence/LEGACY-INTEGRATION.md](docs/career-os/evidence/LEGACY-INTEGRATION.md)

<a id="cos-016"></a>
### COS-016 — Compose the first application workspace with existing CV engine

**VERIFIED · R1 · P1 · Execution / frontend · implementation**

**Parent requirements:** REQ-17, REQ-18, REQ-19, REQ-30; source workstreams WS-10. **Dependencies:** COS-008, COS-012, COS-013. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Connect role analysis, preparation and reviewed CV without tool hopping.

**Existing implementation discovered:** Tracker/ATS/PRISM/editor are separate screens; export and history exist.

**Files/modules:** [components/SmartStudio.tsx](components/SmartStudio.tsx), [components/ResumeBuilder.tsx](components/ResumeBuilder.tsx), [components/ResumePreview.tsx](components/ResumePreview.tsx), [components/prism/PrismWizard.tsx](components/prism/PrismWizard.tsx), [components/careeros/application/ApplicationWorkspace.tsx](components/careeros/application/ApplicationWorkspace.tsx), [components/careeros/application/sections/CvSection.tsx](components/careeros/application/sections/CvSection.tsx), [components/careeros/primitives/ReadinessChecklist.tsx](components/careeros/primitives/ReadinessChecklist.tsx).

**Data ownership:** Application references current and submitted CV revisions; CV owner stays resumes.

**API dependencies:** Context, tracker and PRISM repositories; export helpers.

**Acceptance criteria:**

- Application analysis/CV/notes/activity sections survive route reload.
- Create application version opens correct editor; review new assertions; export works.
- Return to Today resumes same application and CV; incomplete later sections show truthful states.

**Tests:** Goal→opportunity→application→PRISM→editor→Today integration; representative PDF/DOCX regression.

**Analytics:** application_ready

**Legacy impact:** Keep general builder behavior and all supported sections.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-017"></a>
### COS-017 — Add product events and privacy-safe measurements

**VERIFIED · R1 · P1 · Analytics / platform · implementation**

**Parent requirements:** REQ-28, REQ-32, REQ-33; source workstreams WS-16. **Dependencies:** COS-001, COS-003. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Measure meaningful actions and latency without storing private career text.

**Existing implementation discovered:** Sentry is errors only; provider telemetry is operational.

**Files/modules:** [lib/monitoring.ts](lib/monitoring.ts), [services/api.ts](services/api.ts), [supabase/functions/_shared/aiLog.ts](supabase/functions/_shared/aiLog.ts), [supabase/functions/_shared/llm/callLog.ts](supabase/functions/_shared/llm/callLog.ts), [services/careerOs/careerEvents.ts](services/careerOs/careerEvents.ts).

**Data ownership:** Versioned product-event stream/projection, distinct from operational logs.

**API dependencies:** Selected telemetry sink and minimal domain-event persistence.

**Acceptance criteria:**

- Event dictionary covers source PRD events; dedupe and cohort denominators specified.
- No raw CV/JD/contact/answers/salary values in logs; export/delete/retention documented.
- Capture navigation/context/AI stage timings with known sample/device metadata.

**Tests:** Event schema/redaction/dedupe and one canonical funnel verification.

**Analytics:** career_goal_created, application_started, coach_action_executed, offer_recorded

**Legacy impact:** Preserve existing Sentry and AI logs as operational tools.

**Recorded evidence:** [docs/career-os/evidence/COS-006-014-017-domain-layer.md](docs/career-os/evidence/COS-006-014-017-domain-layer.md)

<a id="cos-018"></a>
### COS-018 — Qualify the connected application slice

**VERIFIED · R1 · P0 · QA / release · gate**

**Parent requirements:** REQ-01, REQ-02, REQ-04, REQ-05, REQ-17, REQ-19, REQ-31, REQ-35; source workstreams WS-16. **Dependencies:** COS-007, COS-010, COS-011, COS-013, COS-015, COS-016, COS-017. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Ship one coherent thin slice before expanding surface area.

**Existing implementation discovered:** Existing local test suite is healthy but no Career OS E2E harness is found.

**Files/modules:** [docs/career-os/RELEASE_PLAN.md](docs/career-os/RELEASE_PLAN.md), [supabase/tests](supabase/tests), [components/common/__tests__/navigationRoutes.test.ts](components/common/__tests__/navigationRoutes.test.ts).

**Data ownership:** Fixtures use owned isolated accounts and synthetic content.

**API dependencies:** Real local/staging Supabase and scripted AI with selected live checks.

**Acceptance criteria:**

- J01/J02/J03/J05/J06 connected-slice paths pass on mobile/desktop.
- Missing/wrong documents, retries and rollback do not lose data or double charge.
- R1 evidence bundle records G1/G2 and slice G3/G5/G6 verdicts; R2 not claimed.

**Tests:** Canonical slice browser tests, RLS/migration tests, keyboard/a11y and export checks.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Do not retire legacy paths at R1.

**Recorded evidence:** [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-019"></a>
### COS-019 — Complete Career evidence and progression surfaces

**VERIFIED · R2 · P1 · Career / design · implementation**

**Parent requirements:** REQ-06, REQ-13, REQ-29; source workstreams WS-07. **Dependencies:** COS-008, COS-009, COS-010. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Make professional evidence a durable system of record.

**Existing implementation discovered:** Experience/education/projects/skills exist in CV forms; Career model introduced by COS-009.

**Files/modules:** [components/UserProfileForm.tsx](components/UserProfileForm.tsx), [components/forms](components/forms), [services/profileMapping.ts](services/profileMapping.ts), [services/skillTaxonomy.ts](services/skillTaxonomy.ts), [components/careeros/spaces/CareerSpace.tsx](components/careeros/spaces/CareerSpace.tsx), [components/careeros/career/AchievementsView.tsx](components/careeros/career/AchievementsView.tsx), [components/careeros/career/CareerTimeline.tsx](components/careeros/career/CareerTimeline.tsx).

**Data ownership:** Career fact/achievement/evidence IDs and revisions.

**API dependencies:** Career repositories, provenance resolver and context invalidation.

**Acceptance criteria:**

- Overview/timeline/achievements/skills/education/evidence/profile views use canonical facts.
- Verified requires method/source/time; inferred/confirmed/incomplete clearly distinct.
- Career update works without any active job search; specialized legacy fields retained.

**Tests:** Provenance correction, large-career, locale and evidence review fixtures.

**Analytics:** career_achievement_updated, career_evidence_confirmed

**Legacy impact:** Replace master-copy writer only after canonical migration parity.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-020"></a>
### COS-020 — Deliver qualification and career-direction fit

**VERIFIED · R2 · P1 · Intelligence / opportunities · implementation**

**Parent requirements:** REQ-04, REQ-07, REQ-15, REQ-34; source workstreams WS-08. **Dependencies:** COS-010, COS-011, COS-019. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Explain both capability match and goal tradeoffs.

**Existing implementation discovered:** Deterministic ATS and trajectory inference exist; direction fit not persisted.

**Files/modules:** [lib/ats/atsEngine.ts](lib/ats/atsEngine.ts), [components/ats/AtsAnalyzer.tsx](components/ats/AtsAnalyzer.tsx), [services/smartStudioService.ts](services/smartStudioService.ts), [supabase/functions/ai-trajectory/index.ts](supabase/functions/ai-trajectory/index.ts), [services/careerOs/careerFit.ts](services/careerOs/careerFit.ts), [services/careerOs/analysisRepo.ts](services/careerOs/analysisRepo.ts), [components/careeros/opportunities/FitPanel.tsx](components/careeros/opportunities/FitPanel.tsx).

**Data ownership:** Versioned analysis projection references goal/fact/JD revisions.

**API dependencies:** Existing ATS engine plus bounded structured AI explanation if needed.

**Acceptance criteria:**

- Two fit panels cite evidence, constraints, missing information and source date.
- Missing salary or uncertain skills are unknown; no hiring-probability claims.
- Goal/JD/fact changes stale the report; conflicts and user override are inspectable.

**Tests:** Held-out fit rubric, stale-input and hard-constraint cases; ATS regression suite.

**Analytics:** opportunity_fit_reviewed

**Legacy impact:** Legacy match score stays a labeled historical signal.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/heldout-eval-report.json](docs/career-os/evidence/heldout-eval-report.json)

<a id="cos-021"></a>
### COS-021 — Build campaign milestones and application board

**VERIFIED · R2 · P1 · Execution · implementation**

**Parent requirements:** REQ-16, REQ-18, REQ-30; source workstreams WS-09. **Dependencies:** COS-008, COS-010, COS-012. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Coordinate pursuit around explicit goals.

**Existing implementation discovered:** Existing five-column application board provides reusable interactions.

**Files/modules:** [components/SmartStudio.tsx](components/SmartStudio.tsx), [services/repos/trackerRepo.ts](services/repos/trackerRepo.ts), [types.ts](types.ts), [services/careerOs/campaignRepo.ts](services/careerOs/campaignRepo.ts), [services/careerOs/campaignFunnel.ts](services/careerOs/campaignFunnel.ts), [components/careeros/campaigns/CampaignDetail.tsx](components/careeros/campaigns/CampaignDetail.tsx), [components/careeros/campaigns/ApplicationBoard.tsx](components/careeros/campaigns/ApplicationBoard.tsx).

**Data ownership:** Campaign owner and memberships; one existing application identity.

**API dependencies:** Campaign repository and tracker mutation boundaries.

**Acceptance criteria:**

- Create/pause/close campaign; assign/unassign existing applications without copying.
- Funnel counts/milestones reflect observed state; unassigned legacy records remain visible.
- Board/list and keyboard controls work; inferred status changes are labeled/correctable.

**Tests:** Membership/count/status-transition and non-drag interaction fixtures.

**Analytics:** campaign_created, campaign_completed

**Legacy impact:** Map five legacy statuses; no invented interviews/dates.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-022"></a>
### COS-022 — Persist all application preparation artifacts

**VERIFIED · R2 · P1 · Execution · implementation**

**Parent requirements:** REQ-17, REQ-18, REQ-22; source workstreams WS-10. **Dependencies:** COS-016, COS-020. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Keep cover letter, questions, positioning and networking in one workspace.

**Existing implementation discovered:** Existing optimizers return transient content; questions/network notes need bounded persistence.

**Files/modules:** [components/SmartStudio.tsx](components/SmartStudio.tsx), [services/smartStudioService.ts](services/smartStudioService.ts), [supabase/functions/ai-cover-letter/index.ts](supabase/functions/ai-cover-letter/index.ts), [supabase/functions/ai-linkedin/index.ts](supabase/functions/ai-linkedin/index.ts), [services/careerOs/artifactRepo.ts](services/careerOs/artifactRepo.ts), [components/careeros/application/ArtifactEditor.tsx](components/careeros/application/ArtifactEditor.tsx).

**Data ownership:** Application artifact metadata/content and immutable submission references.

**API dependencies:** Existing optimizer endpoints through approved typed artifact repository.

**Acceptance criteria:**

- All preparation sections save/reopen in same application.
- Employer questions separate from PRISM clarifications; readiness checklist explains optional/required items.
- Networking drafts/private notes work without invented contacts or automatic sends.

**Tests:** Artifact reload/version, app context, partial AI failure and truthful-readiness tests.

**Analytics:** application_artifact_saved, application_ready

**Legacy impact:** Extract Smart Studio panels; keep legacy launcher while migration pending.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-023"></a>
### COS-023 — Track factual changes across generated assets

**VERIFIED · R2 · P1 · Career / AI platform · implementation**

**Parent requirements:** REQ-04, REQ-06, REQ-19, REQ-34; source workstreams WS-07, WS-10. **Dependencies:** COS-019, COS-013, COS-022. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Make career-memory corrections propagate safely.

**Existing implementation discovered:** PRISM grounding and user flags exist without cross-document provenance.

**Files/modules:** [supabase/functions/prism-tailor/grounding.ts](supabase/functions/prism-tailor/grounding.ts), [supabase/functions/prism-tailor/mapping.ts](supabase/functions/prism-tailor/mapping.ts), [components/AIAssist.tsx](components/AIAssist.tsx), [components/builder/MasterProfileSyncCard.tsx](components/builder/MasterProfileSyncCard.tsx), [services/careerOs/careerFacts.ts](services/careerOs/careerFacts.ts), [components/careeros/career/ImpactBanner.tsx](components/careeros/career/ImpactBanner.tsx), [components/careeros/career/useCareerFacts.ts](components/careeros/career/useCareerFacts.ts).

**Data ownership:** Claim-to-artifact revision edges; historical submitted snapshot remains owned by document.

**API dependencies:** Provenance queries and reviewed patch API; existing AI helpers.

**Acceptance criteria:**

- Claim changes list affected drafts and mark derived analyses stale.
- User accepts a diff to update drafts; submitted snapshots remain unchanged.
- All generative entry points distinguish rewriting from new fact and require fact confirmation.

**Tests:** Cross-asset traceability, correction/deletion and unsupported-assertion adversarial tests.

**Analytics:** career_claim_corrected, artifact_update_reviewed

**Legacy impact:** No silent overwrite of existing CV/profile content.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-024"></a>
### COS-024 — Implement evidence-based interview preparation

**VERIFIED · R2 · P1 · Execution / AI experience · implementation**

**Parent requirements:** REQ-06, REQ-20, REQ-30; source workstreams WS-10. **Dependencies:** COS-016, COS-019. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Add the missing interview session workflow.

**Existing implementation discovered:** Only interview status and resource content exist; AI handler is reusable.

**Files/modules:** [services/smartStudioService.ts](services/smartStudioService.ts), [supabase/functions/_shared/handler.ts](supabase/functions/_shared/handler.ts), [lib/articles/articles.ts](lib/articles/articles.ts), [services/careerOs/interviewRepo.ts](services/careerOs/interviewRepo.ts), [services/careerOs/interviewApi.ts](services/careerOs/interviewApi.ts), [supabase/functions/ai-interview/index.ts](supabase/functions/ai-interview/index.ts), [components/careeros/application/sections/InterviewSection.tsx](components/careeros/application/sections/InterviewSection.tsx).

**Data ownership:** Owned interview sessions linked to application and evidence/story references.

**API dependencies:** New bounded interview operation using existing AI router/handler.

**Acceptance criteria:**

- Record scheduled time/timezone/type; prepare themes/questions with evidence citations.
- Text practice saves answers and inspectable feedback; readiness is a checklist.
- Resume after leaving; no fabricated feedback or emotion/personality scoring.

**Tests:** Timezone, evidence-reference, save/reload and AI-unavailable fixtures.

**Analytics:** interview_preparation_started, interview_practice_completed

**Legacy impact:** Legacy interview status stays intact without invented session history.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-025"></a>
### COS-025 — Record submission, responses and outcomes with provenance

**VERIFIED · R2 · P1 · Execution / analytics · implementation**

**Parent requirements:** REQ-09, REQ-16, REQ-18, REQ-28, REQ-33; source workstreams WS-09, WS-10. **Dependencies:** COS-017, COS-021, COS-022, COS-024. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Close the career loop using observed outcomes.

**Existing implementation discovered:** Status and notes exist, but no structured observations or outcome source.

**Files/modules:** [services/repos/trackerRepo.ts](services/repos/trackerRepo.ts), [components/SmartStudio.tsx](components/SmartStudio.tsx), [types.ts](types.ts), [services/careerOs/outcomeRepo.ts](services/careerOs/outcomeRepo.ts), [services/careerOs/outcomes.ts](services/careerOs/outcomes.ts), [components/careeros/application/SubmissionDialog.tsx](components/careeros/application/SubmissionDialog.tsx), [components/careeros/application/OutcomeDialog.tsx](components/careeros/application/OutcomeDialog.tsx).

**Data ownership:** Application outcome observations with source/date; campaign metrics are projections.

**API dependencies:** Application transitions and domain events; manual record first.

**Acceptance criteria:**

- Submission records user confirmation and exact document versions.
- Responses/interviews/offers/withdrawals/rejections and corrections preserve observation history.
- Unknown response remains unknown; campaign updates and eligible actions recompute once.

**Tests:** Outcome correction, missing data, duplicate event and cohort denominator tests.

**Analytics:** application_response_recorded, offer_recorded, career_outcome_recorded

**Legacy impact:** Preserve historical status even when precise dates/feedback missing.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-026"></a>
### COS-026 — Implement the typed Coach action gateway

**VERIFIED · R2 · P0 · AI platform · implementation**

**Parent requirements:** REQ-08, REQ-26, REQ-27, REQ-34; source workstreams WS-11. **Dependencies:** COS-014, COS-013, COS-021, COS-022, COS-024, COS-025. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Allow real bounded execution through existing workflows.

**Existing implementation discovered:** Transport/handler/PRISM exist; generalized tool policy and durable receipts do not.

**Files/modules:** [services/api.ts](services/api.ts), [supabase/functions/_shared/handler.ts](supabase/functions/_shared/handler.ts), [supabase/functions/_shared/entitlement.ts](supabase/functions/_shared/entitlement.ts), [supabase/functions/_shared/llm/router.ts](supabase/functions/_shared/llm/router.ts), [supabase/functions/career-gateway](supabase/functions/career-gateway).

**Data ownership:** Action runs/receipts reference existing specialist results; server derives identity.

**API dependencies:** Registered tools only; entitlement/reserve/settle and same-owner checks.

**Acceptance criteria:**

- Tool schemas/scopes/preconditions/idempotency/charging and result types validated.
- Material factual/destructive/external proposals bind confirmation to exact content/destination/revision.
- Failure/cancel/retry reconciles durable receipts; no success claim before owned result exists.

**Tests:** Wrong-owner, injection, stale confirmation, duplicate tool, quota and timeout reconciliation tests.

**Analytics:** coach_action_executed

**Legacy impact:** Reuse PRISM/ATS/optimizers; do not create a new provider stack.

**Recorded evidence:** [docs/career-os/evidence/COS-026-gateway.md](docs/career-os/evidence/COS-026-gateway.md), [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md)

<a id="cos-027"></a>
### COS-027 — Build one persistent contextual Coach

**VERIFIED · R2 · P1 · AI experience / frontend · implementation**

**Parent requirements:** REQ-04, REQ-08, REQ-21, REQ-30; source workstreams WS-11. **Dependencies:** COS-008, COS-026, COS-021. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Make conversation a connected operating interface.

**Existing implementation discovered:** Existing feature assistants are reusable affordances, not a persistent chat.

**Files/modules:** [components/AIActionModal.tsx](components/AIActionModal.tsx), [components/AIAssist.tsx](components/AIAssist.tsx), [services/api.ts](services/api.ts), [supabase/functions/_shared/llm/router.ts](supabase/functions/_shared/llm/router.ts), [supabase/functions/career-coach/index.ts](supabase/functions/career-coach/index.ts), [services/careerOs/coachApi.ts](services/careerOs/coachApi.ts), [components/careeros/spaces/CoachSpace.tsx](components/careeros/spaces/CoachSpace.tsx), [components/careeros/coach/useCoach.ts](components/careeros/coach/useCoach.ts).

**Data ownership:** Conversation/messages/summary refs/tool receipts; career facts remain separate authority.

**API dependencies:** Context projection, gateway and conversation persistence/export/delete.

**Acceptance criteria:**

- Visible editable context; cited answers and registered tool actions open real result.
- Refresh/re-auth resumes history without mixing applications; summaries cannot override facts.
- Delete/export selected conversation memory; AI unavailable and streaming failures recover.

**Tests:** Conversation continuity, context override, memory revocation and tool receipt end-to-end tests.

**Analytics:** coach_conversation_started, coach_action_executed

**Legacy impact:** Contextual feature assistance enters same Coach/action vocabulary.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-028"></a>
### COS-028 — Consolidate Library and asset relationships

**VERIFIED · R2 · P1 · Frontend / documents · implementation**

**Parent requirements:** REQ-19, REQ-22, REQ-30; source workstreams WS-12. **Dependencies:** COS-008, COS-022, COS-024. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Give every professional asset a durable place.

**Existing implementation discovered:** CVs/versions/ATS reports/headshots already persist.

**Files/modules:** [components/ResumeManager.tsx](components/ResumeManager.tsx), [components/common/VersionHistoryModal.tsx](components/common/VersionHistoryModal.tsx), [services/repos/atsReportRepo.ts](services/repos/atsReportRepo.ts), [services/repos/headshotRepo.ts](services/repos/headshotRepo.ts), [lib/export](lib/export), [components/careeros/spaces/LibrarySpace.tsx](components/careeros/spaces/LibrarySpace.tsx), [components/careeros/library/useLibraryAssets.ts](components/careeros/library/useLibraryAssets.ts), [components/careeros/library/TemplateGallery.tsx](components/careeros/library/TemplateGallery.tsx), [components/resumes/useResumeActions.tsx](components/resumes/useResumeActions.tsx).

**Data ownership:** Heterogeneous asset metadata links existing owners; no duplicate CV blobs.

**API dependencies:** Existing repositories plus artifact metadata and private signed URLs.

**Acceptance criteria:**

- Filter/search CVs, reports, headshots, cover letters, stories and evidence.
- Application/goal associations and version history visible; export/download preserves formats.
- Missing asset/expired URL/large library and downgrade read access work.

**Tests:** Library pagination/association/version/download/lifecycle fixtures.

**Analytics:** library_asset_opened

**Legacy impact:** Preserve template gallery and standalone tailoring/ATS entry points.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-032-033-experience-performance.md](docs/career-os/evidence/COS-032-033-experience-performance.md), [docs/career-os/evidence/LEGACY-INTEGRATION.md](docs/career-os/evidence/LEGACY-INTEGRATION.md)

<a id="cos-029"></a>
### COS-029 — Add command search and actionable inbox

**VERIFIED · R2 · P1 · Frontend / platform · implementation**

**Parent requirements:** REQ-10, REQ-23, REQ-28; source workstreams WS-04, WS-06. **Dependencies:** COS-014, COS-017, COS-027, COS-028. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Expose navigation, owned search and durable attention signals.

**Existing implementation discovered:** No global career search or user inbox found; existing dialogs/repositories suffice initially.

**Files/modules:** [components/NavigationProvider.tsx](components/NavigationProvider.tsx), [components/common/Dialog.tsx](components/common/Dialog.tsx), [services/repos](services/repos), [components/careeros/search/CommandPalette.tsx](components/careeros/search/CommandPalette.tsx), [components/careeros/spaces/NotificationsSpace.tsx](components/careeros/spaces/NotificationsSpace.tsx), [services/careerOs/notificationRepo.ts](services/careerOs/notificationRepo.ts).

**Data ownership:** Search is a permission-filtered projection; inbox references events/actions.

**API dependencies:** Bounded Postgres/repository queries and action/inbox endpoints.

**Acceptance criteria:**

- Cmd/Ctrl-K navigates or offers registered actions; labeled grouped search results.
- Search respects ownership, deletion, pagination, cancellation and empty states.
- Inbox distinguishes information/action; read/dismiss state and dedupe persist.

**Tests:** Keyboard/focus, two-user search, revoked evidence and notification dedupe fixtures.

**Analytics:** career_search_used, notification_action_opened

**Legacy impact:** Operator ops_alerts stay separate; no push/email introduced.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md)

<a id="cos-030"></a>
### COS-030 — Deliver resumable onboarding and existing-user introduction

**VERIFIED · R2 · P1 · Career / frontend · implementation**

**Parent requirements:** REQ-05, REQ-24, REQ-30; source workstreams WS-13, WS-14. **Dependencies:** COS-018, COS-019, COS-015. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Provide first value without blocking access to existing work.

**Existing implementation discovered:** Dashboard currently forces incomplete profiles back to profile on every tab change.

**Files/modules:** [components/Dashboard.tsx](components/Dashboard.tsx), [components/UserProfileForm.tsx](components/UserProfileForm.tsx), [components/AuthGate.tsx](components/AuthGate.tsx), [services/profileCompleteness.ts](services/profileCompleteness.ts), [components/careeros/onboarding/OnboardingFlow.tsx](components/careeros/onboarding/OnboardingFlow.tsx), [components/careeros/onboarding/useOnboardingState.ts](components/careeros/onboarding/useOnboardingState.ts), [components/careeros/today/ClaimDraftDialog.tsx](components/careeros/today/ClaimDraftDialog.tsx), [components/careeros/today/anonymousClaims.ts](components/careeros/today/anonymousClaims.ts).

**Data ownership:** Onboarding progress and reviewed imports; explicit guest ownership claim.

**API dependencies:** Career/goal/import endpoints and authentication continuation.

**Acceptance criteria:**

- New user can pause objective/import/review/goal flow and reach useful Today action.
- Existing user can open historical CVs/applications without forced full onboarding.
- Guest claim preview, duplicate handling and sign-in continuation preserve intended destination.

**Tests:** J01/J02/J03 interrupted-onboarding and incomplete-profile access tests.

**Analytics:** career_onboarding_completed

**Legacy impact:** Replace blanket profile gate with contextual prerequisites; retain field validation.

**Recorded evidence:** [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md), [docs/career-os/evidence/COS-018-r1-qualification.md](docs/career-os/evidence/COS-018-r1-qualification.md)

<a id="cos-031"></a>
### COS-031 — Qualify existing-user rollout and rollback

**VERIFIED · R2 · P0 · Data / release · gate**

**Parent requirements:** REQ-05, REQ-28, REQ-35; source workstreams WS-14. **Dependencies:** COS-007, COS-018, COS-027, COS-028, COS-030. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Move cohorts without lost artifacts or incompatible clients.

**Existing implementation discovered:** Migration framework exists from COS-007; full destinations now available.

**Files/modules:** [supabase/tests](supabase/tests), [docs/DATA.md](docs/DATA.md), [docs/GO_LIVE.md](docs/GO_LIVE.md), [docs/MOBILE_RELEASE.md](docs/MOBILE_RELEASE.md), [supabase/tests/career-os-migration-smoke.sh](supabase/tests/career-os-migration-smoke.sh), [supabase/tests/career-os-lifecycle-smoke.sh](supabase/tests/career-os-lifecycle-smoke.sh), [supabase/functions/_shared/careerTables.ts](supabase/functions/_shared/careerTables.ts).

**Data ownership:** Per-user migration ledger, old/new mappings and original data.

**API dependencies:** Feature flags, lifecycle endpoints and compatibility readers/writers.

**Acceptance criteria:**

- Populated old/native/guest fixtures retain IDs/content/history/preferences.
- Account export/delete cover every new object; partial migration keeps originals available.
- Rollback after new writes preserves those writes; document supported old-client window.

**Tests:** J02/J03/J07 plus lifecycle/RLS/full backup-restore reconciliation drills.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** No legacy deletion yet.

**Recorded evidence:** [docs/career-os/evidence/COS-031-rollout-rollback.md](docs/career-os/evidence/COS-031-rollout-rollback.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-032"></a>
### COS-032 — Qualify mobile, accessibility, localization and visual states

**VERIFIED · R2 · P1 · Design / QA · gate**

**Parent requirements:** REQ-29, REQ-30, REQ-31; source workstreams WS-15, WS-16. **Dependencies:** COS-027, COS-028, COS-029, COS-030. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Make the complete OS usable across supported surfaces.

**Existing implementation discovered:** Mobile shell, theme/text size and en/es/fr/de exist; full journey quality UNKNOWN.

**Files/modules:** [components/mobile](components/mobile), [lib/nativeShell.ts](lib/nativeShell.ts), [services/translationService.tsx](services/translationService.tsx), [styles](styles), [docs/MOBILE_RELEASE.md](docs/MOBILE_RELEASE.md), [components/careeros/shell/MobileNav.tsx](components/careeros/shell/MobileNav.tsx), [scripts/career-os-i18n.mjs](scripts/career-os-i18n.mjs), [services/__tests__/translationCoverage.test.ts](services/__tests__/translationCoverage.test.ts).

**Data ownership:** Presentation only; state continuity follows canonical owners.

**API dependencies:** All workflow APIs under success/partial/error conditions.

**Acceptance criteria:**

- J08 passes native back/keyboard/share and mobile/tablet/desktop journeys.
- WCAG 2.2 AA evidence includes keyboard and screen reader; 320px/zoom/both themes/reduced motion.
- No untranslated new strings in four supported locales; long content and all required UX states reviewed.

**Tests:** Automated a11y, manual assistive-tech, visual regression and native device evidence.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Retain ink-on-white exports and marketing exception.

**Recorded evidence:** [docs/career-os/evidence/COS-032-033-experience-performance.md](docs/career-os/evidence/COS-032-033-experience-performance.md), [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md)

<a id="cos-033"></a>
### COS-033 — Qualify performance, provider failure and cost controls

**VERIFIED · R2 · P1 · Platform / QA · gate**

**Parent requirements:** REQ-26, REQ-27, REQ-32, REQ-34; source workstreams WS-16. **Dependencies:** COS-001, COS-018, COS-026, COS-029. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Keep shell immediate and execution economically predictable.

**Existing implementation discovered:** Build passes with large export chunk; provider budget/fallback infrastructure exists.

**Files/modules:** [vite.config.ts](vite.config.ts), [lib/monitoring.ts](lib/monitoring.ts), [supabase/functions/_shared/llm](supabase/functions/_shared/llm), [supabase/functions/_shared/handler.ts](supabase/functions/_shared/handler.ts), [supabase/functions/prism-tailor/handler.ts](supabase/functions/prism-tailor/handler.ts).

**Data ownership:** Operational run metrics and versioned release budgets.

**API dependencies:** Existing provider router, quota functions and action receipts.

**Acceptance criteria:**

- Measured budgets from COS-001 met by named device/network cohorts.
- Slow AI/export does not block navigation; actual stages and cancellation/recovery work.
- Quota/charging correct across retries/fallback; failure and cost limits verified.

**Tests:** Performance traces, bundle attribution, provider chaos/fallback and metering-race tests.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Optimize proven hotspots; no architectural rewrite to satisfy assumed targets.

**Recorded evidence:** [docs/career-os/evidence/COS-032-033-experience-performance.md](docs/career-os/evidence/COS-032-033-experience-performance.md), [docs/career-os/evidence/final-verification.log](docs/career-os/evidence/final-verification.log)

<a id="cos-034"></a>
### COS-034 — Qualify the complete Career OS release

**BLOCKED · R2 · P0 · Product / release · gate**

**Parent requirements:** REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-24, REQ-30, REQ-31, REQ-33, REQ-34, REQ-35; source workstreams WS-16. **Dependencies:** COS-019, COS-020, COS-021, COS-022, COS-023, COS-024, COS-025, COS-027, COS-028, COS-029, COS-030, COS-031, COS-032, COS-033. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Prove that six spaces operate as one continuous career system.

**Existing implementation discovered:** R1 verified a limited slice; this covers full source authority journeys.

**Files/modules:** [docs/career-os/RELEASE_PLAN.md](docs/career-os/RELEASE_PLAN.md), [docs/career-os/evidence/COS-R2-surfaces.md](docs/career-os/evidence/COS-R2-surfaces.md).

**Proposed modules (not yet implemented):** `docs/career-os/CAREER_OS_ACCEPTANCE_LEDGER.md`.

**Data ownership:** All canonical owners; release verdict separate from implementation status.

**API dependencies:** Full application stack on approved production-like fixtures.

**Acceptance criteria:**

- J01 through J10 pass where applicable; same context through outcome and improved action.
- G1-G7 have traceable artifacts and no unresolved invariant failure.
- Employed user receives useful non-CV career value; no unsupported production or outcome claim.

**Tests:** Complete browser/native workflow, migration, a11y, AI trust and telemetry acceptance bundle.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Legacy retirement remains a separate gate after observation.

**Recorded evidence:** [docs/career-os/evidence/COS-034-r2-gate.md](docs/career-os/evidence/COS-034-r2-gate.md)

**Blocker:** G7 needs an approved staging/production-like environment and a hosted schema read (denied in this session) plus deployment authority; G6 needs a screen-reader/axe pass.

<a id="cos-035"></a>
### COS-035 — Add outcome-informed recommendations with uncertainty

**IMPLEMENTED · R3 · P1 · Intelligence / analytics · implementation**

**Parent requirements:** REQ-09, REQ-33, REQ-34; source workstreams WS-06, WS-09. **Dependencies:** COS-025, COS-034. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Learn from observed outcomes without overstating causal explanations.

**Existing implementation discovered:** Outcomes and telemetry introduced in R2; no historical learning model established.

**Files/modules:** [lib/monitoring.ts](lib/monitoring.ts), [supabase/functions/_shared/llm/router.ts](supabase/functions/_shared/llm/router.ts), [services/careerOs/frontier/outcomeInsights.ts](services/careerOs/frontier/outcomeInsights.ts), [services/careerOs/frontier/scenarios.ts](services/careerOs/frontier/scenarios.ts), [services/careerOs/frontier/proactive.ts](services/careerOs/frontier/proactive.ts).

**Proposed modules (not yet implemented):** `services/careerActions.ts`.

**Data ownership:** Derived recommendation policy references observation cohorts and source revisions.

**API dependencies:** Outcome projection and versioned rule/evaluation interface.

**Acceptance criteria:**

- Show sample sizes, time windows, missing outcomes and source dates.
- A correction/revocation recomputes affected insights; rejection does not automatically lower a skill.
- Compare against deterministic baseline; human review establishes usefulness before rollout.

**Tests:** J11 sparse/confounded/corrected outcome fixtures and held-out rubric comparison.

**Analytics:** career_insight_reviewed

**Legacy impact:** Keep deterministic baseline and feature rollback.

**Recorded evidence:** [docs/career-os/evidence/COS-035-037-frontier-logic.md](docs/career-os/evidence/COS-035-037-frontier-logic.md), [docs/career-os/evidence/heldout-eval-report.json](docs/career-os/evidence/heldout-eval-report.json)

<a id="cos-036"></a>
### COS-036 — Build goal and offer scenario comparison

**IMPLEMENTED · R3 · P1 · Intelligence / Career · implementation**

**Parent requirements:** REQ-07, REQ-11, REQ-34; source workstreams WS-07, WS-08. **Dependencies:** COS-020, COS-025, COS-034. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Help users reason about alternatives and tradeoffs.

**Existing implementation discovered:** Trajectory suggestions exist; no scenario persistence or comparison.

**Files/modules:** [supabase/functions/ai-trajectory/index.ts](supabase/functions/ai-trajectory/index.ts), [services/smartStudioService.ts](services/smartStudioService.ts), [services/careerOs/frontier/outcomeInsights.ts](services/careerOs/frontier/outcomeInsights.ts), [services/careerOs/frontier/scenarios.ts](services/careerOs/frontier/scenarios.ts), [services/careerOs/frontier/proactive.ts](services/careerOs/frontier/proactive.ts).

**Data ownership:** Saved comparison references goals/opportunities/offers and user assumptions.

**API dependencies:** Existing AI router plus deterministic constraints/weighted comparison.

**Acceptance criteria:**

- Compare options across user priorities, pay currency/period, location and evidence gaps.
- Separate verified inputs from assumptions; no fabricated market data or guaranteed trajectory.
- Changing a priority shows its impact; unknown values stay visible.

**Tests:** Scenario consistency, missing/contradictory data and human-reviewed decision-quality fixtures.

**Analytics:** career_scenario_compared

**Legacy impact:** Preserve single trajectory tool as contextual entry.

**Recorded evidence:** [docs/career-os/evidence/COS-035-037-frontier-logic.md](docs/career-os/evidence/COS-035-037-frontier-logic.md), [docs/career-os/evidence/heldout-eval-report.json](docs/career-os/evidence/heldout-eval-report.json)

<a id="cos-037"></a>
### COS-037 — Add opted-in proactive plans and reminders

**IMPLEMENTED · R3 · P1 · Platform / intelligence · implementation**

**Parent requirements:** REQ-08, REQ-10, REQ-26, REQ-27; source workstreams WS-06, WS-11. **Dependencies:** COS-029, COS-035, COS-034. **Inherited contract:** [workflow](#workflow-contract).

**Purpose:** Respond to meaningful career changes with bounded durable work.

**Existing implementation discovered:** Ops cron exists but is not a user reminder scheduler.

**Files/modules:** [supabase/migrations/20260901400000_ops_scheduling.sql](supabase/migrations/20260901400000_ops_scheduling.sql), [supabase/functions/_shared/rateLimit.ts](supabase/functions/_shared/rateLimit.ts), [services/careerOs/frontier/outcomeInsights.ts](services/careerOs/frontier/outcomeInsights.ts), [services/careerOs/frontier/scenarios.ts](services/careerOs/frontier/scenarios.ts), [services/careerOs/frontier/proactive.ts](services/careerOs/frontier/proactive.ts).

**Proposed modules (not yet implemented):** `services/careerActions.ts`.

**Data ownership:** User preferences, scheduled action-run metadata, dedupe and cursor/checkpoints.

**API dependencies:** Approved scheduler design using existing infrastructure first.

**Acceptance criteria:**

- Opt-in trigger/timezone/quiet-hour/volume controls persist and can be disabled.
- Meaningful changes create at most one relevant action; unchanged/nonactionable state stays quiet.
- Cancellation/retry/disconnect obey budgets and confirmations; overdue reminders do not pretend timely delivery.

**Tests:** Scheduler timezone/DST, duplicate delivery, missed run, cancellation and budget fixtures.

**Analytics:** career_reminder_opened

**Legacy impact:** Manual Today remains fully usable without scheduling.

**Recorded evidence:** [docs/career-os/evidence/COS-035-037-frontier-logic.md](docs/career-os/evidence/COS-035-037-frontier-logic.md), [docs/career-os/evidence/heldout-eval-report.json](docs/career-os/evidence/heldout-eval-report.json)

<a id="cos-038"></a>
### COS-038 — Assess optional market and personal-data connectors

**IMPLEMENTED · R3 · P2 · Integrations / product · discovery**

**Parent requirements:** REQ-10, REQ-15, REQ-25, REQ-28; source workstreams WS-08, WS-11. **Dependencies:** COS-034. **Inherited contract:** [discovery](#discovery-contract).

**Purpose:** Choose a permitted, useful source before implementing external access.

**Existing implementation discovered:** No career feeds, mailbox, calendar or LinkedIn account integration found.

**Files/modules:** [services/api.ts](services/api.ts), [config/env.ts](config/env.ts), [supabase/functions/_shared/auth.ts](supabase/functions/_shared/auth.ts), [components/careeros/settings/connectorAssessment.ts](components/careeros/settings/connectorAssessment.ts), [components/careeros/settings/IntegrationsPage.tsx](components/careeros/settings/IntegrationsPage.tsx).

**Data ownership:** User consent, source rights and retention boundaries.

**API dependencies:** Provider documentation and read-only feasibility checks; no credential collection in docs.

**Acceptance criteria:**

- Record source permissions, API/scope/rate/retention/cost constraints and disconnect behavior.
- Choose one bounded read-only adapter or record a no-go; retain manual import.
- Define provenance/freshness and exactly what product value the connector adds.

**Tests:** Contract spike and synthetic payload mapping; no external sends.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** No scraping or bulk contact ingestion implied.

**Recorded evidence:** [docs/career-os/evidence/COS-038-connector-assessment.md](docs/career-os/evidence/COS-038-connector-assessment.md)

<a id="cos-039"></a>
### COS-039 — Implement one qualified read-only connector

**BLOCKED · R3 optional · P2 · Integrations · implementation**

**Parent requirements:** REQ-10, REQ-15, REQ-26, REQ-28; source workstreams WS-08, WS-11. **Dependencies:** COS-038, COS-037. **Inherited contract:** [foundation](#foundation-contract).

**Purpose:** Bring permitted external signals into canonical opportunities/actions.

**Existing implementation discovered:** Connector contract must be selected by COS-038; current APIs absent.

**Files/modules:** [supabase/functions/_shared/auth.ts](supabase/functions/_shared/auth.ts), [supabase/functions/_shared/handler.ts](supabase/functions/_shared/handler.ts), [supabase/functions/account-delete/index.ts](supabase/functions/account-delete/index.ts).

**Data ownership:** Scoped tokens and imported signal references owned by user.

**API dependencies:** Only the approved connector API; dedupe/webhook or cursor polling.

**Acceptance criteria:**

- Consent, minimal scopes, freshness attribution and disconnect/purge work.
- Duplicates/out-of-order events do not create duplicate applications/actions.
- Unavailable/revoked source falls back to manual entry; no sending capability added.

**Tests:** J12 connector contract/revocation/duplicate/retry/lifecycle tests.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Optional enhancement; never blocks core Career OS release.

**Recorded evidence:** None yet; required evidence follows the inherited contract.

**Blocker:** COS-038 no-go: no permitted, useful read-only source with authorised credentials; re-assess before any connector work.

<a id="cos-040"></a>
### COS-040 — Qualify frontier intelligence against held-out cases

**IMPLEMENTED · R3 · P1 · Product / AI QA · gate**

**Parent requirements:** REQ-04, REQ-06, REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-33, REQ-34, REQ-35; source workstreams WS-16. **Dependencies:** COS-035, COS-036, COS-037, COS-038. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Earn frontier capability claims with evidence.

**Existing implementation discovered:** R2 provides coherent execution; new learning/scenarios/proactivity require additional proof.

**Files/modules:** [supabase/functions/prism-tailor/golden](supabase/functions/prism-tailor/golden), [docs/career-os/RELEASE_PLAN.md](docs/career-os/RELEASE_PLAN.md), [scripts/career-os-eval.ts](scripts/career-os-eval.ts), [services/careerOs/frontier/evaluation.ts](services/careerOs/frontier/evaluation.ts).

**Data ownership:** Versioned evaluation cases, rubrics and release verdicts.

**API dependencies:** Scripted tests plus explicitly selected cost-capped live runs.

**Acceptance criteria:**

- G8 records usefulness, truth, action integrity, uncertainty, latency and cost by cohort.
- J10/J11 and adversarial variants pass; optional connector claims require separate COS-039 evidence.
- Every promoted policy has comparison to baseline and rollback; no guaranteed employment claims.

**Tests:** Held-out human review, adversarial/abstention cases and policy regression report.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Keep existing deterministic policy available for rollback.

**Recorded evidence:** [docs/career-os/evidence/COS-040-g8-verdict.md](docs/career-os/evidence/COS-040-g8-verdict.md), [docs/career-os/evidence/heldout-eval-report.json](docs/career-os/evidence/heldout-eval-report.json)

<a id="cos-041"></a>
### COS-041 — Retire only qualified legacy surfaces

**BLOCKED · Retirement · P1 · Frontend / release · gate**

**Parent requirements:** REQ-01, REQ-03, REQ-05, REQ-35; source workstreams WS-17. **Dependencies:** COS-031, COS-034. **Inherited contract:** [qualification](#qualification-contract).

**Purpose:** Remove superseded UI after migration and observation prove safe.

**Existing implementation discovered:** Legacy routes deliberately preserved through R1/R2.

**Files/modules:** [components/Dashboard.tsx](components/Dashboard.tsx), [components/SmartStudio.tsx](components/SmartStudio.tsx), [components/NavigationProvider.tsx](components/NavigationProvider.tsx), [docs/career-os/CAREER_OS_INFORMATION_ARCHITECTURE.md](docs/career-os/CAREER_OS_INFORMATION_ARCHITECTURE.md).

**Data ownership:** No removal of canonical data or export formats.

**API dependencies:** Redirect adapters and release observation telemetry.

**Acceptance criteria:**

- Every retired route has replacement parity and recorded usage/old-client window evidence.
- Deep-link/auth/native compatibility and rollback drill pass after observation threshold from COS-001.
- Delete only superseded presentation/temporary adapters; keep proven business logic.

**Tests:** Complete route ledger regression, no-orphan links and historical data access checks.

**Analytics:** Use the inherited event policy; no additional product event for this task.

**Legacy impact:** Destructive data cleanup is excluded; schema contraction needs its own evidenced migration.

**Recorded evidence:** None yet; required evidence follows the inherited contract.

**Blocker:** Requires production observation (route usage, old-client share) after COS-031/COS-034 qualify; nothing has run in production.
