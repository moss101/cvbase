# CVBase — Production Launch & Supabase Migration (Program Spec)

**Date:** 2026-06-22
**Status:** Approved (architecture + workstream order); pending final spec review
**Source of truth for current state:** `FEATURE_INVENTORY.md` (read-only audit, 2026-06-21)
**Definition of done:** Every required-change in `FEATURE_INVENTORY.md §8` is implemented and verified, all deferred features (§3.8 list) are built, and the app is deployable to production behind a real backend with real payments.

---

## 1. Goal

Take CVBase from a client-only prototype (AI key in the browser, simulated billing, spoofable entitlements, localStorage persistence, a broken AI suite returning identical mock data, no backend, no tests, no version control) to a **production-ready, server-backed product** on **Supabase + Stripe**, with **all** advertised features genuinely working — including the items the audit had marked "defer."

This is the realization of `FEATURE_INVENTORY.md §8` plus the §3.8 deferred set, with scope = **everything** per the user's decision.

## 2. Locked decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Scope | **Everything**, including §3.8 deferred features |
| Backend | **Supabase** (Postgres + RLS + Auth + Storage + Edge Functions) — full migration off Firebase |
| Payments | **Stripe** (Checkout + Customer Portal + webhooks) |
| Migration style | **Big-bang cutover** — app is pre-production, no real users/data to preserve; Firebase removed entirely |
| Secrets | User provides real keys into a gitignored `.env.cvbase.local`; server secrets go to Supabase secret store |
| Build order | **W0 → W1 → W2 → W3 (AI) → W4 (billing) → W5 → W6 → W7** (AI backend before billing) |

## 3. Current-state summary (verified against source)

- **No backend, no git.** Web bundle copied into `ios/`/`android/` via Capacitor. (git initialized as part of W0.)
- **AI key in the browser:** `vite.config.ts:14` injects `GEMINI_API_KEY` → `process.env.API_KEY`, read by `services/geminiService.ts` and `services/smartStudioService.ts`.
- **Model bug:** `gemini-3.5-flash` (invalid) at 5 sites (`smartStudioService.ts:57,186,276,379`, `geminiService.ts:396`); valid `gemini-2.5-flash` / `gemini-2.5-flash-image` at 8 sites. The 4 Smart Studio AI functions throw and return **hardcoded mock objects** to all users, including paid Elite.
- **Three overlapping ATS/match implementations:** deterministic `services/atsEngine.ts` (the keeper, ~900 lines, real), `geminiService.checkAtsCompliance` (AI), `smartStudioService.analyzeJobScanMatch` (AI, broken→mock).
- **Billing simulated:** `subscriptionService.ts` — `processCardPayment` (`:343`) approves any Luhn-valid card via `setTimeout`; state in localStorage + best-effort Firestore.
- **Entitlements spoofable:** `firestore.rules:62` lets the owner write `billing/state`; Smart Studio has **no** plan gate (`Dashboard.tsx:787`).
- **Persistence:** Firestore holds only `users/{uid}` profile + `users/{uid}/billing/state`. Resumes, tracker, settings are **localStorage only**.
- **No HTML sanitization:** `dangerouslySetInnerHTML` in **75 component files** (templates + `ResumePreview`) render AI/imported HTML raw.
- **Single resume only** (`cvbase-resume-data`); "Unlimited resumes" unbacked. **No DOCX export.** Stale `dist/` + mobile bundles.

Plans (`subscriptionService.ts` `PLANS`): **Free** ($0), **Pro** ($12/mo or $8/mo billed yearly), **Elite** ($24/mo or $16/mo billed yearly). Metered usage: `atsScans`, `aiActions` (monthly). Entitlement flags: `resumes`, `atsScansPerMonth`, `aiActionsPerMonth`, `templates` (basic/all), `liveAtsRescore`, `smartStudio`, `aiHeadshot`, `prioritySupport`, `watermarkFree`. Promo codes: `CVBASE20` (20%), `LAUNCH50` (50%), `FRIEND10` (10%).

## 4. Target architecture

```
React 19 / Vite 6 / Capacitor 8 client
  • UI shell, 75 templates, resume builder, ATS analyzer — preserved
  • data access via supabase-js repositories (no direct DB elsewhere)
  • all AI + payment calls go to Edge Functions; NO secret keys in the bundle
        │  (anon key + JWT)
        ▼
Supabase
  • Auth: email/password + Google OAuth  (replaces Firebase Auth)
  • Postgres + Row-Level Security:
        profiles, resumes, resume_versions, job_applications,
        subscriptions, usage_counters, ai_logs
  • Storage (private, per-user): headshots
  • Edge Functions (Deno/TS):
        ai-suggest, ai-cover-letter, ai-linkedin, ai-trajectory,
        ai-headshot, ai-parse-pdf, ats-analyze,
        stripe-checkout, stripe-portal, stripe-webhook
        + shared: auth guard, entitlement guard, usage meter, Gemini client,
          output schema-validation + sanitization
        │
        ▼
Stripe (Checkout + Customer Portal + webhooks → writes subscriptions table = source of truth)
Gemini (server-side key, only inside Edge Functions)
```

**Key principles**
- **No secret ever reaches the client bundle.** Client gets only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`.
- **Server is the source of truth** for entitlements, usage, and subscription state. The client UI may *reflect* entitlements for UX but never *grants* them.
- **One ATS engine.** The deterministic engine becomes a shared module consumed by both the client (instant live re-score, no metering) and the `ats-analyze` Edge Function (the metered "scan"). The two AI ATS duplicates are retired.
- **AI outputs are schema-validated, sanitized, anti-hallucination-prompted, prompt-versioned, and logged with safe metadata only** (`ai_logs`: function, model, promptVersion, token estimate, status — never resume content).

## 5. Data model (Postgres + RLS)

All tables key on `user_id uuid` referencing `auth.users(id)`. RLS enabled on every table.

| Table | Columns (essentials) | Client access (RLS) |
|-------|----------------------|---------------------|
| `profiles` | `id`(=auth uid, PK), email, first/last name, phone, job_title, industry, experience_years, bio, care_specialties[], certifications[], availability, licensed_state, linkedin, github, portfolio, timestamps | owner: select/insert/update/delete |
| `resumes` | id, user_id, title, data jsonb, template_id, visible_sections jsonb, is_primary, timestamps | owner: full |
| `resume_versions` | id, resume_id, user_id, label, data jsonb, created_at | owner: select/insert/delete |
| `job_applications` | id, user_id, company, role, status (wishlist/applied/interview/offer/rejected), match_score, url, notes, sort_order, timestamps | owner: full |
| `subscriptions` | user_id (PK), stripe_customer_id, stripe_subscription_id, plan_id (free/pro/elite), cycle, status, current_period_start/end, cancel_at_period_end, timestamps | owner: **select only**; writes **service_role only** |
| `usage_counters` | user_id, month (YYYY-MM), ats_scans, ai_actions, PK(user_id,month) | owner: **select only**; writes **service_role only** |
| `ai_logs` | id, user_id, function, model, prompt_version, token_estimate, status, created_at | **service_role only** (no client read) |

This closes the entitlement-spoofing hole: users can *read* their plan/usage but only Edge Functions (service_role) and Stripe webhooks can *write* them.

**Storage:** bucket `headshots` (private), path `headshots/{uid}/...`, RLS via storage policies on owner prefix.

## 6. Secrets & configuration

- `.env.example` (committed) documents every key. Real values live in `.env.cvbase.local` (gitignored).
- **Client build env** (Vite): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`. `vite.config.ts` stops injecting `GEMINI_API_KEY` (removed).
- **Edge Function secrets** (`supabase secrets set`): `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GEMINI_API_KEY`.
- **Google OAuth** client id/secret configured in the Supabase dashboard Auth provider (not in code).
- Stripe products/prices are created in **test mode** via the API from the `PLANS` catalog (a one-off script), so price IDs map deterministically to plan+cycle.

## 7. Workstreams (build order)

### W0 — Foundations
- `git init` (done) + initial commit; `.gitignore` hardened for secrets.
- Add tooling: TypeScript strict mode, Vitest (client/unit), ESLint/Prettier, `supabase` CLI config (`supabase/config.toml`), Deno config for functions.
- `supabase/` scaffold: `migrations/`, `functions/`, shared `_shared/`.
- GitHub Actions CI scaffold: typecheck + lint + unit tests + build (runs even without a remote; ready when one is added).
- Wire `.env.cvbase.local` → client env + a `scripts/push-secrets.sh` that loads server secrets into Supabase.
**Done when:** repo builds, typechecks, `vitest` runs (even with 0 tests), `supabase` project links.

### W1 — Auth migration (Firebase Auth → Supabase Auth)
- `services/supabase.ts` (client) replaces `services/firebase.ts`.
- New `AuthProvider` (same `useAuth` contract: user, profile, sign in/up email + Google, logout, updateProfile) backed by Supabase Auth + `profiles` table. Profile auto-provision on first sign-in (port `FirebaseProvider` logic).
- `AuthModal.tsx` updated; email verification enabled.
- Remove `firebase` SDK usage from auth path. Provide Supabase Google redirect URL for the user to register in Google Cloud + Supabase dashboard.
**Done when:** sign up / sign in (email + Google) / logout / profile read+write all work against Supabase; no `firebase/auth` imports remain.

### W2 — Data layer (Postgres schema + RLS; move persistence off localStorage)
- Migrations for all tables in §5 + RLS policies + Storage bucket/policies.
- Repositories: `profileRepo`, `resumeRepo`, `trackerRepo`, `billingRepo` (read), `usageRepo` (read) using supabase-js.
- Resume builder reads/writes `resumes` (with a one-time localStorage→Postgres import on first authenticated load). Job tracker reads/writes `job_applications`. Settings/visible-sections move to the resume row.
- `firebase/firestore` usage removed; `firestore.rules` retired (kept in repo history).
**Done when:** resumes + tracker persist server-side, survive logout/login and device switch; RLS verified (a user cannot read another user's rows).

### W3 — AI backend (Edge Functions) — *priority per user*
- Edge Functions for every current client AI call, holding the Gemini key server-side:
  - `ai-suggest` (section suggestions + bullet/summary/skill generators; `geminiService` getAiSuggestionsForSection/analyzeResume/generators) — metered `aiActions`; anti-hallucination + "use placeholder for missing metrics" rule; schema-validated.
  - `ai-cover-letter`, `ai-linkedin`, `ai-trajectory` (Smart Studio) — **fix the model id** (now `gemini-2.5-flash`), real outputs, **delete the mock fallbacks**; disclaimers added.
  - `ai-headshot` (`gemini-2.5-flash-image`) → store to `headshots` bucket.
  - `ai-parse-pdf` (image-PDF fallback).
  - `ats-analyze`: runs the **shared deterministic engine** server-side, increments `ats_scans`; folds in the old `checkAtsCompliance` need. Smart Studio "match" tab routes here — the AI JobScan duplicate is **deleted**.
- Client `services/geminiService.ts` + `smartStudioService.ts` become thin clients calling Edge Functions via `services/api.ts`. Direct `@google/genai` usage removed from client; `vite.config.ts` key injection removed.
- ATS engine extracted to `src/lib/ats/` shared by client (live, unmetered preview) and `ats-analyze` (metered).
**Done when:** all AI features produce real, per-user output via the server; no mock fallback path remains; no AI key in the bundle (grep clean); every AI endpoint enforces auth + entitlement + metering.

### W4 — Billing (Stripe) + server-enforced entitlements
- Create Stripe products/prices from `PLANS` (test mode) via script.
- `stripe-checkout` (create Checkout Session for plan+cycle, with promo support), `stripe-portal` (Customer Portal for invoices/payment methods/cancel/downgrade), `stripe-webhook` (checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid/payment_failed → upsert `subscriptions`).
- `subscriptionService.ts` simulated gateway + client proration logic removed; client billing UI (`PricingPage`, `CheckoutPage`, `BillingDashboard`) re-pointed to Checkout + Portal. `SubscriptionProvider` reads entitlements from `subscriptions` + `usage_counters` (read-only).
- **Entitlement guard** in every gated Edge Function; **add the missing Smart Studio gate**; reconcile the job-tracker free-vs-Elite placement (tracker = Free feature, surfaced outside the Elite-gated Smart Studio shell).
**Done when:** a Stripe test-mode purchase upgrades the plan via webhook (not client), entitlements/usage are enforced server-side and cannot be spoofed, and over-limit calls are rejected with a clear upgrade path.

### W5 — Security hardening
- Central `SafeHtml` component + `sanitizeHtml()` (DOMPurify) applied to **all 75** `dangerouslySetInnerHTML` sites (templates + `ResumePreview`).
- ATS report gains a `disclaimer` field and **anti-keyword-stuffing score caps**; disclaimer surfaced in the Analyzer UI: *"A higher match score can help with ATS screening, but it does not guarantee interviews. Keep your resume truthful, readable, and relevant."*
- RLS audit (cross-user read/write attempts blocked); security headers / CSP for the web build; dependency audit.
**Done when:** sanitization verified on a stored-XSS attempt; ATS disclaimer + caps present and tested; RLS audit passes.

### W6 — Deferred features (now in scope)
- **Multi-resume / version manager:** UI over `resumes` + `resume_versions` (create/duplicate/rename/switch/restore). Honors the per-plan `resumes` limit.
- **DOCX export:** add a docx generator (e.g., `docx`), parallel to PDF export.
- **Career trajectory** (real, via `ai-trajectory`), **AI headshot** (real, Elite, via `ai-headshot` + Storage), **job-tracker cloud sync** (already in Postgres from W2 — verify cross-device).
**Done when:** each deferred feature works end-to-end and is plan-gated correctly.

### W7 — Tests, CI, docs, rebuild
- Unit tests: ATS engine, skill taxonomy, resume parser, entitlement/usage logic, sanitizer. Edge Function tests (Deno). RLS integration tests. Stripe webhook test via Stripe CLI triggers.
- CI green (typecheck, lint, test, build).
- Legal/privacy: Privacy Policy + Terms (AI usage, data handling, no-guarantee disclaimer) as in-app pages.
- Rebuild `dist/` + `npx cap sync` for iOS/Android; verify the deployed bundle matches source ("75+ templates", etc.).
**Done when:** CI is green, docs are published in-app, and fresh web + mobile builds run against the live Supabase/Stripe stack.

## 8. Testing strategy

- **Vitest** for client/shared TS (pure logic first: ATS engine, taxonomy, parser, entitlement math, sanitizer).
- **Deno test** for Edge Functions (mock Gemini/Stripe; assert auth/entitlement/metering branches).
- **RLS tests**: authenticated client attempts cross-user access → expect denial.
- **Stripe**: test-mode keys + Stripe CLI `trigger` for webhook events; assert `subscriptions` upsert.
- TDD applied per workstream where logic is non-trivial (engine, entitlements, webhook reducer).

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Secrets leaking into client bundle | Remove key injection; CI grep asserts no `sk_`, `service_role`, or Gemini key in `dist/` |
| Entitlement spoofing | Plan/usage writable only by service_role; client read-only; enforcement in Edge Functions |
| AI hallucination (fake metrics) | Anti-hallucination prompts + placeholder rule + schema validation + accept/reject UX preserved |
| Stored XSS via AI/imported HTML | DOMPurify on all sinks |
| Big-bang migration breakage | Pre-production (no data); migrate behind tests; keep Firebase code in git history for reference |
| Deno port of deterministic engine | Engine is pure TS with no browser deps → extract to shared module; parser stays client-side (sends text) |

## 10. Out of scope (explicitly not built)

Per `FEATURE_INVENTORY.md §3.8` final line: interview prep, voice AI / TTS-STT, coach marketplace, auto-apply, job-board scraping, B2B dashboards. Live (non-test) Stripe go-live, App Store / Play Store submission, and DNS/hosting are **operator steps** the user performs with the delivered code + checklist.

## 11. Go-live acceptance checklist

- [ ] No secrets in bundle (`dist/` grep clean); Gemini key only in Supabase secrets.
- [ ] Auth (email+Google), profile, resumes, tracker all server-persisted with RLS verified.
- [ ] All AI features return real per-user output server-side; zero mock fallbacks; model ids valid.
- [ ] One ATS engine; Smart Studio match routes to it; disclaimer + anti-stuffing caps present.
- [ ] Stripe test purchase drives plan via webhook; entitlements/usage server-enforced & unspoofable; Smart Studio gated; tracker placement reconciled.
- [ ] Deferred features (version manager, DOCX, trajectory, headshot, tracker sync) working + gated.
- [ ] CI green; privacy/terms in-app; `dist/` + mobile rebuilt against live stack.
