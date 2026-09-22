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
