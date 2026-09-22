# COS-032 / COS-033 — Mobile, accessibility, localization, visual states; performance, provider failure and cost controls

21 September 2026 · Local stack + Vite dev server + production build; Chromium (desktop browser pane) and the iOS Simulator (iPhone 17 Pro, iOS 26.5) running the Capacitor build against the local stack.

## Mobile / native (J08)

* **Web mobile emulation (375×812 and 320×640):** Today, Opportunities, Application workspace (all sections), Coach, Library, Settings render single-column with no horizontal overflow (`document.documentElement.scrollWidth === innerWidth` at both widths). Detail routes show the existing `MobileTopBar` back arrow; list spaces show the five-entry tab bar; the More sheet (Career, Library, utilities, tools, account) opens via the existing `BottomSheet`, which registers with the navigation back-handler chain (hardware/gesture back closes the sheet first).
* **Native iOS (real build):** `CVBASE_ENV_FILE=.env.cvbase.localstack npm run build && npx cap sync ios`, `xcodebuild` App scheme (48 s, 1 benign warning), installed and launched on the booted simulator. Passwordless sign-in from inside the WKWebView reached the local GoTrue (the code arrived in Mailpit — the earlier sandbox limitation applies to external HTTPS only, not to the host's loopback), the QA account's real CV opened in the builder, the landing menu's "Templates" entry redirected into the Career OS Library → Template gallery (cohort redirect honoured natively), the Library listed the real assets (2 CVs, 10 evidence items) and the back chevron unwound the stack. Screenshots were taken in the session (dark scheme follows the simulator's appearance).
* Fixes made during the pass: application workspace rails stack below 1280 px (double-nested side rails collapsed the content column at the 1024 px shell width); the workspace bar reads "Application" instead of the owning Campaigns entry.

## Accessibility (partial)

* All controls are real `button`/`input`/`select` elements with visible text or `aria-label`; StatePanel uses `role="status"`/`role="alert"`; dialogs use the existing `Dialog`/`ConfirmDialog` focus trap and return focus; the palette is fully keyboard-driven (arrows/Enter/Esc/Home/End); board columns move applications with Earlier/Later buttons (no drag requirement); every status has a text label beside its colour. 44 px targets come from the shared `tap-target`/Button primitives. The token generator's 181 contrast gates pass in both themes.
* **Not performed:** a screen-reader walkthrough (VoiceOver/NVDA) and an automated axe run — the browser pane's accessibility tree omitted names for buttons whose label is a nested span (confirmed to be a tooling artefact: the DOM has the text), so a real assistive-technology pass is still required before claiming WCAG 2.2 AA (tracked as a G6 gap).

## Localization

* Every new string goes through `t('careeros.*', default)`; `services/__tests__/translationCoverage.test.ts` enforces that es/fr/de carry every English key. The 1 411 new keys (Career OS spaces, primitives, PRISM binding, builder recovery) were translated into es/fr/de by two localisation agents and merged with `scripts/career-os-i18n.mjs --apply` (see the delivery report for the final count). Dates/times use `Intl` with the recorded IANA zone; money is never formatted from guessed values.

## Visual states

Each space was exercised in loading, empty/first-use, populated, partial (one failed source → "Some sections could not be loaded" with retry), error/retry, AI-unavailable (PRISM, Coach, interview questions), denied (free-plan resume limit; operator-only admin), offline (`navigator.onLine` panels) and dark theme. Screens never show fabricated example content in a real account (template previews inside the gallery/wizard use the existing sample CV, as before).

## Performance (dev profile, COS-033)

| Measure | Observed | Provisional budget | Note |
| --- | --- | --- | --- |
| Production JS: entry `index` | 800 kB raw / 248 kB gzip | — | landing + translation catalogue, pre-existing weight |
| `CareerShell` chunk | 133 kB raw / 41 kB gzip | — | shell + provider + primitives |
| Space chunks | Today 17 kB, Applications 27 kB, Coach 16 kB gzip | — | lazy per space |
| Entry + shell + Today | ≈ 306 kB gzip | ≤ 350 kB gzip | within budget |
| Export/PDF/DOCX/parsers | html2pdf 985 kB, mammoth 503 kB, pdfjs 453 kB, docx 343 kB raw | lazy | not loaded by navigation |
| Today owned queries | ~34 PostgREST calls, ≤ 14 ms each locally | — | consolidation candidate |
| Dev-server `/app/today` DOMContentLoaded | 48 ms (unbundled modules) | — | not a user-latency claim |

Provider failure and cost controls (live): PRISM analyze with no provider → run `failed/llm_unavailable`, usage charged then released (`ai_actions` back to 0), retry allowed and free; Coach outage → abstained stored message, `released: true`; interview questions → abstain uncharged. Navigation stays responsive during those calls (space chunks are independent of AI modules). Cancellation/timeout reconciliation is covered by the gateway Deno tests (`interrupted` receipts retryable).

## Gate verdicts

* G6 (experience): PARTIAL — mobile web, native shell, dark theme, states and localization coverage verified; screen-reader/axe evidence outstanding.
* Performance budgets: PASS on the dev profile; production device/network cohorts remain unmeasured (no staging deployment authorised).
