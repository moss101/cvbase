# Pre-existing modules inside the Career OS shell

22 September 2026 · Local Supabase stack + Vite dev server, QA account `careeros-qa@example.com`, Chromium desktop. Follow-up to the delivery report: every module the legacy dashboard rendered now has a home in the six-space shell, and the enabled cohort is redirected from every legacy dashboard tab (Smart Studio was previously excluded).

| Legacy module | Where it lives now | Verified |
| --- | --- | --- |
| Dashboard home cards (recent document, ATS signal, Smart Studio, design library, current plan) | Today → **Documents & tools** panel (`components/careeros/today/WorkspaceShortcuts.tsx`) reading owned records (most recently edited CV, latest `ats_reports` score) instead of the old localStorage draft/score; each source fails on its own | live + `today.test.tsx` |
| `ResumeManager` (create with plan limit, duplicate, rename, delete, primary guard, server `resume_limit_reached` backstop) | Library → CV cards and "New CV"; logic extracted to `components/resumes/useResumeActions.tsx`, which `ResumeManager` now uses too | live (duplicate → rename → primary guard toast → delete, real DB rows) + `library.test.tsx` |
| `SmartStudio` (ATS match, LinkedIn, cover letter, job pipeline, trajectory) | Library → `/app/library/studio?tool=…`; `/app/smart-studio` redirects there; prefilled from the primary CV; the pipeline explains its jobs are the same records as Applications | live + `library.test.tsx`, `navigationRoutes.test.ts` |
| `UserProfileForm` | Career → Profile | (earlier) |
| `AtsAnalyzer`, `PrismWizard`, template gallery | Library → `/ats`, `/tailor`, `/templates` | (earlier) |
| `SettingsPanel`, `BillingDashboard`, `AdminPanel` | `/app/settings`, `/app/billing`, `/app/admin` | (earlier) |
| `ResourcesPage` | Sidebar/More "Career resources" → `/resources` (previously pointed at the Library by mistake) | live + `shell.test.ts` |
| Builder, AI assist, ATS modal, version history, JSON backup, headshot generator | Library → CV editor (`ResumeBuilder` unchanged); JSON backup in Settings | (earlier) |

## Defects found and fixed in this pass

* **Any toast crashed the whole app** (pre-existing on `main` since b39feed): `ToastProvider` wrapped `TranslationProvider`, but toast items call `useTranslation()`. Provider order swapped in `App.tsx`; verified live with the primary-CV guard toast and the delete toast.
* Library "New CV" opened the primary CV (legacy `/builder` behaviour) instead of creating one → now creates an untitled CV with the plan limit, as the old resume manager did.
* Live rule actions kept the wording they were first stored with, so the interview-time formatting fix never reached existing rows → `upsertByDedupeKey` refreshes title/reason/evidence labels on live (READY/PROPOSED) rows only; finished rows are history and untouched (`repos.queue.test.ts`). Verified live: "Interview recorded for 25 Sept 2026, 10:30 (Europe/Berlin)".
* Smart Studio pipeline notice button was squeezed by its text → fixed width.

## CV builder and PRISM (follow-up, same day)

Both pre-date the Career OS and run unchanged inside it:

* **CV builder (`ResumeBuilder`)** opens full-screen for `/app/library/cvs/:id/edit` (Library "Open in editor", Today "Recent document", an application's CV tab) and `/app/library/cvs/new`; legacy `/builder` and `/builder/:id` still work. It opens the exact CV id asked for (never the primary as a substitute), autosaves with revision checks, and its back control returns to where it was opened from. Live: opened an application's linked CV from the application, edited the target job title, autosave wrote revision 3 of that CV only (primary unchanged), back returned to the application's CV tab.
* **PRISM** runs standalone at `/app/library/tailor` (`/app/prism` redirects there; the full wizard renders) and bound to an application from its CV tab (bound runs, idempotent start, charge/release — see COS-013). Live: redirect and wizard render checked.

### Gap found and fixed: builder CVs could not be used for an application without PRISM

The application's CV tab said "open a CV in the Library and link it here from the editor" and readiness said "link a CV manually", but no linking existed — a successful PRISM run was the only way to attach a CV, so free-plan users, the flag-off cohort and anyone without an AI provider could never use a CV made in the builder. The CV tab now has **Use a saved CV**:

* **Use a copy** (default): creates a non-primary copy tied to the application (`resumes.application_id`, `origin {kind:'manual', source:'application_copy', sourceResumeId, sourceRevision}`) and sets `job_applications.current_resume_id`; edits for this application stay out of the original. The plan's resume limit applies (upgrade prompt, nothing half-linked).
* **Link as-is**: points the application at the saved CV itself.
* Available after submission as well; the submission snapshot is never changed. Event `application_cv_linked {mode, replaced}` (ids only).

Live: on the QA account's Northwind application (PRISM run had failed, no CV) "Use a copy" created "Quinn — primary · Northwind Traders" linked both ways, readiness moved from "blocked" to "Complete: Application CV", primary untouched. Tests: `application.test.tsx` (copy, as-is, limit), `careerEvents.test.ts`.

Noted, not changed: the builder sidebar's back control is a clickable `div`, so it is not reachable by keyboard (pre-existing; the header and mobile top bar back buttons are real buttons).

## Found while capturing the frontend overview (23 September)

* **Opening a CV in the builder saved a new revision** with byte-identical content. The unchanged-content guard compared `JSON.stringify` output, which depends on key order; the editor re-spreads objects after loading and Postgres `jsonb` reorders keys, so identical content looked changed. Revision bumps from a mere open make PRISM source checks, submission snapshots and "facts changed" reviews look out of date. `main` had no guard at all (always saved on open). Fix: `stableStringify` (sorted keys, array order kept) in `lib/builder/persistenceLogic.ts`, with a test. Live: reopening a CV left its revision unchanged; a real edit still saved (revision +1).
* **Phone layouts overflowed sideways.** Responsive grids had no base column template, so on phones the single implicit column grew to the widest truncated line (the new Today "Documents & tools" panel pushed Today to 580 px on a 375 px screen; the fit breakdown's cited-fact chips pushed the opportunity page 130–200 px wide). Fix: `grid-cols-1` (minmax(0,1fr)) on every responsive grid in `components/careeros` (17 files) and wrapping cited-fact labels. Sweep of 16 screens at 390 px and 320 px with headless Chrome: no page scrolls sideways (the only wide element left on Career, Settings and Goals is their intentionally scrollable tab strip). The earlier COS-032 "no overflow" result predates the Documents & tools panel.
