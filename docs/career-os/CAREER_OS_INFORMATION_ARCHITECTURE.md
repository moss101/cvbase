# Information architecture and route disposition

Every route below is grounded in `NavigationProvider.tsx`, `App.tsx`, Dashboard and Smart Studio. Destinations are proposed, not implemented. Each current route family receives exactly one disposition. No deletion is authorized by this ledger before retirement qualification.

## Current route ledger

| Current route / family | Current capability | Canonical destination | Disposition | Compatibility rule |
| --- | --- | --- | --- | --- |
| `/` | Public landing | `/` | KEEP | Preserve web visitor entry |
| `/sign-in?next=…` | Authentication | Same | KEEP | Validate nested destination, resume after login |
| `/app` | Dashboard default | `/app/today` | REDIRECT | Preserve history with replace; cohort fallback |
| `/app/dashboard` | Explicit dashboard alias | `/app/today` | REDIRECT | Same landing and compatibility as `/app` |
| `/app/resumes` | Resume library | `/app/library?type=cv` | MERGE | Existing IDs/edit/export remain accessible |
| `/app/templates` | Gallery | `/app/library/templates` | MOVE | Continue into existing builder with selected template |
| `/app/profile` | Master profile | `/app/career/profile` | MOVE | Preserve fields, validation and account ownership |
| `/app/smart-studio` | Five local tools | `/app/library/studio` (`?tool=match\|linkedin\|cover\|tracker\|trajectory`) | MERGE | Smart Studio runs unchanged inside the Library; the active tool is kept in the URL; do not guess application |
| `/app/ats` | ATS analysis/history | `/app/library/ats` | MOVE | Allow standalone scan and contextual application entry |
| `/app/billing` | Billing | `/app/billing` | KEEP | Not a primary career space |
| `/app/prism` | Tailoring wizard | `/app/library/tailor` | MOVE | Honor flag/entitlement; allow standalone tailoring |
| `/app/settings` | Settings | `/app/settings` | KEEP | Preserve preferences and lifecycle actions |
| `/app/admin` | Operator console | `/app/admin` | KEEP | Keep server/admin authorization |
| `/builder` | General CV editing | `/app/library/cvs/new` | REDIRECT | Preserve actual legacy primary/local behavior in adapter; do not destroy guest draft |
| `/builder/:resumeId` | Specific CV | `/app/library/cvs/:resumeId/edit` | REDIRECT | Preserve ID; missing ID never opens another resume |
| `/resources` | Public resources/articles | `/resources` | KEEP | Resource filters/article selections are local state |
| `/pricing` | Public pricing | `/pricing` | KEEP | Preserve checkout entry |
| `/legal` | Default privacy alias | `/legal/privacy` | REDIRECT | Consistent canonical document |
| `/legal/privacy` | Privacy | Same | KEEP | Preserve content |
| `/legal/terms` | Terms | Same | KEEP | Preserve content |
| `?mode=preview&template=:id` | Headless template renderer | Same query contract | KEEP | Automation/export dependency; not user navigation |

Trailing slashes normalize. Unknown/malformed paths currently fall back to landing; introduce an owned-context-safe not-found experience with tests. A target route is enabled only after its replacement supports the same data and meaningful actions. During partial rollout, leave the old view functional rather than redirecting into an incomplete destination.

## Local subviews and contextual entry points

| Existing entry | Destination | Disposition | Notes |
| --- | --- | --- | --- |
| Smart Studio `match` | Opportunity analysis / application Role Analysis | MERGE | Resolve explicit opportunity; standalone paste remains supported |
| Smart Studio `linkedin` | Career positioning or application LinkedIn | MERGE | Save results in the selected context |
| Smart Studio `cover` | Application Cover Letter | MERGE | Generic legacy entry offers application selection |
| Smart Studio `tracker` | Campaign board + all applications | MERGE | Existing unassigned records remain visible |
| Smart Studio `trajectory` | Career Overview / Coach explanation | MERGE | Reuse endpoint; no conversation-history claim |
| Builder sections, AI modals, ATS modal | Existing editor/inline assistance | KEEP | Preserve all sections, edit history and exports |
| VersionHistoryModal / JSONBackupModal | Document version/history actions | KEEP | Preserve import/export contracts |
| AuthModal / upgrade prompts | Current in-place account/billing flow | KEEP | Preserve intended destination and context |
| Settings export/delete | Settings → Your data | KEEP | Extend lifecycle to new objects |
| Admin internal tabs | Operator console | KEEP | Not subject to career navigation collapse |
| Mobile More/drawers/sheets | More + contextual panels | MERGE | Preserve native back interception and safe areas |

## Canonical destination families

| Space | Paths / subviews | Primary job |
| --- | --- | --- |
| Today | `/app/today` | Choose and complete the next useful action |
| Career | `/app/career`; `/overview`, `/experience`, `/achievements`, `/skills`, `/education`, `/evidence`, `/goals`, `/goals/:goalId`, `/profile` beneath it | Review career facts and direction |
| Opportunities | `/app/opportunities`; `/:opportunityId`; view filters in query | Understand and select opportunities |
| Campaigns | `/app/campaigns`; `/:campaignId`; board/list view in query | Coordinate progress toward a goal |
| Application workspace | `/app/applications`; `/:applicationId/:section` | Execute one application; nested contextual surface, not seventh primary space |
| Coach | `/app/coach`; `/:conversationId` | Conversational decisions and tool execution |
| Library | `/app/library`; `/templates`, `/tailor`, `/ats`, `/studio`, `/cvs/new`, `/cvs/:resumeId/edit`, `/documents/:documentId` | Manage owned professional artifacts |
| Utilities | `/app/search`, `/app/notifications`, `/app/settings`, `/app/settings/integrations`, `/app/billing`, `/app/admin` | Commands, inbox and account operations |

Application section enum: `analysis`, `cv`, `cover-letter`, `questions`, `linkedin`, `networking`, `interview`, `notes`, `activity`. Default to `analysis` for a bare application ID. Destructive actions and arbitrary tool arguments do not belong in routes. Route names are stable planning contracts; changes update ledger, context tests, redirects and task DAG together.

## Cutover dependencies and deletion eligibility

All route changes depend on COS-004 parsing/compatibility and COS-008 shell integration. The following destination tasks add route-specific prerequisites. KEEP routes require regression evidence but have no deletion eligibility. MOVE/MERGE/REDIRECT entries preserve IDs, parameters and historical data under COS-007/COS-031, and become eligible for presentation retirement only through COS-041.

| Current entries | Destination qualification dependency | Redirect / migration impact |
| --- | --- | --- |
| `/app`, `/app/dashboard` | COS-015, COS-018 | Redirect to Today only for qualified cohort; otherwise keep legacy dashboard |
| resumes/templates, both builder families | COS-016, COS-028 | Resume IDs, chosen template, guest draft and version history preserved |
| profile | COS-019, COS-030 | Specialized fields preserved; existing users are not forced through full onboarding |
| Smart Studio + five local subviews | COS-020, COS-021, COS-022, COS-025, COS-027 | Contextual tool handoff or explicit selection; no guessed application |
| ATS and PRISM routes | COS-013, COS-028 | Existing report/run IDs and feature/plan gates preserved |
| legal default alias | COS-004 | Replace with canonical privacy URL; content unchanged |
| Mobile drawer/More consolidation | COS-008, COS-032 | Shared destinations, native back and safe-area continuity |

## Navigation behavior

Desktop shows the six primary spaces, then Search, Notifications and Profile. Mobile shows Today, Opportunities, Coach, Campaigns and More; More includes Career, Library, settings, integrations and help. Preserve the existing native shell behavior while testing tablet composition explicitly.

Context breadcrumbs expose opportunity/company and application. Search and Coach opened from an application inherit its references. Application tabs use URL section state; reload/back restores the same section. Gallery filtering can remain query/local state. Shared route descriptors should drive desktop/mobile labels, navigation and command entries to prevent divergent products.

Route migration tests cover every current route family, each Smart Studio subview handoff, auth continuation, disabled flags, limited plan, unknown ID, deleted document, web history, Android back and iOS gesture behavior. No `DELETE` disposition is assigned in this planning baseline.
