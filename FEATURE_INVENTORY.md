# CVBase — Feature Inventory (Pre-Production Audit)

> Historical June audit. Several findings below have since changed, including Supabase persistence and server-side AI. Use [CURRENT_PRODUCT_MAP.md](docs/career-os/CURRENT_PRODUCT_MAP.md) for the September 2026 source audit and [tasks.md](tasks.md) for Career OS implementation. Retained for history, not current implementation authority.

**Date:** 2026-06-21
**Scope:** Complete inventory of existing resume / ATS / job-matching / career features **before** any architecture, backend, billing, or AI changes.
**Method:** Read-only static inspection of the actual source (no code was changed). Every claim below is backed by a `file:line` reference. Features were verified by reading the implementation, **not** assumed from UI presence.
**Guiding rule:** These Jobscan-style features are existing product scope. They must be **preserved and hardened**, not removed or silently simplified, during production work.

---

## 0. TL;DR — what is actually real

- ✅ **The crown jewel is real:** `services/atsEngine.ts` is a genuine **deterministic, client-side** ATS + job-description match engine (~900 lines, no AI, no network). It produces keyword match, skill gaps, role fit, section feedback, format checks, and recommendations. **Keep this.**
- ⚠️ **A second, AI-based "JobScan" suite exists in parallel** (`services/smartStudioService.ts`) and is **currently broken**: all 4 of its AI functions call model **`gemini-3.5-flash`, which does not exist**, so every call throws and returns **hardcoded mock data**. Users (including paid Elite) see identical canned "Drizzle ORM / KPI Dashboard" results regardless of their resume.
- 🔴 **Billing is fully simulated** and **entitlements are nominal only** — even the client-side gate is missing on Smart Studio.
- 🔴 **No backend exists.** The Gemini API key is shipped in the browser bundle.
- ⚠️ **Persistence is localStorage-only** for everything except the user profile + billing doc. Resumes, job tracker, and settings are **not** cloud-saved; they don't sync across devices and are lost if storage is cleared.

---

## 1. Classification legend

| Tag | Meaning |
|-----|---------|
| `REAL` | Genuinely implemented and functional |
| `AI` | Depends on a live Gemini call (client-side key today) |
| `MOCK` | Returns hardcoded/simulated data |
| `BROKEN` | Wired up but non-functional as written |
| `CLIENT-ONLY` | Runs entirely in the browser; no server enforcement |
| `LOCALSTORAGE` | Persisted only in browser localStorage |
| `STALE` | Built artifact lags current source |

---

## 2. Master inventory

| # | Feature | Files (evidence) | Status | Persistence | Launch decision |
|---|---------|------------------|--------|-------------|-----------------|
| 1 | Resume builder + 16 section forms | `components/ResumeBuilder.tsx`, `components/forms/*` | `REAL` `CLIENT-ONLY` | `LOCALSTORAGE` (`cvbase-resume-data`) | **Preserve** + add cloud save |
| 2 | 75 resume templates | `components/templates/*` (75 files) | `REAL` `CLIENT-ONLY` | n/a | **Preserve** + server entitlement |
| 3 | Deterministic ATS + JD match engine | `services/atsEngine.ts`, `services/skillTaxonomy.ts`, `services/resumeParser.ts` | `REAL` `CLIENT-ONLY` | n/a | **Preserve (core)** |
| 4 | ATS Analyzer UI (uses #3) | `components/ats/AtsAnalyzer.tsx` | `REAL` | reads `cvbase-resume-data` | **Preserve** |
| 5 | AI ATS-compliance check | `services/geminiService.ts:152` `checkAtsCompliance` → `AtsChecker.tsx`, `common/AtsCompatibilityPanel.tsx` | `AI` (valid `gemini-2.5-flash`) | n/a | Preserve → backend (or fold into #3) |
| 6 | AI JobScan match (Smart Studio) | `services/smartStudioService.ts:53` → `SmartStudio.tsx` | `AI` **`BROKEN`→`MOCK`** (`gemini-3.5-flash`) | n/a | **Fix or hide before launch** |
| 7 | AI Cover Letter generator | `services/smartStudioService.ts:272` | `AI` **`BROKEN`→`MOCK`** | n/a | Fix + backend, then preserve |
| 8 | AI LinkedIn optimizer | `services/smartStudioService.ts:183` | `AI` **`BROKEN`→`MOCK`** | n/a | Fix + backend, then preserve |
| 9 | AI Career Trajectory analyzer | `services/smartStudioService.ts:376` | `AI` **`BROKEN`→`MOCK`** | n/a | Defer (beyond core scope) |
| 10 | AI per-field tips | `services/geminiService.ts:395` `generateFieldTip` | `AI` **`BROKEN`** (`gemini-3.5-flash` → generic fallback) | n/a | Fix model + backend |
| 11 | AI section suggestions (summary/exp/skills) | `geminiService.ts` `getAiSuggestionsForSection`, `analyzeResume` → `AIActionModal.tsx`, `AIAssist.tsx` | `AI` (valid 2.5-flash) | n/a | **Preserve** → backend |
| 12 | AI bullet / summary / skill generators | `geminiService.ts:289/326/362` | `AI` (valid 2.5-flash) | n/a | **Preserve** → backend |
| 13 | AI professional headshot | `geminiService.ts:239` (`gemini-2.5-flash-image`) | `AI` `REAL` | n/a | Defer/Preserve (Elite) → backend |
| 14 | Resume import & parsing (PDF/DOCX/TXT/MD) | `services/resumeParser.ts` (pdfjs-dist + mammoth) | `REAL` `CLIENT-ONLY` | n/a | **Preserve** |
| 15 | AI PDF text extraction (fallback for image PDFs) | `services/smartStudioService.ts:537` (valid 2.5-flash) | `AI` `REAL` | n/a | Preserve → backend |
| 16 | PDF export | `components/forms/FinalizeForm.tsx`, `ResumeBuilder.tsx`, `common/PDFQualityModal.tsx` (browser print + html2pdf CDN) | `REAL` `CLIENT-ONLY` | n/a | **Preserve** |
| 17 | DOCX export | — | **NOT IMPLEMENTED** (`mammoth` is import-only; no docx-gen lib) | n/a | Defer (don't block) |
| 18 | JSON backup / restore | `components/common/JSONBackupModal.tsx` | `REAL` `CLIENT-ONLY` | file download | **Preserve** (safety net) |
| 19 | Job / application tracker (Kanban) | `SmartStudio.tsx:1055` (load `:212`, save `:226`) | `REAL` `CLIENT-ONLY` | `LOCALSTORAGE` (`smart-studio-jobs-v1`) | Preserve → Firestore (low priority) |
| 20 | Multiple resume versions / version manager | — | **NOT IMPLEMENTED** (single `cvbase-resume-data` key; "Unlimited resumes" is unbacked) | n/a | Defer / build later |
| 21 | i18n (EN/ES/FR/DE) | `services/translationService.tsx` | `REAL` `CLIENT-ONLY` (static dictionaries) | `cvbase-language` | **Preserve** |
| 22 | Auth (email/password + Google) | `components/FirebaseProvider.tsx` | `REAL` | Firestore `users/{uid}` | **Preserve** + email verification |
| 23 | Subscription billing & checkout | `services/subscriptionService.ts`, `components/billing/*` | **`MOCK` / simulated gateway** | `LOCALSTORAGE` + user-writable Firestore | **Replace with real PSP** |
| 24 | Usage limits / entitlements | `subscriptionService.ts:492+`, `SubscriptionProvider.tsx` | `CLIENT-ONLY`, spoofable; **partly unenforced** | `LOCALSTORAGE` | **Move server-side** |
| 25 | Landing / marketing site | `components/landing/*` | `REAL` | n/a | Preserve |
| 26 | Resources / guides page | `components/ResourcesPage.tsx` | `REAL` | `cvbase-resources-checklist` | Preserve |

---

## 3. The eight required buckets

### 3.1 Existing implemented features (real)
- Resume builder + all 16 forms (#1)
- 75 templates (#2)
- **Deterministic ATS + JD match engine** (#3) and its Analyzer UI (#4)
- Resume import/parse PDF/DOCX/TXT/MD (#14)
- PDF export (#16), JSON backup/restore (#18)
- Job/application Kanban tracker (#19)
- i18n EN/ES/FR/DE (#21)
- Auth email + Google (#22)
- AI section/bullet/summary/skill suggestions + headshot + AI-PDF parse (#11, #12, #13, #15) — real *when the key is set*, valid models

### 3.2 Partially implemented features
- **Entitlements / usage limits (#24):** logic exists (`recordUsage`, `usageRemaining`) but enforcement is client-side and incomplete — Smart Studio renders with **no** plan gate (`Dashboard.tsx:787`); `AtsAnalyzer` has an `onUpgrade` gate (`Dashboard.tsx:794`).
- **Cloud sync:** only the profile (`users/{uid}`) and billing doc sync; resumes/tracker/settings do **not**.
- **"Unlimited resumes" (#20):** advertised in `PLANS`, but only a single resume is stored. No version manager.

### 3.3 Demo / simulated features
- **Billing/payments (#23):** `subscriptionService.ts:332` "Simulated payment gateway"; `processCardPayment` (`:343`) is a `setTimeout` approving any Luhn-valid card; auto-renewal simulated (`:290`).
- **Smart Studio AI suite mock fallbacks (#6–#9):** large hardcoded result objects (`smartStudioService.ts:160, 251, 333, 469`) currently returned **on every call** (see 3.4).

### 3.4 Broken / non-functional features
- **`gemini-3.5-flash` is not a real model.** It is used in **5 places**, all of which fail and fall back:
  - `smartStudioService.ts:57` JobScan match → **mock** (`:160`)
  - `smartStudioService.ts:186` LinkedIn → **mock** (`:251`)
  - `smartStudioService.ts:276` Cover letter → **mock** (`:333`)
  - `smartStudioService.ts:379` Career trajectory → **mock** (`:469`)
  - `geminiService.ts:396` field tips → generic fallback string (`:414`)
  - **Effect:** the entire Smart Studio AI experience shows **identical canned data to all users**, including paid Elite. This is the single most misleading gap to fix or hide before charging anyone.
- **Stale build artifacts (`STALE`):** `dist/` and the iOS/Android bundles predate current source (e.g., `dist/index.html` says "40+ templates"; source says "75+"). Whatever is deployed ≠ current code.

### 3.5 Features that depend on client-side AI (key currently shipped to browser)
All call Gemini directly from the browser via `process.env.API_KEY` (baked in at build by `vite.config.ts:14`):
- `geminiService.ts`: section suggestions, `analyzeResume`, `checkAtsCompliance`, bullet/summary/skill generators, headshot, field tips (#5, #10, #11, #12, #13)
- `smartStudioService.ts`: JobScan match, LinkedIn, cover letter, trajectory, AI-PDF parse (#6, #7, #8, #9, #15)

### 3.6 Features that require backend migration
Every item in 3.5 must move server-side (proxy the key, validate output, meter usage). Plus:
- Billing → real PSP webhooks + server-written subscription state (#23)
- Entitlements/usage counters → server-enforced source of truth (#24)
- Resume + tracker persistence → Firestore (so they survive and sync) (#1, #19, #20)

### 3.7 Features to preserve for launch (MVP scope)
Resume builder (#1), templates (#2), **deterministic ATS/JD match (#3/#4)**, AI resume assistant (#5/#11/#12, hardened to backend), resume import (#14), PDF export (#16), JSON backup (#18), i18n (#21), auth (#22), billing (#23, rebuilt real), cover letter (#7) + LinkedIn (#8) once fixed.

### 3.8 Features to defer (do not block launch)
Career trajectory navigator (#9), AI headshot (#13), DOCX export (#17), resume version manager (#20), job tracker cloud-sync (#19 stays localStorage for MVP). Out of scope entirely: interview prep, voice AI / TTS-STT, coach marketplace, auto-apply, job-board scraping, B2B dashboards.

---

## 4. Detailed feature cards (Jobscan-style modules)

### Feature: Resume ↔ Job-Description Match (CORE)
**Status:** Implemented, **REAL**, deterministic, client-side — **the keeper.**
**Files:** `services/atsEngine.ts` (`analyzeJobDescription:106`, `runAtsAnalysis:435`, `runFullAnalysis:919`), `services/skillTaxonomy.ts`, `services/resumeParser.ts`; UI `components/ats/AtsAnalyzer.tsx`.
**Current behavior:** Parses a JD into weighted keywords + seniority + years + education; parses the resume; returns an `AtsReport` (`atsEngine.ts:310`) with: `atsScore` + dimensions, `matchScore` + dimensions, matched/missing keywords, skill-gap groups (hard/soft), section feedback, pass/warn/fail format checks, prioritized recommendations with impact, and `roleFit` (title/seniority/years/education/competitiveness).
**Coverage vs requested fields:** ✅ overall match, keyword match, missing keywords, hard/soft skills, job-title alignment, education, experience, formatting warnings, recommended edits. ⚠️ Missing an explicit truthfulness **disclaimer** field and an "ATS readability" note bucket (easy adds).
**Production risk:** Usage must be server-metered if gated; report has no anti-keyword-stuffing disclaimer yet.
**Required changes:** (a) make this the single match engine (retire the two duplicates); (b) add `disclaimer` + score-cap rules; (c) server-side usage counting; (d) tests.

### Feature: AI JobScan Match (Smart Studio)
**Status:** **BROKEN → returns MOCK to everyone.**
**Files:** `services/smartStudioService.ts:53`; UI `SmartStudio.tsx` (match tab).
**Current behavior:** Calls `gemini-3.5-flash` (invalid) → always throws → returns hardcoded result (`:160`).
**Production risk:** Ships fake, identical "personalized" analysis to paying users; reputational + refund risk.
**Launch decision:** Either **(A)** delete this and route the Smart Studio "match" tab to the real deterministic engine (#3), or **(B)** fix the model id, move the call to a backend endpoint, and schema-validate. **(A) is lower-risk and avoids a duplicate.**

### Feature: AI Resume Optimizer (bullet rewriting / suggestions)
**Status:** **REAL** (valid model) but client-side; user-reviewed before applying.
**Files:** `geminiService.ts` (`getAiSuggestionsForSection:25`, `analyzeResume:126`); UI `AIActionModal.tsx` (`onApplySuggestions:42`), `common/ImprovementModal.tsx` (`onApplySuggestion:44`).
**Good:** suggestions are **accept/reject**, never auto-inserted — matches the "manual apply" requirement.
**Risk:** can fabricate metrics (e.g., mock bullet "reduced bottlenecks by 18%"); no "use placeholder for missing metrics" guard.
**Required changes:** move AI call to backend; add anti-hallucination prompt + placeholder rule; schema-validate; server-meter `aiActions`.

### Feature: Cover Letter Generator
**Status:** Present, **BROKEN → MOCK** (`smartStudioService.ts:272`, invalid model → `:333`).
**Required changes:** fix model, move to backend, keep the user-edit step, add "no guaranteed success" disclaimer. Preserve.

### Feature: LinkedIn Optimizer
**Status:** Present, **BROKEN → MOCK** (`smartStudioService.ts:183`, invalid model → `:251`).
**Required changes:** fix model, move to backend, add resume↔profile consistency check, avoid unsupported claims. Preserve.

### Feature: Application / Job Tracker
**Status:** **REAL**, client-only Kanban.
**Files:** `SmartStudio.tsx:1055` (board), load `:212` / save `:226`, key `smart-studio-jobs-v1`; columns wishlist/applied/interview/offer/rejected; add/move/delete cards with a per-card match-score tag.
**Risk:** localStorage-only (no sync, no backup, no security); **entitlement inconsistency** — "Job application tracker" is listed as a **Free** feature in `PLANS`, but the tracker lives inside the (nominally Elite) Smart Studio, which currently has no gate at all.
**Launch decision:** Preserve; not a blocker. Move to Firestore + rules when convenient; reconcile the free-vs-Elite placement.

### Feature: Version Manager / Multiple Resumes
**Status:** **NOT IMPLEMENTED.** Single resume in `cvbase-resume-data`. "Unlimited resumes" (`subscriptionService.ts:62`) is unbacked.
**Launch decision:** Defer, or build a minimal multi-resume store before advertising the Pro benefit.

### Feature: Export (PDF / DOCX)
**Status:** PDF **REAL** (browser print + html2pdf). DOCX **NOT IMPLEMENTED** (`mammoth` is docx→html *import* only).
**Launch decision:** Preserve PDF; defer DOCX.

---

## 5. Cross-cutting architecture truths

1. **No backend.** Only the web bundle, copied into `ios/` and `android/`. There is nowhere to safely hold the AI key, validate payments, or enforce entitlements.
2. **AI key in the browser.** `vite.config.ts:14` injects `GEMINI_API_KEY` → `process.env.API_KEY`, read client-side by `geminiService.ts:5` and `smartStudioService.ts:5`. Extractable from the bundle.
3. **Three overlapping ATS/match implementations** — consolidate onto the deterministic one (#3):
   - `atsEngine` (deterministic, real) → `AtsAnalyzer`
   - `geminiService.checkAtsCompliance` (AI, valid model) → `AtsChecker`, `AtsCompatibilityPanel`
   - `smartStudioService.analyzeJobScanMatch` (AI, broken→mock) → `SmartStudio`
4. **Model-id bug:** `gemini-3.5-flash` (5 call sites) is invalid; `gemini-2.5-flash` / `gemini-2.5-flash-image` (8 sites) are valid.
5. **Persistence map:** Firestore = `users/{uid}` profile + `users/{uid}/billing/state` only (`firestore.rules`). Everything else is localStorage: `cvbase-resume-data`, `cvbase-selected-template`, `cvbase-visible-sections`, `cvbase-settings`, `cvbase-last-ats-score`, `cvbase-language`, `cvbase-active-section`, `cvbase-resources-checklist`, `smart-studio-jobs-v1`, `cvbase-billing-v1:<uid>`. No `resumes` collection exists.
6. **Entitlements spoofable & partly unenforced:** billing state is user-writable in both localStorage and Firestore (`firestore.rules` allows owner write to `billing/state`); Smart Studio has no UI gate.
7. **No HTML sanitization** on `dangerouslySetInnerHTML` (75 templates + `ResumePreview`) — AI/imported HTML rendered raw.

---

## 6. Backend migration map (existing client AI → server endpoint)

| Existing client function | Proposed backend service | Notes |
|--------------------------|--------------------------|-------|
| `atsEngine.runFullAnalysis` (deterministic) | `functions/.../scoreResumeHealth` + `analyzeResumeAgainstJob` (can stay deterministic server-side) | Move for usage metering; logic already solid |
| `geminiService.checkAtsCompliance` | fold into `analyzeResumeAgainstJob` | Dedupe with deterministic engine |
| `smartStudioService.analyzeJobScanMatch` | `analyzeResumeAgainstJob` | Retire mock; fix model |
| `geminiService.getAiSuggestionsForSection` / `analyzeResume` | `optimizeResumeBullets` | Add placeholder/anti-hallucination rules |
| `smartStudioService.optimizeCoverLetter` | `generateCoverLetter` | |
| `smartStudioService.optimizeLinkedInProfile` | `generateLinkedInSuggestions` | |
| `smartStudioService.parsePdfFileWithAi` | `extractJobRequirements` / PDF parse endpoint | |
| `geminiService.generateProfessionalHeadshot` | image endpoint (defer) | Elite only |

All backend AI outputs should be **schema-validated, sanitized, non-hallucinatory, prompt-versioned, and logged with safe metadata only** (matching the target `ATSReport` schema, including a `disclaimer`, `promptVersion`, `model`, `generatedAt`).

---

## 7. Launch decision matrix

| Decision | Features |
|----------|----------|
| **Must preserve for launch** | Resume builder (#1), templates (#2), **deterministic ATS/JD match (#3/#4)**, AI resume suggestions (#5/#11/#12 → backend), resume import (#14), PDF export (#16), JSON backup (#18), i18n (#21), auth (#22) |
| **Ship as production-hardened MVP** | Billing (#23 → real PSP), entitlements (#24 → server), cover letter (#7) & LinkedIn (#8) once model fixed + backend |
| **Defer after launch** | Career trajectory (#9), AI headshot (#13), DOCX export (#17), version manager (#20), tracker cloud-sync (#19) |
| **Remove or hide because fake/broken** | Smart Studio AI tabs while they return mock (#6–#9) — hide or route to the real engine until backed by a working backend |

---

## 8. Required-changes summary (no code changed yet)

- [ ] Stand up a backend; move **all** AI calls server-side; stop shipping the key.
- [ ] Fix the `gemini-3.5-flash` model id (or remove those duplicate features).
- [ ] Consolidate to the **one** deterministic ATS engine; retire the two duplicates.
- [ ] Replace the simulated payment gateway with a real PSP; write subscription state **server-side**; lock down `billing/state` in `firestore.rules`.
- [ ] Enforce usage limits and plan gates server-side; add the missing Smart Studio gate; reconcile the tracker's free-vs-Elite placement.
- [ ] Persist resumes (and ideally the tracker) to Firestore with owner-scoped rules; add a real multi-resume/version store before advertising "Unlimited resumes."
- [ ] Add output sanitization (DOMPurify) around all `dangerouslySetInnerHTML`.
- [ ] Add an ATS-report **disclaimer** + anti-keyword-stuffing score rules: *"A higher match score can help with ATS screening, but it does not guarantee interviews. Keep your resume truthful, readable, and relevant."*
- [ ] Add tests, CI, version control, and legal/privacy docs (separate production-readiness track).
- [ ] Rebuild `dist/` + mobile bundles (currently stale).

---

## 9. Audit note

This document was produced **read-only**. No source files, build artifacts, configuration, or features were changed, removed, or simplified. The backend-migration and hardening steps above are **proposals for the next phase** — they have not been started. The Jobscan-style feature set is documented here precisely so it can be **preserved and hardened**, per the stated objective.
