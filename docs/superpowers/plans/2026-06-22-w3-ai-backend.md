# W3 — AI Backend (Edge Functions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every AI call server-side into Supabase Edge Functions that hold the Gemini key, enforce auth + plan entitlement + usage metering, validate/sanitize outputs, and log safe metadata — fixing the `gemini-3.5-flash` bug, deleting all mock fallbacks, and collapsing the three ATS/match implementations into one shared deterministic engine.

**Architecture:** Extract the deterministic ATS engine (+ skill taxonomy + pure resume-parse helpers) into a runtime-neutral `lib/ats/` shared by the browser (instant, unmetered live re-score) and the metered `ats-analyze` Edge Function. Add `supabase/functions/_shared/` modules (CORS, auth guard, entitlement+meter, Gemini client, schema-validate, sanitize, ai-log). Implement one Edge Function per AI capability. The client's `geminiService.ts` / `smartStudioService.ts` become thin `services/api.ts` callers; direct `@google/genai` usage and the AI key leave the bundle entirely.

**Tech Stack:** Supabase Edge Functions (Deno/TS), `@google/genai` (server-side, via Deno npm: specifier), Postgres (`subscriptions`/`usage_counters`/`ai_logs` from W2), React/Vite client, Vitest (shared `lib/` units), Deno test (functions).

## Global Constraints

- npm + Node 20; **trailing-space dir** `/Volumes/DATA/cvbase ` (quote in shell; include the space in absolute file-tool paths). Tests via `npm test` / `./node_modules/.bin/vitest` (vitest 2.1.9), never `npx vitest`.
- Branch `feat/supabase-stripe-production`; commit per task; co-author `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Local Supabase running (Docker — it has been unstable; if `supabase start` fails, restart Docker Desktop with ≥4 GB memory). Edge Functions served via `supabase functions serve`. The **Gemini key** must be in `.env.cvbase.local` as `GEMINI_API_KEY` and loaded via `supabase functions serve --env-file ../.env.cvbase.local` (NEVER bundled into the client).
- **Valid models only:** `gemini-2.5-flash` (text), `gemini-2.5-flash-image` (headshot). `gemini-3.5-flash` does NOT exist — every occurrence is a bug to fix.
- **No secret or `@google/genai` in the client bundle** by the end (grep-clean). The W0 vite.config already stopped injecting the key; W3 removes the client SDK import too.
- **Server is the authority:** every AI endpoint verifies the Supabase JWT, checks plan entitlement + remaining usage against `subscriptions`/`usage_counters` (service_role), meters on success, and logs to `ai_logs` (function, model, promptVersion, token estimate, status — NEVER resume content).
- **Shared `.ts` imports:** tsconfig has `allowImportingTsExtensions: true`, so shared `lib/ats/*.ts` files use explicit `.ts` extensions (required by Deno, accepted by Vite).
- **Anti-hallucination:** AI prompts must instruct "use a clearly-marked placeholder (e.g. `[X]`) for any metric the user did not provide; never invent numbers." The existing accept/reject UX is preserved.

## Reference — current AI surface (to be migrated)

- `services/geminiService.ts`: `generateSuggestion`, `getAiSuggestionsForSection`, `analyzeResume`, `checkAtsCompliance` (→ folds into ats-analyze), `generateProfessionalHeadshot` (2.5-flash-image), `generateBulletPointSuggestions`, `generateSummarySuggestions`, `generateSkillSuggestions`, `generateFieldTip` (**3.5-flash bug**). All else `gemini-2.5-flash`.
- `services/smartStudioService.ts`: `analyzeJobScanMatch` (**3.5→mock**, DELETE — match routes to ats-analyze), `optimizeLinkedInProfile` (**3.5→mock**), `optimizeCoverLetter` (**3.5→mock**), `analyzeCareerTrajectory` (**3.5→mock**), `parsePdfFileWithAi` (2.5-flash).
- `services/atsEngine.ts`: `analyzeJobDescription(jd)`, `runAtsAnalysis(resume, job)`, `runFullAnalysis(resume, jd)`. Imports pure `./skillTaxonomy` and `./resumeParser` (`extractDateRanges` + types `ParsedResume`/`ParsedSection`); the pdfjs/mammoth file-parsing in resumeParser stays client-side.
- Entitlement/usage: `subscriptionService` `usageRemaining(state,kind)`, `recordUsage(state,kind)`, plan limits `atsScansPerMonth`/`aiActionsPerMonth`; W2 `usageRepo.getUsage(uid,month)` reads `usage_counters`.

---

### Task 1: Extract the ATS engine into a runtime-neutral `lib/ats/`

**Files:**
- Create: `lib/ats/skillTaxonomy.ts` (move from `services/skillTaxonomy.ts`), `lib/ats/parsedResume.ts` (the pure `ParsedResume`/`ParsedSection` types + `extractDateRanges`, moved out of `services/resumeParser.ts`), `lib/ats/atsEngine.ts` (move from `services/atsEngine.ts`), `lib/ats/index.ts` (re-exports).
- Modify: `services/resumeParser.ts` (keep pdfjs/mammoth file→`ParsedResume`; import the types + `extractDateRanges` from `lib/ats/parsedResume.ts`), and every importer of `atsEngine`/`skillTaxonomy` (`components/ats/AtsAnalyzer.tsx`, etc.).
- Test: `lib/ats/__tests__/atsEngine.test.ts`, `lib/ats/__tests__/skillTaxonomy.test.ts`.

**Interfaces:**
- Produces `lib/ats/index.ts` re-exporting `analyzeJobDescription`, `runAtsAnalysis`, `runFullAnalysis`, `AtsReport`, `JobAnalysis`, `ParsedResume`, `extractSkills`, etc. — consumed by the client (live preview) and `ats-analyze` (Task 4). All files pure TS (no `pdfjs`, `mammoth`, `window`, `process`), `.ts` extensions on internal imports.

- [ ] **Step 1:** `grep -rn "from '.*skillTaxonomy'\|from '.*atsEngine'\|from '.*resumeParser'" --include=*.ts --include=*.tsx . | grep -v node_modules` to enumerate importers before moving.
- [ ] **Step 2:** Move `services/skillTaxonomy.ts` → `lib/ats/skillTaxonomy.ts` unchanged (it is already pure). 
- [ ] **Step 3:** Read `services/resumeParser.ts`; split out the pure type defs (`ParsedResume`, `ParsedSection`) and `extractDateRanges` (and any pure helpers the engine imports) into `lib/ats/parsedResume.ts`. Leave the pdfjs/mammoth parsing functions in `services/resumeParser.ts`, which now `import { ParsedResume, ParsedSection, extractDateRanges } from '../lib/ats/parsedResume.ts'` and re-exports the types for existing client importers.
- [ ] **Step 4:** Move `services/atsEngine.ts` → `lib/ats/atsEngine.ts`; update its imports to `'./skillTaxonomy.ts'` and `'./parsedResume.ts'`.
- [ ] **Step 5:** Create `lib/ats/index.ts` re-exporting the public API. Re-point all client importers (from Step 1) to `lib/ats` (keep `services/atsEngine.ts` + `services/skillTaxonomy.ts` as one-line re-export shims **only if** many files import them, else update imports directly).
- [ ] **Step 6: Write a real unit test** `lib/ats/__tests__/atsEngine.test.ts` exercising `runFullAnalysis` on a small fixture resume+JD and asserting the score is in range and a known keyword is matched/missing. Plus `skillTaxonomy.test.ts` asserting `extractSkills('experienced with React and Node')` includes React/Node.
- [ ] **Step 7:** Run `npm test` (new ATS tests pass) and `npm run typecheck` (≤24) and `npm run build` (exit 0; client still gets the engine for live preview). **Commit** `refactor(w3): extract deterministic ATS engine to runtime-neutral lib/ats`.

---

### Task 2: Shared Edge Function modules (`supabase/functions/_shared/`)

**Files:** Create `cors.ts`, `auth.ts`, `entitlement.ts`, `gemini.ts`, `validate.ts`, `sanitize.ts`, `aiLog.ts`, `respond.ts` under `supabase/functions/_shared/`.

**Interfaces (consumed by every function in Tasks 3–6):**
- `cors.ts`: `corsHeaders`, `handleOptions(req): Response | null`.
- `auth.ts`: `getUser(req): Promise<{ user, supabaseUser }>` — verifies the `Authorization: Bearer <jwt>` via a user-scoped client; throws `HttpError(401)` if absent/invalid. Also exports `serviceClient()` (service_role) for metering.
- `entitlement.ts`: `checkAndMeter(userId, kind: 'atsScans'|'aiActions'): Promise<void>` — reads plan from `subscriptions` (default `free`), reads `usage_counters` for the current `YYYY-MM`, compares to the plan limit (`-1` = unlimited), throws `HttpError(402, 'limit_reached', {upgrade:true})` if over, else upserts `usage_counters` +1 (service_role). `entitled(userId, feature: 'smartStudio'|'aiHeadshot'): Promise<boolean>` for boolean-gated features.
- `gemini.ts`: `geminiText(prompt, {schema?, model?}): Promise<string|object>` and `geminiImage(...)` — wraps `@google/genai` (Deno `npm:@google/genai`) with `GEMINI_API_KEY` from `Deno.env`, valid model default `gemini-2.5-flash`, the anti-hallucination system instruction, and JSON-schema response config when `schema` given.
- `validate.ts`: `validateShape<T>(value, schema): T` — minimal runtime schema check; throws `HttpError(502,'bad_ai_output')` on mismatch.
- `sanitize.ts`: `sanitizeText(s)` / `sanitizeHtml(s)` — strip control chars / disallowed tags from AI output before returning.
- `aiLog.ts`: `logAi(userId, {function, model, promptVersion, tokenEstimate, status})` — inserts a safe-metadata row into `ai_logs` (service_role); never receives resume content.
- `respond.ts`: `HttpError` class; `ok(data)` / `fail(err)` → JSON Responses with `corsHeaders`.

- [ ] **Step 1:** Create `respond.ts` + `cors.ts` (HttpError, ok/fail, corsHeaders, handleOptions).
- [ ] **Step 2:** Create `auth.ts` (`getUser` via `createClient(SUPABASE_URL, ANON, {global:{headers:{Authorization}}})` then `auth.getUser()`; `serviceClient()` via service-role key from `Deno.env`).
- [ ] **Step 3:** Create `entitlement.ts` (`checkAndMeter`, `entitled`) reading `subscriptions`/`usage_counters` and upserting usage with the service client. Mirror the plan limits from `subscriptionService` (free: ats 3 / ai per the catalog; pro/elite: -1 where applicable).
- [ ] **Step 4:** Create `gemini.ts` (npm:@google/genai client; system instruction includes the placeholder/anti-hallucination rule; schema → `responseMimeType:'application/json'` + `responseSchema`).
- [ ] **Step 5:** Create `validate.ts`, `sanitize.ts`, `aiLog.ts`.
- [ ] **Step 6:** `deno check supabase/functions/_shared/*.ts` (via `supabase functions` Deno) passes. **Commit** `feat(w3): shared edge-function modules (auth, entitlement+meter, gemini, validate, sanitize, ai-log)`.

---

### Task 3: `ats-analyze` Edge Function (the one ATS engine, metered)  ⚠️ verify the metering path

**Files:** Create `supabase/functions/ats-analyze/index.ts`; create client `services/api.ts` (`callFn(name, body)` posting to `${SUPABASE_URL}/functions/v1/<name>` with the session JWT).

**Interfaces:** Request `{ resumeText: string, jobDescription?: string }` → Response `AtsReport` (+ `job`). Consumes `lib/ats` (Deno imports `../../../lib/ats/index.ts`) + `_shared` (auth, `checkAndMeter(uid,'atsScans')`, log).

- [ ] **Step 1:** Implement `index.ts`: handle OPTIONS; `getUser`; `checkAndMeter(user.id,'atsScans')`; build a `ParsedResume` from `resumeText` (reuse the pure parse helper) and run `runFullAnalysis`; `logAi(...status:'ok')`; return the report. On engine error log `status:'error'` and 500.
- [ ] **Step 2:** Add `services/api.ts` `callFn`. 
- [ ] **Step 3:** Serve locally: `supabase functions serve ats-analyze --env-file ../.env.cvbase.local` and curl it with a test user JWT + a sample resume/JD; assert a real `AtsReport` and that `usage_counters.ats_scans` incremented (and a free user is blocked after 3).
- [ ] **Step 4:** Repoint `components/ats/AtsAnalyzer.tsx`'s metered "scan" to `api.callFn('ats-analyze', …)`; keep the **client** `lib/ats` live re-score (unmetered) for instant preview. Route Smart Studio's "match" tab to `ats-analyze` and **delete `analyzeJobScanMatch`** + its mock.
- [ ] **Step 5:** typecheck (≤24) + build. **Commit** `feat(w3): ats-analyze edge function; one shared engine; delete AI JobScan mock`.

---

### Task 4: `ai-suggest` Edge Function + geminiService → thin client

**Files:** Create `supabase/functions/ai-suggest/index.ts`; rewrite `services/geminiService.ts` as thin `api.callFn` wrappers.

**Interfaces:** Request `{ kind: 'section'|'bullets'|'summary'|'skills'|'analyze'|'fieldTip', payload: … }` → typed result. Metered `aiActions`. Replaces `generateSuggestion/getAiSuggestionsForSection/analyzeResume/generateBulletPointSuggestions/generateSummarySuggestions/generateSkillSuggestions/generateFieldTip` (fixing the **fieldTip** model to `gemini-2.5-flash`).

- [ ] **Step 1:** Implement `index.ts`: auth; `checkAndMeter(uid,'aiActions')`; switch on `kind`; build the prompt (port from geminiService, add the placeholder rule); `geminiText` with the JSON schema for list/structured kinds; `validateShape` + `sanitize`; `logAi`; return.
- [ ] **Step 2:** Rewrite `services/geminiService.ts` so each exported function calls `api.callFn('ai-suggest', {kind, payload})` and returns the same types the UI already consumes (no UI changes needed). Remove `new GoogleGenAI` and the `apiKey` read from this file.
- [ ] **Step 3:** Serve + curl each `kind` with a JWT; assert real output + `aiActions` increments + over-limit 402.
- [ ] **Step 4:** typecheck (≤24) + build. **Commit** `feat(w3): ai-suggest edge function; geminiService becomes a thin client; fix fieldTip model`.

---

### Task 5: `ai-cover-letter`, `ai-linkedin`, `ai-trajectory` (fix models, delete mocks)

**Files:** Create three functions under `supabase/functions/`; rewrite the corresponding `services/smartStudioService.ts` exports as `api.callFn` wrappers; **delete every mock fallback object**.

**Interfaces:** Each: auth + `checkAndMeter(uid,'aiActions')` + `entitled(uid,'smartStudio')` (these are Smart Studio features) + `gemini-2.5-flash` + schema-validate + sanitize + a user-facing disclaimer field. Return the existing `CoverLetterOptimizeResult` / `LinkedInOptimizeResult` / `CareerTrajectoryResult` shapes.

- [ ] **Step 1:** Implement the three `index.ts` (port prompts from smartStudioService, fix model id, add placeholder rule + disclaimer).
- [ ] **Step 2:** Rewrite `optimizeCoverLetter`/`optimizeLinkedInProfile`/`analyzeCareerTrajectory` as thin clients; **remove the hardcoded mock return objects** entirely.
- [ ] **Step 3:** Serve + curl each with a JWT (Elite-gated); assert real, resume-specific output (not the canned "Drizzle ORM/KPI" data) + metering + that a non-Elite user is gated.
- [ ] **Step 4:** typecheck (≤24) + build. **Commit** `feat(w3): cover-letter/linkedin/trajectory edge functions; delete all AI mocks`.

---

### Task 6: `ai-headshot` + `ai-parse-pdf`; remove `@google/genai` + AI key from the client

**Files:** Create `supabase/functions/ai-headshot/index.ts` (+ Storage write), `supabase/functions/ai-parse-pdf/index.ts`; finish `services/smartStudioService.ts` thin-client (`parsePdfFileWithAi`); remove `@google/genai` from client deps + any residual key reads.

- [ ] **Step 1:** `ai-headshot`: auth + `entitled(uid,'aiHeadshot')` (Elite) + `gemini-2.5-flash-image`; upload the result to the private `headshots/{uid}/...` bucket (service client) and return a signed URL; meter `aiActions`.
- [ ] **Step 2:** `ai-parse-pdf`: auth + `gemini-2.5-flash`; returns extracted text (image-PDF fallback). (Parsing of normal PDFs stays client-side in `resumeParser`.)
- [ ] **Step 3:** Rewrite `generateProfessionalHeadshot` + `parsePdfFileWithAi` as `api.callFn` wrappers. Remove `import ... '@google/genai'` from all client files; remove `@google/genai` from `package.json`; `npm install`.
- [ ] **Step 4:** `grep -rn "@google/genai\|process.env.API_KEY\|GoogleGenAI" --include=*.ts --include=*.tsx . | grep -v node_modules | grep -v supabase/functions` → none in client. `npm run build` then grep `dist/` for `@google/genai`/`AIza...` → clean.
- [ ] **Step 5:** typecheck (≤24) + build. **Commit** `feat(w3): ai-headshot + ai-parse-pdf; remove @google/genai and the AI key from the client`.

---

### Task 7: Workstream checkpoint + tag

- [ ] **Step 1:** Write `supabase/tests/w3-ai-smoke.sh`: with `supabase functions serve` running, create a confirmed test user (admin API) + token; for each function assert (a) 401 without a token, (b) a real (non-mock) 200 with a token, (c) `ai_logs` got a row, (d) `usage_counters` incremented, (e) a free/over-limit user gets 402, (f) Elite-gated functions reject a free user. Clean up.
- [ ] **Step 2:** Run it → ALL PASS (needs `GEMINI_API_KEY` in `.env.cvbase.local`; if absent, the AI calls are skipped with a clear SKIP and only the auth/entitlement branches are asserted).
- [ ] **Step 3: Full gate:** `npm run typecheck` (≤24) · `npm test` (ATS + existing units pass) · `npm run build` (exit 0) · bundle grep clean of `@google/genai`/`AIza...`/`sk_`/`service_role`.
- [ ] **Step 4: Commit** `test(w3): AI edge-function smoke (auth+entitlement+metering+no-mock)` and **tag** `git tag w3-complete`.

## Self-Review

- **Spec coverage (§7 W3):** ai-suggest (T4), ai-cover-letter/linkedin/trajectory + delete mocks + fix model (T5), ai-headshot + ai-parse-pdf (T6), ats-analyze = one shared engine + delete AI JobScan + fold checkAtsCompliance (T1+T3), client becomes thin via `services/api.ts` + remove `@google/genai`/key (T4–T6), engine extracted to shared `lib/ats` (T1), every endpoint enforces auth+entitlement+metering and logs safe metadata (T2 shared + each function), grep-clean bundle (T6/T7). ✓
- **Placeholder scan:** shared module + function contracts are concrete (signatures, models, metering kind, gating); the parallel functions in T5 share the T3/T4 pattern. The implementer ports each prompt from the named current function. ✓
- **Type consistency:** functions return the **existing** `types.ts`/service result shapes (`AtsReport`, `CoverLetterOptimizeResult`, etc.) so the UI is unchanged; `checkAndMeter` kind is `'atsScans'|'aiActions'` matching `UsageKind`. ✓
- **Risk notes:** T3–T6 need Docker + a real `GEMINI_API_KEY` to verify live; the client cutover (removing `@google/genai`, deleting mocks) is the irreversible part — checkpoint before T4. The ATS extraction (T1) is pure/Docker-free and is the safe first step.
- **Deferred:** real billing writes to `subscriptions` (W4); DOMPurify on the 75 render sinks (W5); career-trajectory/headshot UI polish (W6).
