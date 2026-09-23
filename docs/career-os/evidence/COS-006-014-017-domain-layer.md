# Domain layer — context projection (COS-006), action rules (COS-014), product events (COS-017), fit engine (COS-020 logic), facts import (COS-009 logic), readiness/outcomes/funnel (COS-018/021/022/025 logic)

21 September 2026 · `services/careerOs/` · Verified: `npx vitest run services/careerOs` → 15 files / 193 tests; `npm run typecheck` clean. Client repositories exercised live against the local stack through the shell (profile bootstrap, migration RPC, opportunities/facts reads) and by the PostgREST upsert check below.

## Modules

| Module | Task | Contract |
| --- | --- | --- |
| `mappers.ts` | all | row↔domain for all 23 tables; enum vocabularies mirror the SQL CHECKs; `deriveStageFromStatus` matches the `job_applications_sync_stage` trigger |
| `repoUtils.ts` | COS-006/012 | `getOwned` → `NotFoundError`; `updateWithRevision` → `ConflictError` on zero rows; `isUuid`/`assertUuid` reject malformed ids before any query (found live: `/app/applications/not-a-real-id` used to reach PostgREST as a 400) |
| 17 repositories | COS-009…025 | owner-scoped reads, revision-preconditioned updates, idempotent `start` (RPC), immutable `recordSubmission` (supersede keeps `previous`), reversible `merge`/`unmerge`, `upsertByDedupeKey` for actions/events/notifications |
| `careerContext.ts` | COS-006 | `resolveContext(userId, route, hints, deps)` — main owned object first, related context through persisted relations, hint contradictions reported as `ContextConflict` and never applied, `unavailable`/`partial`/`stale` completeness, `contextCacheKey`, `invalidationFor`, `actionsAffectedBy` |
| `careerFacts.ts` | COS-009 | `candidateFactsFromResume` (inferred, candidate, provenance, fingerprint), `candidateFactsFromProfile`, `reconcileCandidates` (new / duplicates / conflicts with a shared `conflictGroup`), `factsRevision`, `impactOfChange` |
| `careerActions.ts` | COS-014 | `RULES_VERSION rules-1.0.0`; deterministic rules (REVIEW_IMPORT, RESOLVE_CONFLICT, SET_GOAL only when there is something to pursue, PREPARE_INTERVIEW from recorded dates only, REVIEW_TAILORING, FOLLOW_UP_APPLICATION, TAILOR_CV, REVIEW_OPPORTUNITY, START_APPLICATION, IMPROVE_ACHIEVEMENT, CAPTURE_ACHIEVEMENT, RECORD_OUTCOME); dedupe key = type:subject:hash(material inputs); ranking comparator = confirmed deadline → unblocking → goal relevance → effort → key; `shouldResurface`; `completionForReceipt` |
| `careerFit.ts` | COS-020 | `FIT_ENGINE_VERSION fit-1.0.0`; deterministic requirement extraction; qualification supported/partial/missing/unknown with evidence refs (supported requires verified/user_confirmed); direction factors + constraint verdicts; missing pay → unknown; `hiddenByConstraint`; `isAnalysisStale` |
| `careerEvents.ts` | COS-017 | versioned envelope, dedupe key, redaction of private keys / long strings / `@`, dev-throw prod-drop, `emit` never rejects |
| `campaignFunnel.ts`, `readiness.ts`, `outcomes.ts` | COS-021/018/025 | observed counts (no percentage), checklist readiness (no score), stage effects of outcomes, corrected history, unknown responses |

## Decisions recorded

* A DISMISSED action with an unchanged dedupe key stays dismissed; a new key with a dismissed sibling (same type:subject prefix) is inserted READY with `resurfaced_reason`; keys no longer produced expire.
* Fingerprints are FNV-based on the same normalisation as the SQL `md5` used by the legacy backfill; cross-source dedupe uses the normalised identity key, so legacy and client imports never duplicate each other.
* The `career_facts (user_id, source_fingerprint)` unique index was changed from partial to plain after a live PostgREST check returned `42P10` (no inferable constraint); after the change a batch with duplicate fingerprints and NULL fingerprints inserted 3 rows and a re-import inserted 0 (`Prefer: resolution=ignore-duplicates`). Bulk inserts must carry uniform keys (`PGRST102` otherwise) — documented for the importers.

## Tests (`services/careerOs/__tests__/`)

`mappers` 23 · `repos.core` 25 · `repos.execution` 15 · `repos.queue` 13 · `careerFacts` 14 · `careerContext` 12 (two users/two applications, hint conflict, missing, stale) · `careerActions` 20 (ordering, dedupe stability, no-data, missing interview date never a deadline, expiry, resurfacing) · `careerFit` 11 (missing pay unknown, hard constraint hides with reason, stale after goal revision, no probability field) · `careerEvents` 9 (redaction, dedupe, envelope) · `campaignReadinessOutcomes` 8 · plus gateway/coach/interview client tests 14 and frontier tests 29.
