# COS-013 — PRISM bound to the application, durable recovery hardened

20–21 September 2026 · Server: `supabase/functions/prism-tailor` (Deno, Supabase Edge Functions) · Client contract: `services/prismService.ts`, `services/repos/prismRepo.ts` · Verified with scripted-model unit tests and, for every path that needs no model call, against the real local stack (the local edge runtime has no LLM keys). Not deployed.

## What changed

| File | Change |
| --- | --- |
| [supabase/functions/prism-tailor/handler.ts](../../../supabase/functions/prism-tailor/handler.ts) | **New.** The whole request pipeline as `handlePrismRequest(req, deps?)` with injectable `PrismDeps` (`getUser`, `serviceClient`, `checkAndMeter`, `releaseUsage`, `model`, `logAi`, `now`). Analyze/generate/finalize logic from the old `index.ts`, plus the binding, idempotency, stale-source, finalize reconciliation, checkpoint durability and refund receipt described below. |
| [supabase/functions/prism-tailor/index.ts](../../../supabase/functions/prism-tailor/index.ts) | Thinned to `Deno.serve((req) => handlePrismRequest(req))`. The repository convention (admin/routes.ts, _shared/handler.ts) is that `index.ts` only serves; a `Deno.serve` at module load cannot be imported by a test. |
| [supabase/functions/prism-tailor/fakeSvc_test.ts](../../../supabase/functions/prism-tailor/fakeSvc_test.ts) | **New.** In-memory PostgREST-builder stand-in (select/insert/update, eq/gte/in/limit, single/maybeSingle/thenable, `(user_id, idempotency_key)` uniqueness, scripted failures by table/op/payload, rejecting or `{error}`). |
| [supabase/functions/prism-tailor/handler_test.ts](../../../supabase/functions/prism-tailor/handler_test.ts) | **New.** 21 tests through the real graphs with the scripted model from `fixtures_test.ts`. |
| [services/prismService.ts](../../../services/prismService.ts) | `analyzeGaps` accepts `PrismBinding` (`applicationId`, `sourceResumeId`, `sourceResumeRevision`, `idempotencyKey`); `generateResume` accepts `acknowledgeStale`; in-band errors now carry `extra` onto the thrown `FnError` (so `source_stale` exposes `extra.currentRevision`); `finalizeRun({ runId, resumeId, applicationId? })` returns `{ runId, status, applicationId, resumeId }` while the positional `finalizeRun(runId, resumeId)` the wizard already calls keeps working (overload). `CHECKPOINT_DEGRADED_STAGE` exported. |
| [services/repos/prismRepo.ts](../../../services/repos/prismRepo.ts) | `PrismRunSummary` gains the binding fields; `getResumable(userId)` now adds `.is('application_id', null)` so the standalone banner never offers an application's run; new `getResumableForApplication(userId, applicationId)` scoped by owner **and** `application_id`. |
| [services/__tests__/prismService.test.ts](../../../services/__tests__/prismService.test.ts), [services/repos/__tests__/prismRepo.test.ts](../../../services/repos/__tests__/prismRepo.test.ts) | 5 new service tests, 4 new repo tests. |

`PrismWizard.tsx` is untouched: it still sends today's payloads (no binding fields, positional finalize) and the standalone flow behaves as before — asserted by the "standalone analyze (today's payload)" / "unchanged standalone contract" / "standalone finalize" tests and the existing 7 `PrismWizard.test.tsx` tests.

## Behaviour

### Analyze (`phase: 'analyze'`)

Body gains optional `applicationId` (uuid), `sourceResumeId` (uuid), `sourceResumeRevision` (int ≥ 0), `idempotencyKey` (1–128 chars).

1. Ownership first, before any limit, charge or row: `applicationId` / `sourceResumeId` are loaded with `.eq('user_id', user.id)`; a foreign or missing id is `404 application_not_found` / `404 resume_not_found` — identical answers, so existence is never revealed.
2. With an `idempotencyKey`, the `(user, key)` run is looked up:
   * `analyzing` / `generating` and `updated_at` inside the 3-minute active window → `409 run_in_progress { runId }`.
   * `awaiting_answers` → one `done` event `{ runId, questions }` from the row; `review` → `done` with the stored result; `completed` → `done { runId, resumeId }`. No model call, no charge, no new row.
   * `failed`, or a crashed `analyzing`/`generating` row outside the window: if the row already has `questions`, analyze had finished — they are replayed (a re-run would discard the checkpointed generate progress); otherwise analyze is re-run **on the same row**, seeded with the checkpointed `gap_analysis` (the gap analyst is skipped), the body's JD/CV/template refresh the row, and only the single-active-run check applies. Not charged unless the charge had been refunded (see charging rule).
3. Otherwise: hourly limit, single-active-run, `checkAndMeter('aiActions')`, insert with the four binding columns and a usage receipt `checkpoint.usage = {kind, charged:true, released:false}`. A `23505` on the key (two concurrent starts) refunds this call's reservation and answers `409 run_in_progress` with the winner's id; any other insert failure refunds and answers `500 run_create_failed`.
4. With an `applicationId`, `job_applications.prism_run_id = runId` (same owner) — logged, non-fatal, because `prism_runs.application_id` is the authoritative edge and finalize re-asserts the pointer.

### Generate (`phase: 'generate'`)

Contract unchanged (`runId`, `answers`), plus `acknowledgeStale?: boolean`.

* A run with `application_id` re-checks the application still exists for this user → `404 application_not_found`.
* If `source_resume_revision` is set and the source resume's current `revision` differs (or the resume is gone → `null`), the stream is a single in-band `{type:'error', error:'source_stale', extra:{currentRevision}}` and the run is left exactly as it was (status, error_code untouched) until the body carries `acknowledgeStale: true`. The client throws `FnError{code:'source_stale', extra}` for the review prompt.

### Finalize (`phase: 'finalize'`)

Body gains optional `applicationId`. Returns `{ runId, status:'completed', applicationId, resumeId }`.

* Idempotent: `completed` with the same `resume_id` → `200`; `completed` with a different resume → `409 run_not_reviewable`; any other non-`review` status → `409 run_not_reviewable`.
* `applicationId` in the body must match the run's binding when both exist (`409 application_mismatch`); when the body omits it the run's binding is used.
* The resume is loaded with ownership (`404 resume_not_found`) — today's code did not check this before linking `resume_id`.
* Ordering: link **first** (`job_applications.current_resume_id = resumeId, prism_run_id = runId` and `resumes.application_id = applicationId, origin = {kind:'prism', runId, sourceResumeId, sourceRevision}`, both same-owner updates), **then** mark the run completed and wipe its text. A link failure answers `500 finalize_link_failed { retryable: true }` and leaves the run in `review` with its result, so the client retry redoes the whole finalize; a completion failure after linking answers `500 finalize_failed { retryable: true }` and the retry redoes the same idempotent updates. Standalone runs (no application) behave exactly as before: one `prism_runs` update, nothing else touched.

### Checkpoint durability

`onCheckpoint` still persists every stage fragment, but a failed write is retried once; if it fails twice the stream carries one `{type:'stage', stage:'checkpoint_degraded', label:'Progress could not be saved; if this stops, you will restart this step'}` (once per stream, however many later checkpoints fail), the failure count is kept per run, and only if the run later fails is `error_code` recorded as `checkpoint_degraded` (the in-band `error` event keeps the real code and adds `extra.checkpointDegraded: true`). A single transient failure absorbed by the retry emits nothing. The failure-status write is deliberately separate from the usage-receipt write so a database that is dropping checkpoint writes can still record the failure. Stage labels are the graph's fixed `STAGE_LABELS`; no synthetic stages were added.

### Resumable runs on the client

`getResumable` excludes application-bound runs; `getResumableForApplication` returns only that application's latest resumable run. Both filter on `user_id` and `status in (awaiting_answers, review, failed)`.

## Charging rule (documented for REQ-27)

One metered `aiActions` per logical tailoring, identified by the idempotency key:

* **Charged once, at analyze**, when the run row is created (`checkAndMeter` then insert). The receipt lives on the run: `checkpoint.usage = {kind:'aiActions', charged, released}` (wiped with the rest of the checkpoint at finalize).
* **Idempotent replays are free**: the same key returns the existing run's outcome without `checkAndMeter`.
* **Generate and finalize are unmetered**: they require the paid row.
* **Retries of a failed analyze/generate on the same run are free** — the run's single charge is still held. The one exception keeps the count at exactly one: when the failure was ours (`shouldRefund` from `_shared/handler.ts`: `LlmAllProvidersFailedError` or any 5xx such as `bad_ai_output`), the charge is refunded with `releaseUsage` at failure time and the receipt records `released:true`; the resume of that run then re-reserves it (`checkAndMeter` again, receipt back to `released:false`; a `402` here is the user's real quota state). User-side failures (`cost_cap_exceeded`, invalid answers) are not refunded and resume free.
* **Duplicate submission** (two concurrent analyzes with one key) charges once: the loser's reservation is released and it receives `409 run_in_progress`.
* `run_create_failed` after metering is refunded — the user has no run to resume.

Net effect asserted by the tests: `calls.meter` is `['aiActions']` across analyze → replay → generate → finalize → finalize; `['aiActions','aiActions']` with `calls.release === ['aiActions']` across outage → refund → resume.

## Tests

```
deno test --allow-env --allow-read --node-modules-dir=none supabase/functions/prism-tailor/ supabase/functions/account-export/ supabase/functions/_shared/
ok | 182 passed | 0 failed     (prism-tailor 72 = 51 pre-existing + 21 handler; account-export 7; _shared 103)
```
The 21 handler tests (`supabase/functions/prism-tailor/handler_test.ts`):

```
standalone analyze (today's payload): metered once, run row created, stages + done streamed
IDEMPOTENT analyze: the same key replays the run — no second meter, no second row, no model calls
IDEMPOTENT analyze: key of a run still analyzing inside the active window → 409 run_in_progress
IDEMPOTENT analyze: review/completed runs replay their outcome without metering
IDEMPOTENT analyze: a FAILED run with the same key is re-run on the same row for free
IDEMPOTENT analyze: a stale (crashed) analyzing row outside the window resumes from its checkpointed gap analysis
OWNERSHIP: a foreign application id is 404 application_not_found before anything is metered or created
QUOTA: a 402 from metering creates no run row
GENERATE: a changed source revision answers in-band source_stale (run untouched) until acknowledged
GENERATE: a bound run whose application vanished is 404 application_not_found
GENERATE: unchanged standalone contract — resumes an awaiting_answers run to review
FINALIZE with an application: links application + resume FIRST, then completes; a second finalize is 200 ok
FINALIZE: the run's own binding is used when the body omits applicationId; a conflicting one is 409
FINALIZE: a link failure leaves the run in review and answers 500 finalize_link_failed retryable; the retry completes
FINALIZE: standalone (no application) behaves as before — completes without touching resumes/job_applications
CHECKPOINT DEGRADED: a checkpoint write that rejects twice emits one in-band stage event and the run still completes
CHECKPOINT DEGRADED: when the run later fails, error_code records checkpoint_degraded and the client learns it
CHECKPOINT: a single transient write failure is absorbed by the retry — no degraded event
REFUND: an our-side provider outage refunds the charge, records it on the run, and the free retry re-reserves exactly once
a user-side failure (cost cap) is not refunded and the run is still resumable for free
gate: the feature flag still fails closed and a bad body is 400
```

```
deno check --node-modules-dir=none supabase/functions/prism-tailor/index.ts supabase/functions/account-export/index.ts supabase/functions/account-delete/index.ts   → clean
npx vitest run services/__tests__/prismService.test.ts services/repos                    → 4 files, 31 passed
npx vitest run components/prism                                                           → 7 passed (PrismWizard unchanged)
npm run typecheck → 0 errors in this task's files; the only error is App.tsx importing components/careeros/CareerShell, being added by a parallel task
```

## Live check on the local stack (real edge runtime + Postgres, no model calls)

The local `supabase_edge_runtime_cvbase_` container serves the repository's `prism-tailor` and has no LLM keys (`/health` reports `llm: 0`), so the paths below were exercised for real and the model-dependent ones by the scripted-model tests above. Two users, `prism` flag at 100%, user A on `pro`; A owns a source resume (revision 1), an output resume and an application; B owns an application. Rows for the replay/stale/finalize steps were seeded with `psql` in the states the pipeline would leave them in.

```
PASS: analyze with B's application -> 404 application_not_found
PASS: analyze with a non-owned source resume -> 404 resume_not_found
PASS: no run row created by refused starts
PASS: same idempotency key replays the review result in one done event
PASS: still exactly one run row
PASS: source resume revision bumped 1 -> 2 by career_os_touch
PASS: generate on a stale source -> in-band source_stale {currentRevision:2}
PASS: run untouched by the stale prompt (still awaiting_answers)
PASS: finalize -> {runId,status:completed,applicationId,resumeId}
PASS: job_applications.current_resume_id + prism_run_id linked
PASS: resumes.application_id + origin {kind:prism,runId,sourceResumeId,sourceRevision} written
PASS: run completed and wiped (jd_text null, checkpoint {})
PASS: second finalize (same resume) -> 200 ok, not run_not_reviewable
PASS: finalize with a different resume after completion -> 409
PASS: B finalizing A's run -> 404 run_not_found
PASS: completed run replays {runId,resumeId}
PASS: still one run row after all replays
----
PRISM BINDING LIVE CHECK: ALL PASS
```

(Ad-hoc script, not committed; each line is a `curl` against `POST /functions/v1/prism-tailor` with the user's JWT followed by a `psql` assertion.) The same-owner composite FKs held on the real finalize update; `career_os_touch` bumped the source resume's `revision` exactly as the stale check expects.

## Not verified here

* A live analyze → generate through real providers (needs `DEEPSEEK_API_KEYS` in the runtime; `supabase/tests/prism-e2e-smoke.sh` remains the opt-in path and is unchanged in contract — it sends no binding fields).
* The wizard UI for the `source_stale` review prompt and `checkpoint_degraded` message: the service throws / forwards them, and `PrismWizard.tsx` (COS-016's workspace composition) is where they get rendered.
* Nothing was deployed or run against the hosted project.
