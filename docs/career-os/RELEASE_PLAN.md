# Release and qualification plan

Use [tasks.md](../../tasks.md) for dependencies and [acceptance ledger](CAREER_OS_ACCEPTANCE_LEDGER.md) for requirement status. Gates below describe runtime evidence still to produce. Repository audit and document completion do not pass runtime gates.

## Gate mapping

| Source gate | Required evidence | Release use |
| --- | --- | --- |
| G1 Foundation | Current map/domain/IA plus implemented context contracts, token aliases, ownership tests and schema/migration decisions | R0 exit |
| G2 Shell | Working six-space route shell, responsive navigation, flags and real context resolution | Before connected slice qualification |
| G3 Core | Today/Career/Goals/Opportunities on owned real-shaped data, cold-start/degraded states | R1 slice plus R2 complete surfaces |
| G4 Execution | Campaign/application/Coach/interview/outcome journey, receipts and failure recovery | R2 |
| G5 Migration | Legacy populated and guest-import fixtures; content/ID parity; rollback retaining new writes | Before each expanded cohort |
| G6 Experience | Mobile/native, accessibility, performance, visual, localization and UX state results | Every release, final comprehensive R2 gate |
| G7 Production | Complete canonical new/existing-user journey on approved staging/production-like environment; operators can diagnose failure | R2 qualification |
| G8 Intelligence extension | Held-out usefulness evaluation, factual/context safety, consent, sparse-outcome uncertainty and budgets | R3; added gate, not a replacement for G7 |
| G9 Retirement | Replacement parity, old-link/client coverage, observation evidence and practiced rollback | Superseded UI removal |

## Canonical fixtures

| Fixture | Scenario | Evidence required |
| --- | --- | --- |
| J01 New user | Objective → CV import → review candidate facts → goal → Today → opportunity → application | First useful action works before exhaustive profile completion; resume onboarding |
| J02 Existing user | Populated profile, several CVs/versions, wishlist/applied/interview rows, ATS reports/headshots | All original IDs/content accessible; no forced onboarding; correct campaign/unassigned handling |
| J03 Anonymous transition | Local CV and tracker → sign-in; a second account later signs in | Explicit claim preview; idempotent mapping; no demo import or other-account cache exposure |
| J04 Full journey | Today → opportunity fit → application → PRISM clarification/CV → Coach → user-confirmed submission → interview → outcome → improved actions | Same context IDs, reviewed evidence, immutable submission snapshot and real completion receipt |
| J05 Competing contexts | Two roles, documents and goals open sequentially/on separate tabs; goal revised | No cross-application resume/run/context bleed; stale analysis marked |
| J06 Failure/recovery | Offline, revoked auth, quota exceeded, provider failure, missing document, interrupted stream, failed checkpoint/save | Honest progress; durable drafts; no duplicate artifact/charge; explicit recovery |
| J07 Concurrency/migration | Two-device writes, partial backfill/import, old native client, rollback after new writes | Conflict resolution; stable mappings; no orphan/lost records |
| J08 Accessibility/mobile | Keyboard and screen reader; 320px and large text; iOS/Android back, keyboard, sharing | All primary journeys accessible and visually coherent |
| J09 AI trust | Malicious JD, contradictory claims, missing metrics, changed confirmation payload, wrong-owner refs | No unsupported accepted facts, data leakage or unauthorized execution |
| J10 Continuing career | Employed user captures achievement and revises career goal without applying | Useful non-CV action and explainable progress |
| J11 Sparse outcomes | One rejection, unknown responses, user correction and revoked source | No causal or statistical overclaim; corrected recommendation inputs |
| J12 Optional integration | Revoked token, duplicate webhook, outdated listing, quiet hours, disconnect | No duplicate action/send; attribution/freshness shown; manual fallback |

## Migration and rollout

R0 records actual deployed schema/flag versions and sanitized fixture structure; it does not pull customer content into documentation. Expand schemas before switching readers. Backfill using durable per-item mappings and record migrated/failed/pending counts. Incomplete projections must link to original records. The same job is restartable after interruption.

A schema proposal must state how current native clients read/write during rollout. Use an adapter or controlled compatibility strategy. Retain legacy tracker statuses until coordinated cutover. Resume version snapshots and specialized profile fields cannot disappear merely because the new UI omits a field.

Use existing feature-flag infrastructure with shared cohort semantics on client and server. Roll out internal/test accounts, then explicitly selected cohorts, then broader release only after gates pass. Exact cohort sizes, observation duration and performance thresholds are set from R0 baselines and risk, not invented in this document. Freeze expansion on invariant failures, unresolved write reconciliation or unacceptable cost/latency.

Rollback reverts entry points and readers, cancels pending unsupported jobs and preserves new writes. Keep mappings/versioned payloads so old-compatible projections can expose new data. Test rollback after a user edits a new Career fact and creates a new application; restoring an old database backup alone is not an acceptable rollback because it loses those writes.

## Evidence and completion

For each task, store implementation revision, commands/environment, fixtures, result summary and relevant screenshots/API receipts/migration diffs. Evidence paths must be committed or durably referenced without secrets or customer content. Verify negative as well as happy paths. A test written is not a test passed; a passing mocked test is not a live integration result.

Statuses: NOT_STARTED → PLANNED → IN_PROGRESS → IMPLEMENTED → VERIFIED → QUALIFIED; BLOCKED records a specific unresolved prerequisite. Dependencies normally require VERIFIED, while release gates explicitly require qualification evidence. Task status is separate from release permission. Existing local baseline results are recorded in [BASELINE](evidence/BASELINE.md).

## Performance and AI evaluation protocol

Measure on named device/browser/native build and network profile. Record p50/p95 sample counts for shell/navigation, context fetch, preview edit, AI first actual stage and completion. Measure bundle contribution separately. Set and approve budgets before broad implementation qualification; no numerical production-performance claims can be inferred from a local build.

AI evaluations use versioned fixtures and human rubrics for truthful evidence use, strategic relevance, context continuity, tool correctness and usefulness. Compare new policies to the deterministic baseline; record regressions by cohort. Live model calls are explicitly selected and cost capped. Never use changed model output as silent canonical fact updates.

## External integration boundary

R1/R2 work with manual imports, user-recorded submission/outcomes and private networking notes. R3 connector discovery must establish source permission, ingestion method, scope, retention, provenance, token storage, duplicate handling and user disconnect. Start read-only; external communication/submission requires a separate reviewed send flow and explicit content/destination confirmation. No silent scraping or sending is implied by this plan.
