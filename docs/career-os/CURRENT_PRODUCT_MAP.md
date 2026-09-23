# Current product map

Audit date: 20 September 2026. Baseline commit: `9d629cfe64d4ad4bec895f82dae1b100c55d8f32` (4 September). Scope: tracked application source, schemas, tests, CI and repository documentation. No production data, secrets, deployed schemas or live AI calls were inspected. The working tree was initially clean.

`EXISTS` means source implementation found; `PARTIAL` means only part of the target behavior exists; `NOT_FOUND` means no implementation found in the inspected routes/models/services; `UNKNOWN` means runtime evidence is unavailable. None means production qualification.

## Stack and boundaries

React 19 + TypeScript + Vite 6; Tailwind 3 with generated CSS variables; Supabase Auth/Postgres/Storage/Edge Functions; Deno server code; provider routing for text AI and specialized Gemini media calls; Capacitor 8 Android/iOS; Vitest, Deno tests, repository smoke scripts and GitHub Actions. Versions describe package manifests, not an upgrade recommendation.

Root files: [App.tsx](../../App.tsx), [package.json](../../package.json), [types.ts](../../types.ts), [vite.config.ts](../../vite.config.ts). There are 74 `*Template.tsx` component files, 20 SQL migrations and 15 deployed-function entrypoint directories in source. Runtime deployment status is UNKNOWN.

## Evidence → finding → implementation path

| Evidence | Finding | Consequence / path |
| --- | --- | --- |
| [NavigationProvider](../../components/NavigationProvider.tsx), `Route`, `routeToPath`, `pathToRoute` | Seven view kinds; ten dashboard tabs; URL parser accepts at most two path segments | Extend current route contract and tests; do not add a parallel router by default |
| [Dashboard](../../components/Dashboard.tsx), [DashboardMobile](../../components/mobile/DashboardMobile.tsx) | Desktop and mobile compose feature tabs separately | Shared space descriptors and data composition before broad screen migration |
| [SmartStudio](../../components/SmartStudio.tsx), `activeSubTab` | Match, LinkedIn, cover, tracker and trajectory are local tabs; inputs/results mostly component state | Extract reusable panels and persistence boundaries, then place them in context |
| [profileMapping](../../services/profileMapping.ts), [MasterProfileSyncCard](../../components/builder/MasterProfileSyncCard.tsx) | Profile stores summary/contact/skills-like fields; document contains experiences; one-way copy merges selected fields | Career ownership is a real gap; profile is not a complete career record |
| [mappers](../../services/repos/mappers.ts), [usePersistence](../../lib/builder/usePersistence.ts) | `StoredResume` omits `updatedAt`; conflict path depends on it; missing requested document falls back to primary | Surface versions and return explicit unavailable document state before context-driven editing |
| [usePersistence](../../lib/builder/usePersistence.ts), [ResumeBuilder](../../components/ResumeBuilder.tsx) | Shared device keys `cvbase-resume-data`, settings, sections and template | Account/document scoped caches, explicit anonymous import and account-switch fixtures |
| [SmartStudio](../../components/SmartStudio.tsx), tracker load/save | Empty cloud imports local rows using new random IDs; full-array writes can partially fail; default anonymous examples exist | Durable import mapping and per-record recovery; keep demo data out of migration and action metrics |
| [PRISM graph](../../supabase/functions/prism-tailor/graph.ts), [PRISM endpoint](../../supabase/functions/prism-tailor/index.ts) | Real staged LangGraph workflow, grounding, capped writer passes, checkpoint hooks, NDJSON | Reuse pipeline; inspect checkpoint write failures, charging and idempotent finalize before Coach execution |
| [prismRepo](../../services/repos/prismRepo.ts), `getResumable` | Resume lookup selects latest user run, without application context | Add scoped run association; never resume another application's run |
| [types](../../types.ts), [data migration](../../supabase/migrations/20260622042125_data_layer.sql) | `job_applications` stores five statuses but no opportunity/campaign/document FK | Extend this table; preserve all IDs and historical status values |
| [ATS compatibility exports](../../services/atsEngine.ts), [shared ATS](../../lib/ats/atsEngine.ts) | Services re-export shared runtime-neutral implementation | Similar filenames are compatibility aliases, not duplicate engines to rewrite |
| [monitoring](../../lib/monitoring.ts) | Optional Sentry errors only; tracing disabled | Add product events and performance measurements deliberately |
| [FEATURE_INVENTORY](../../FEATURE_INVENTORY.md), [current Smart Studio service](../../services/smartStudioService.ts) | June inventory still describes Firebase/client mocks/local-only persistence; current code uses Supabase/server calls | Historical notes must not drive new migration decisions |

## Capabilities and screen inventory

| Capability / screen | State | Existing owner / entry point | Career OS disposition |
| --- | --- | --- | --- |
| Landing, pricing, legal | EXISTS | `LandingPage`, `components/landing/*`, `PricingPage`, `LegalPage` | Preserve public routes |
| Authentication, auth modal, account profile | EXISTS | `AuthProvider`, `AuthGate`, `AuthModal`, `UserProfileForm` | Preserve identity; integrate continuation and Career profile |
| Dashboard desktop/mobile | EXISTS | `Dashboard`, `DashboardMobile` | Recompose into Today and shared shell |
| Multiple resumes and template gallery | EXISTS | `ResumeManager`, Dashboard templates, template registry | Library; gallery remains CV creation entry |
| CV editing/preview/export/history | EXISTS | `ResumeBuilder`, `ResumePreview`, `lib/builder/*`, `lib/export/*`, `versionRepo` | Reuse in Library/application workspace |
| ATS report and compliance modal | EXISTS | `ats/AtsAnalyzer`, `AtsChecker`, `AIAssist`, `lib/ats/*` | Preserve engine; map report/inline UX separately |
| Match/LinkedIn/cover optimization | EXISTS; transient outputs | `SmartStudio`, `smartStudioService`, Edge functions | Persist and attach to application |
| Trajectory analysis | EXISTS; single response | `ai-trajectory`, Smart Studio | Career/Coach evidence source, not a complete Coach |
| Tracker | EXISTS; limited relational model | `trackerRepo`, Smart Studio board | Campaign/application foundation |
| Tailoring | EXISTS; feature gated | `PrismWizard`, `prismService`, `prismRepo`, `prism-tailor` | Application action and resumable run |
| Resources/articles | EXISTS | `ResourcesPage`, `components/articles/*`, `lib/articles/*`, `articles` | Keep public resources; cross-link from contextual learning |
| Settings/themes/language | EXISTS; device preferences | `SettingsPanel`, `ThemeProvider`, `translationService` | Preserve and migrate keys deliberately |
| Billing/usage | EXISTS | `SubscriptionProvider`, billingRepo, usageRepo, Stripe functions | Reuse entitlements and limits |
| Admin/health/ops | EXISTS; production status UNKNOWN | `components/admin/*`, adminApi, admin/health functions | Keep restricted surfaces outside career navigation |
| Goals/campaign objects | NOT_FOUND | No first-class types, tables or repositories found | New bounded extensions |
| Saved opportunity/discovery feed | PARTIAL | JD input, job URL and wishlist row only | Canonical opportunity + import first; feeds later |
| Interview workflow | NOT_FOUND | Tracker `interview` status and resource articles only | New session/prepare/outcome model |
| Conversational Coach | NOT_FOUND | AI assistance and trajectory prompts, no conversation storage/UI | New conversation/action interface on existing AI stack |
| Recommendations/unified activity | NOT_FOUND | Dashboard local signals; operational logs | Shared action and domain-event projections |
| Global search/notifications/connectors | NOT_FOUND for Career OS | Gallery/content filtering; ops alerts are operator-only | Scoped search/inbox; optional approved integrations later |

The [IA ledger](CAREER_OS_INFORMATION_ARCHITECTURE.md) enumerates every discovered route, all Smart Studio subviews, and non-route entry points. Conditional or hidden routes are included.

## State and data inventory

Providers: Auth, Subscription, Theme, Translation, Navigation, Toast. Feature state: React local state in Dashboard, Smart Studio, ResumeBuilder and PrismWizard. Browser history and native back handlers are centralized in NavigationProvider; native overlay interception and safe areas are valuable existing behavior. There is no general query-cache or CareerContext implementation found.

User-owned persistence: `profiles`, `resumes`, `resume_versions`, `job_applications`, `prism_runs`, `prism_line_flags`, `ats_reports`, `headshots` plus private headshot objects. User-associated operational data: subscriptions, usage counters, AI logs and rate-limit records. Other schema: `feature_flags`, `prism_agent_logs`, `ops_alerts`, `articles`, `admin_audit_log`, `llm_providers`, `llm_call_logs`, `stripe_events`, `llm_response_cache`, `llm_key_health`. Ownership and access differ; do not expose operational rows as a career timeline.

Known device keys: builder data/settings/sections/template/active section and last-synced markers; `smart-studio-jobs-v1`; last ATS score; theme, reduced motion, text scale and language. A complete old-key and native Preferences audit is required before deletion of any cache.

Background tasks found: PRISM alert scan, PRISM run pruning and ops log pruning in `20260901400000_ops_scheduling.sql`. These do not establish a user reminder scheduler. Deployed cron health, storage contents, customer record volume and applied migrations are UNKNOWN.

## API and integration inventory

The client [api.ts](../../services/api.ts) provides authenticated POST `callFn` and NDJSON `streamFn`. Direct repositories use Supabase with RLS. Function paths are `/functions/v1/<name>`.

| Endpoint group | Names | Reuse boundary |
| --- | --- | --- |
| Text AI | `ai-suggest`, `ai-linkedin`, `ai-cover-letter`, `ai-trajectory` | Reuse handler/auth/validation/rate-limit/entitlement/provider routing |
| Parsing/media | `ai-parse-pdf`, `ai-headshot` | Existing import/media paths; retain private storage |
| Analysis/execution | `ats-analyze`, `prism-tailor` | ATS algorithm and staged specialist workflow |
| Billing | `stripe-checkout`, `stripe-portal`, `stripe-webhook` | Real payment integration; preserve dedupe/event ordering |
| Lifecycle | `account-export`, `account-delete` | Extend for every new owned object and storage path |
| Operations | `admin`, `health` | Preserve server authorization and limited operational metadata |

Auth supports current Supabase flows; billing integrates Stripe. Capacitor provides native back, keyboard, browser, file/share and shell behavior. LLM router supports configured provider adapters, caching, key health and logs; actual provider configuration is UNKNOWN. No mailbox, calendar, LinkedIn account API or job-board ingestion integration was found. LinkedIn optimization is text generation, not LinkedIn connectivity.

## Design, mobile and test coverage

Existing foundations: generated `styles/theme.css`, role-split `--ct-*` / `--cb-*`, Tailwind mapping, fonts, `ThemeProvider`, dialogs, toast, errors, mobile sheets, top/bottom bars, sticky actions, local translations, print rules. `PRODUCT.md` describes calm professional styling, light/dark, ink-on-white documents and 44px targets. Dashboard-specific CSS and repeated card/button patterns need measured consolidation. Native always selects mobile shell; browser uses 1024px boundary.

Current checks executed locally on 20 September:

| Check | Result | Evidence / limit |
| --- | --- | --- |
| `npm run typecheck` | PASS | [Baseline record](evidence/BASELINE.md) |
| `npm test` | 27 files, 254 tests PASS | Baseline record; jsdom focus and Node localStorage warnings |
| Deterministic Deno suites matching CI groups | 212 PASS, 0 failed | [Raw log](evidence/edge-tests.log); scripted models, no live AI |
| `npm run build` | PASS | [Raw log](evidence/build.log); export chunk size warning |
| Live Supabase smoke scripts | NOT RUN | Local-stack safety assumptions and provisioned fixtures not established |
| Live model, browser journey, mobile device, accessibility, performance | NOT RUN | Must be qualified by implementation tasks |

Existing tests cover ATS/parsing/taxonomy, template rendering/section order, rich text/PDF/DOCX helpers, history, validation, API/subscription/mappers/account lifecycle, navigation parsing, dialog/toast and PRISM wizard. Edge coverage includes handler guards, routing/cache/key health, admin/health, billing event handling, prompts and PRISM grounding/graphs/golden fixtures. No committed full Career OS E2E, migration fixture suite or visual/a11y harness exists yet.

## Discovery gate result

Repository coverage is sufficient for this implementation plan. Runtime discovery remains open: deployed schema/flags, legacy customer fixtures, provider configuration, account-switch behavior, connector rights, production latency and usage baselines. These are explicit tasks and gates; they do not justify declaring absent or rebuilding existing services. Audit artifacts are verified as planning outputs; no Career OS runtime feature is qualified by this audit.
