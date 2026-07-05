# PRISM Build Notes

Running log of decisions and lessons while building the PRISM resume-tailoring
wizard. One entry per decision; entries are updated in place if later found wrong.

## Project root path has a trailing space
`/Volumes/DATA/cvbase ` (note trailing space) is the real repo root. Writing to
the no-space path creates a stray directory and silently loses edits. Every
absolute path in tooling must include the space.

## No PRISM/LangGraph design note exists in the repo
The goal references "CVBase's design note" but `docs/` only has W0–W7 launch
plans. The pipeline shape in the goal itself is the spec; built to that.

## "Pydantic + structured outputs" maps to zod + Gemini responseSchema here
CVBase is TypeScript end-to-end (React SPA + Deno Edge Functions); there is no
Python anywhere, so introducing a Python service would violate the "fit existing
conventions" constraint. The load-bearing intent — strict schema fed through the
model's structured-output API, invalid output is a failure — is implemented as:
zod schema → converted to Gemini `responseSchema` (the structured-output API) →
zod `.parse()` on the response → one repair re-prompt with the validation errors
→ `HttpError(502, 'bad_ai_output')` if still invalid (repo's existing fail-loud
convention from `_shared/validate.ts`).

## Pipeline lives in one Edge Function, `prism-tailor`, in two stateless phases
Supabase Edge Functions are stateless with wall-clock limits, and the pipeline
has a natural pause at the questionnaire. Phase `analyze` runs Gap Analyst →
Wizard Creator and returns `{gapAnalysis, questions}`; phase `generate` takes
`{cvText, jdText, gapAnalysis, answers}` back and runs Aggregator → Writer ↔
Critic (cap 2) → Parser. No `prism_sessions` table / LangGraph checkpointer:
client round-trips the state between phases. Simpler, no migration, no cleanup
job; the data is the user's own so tampering is a non-issue. Revisit if we ever
want "resume an abandoned wizard".

## Real LangGraph (`npm:@langchain/langgraph`) in Deno, but Gemini via existing helper
The graph shape (nodes, conditional Writer↔Critic edge, state annotations) uses
LangGraph JS as mandated. Model calls inside nodes go through the existing
`_shared/gemini.ts` (`geminiJson`) rather than LangChain's model wrappers, so we
keep the repo's retry/backoff, ANTI_HALLUCINATION system prompt, and single
model constant. Nodes take the model as an injected `ModelFn` dependency so
tests can script deterministic responses without a Gemini key.

## Status events stream as NDJSON; status lines are a fixed map, not model output
"User never sees raw agent output" is enforced structurally: the edge function
streams newline-delimited JSON events `{type:'stage', stage, label}` where
`label` comes from a hardcoded STAGE_LABELS map (one human line per agent).
Model output never reaches the event channel; only the final `{type:'done'}`
event carries the parsed result. Client reads the stream via a new `streamFn`
helper next to `callFn` in `services/api.ts`.

## Writer bullets must be emitted as `<p>• …</p>` HTML
Template components render `experience[].description` as sanitized HTML in the
repo's `<p>• bullet</p>` format (see `exampleData.ts`). The Writer outputs plain
bullet strings (ATS-safe, no markup); the deterministic Parser step joins them
into that HTML shape. Keeping markup out of the LLM schema also keeps the ATS
Critic's formatting checks meaningful.

## Verification uses the real graph with a scripted model; no local Gemini key
No `GEMINI_API_KEY` exists locally (no .env files; deployed secrets only). Deno
tests drive the actual compiled graph with a scripted ModelFn: critic fails
pass 1 → passes/caps at 2; writer emits invalid schema → repair path → 502.
CI already runs `deno test supabase/functions/_shared/`; extended to include
`prism-tailor/`. A live-model trace needs the deployed env (operator step).

## Entitlement: metered as `aiActions`, one consume per phase
Reuses `checkAndMeter(user.id, 'aiActions')` like `ai-suggest`. The full
pipeline is ~6–8 Gemini calls per resume; whether PRISM should be a Pro-gated
feature (`requireFeature`) or cost >1 action is a pricing decision flagged for
a human.

## Local/CI Deno tests need `--node-modules-dir=none`
The repo's package.json switches Deno into byonm mode, which refuses `npm:`
specifiers that aren't in node_modules. `--node-modules-dir=none` makes Deno
resolve them from its own cache — matching how the Supabase edge runtime
resolves them in production. `deno.lock` now pins @langchain/langgraph + zod.

## vitest footgun: never return `mock.mockReset()` from beforeEach
`mockReset()` returns the mock itself, and vitest treats a beforeEach return
value as a cleanup hook — so it *called the mock with zero arguments* after
each test, producing a baffling "onEvent is not a function" inside the mock
implementation. Wrap resets in braces: `beforeEach(() => { m.mockReset(); })`.

## PRISM entry point is a Dashboard tab, not a new App view
Dashboard already owns tab routing, auth context, and `onEditResume` (which
jumps into the builder for a given resume id). PrismWizard slots in as the
'prism' tab and hands the finished resume id straight to `onEditResume` — no
App.tsx routing changes needed.

## Live-model verification done locally; Gemini free tier is 20 requests/day
`.env.cvbase.local` has a GEMINI_API_KEY (free tier). Two full live traces +
one HTTP E2E through `supabase functions serve` consumed the day's quota
(20 RPD for gemini-2.5-flash), which then exercised the UI's error path in the
browser (friendly message, no leak — as designed). Production needs a paid-tier
key or PRISM will die after ~3 resumes/day globally.

## Live latency: phase 1 ≈ 22s, phase 2 ≈ 100s when the critic loops
Measured with real Gemini: analyze 21.8s; generate 97–105s when the writer
revises once, ~60s when it passes first try. Within Supabase Edge wall-clock
(150s free / 400s paid) but phase 2 has little headroom on free tier.

## The critic caught real drift; grounding hardening was needed
First live run produced one hallucinated filler bullet ("Contributed to the
design and implementation of microservices…") and a "Senior" title claim in
the summary. Fixes that removed it on re-run: writer told bullets-per-fact
(2–5, never pad, never claim unstated seniority), and the critic now receives
the FULL aggregated context with a new `unsupported_claim` issue kind that
blocks `pass`. Shipped-but-capped resumes surface these in unresolvedIssues.

## Local stack keys ≠ .env.cvbase.local keys
`.env.cvbase.local` points at the REMOTE project; the local `supabase start`
stack uses the standard demo JWT keys from `supabase status`. For browser dev
against the local stack, a gitignored `.env.local` overrides
VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY (VITE_-prefixed names win in
vite.config.ts). Delete it to point back at remote.

## React-controlled inputs can't be set by raw DOM value writes (browser or jsdom)
Both Chrome-automation `fill` and jsdom needed the native value setter +
`_valueTracker.setValue('')` + bubbled `input` event for React 19 to accept
programmatic text. Used in the PrismWizard component test (first component
test in the repo — pattern: `// @vitest-environment jsdom`, no RTL dependency).

## Template picker shows real thumbnails via a shared TemplatePreviewRegistry
User feedback: name-only cards weren't enough. Dashboard's private templateMap
(~80 imports) + LazyTemplatePreview moved to
`components/templates/TemplatePreviewRegistry.tsx`; Dashboard now imports it
(203 lines slimmer) and PrismWizard renders live scaled A4 previews
(scale prop, 0.16 in the picker vs 0.28 in the gallery). The shared map is now
typed `Record<TemplateId | 'default', …>` so a template added to types.ts
without a renderer is a compile error (repo's existing completeness pattern).
jsdom tests need an IntersectionObserver stub (lazy-mount API missing there).
Remaining known duplication: ResumeBuilder/PreviewModal/HeadlessPreview still
carry their own templateMaps — consolidation is a safe follow-up, not done here
to keep this diff scoped.

## All 10 code-review findings fixed (high-effort review, 8 angles)
The review's headline catch: best-draft selection compared raw ATS score only,
so a high-scoring draft that FAILED on unsupported claims could ship over a
clean passing revision — pass status now dominates, score only breaks ties
(regression test added). Other fixes: education.description now HTML-escaped
in the parser step; PRISM gates on the resume-count plan limit before running
(same canCreateResume gate as ResumeManager); one tailoring now costs ONE
aiAction (charged at analyze; generate unmetered — documented trade-off:
generate needs a schema-valid gapAnalysis from a paid analyze); fixed the
pre-existing entitlement.ts drift (pro was unlimited aiActions + smartStudio
server-side vs 200/month + locked in PLANS — PLANS is the source of truth);
LazyTemplatePreview memoized with hoisted constants (typing in the wizard no
longer re-renders mounted preview trees); PrismWizard reuses
parseFromResumeData().rawText and smartStudioService's parsePdfFileWithAi +
new shared arrayBufferToBase64 (SmartStudio's stack-risky per-byte loop fixed
too); api.ts callFn/streamFn share fnRequest/toFnError; and the three
duplicate ~75-entry templateMaps in ResumeBuilder/PreviewModal/HeadlessPreview
were deleted in favor of the shared TemplatePreviewRegistry (maps verified
entry-for-entry identical before deletion).

## Production hardening pass 1: run-scoped, checkpointed pipeline (v2 contract)
The stateless two-phase design was replaced by `prism_runs` rows (migration
20260704130000): the edge function creates a run at analyze, checkpoints after
EVERY agent stage (context/draft/critique/iteration/best in a jsonb column),
and generate takes only {runId, answers} — no raw CV/JD round-trip. Nodes skip
stages whose output is already in state, so crashed/abandoned runs resume from
the last completed agent (Deno tests prove: post-writer crash resumes at
critic; capped+failed run resumes straight to ship with zero model calls).
Ownership is enforced at the data layer: service-role loads filter user_id AND
RLS covers direct reads; users can select/delete only their own rows, and only
the edge function writes. jd/cv text is wiped at finalize and by
prism_prune_runs() for stale runs (data minimization).

## Hardening pass 1: injection defense, routing, budget, flags, review gate
- Prompt injection: JD/CV/answers are wrapped in <job_description>/<candidate_cv>/
  <candidate_answers> tags with embedded closing tags neutralized, and every
  agent prompt carrying untrusted content states the data-not-instructions
  SECURITY RULE (tested: hostile JD with "IGNORE PRIOR INSTRUCTIONS" + forged
  tags cannot break out of its data block).
- Cost routing (per-agent): gap_analyst/wizard_creator/critic →
  gemini-2.5-flash-lite (routine judgment); aggregator/writer stay on
  gemini-2.5-flash (aggregator writes the source of truth — an omission there
  is unrecoverable; writer is the user-facing prose). TOKEN_BUDGET=60k per run:
  mid-loop exhaustion ships the best draft, pre-draft exhaustion fails loud
  with cost_cap_exceeded. Tokens measured from Gemini usageMetadata
  (geminiJsonMetered, with a 60s per-call timeout).
- Rate limiting: 6 runs/user/hour + one active run at a time (409
  run_in_progress) enforced in the edge function.
- Zero-gap: conditional edge skips the wizard when gaps=[] (UI auto-continues
  into generate).
- Review gate: the resume row is created ONLY by the review screen's explicit
  approve action; per-line "Not mine" flags insert prism_line_flags (the
  guardrail-improvement signal); finalize links the resume + wipes run text.
- Feature flag: `feature_flags.prism` (enabled + rollout_pct, FNV bucket per
  user) enforced in the edge function (fail closed) AND hides the Dashboard
  tab. Rollout plan: enabled@0% (internal allowlist via pct), 10%, 50%, 100%.
- Telemetry: prism_agent_logs rows per agent call {model, status, latency_ms,
  tokens, iteration} keyed by run id (the trace id); structurally no CV/JD
  content. Failed runs carry error_code on the run row.
Still open (next iterations): golden set + hallucination-check script in CI,
alerting thresholds, live adversarial verification, cross-user RLS smoke.

## Hardening pass 2: automated suite + deterministic hallucination check + alerting
- `grounding.ts`: deterministic traceability checker (numbers value-compared so
  "2k"≡"2,000", companies/titles vs workHistory, skills/certs/languages vs the
  context corpus). Runs BOTH inside the critic node (violations force a
  failing critique as unsupported_claim issues → revision or ship-with-flags)
  and as the golden suite's automated hallucination check. The revert-detector
  test proves it: a fabricated "$3M budget" bullet ships flagged even when the
  scripted LLM critic passes it.
- Golden set (`golden/cases.ts`): 10 CV/JD pairs across junior→lead, six
  fields, gap severities from near-zero to career-change, each with expected
  keywords, gap-count range, ATS range, and an answer bank; plus 3 adversarial
  cases (JD injection, CV instruction override, cross-user leak attempt).
  `golden_test.ts` (CI, deterministic): fixture integrity + prompt-construction
  defenses for every attack. `golden_live.ts`: full pipeline against real
  Gemini with all expectations + grounding on actual writer output; wired into
  CI as a step gated on the GEMINI_API_KEY secret (~7 calls/case, mostly lite).
  Gotcha: INJECTION_RULE names the tags in prose, so block-boundary tests must
  anchor on "<tag>\n", not the bare tag string.
- Alerting (migration 20260704150000): `prism_alert_check()` (failure_rate,
  cost_spike, spend_volume over a window) + `prism_alert_scan()` persisting to
  `ops_alerts` with a 1h dedup. Verified live: seeded 3 failed + 3 heavy runs →
  failure_rate 50%>25 and cost_spike 55k>40k both fired and persisted once.
  Operator step: schedule `select prism_alert_scan()` via pg_cron every 10 min.
- Fixture markers renamed draft-1→draft-one (the number check flags digits in
  markers — the checker is strict enough to catch its own test scaffolding).

## Hardening pass 3: full live verification battery (2026-07-04 evening)
All against the local stack + real Gemini, run 925273b2:
- Cross-user: user B got [] from REST reads of A's run/logs, run_not_found
  from generate/finalize with A's runId, and a no-op delete; A's run intact.
- Organic §2 proof: flash-lite threw 503s mid-critic → bounded retries
  exhausted → run failed with error_code + clean in-band error (no hang);
  re-calling generate resumed AT THE CRITIC (checkpoint skipped aggregator +
  writer) and completed to review. Trace shows both attempts.
- Operator trace (prism_agent_logs): 7 rows with per-agent model/latency/
  tokens/iteration incl. the error row; zero PII; run row carries versions
  (schema v1 / prompt v2) + 19,174 tokens.
- Finalize: status completed, jd/cv/gap/checkpoint ALL wiped, resume linked.
- Feature flag off → 403 feature_disabled; rate limit → 429 after 6 runs/h.
- 3 adversarial inputs live: schema-valid completion, bounded questions, zero
  leakage (no PERFECT MATCH / champion architect / system prompt echoes);
  injection JD still produced real gap questions.
- Delete-my-data at the data layer: RLS delete under A's JWT claims removed
  all runs; agent logs cascaded to zero.
Known gaps for sign-off: at-rest encryption is Supabase platform disk-level
(no column crypto — mitigated by wipe-on-finalize/prune); full 13-case live
golden suite needs a paid Gemini key (free tier quota + 503 spikes); alert
scan needs pg_cron wiring in prod; aggregator ran 40s live (total generate
~3.5min with a retry) — fine for paid Edge 400s wall clock, tight for free.
