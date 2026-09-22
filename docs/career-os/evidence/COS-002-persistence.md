# COS-002 — Document identity, cache scoping and sync conflicts

21 September 2026 · Verified with `npm run typecheck` (clean) and `npx vitest run` (39 files / 430 tests at completion; 60 new tests in this task). No production data touched.

## Changes

| File | Change |
| --- | --- |
| `services/repos/mappers.ts` | `StoredResume` gains `updatedAt`, `revision`, `applicationId`, `origin`; `resumeToRow` never writes revision/updated_at |
| `services/repos/resumeRepo.ts` | `saveById(userId, id, patch, expectedRevision?)` adds `.eq('revision', n)` and selects the new revision; zero rows → `ConflictError` (with precondition) or `NotFoundError` |
| `services/repos/trackerRepo.ts` | `get`, `update(…, expectedRevision?)`, per-record `diffJobs`/`syncJobs`/`flushPending` with a per-user pending queue (`cvbase:tracker-pending:{userId}`), idempotent `importLocalJobs` with an import map (`cvbase:tracker-import-map:{userId}`), `isDefaultSampleJob` so the anonymous sample rows are never imported |
| `lib/builder/draftCache.ts` (new) | Account/document-scoped draft keys `cvbase:draft:{scope}:{docKey}:{field}`; non-destructive legacy adapter (anon/primary only); mirror write of the primary draft to the legacy keys for the readers that still use them, with an owner marker so a signed-in mirror is never adopted anonymously; `listAnonymousDrafts` / `claimAnonymousDraft` / `clearAnonymousDraft` (explicit claim only) |
| `lib/builder/persistenceLogic.ts` (new) | Pure identity/hydration/conflict decisions |
| `lib/builder/usePersistence.ts` | `documentState: loading|ready|unavailable|conflict`; a missing/unowned requested id is `unavailable` and never falls back to the primary; revision-tracked autosave with conflict staging (`useCloud` / `keepMine`); account switch clears state and cancels pending saves; anonymous draft offered, never auto-claimed |
| `components/ResumeBuilder.tsx` | "This CV is unavailable" panel with back; anonymous-draft notice (Restore / Dismiss); stale-revision conflict copy |
| `components/SmartStudio.tsx` | Tracker load/save block only: per-record sync, pending-queue retry, no sample import |

## Acceptance criteria → tests

* Missing resume ID never loads a different CV — `usePersistence.test.tsx` "missing id → unavailable (no getPrimary)", "deleted row → unavailable".
* Scoped cache + explicit anonymous claim — `draftCache.test.ts` (13), `usePersistence.test.tsx` "anonymous draft offered/claimed/dismissed, never auto-claimed", "two users in sequence", "StrictMode switch", "sign-out".
* Concurrent/stale saves surface conflicts — `resumeRepo.test.ts` (ConflictError on zero rows), `usePersistence.test.tsx` "stale-revision conflict + keepMine/useCloud", "two-device conflict at hydration".
* Failed tracker writes recoverable after reload — `trackerRepo.test.ts` (14): queued failure retried next save, removal supersedes queued upsert, samples never imported, idempotent import map.

## Notes and limits

* Deployment prerequisite: the client now selects `revision`, so the foundation migration must be applied before this client ships.
* `ConfirmDialog` treats Escape/backdrop as cancel = "Keep mine"; a dedicated conflict dialog would be safer (tracked for COS-032 UX review).
* Node 26's experimental `globalThis.localStorage` shadows jsdom under Vitest; the tests install an in-memory stub. A project-wide fix belongs in `vitest.setup.ts`.
