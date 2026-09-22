# CVBase Career OS — product requirements

Version 2.0 · 20 September 2026 · Repository-grounded implementation proposal

CVBase will turn professional evidence, goals and opportunities into a continuous cycle of useful decisions, completed work and learning from outcomes. A user should return to CVBase to manage their career even when they do not need a new CV.

Start implementation at [tasks.md](tasks.md). The [program graphs](docs/career-os/GRAPHS.md) explain the dependencies; the [current product map](docs/career-os/CURRENT_PRODUCT_MAP.md) distinguishes existing code from proposed capability. The supplied [recursive implementation authority](docs/career-os/SOURCE_PRD.md) is preserved verbatim. Its invariants remain binding; this document supplies repository mappings, concrete contracts, priorities and qualification criteria. No runtime migration or production release has been performed by this planning work.

## 1. What changes, and why

The application is currently organized around a document builder, dashboard tabs and Smart Studio tools. It has 74 template component files, persistent resumes and application tracking, an ATS engine, profile editing, server AI, and a substantial PRISM tailoring workflow. It does not yet have the durable object relationships needed for one Career OS.

The critical change is to connect existing capabilities around **Career → Goal → Opportunity → Application → Outcome**, with Campaign coordinating pursuit and Action coordinating execution. The primary spaces are **Today, Career, Opportunities, Campaigns, Coach and Library**. The CV engine remains a specialist capability inside this system.

The source PRD assumes some capabilities that are not established by this checkout. Persistent conversational coaching, interview preparation sessions, job discovery feeds and saved opportunity entities are genuine gaps in the inspected source. A trajectory analysis endpoint is not a conversation system; an `interview` tracker status is not an interview preparation workflow. Existing artifacts and statuses must still be preserved.

## 2. Who gets value first

The initial planning assumption is an experienced professional pursuing a role change or progression, using an existing CV and several active applications. This makes the first end-to-end release testable with capabilities already present. It is a sequencing choice, not a restriction on supported users.

| User situation | Job to be done | Observable value |
| --- | --- | --- |
| Active applicant | Decide which role deserves effort and prepare a truthful application | A saved opportunity becomes one resumable application with linked CV and evidence |
| Employed professional | Build evidence and consider the next career move | Capture an achievement, review a goal and receive a useful action without applying |
| Graduate / career changer | Identify transferable evidence and credible next steps | Explainable gaps and attainable actions without treating missing history as failure |
| Executive / returner | Develop positioning and coordinate selective pursuit | Multiple goals, constraints, relationship notes and evidence-backed interview stories |

Preserve the existing English, Spanish, French and German interfaces. Arabic/RTL is a separate expansion decision, not an assumed current feature. All new strings enter the existing translation service; dates, money and time zones are explicit in domain contracts.

## 3. Invariants and scope

**REQ-01 — Reuse and continuity.** Search, map, reuse, recompose, then extend only for an evidenced gap. Retain React/Vite, Supabase, the current native shell, repositories, ATS logic, template/export engine, auth, billing and PRISM. Do not introduce another frontend, identity database, AI provider stack or competing application object.

**REQ-02 — Canonical ownership.** One owner for career facts, goals, opportunity identity, application identity and document relationships. A tailored document is a snapshot; editing it must not silently update career facts. The domain and context documents determine ownership before migrations are implemented.

**REQ-03 — Six coherent spaces.** Desktop navigation: Today, Career, Opportunities, Campaigns, Coach, Library. Mobile: Today, Opportunities, Coach, Campaigns, More. Settings, integrations, billing, help and admin remain available without becoming career pillars. Interview work belongs in the application context. Marketing and rendered CVs retain their established visual exceptions.

**REQ-04 — Trustworthy intelligence.** Every recommendation has a reason and supporting source references. Unknown information stays unknown. No fabricated metrics, fabricated market intelligence, fake activity, fake progress or unsupported claim of completion. The AI can abstain.

**REQ-05 — Preservation and recovery.** Existing CVs, versions, profile fields, application records, ATS reports, headshots and preferences remain accessible throughout rollout, partial migration and rollback. Anonymous web editing remains supported. Account ownership cannot be inferred from a shared local-storage key.

Non-goals remain employer ATS, recruiter CRM, social network, LMS, employer-side marketplace, HRIS, general productivity suite, mass outreach and autonomous application spam. No new graph database, vector database or workflow vendor is required by this PRD. No subscription prices or provider/model selections are changed here.

## 4. Definition of a frontier Career OS

Frontier quality means observable improvement in user judgment and execution, rather than a larger feature count. These capabilities build on the core and must be measured independently.

| Requirement | Capability | Required behavior |
| --- | --- | --- |
| REQ-06 | Evidence-aware career memory | Every reusable claim retains source, confirmation state, version and uses; a correction identifies affected drafts |
| REQ-07 | Strategic fit | Show qualification fit separately from goal-direction fit, constraints and missing information |
| REQ-08 | Bounded planning and execution | Translate intent into typed, reviewable steps; execute through existing workflows; recover interrupted work |
| REQ-09 | Outcome learning | Relate observed application/interview outcomes to prior actions, with sample size and uncertainty; support user correction |
| REQ-10 | Proactive assistance | Produce timely, deduplicated actions from meaningful changes; honor dismissal, snooze, quiet hours and consent |
| REQ-11 | Career scenario comparison | Compare goals and offers under user-selected priorities and explicit assumptions; expose tradeoffs, never imply guaranteed outcomes |

First release does not claim predictive career simulation, causal hiring explanations or live market coverage. Later capabilities qualify only when the underlying evidence and instrumentation exist.

## 5. Core product requirements

### Today and the action system

**REQ-12.** Today opens with orientation, normally up to three eligible priority actions, a decomposable career pulse, active campaigns and recent activity. It must work without an AI call. It must not auto-create campaigns or invent a goal to fill the page.

Candidate actions are initially produced by deterministic rules over durable state: unreviewed import, near interview, unfinished tailoring review, a user-set follow-up date, or an evidence gap affecting an active application. Sort by confirmed deadline, dependency unblocking, goal relevance and effort fit. Record the rule/version and explain the dominant reason. Missing interview dates must not become invented deadlines. Use a stable dedupe key per user, action type, subject and material input revision. Dismissed actions do not reappear unless the trigger materially changes; expose why a resurfaced action returned.

The shared recommendation contract contains ID, type, title, reason, evidence references, priority band, context references, input revisions, source, creation/expiry time and optional confidence. Confidence may be omitted where uncalibrated; it is not a decorative percentage. Every actionable item points to the shared action vocabulary in the context model.

Completion requires the destination workflow's durable result. Opening a route, generating text, or receiving HTTP 200 does not alone complete a career action. A user can explicitly record an externally completed activity, with source `user_reported`.

### Career, evidence and goals

**REQ-13.** Career includes Overview, Experience, Achievements, Skills, Education, Evidence, Goals and Profile. It presents professional progression rather than a CV layout. Reuse profile forms and parsing, but move facts behind one canonical owner. Preserve specialized fields such as `careSpecialties` and `licensedState` as legacy data until mapped, even if their display changes.

**REQ-06.** Claims are `verified`, `user_confirmed`, `inferred` or `incomplete`. Verified means a recorded verification method, source and time, not an LLM confidence score or presence in an imported CV. Imports are unconfirmed candidate facts. User affirmation is `user_confirmed`. Extraction confidence is a separate field. Contradictory values are shown for resolution, never silently merged.

An achievement holds an ID, narrative, experience link, optional metric/unit/period, evidence references and review state. Claim-to-document references support “used in” counts and change impact. Updating a claim marks dependent drafts stale and offers a diff; historical submitted snapshots remain unchanged. Evidence can be corrected, withdrawn and deleted. Account export includes canonical user facts and their associations.

**REQ-14.** Goals support role, level, industry, location, remote preference, compensation range/currency/period, target date, target employers, constraints and priorities. Multiple goals may coexist; exactly one may be primary. A missing primary goal is valid. Revisions are recorded and trigger recomputation; existing applications retain their decision-time goal snapshot.

### Opportunities and strategic decisions

**REQ-15.** Begin with user-pasted job descriptions and manually entered opportunities, plus migration of tracker `wishlist` rows. Persist opportunity identity, source URL if supplied, captured content, source/capture date, freshness and owner. Normalize duplicates conservatively; allow explicit merge and reversal with surviving links. Company/title alone is insufficient identity.

For You, Saved, Applied, Watching and Archived are views over canonical data. Until a real feed is qualified, For You ranks imported opportunities and clearly explains its coverage. Do not label generated roles as available vacancies. Separate role/project/path types; the first implementation may qualify job roles before other types.

**REQ-07.** Qualification fit decomposes requirements into supported, partial, missing and unknown evidence. Career-direction fit evaluates explicit goal priorities and constraints. Reuse the deterministic ATS engine as one signal, not as a probability of hiring. Persist input versions and analysis time; mark results stale after changes. Missing pay is unknown. A role that breaks a hard user constraint may be hidden by default with an inspectable exclusion reason; the user can revise their constraint.

An opportunity detail offers Save, Ask Coach, Start Application and Not Interested. It shows source date and the two fit explanations. Outdated or closed listings remain reviewable with status. External content is data, not instructions for Coach tools.

### Campaigns and application execution

**REQ-16.** A campaign coordinates a goal, milestones, target opportunities, applications, interviews, relationship notes and outcomes. It can be paused or closed. Milestone state and funnel counts take precedence over a generic progress percentage. An opportunity may be considered in several campaigns; an application has one owning campaign, optionally null. Do not duplicate applications to fill boards.

**REQ-17.** Extend `job_applications` as the application authority. Start Application is idempotent and returns a durable application ID. Reopening the same opportunity presents an existing application; reapplication is an explicit new attempt linked to the previous one. A legacy wishlist row keeps its ID during migration; projection and stage metadata distinguish a saved opportunity from a submitted application.

Workspace sections: Role Analysis, CV, Cover Letter, Questions, LinkedIn, Networking, Interview Preparation, Notes and Activity. Every persisted artifact carries application and opportunity references where relevant. Users may enter or leave any section without losing context. Missing sections show honest states with actionable next steps.

**REQ-18.** Readiness lists necessary, optional, incomplete and blocked preparation items. It is not a measure of human worth or hiring probability. PRISM clarification questions and employer application questions are distinct types. Submission is a user-confirmed record with timestamp and submitted artifact versions; the first release opens the employer site or exports documents. CVBase must never mark an application sent simply because the user opened that site.

Networking initially supports private relationship notes, follow-up dates and reviewed drafts. It does not infer real contacts from a model or transmit messages. Connection-based contact discovery and sending require the later connector contract.

### CVs, interview preparation and Coach

**REQ-19.** Reuse ResumeBuilder, templates, preview, history and PDF/DOCX export. Application CVs are separate versions linked to the application and source evidence. Resume limits still apply. Save, reload, undo, export and native sharing must remain functional. Offer collapsible structure, editor and preview on desktop; preserve mobile sheets and preview switching.

Reuse PRISM's analyze → clarify → generate → review → finalize flow, its NDJSON events and grounding tests. Bind runs to the application and source revisions. A refresh resumes the same run. Stale inputs or missing documents prompt recovery rather than fallback to another resume. Inline suggestions distinguish transformation from new factual assertions; new facts require explicit confirmation before acceptance.

**REQ-20.** Interview preparation is a new bounded workflow using existing evidence and AI infrastructure. Store interview time/time zone/type, role themes, referenced achievements, practice questions, user answers and feedback. Begin with text practice and reusable stories. Readiness enumerates covered themes and remaining preparation. Capture self-reported results and recruiter feedback separately. Voice, video scoring and emotion/personality inference are outside this plan.

**REQ-21.** Coach is one persistent, context-aware conversation surface. Users see and can change its selected goal, campaign, opportunity and application. Messages cite the career records used. Store conversations and tool receipts in the existing Supabase ownership model; summaries reference source IDs and cannot override facts. Clear/export/delete conversation history and selective memory are required.

Coach initially supports a bounded set of tools: inspect context, explain priorities, compare imported roles, start/resume application work, request PRISM tailoring, review evidence, prepare interviews and create reviewed plans. The action gateway validates ownership, input versions, plan limits and action policy on the server. The model cannot choose arbitrary URLs, SQL, user IDs, or unregistered tools.

Read-only explanations can run immediately. Material factual edits show a diff; external submissions, sends and destructive actions require explicit user confirmation tied to exact content and destination. A changed proposal invalidates confirmation. “Done” requires a persisted tool receipt linking the actual result. Cancellation stops future steps; completed side effects remain visible. Retried runs must not create duplicate documents or double charge quota.

### Library, search, onboarding and notifications

**REQ-22.** Library composes existing resumes, versions, ATS reports and headshots, then adds linked cover letters, interview stories and imported evidence. It provides filters, text search, associations and version history. Published career resources remain a separate content collection, not user-owned Library assets. Export remains an artifact action, not a navigation pillar.

**REQ-23.** Command search initially navigates and searches owned records using existing Postgres capabilities or bounded repository queries. It respects permissions, input limits, cancellation and pagination. Add dedicated search infrastructure only after measured query needs justify it. Search snippets must not expose revoked evidence or another user's content.

**REQ-24.** New-user onboarding asks objective, imports information, reviews important facts, creates a goal and lands on one meaningful action. It can be paused and resumed. Existing users receive a brief introduction and retain direct access to historical data without completing onboarding again. Anonymous drafts must be explicitly claimed into the signed-in account, with preview and duplicate handling.

**REQ-10.** Notifications distinguish information from action required. Initially deliver an in-app inbox linked to Actions. Later scheduled intelligence runs need durable checkpoints, dedupe, per-user budgets, quiet hours and disconnect/cancellation behavior. Notification volume and daily activity are not success metrics.

## 6. Architecture and operational requirements

**REQ-25.** Preserve the modular monolith: React feature composition, a canonical context adapter, existing repositories, Supabase tables/RLS/Edge Functions and existing LLM routing. PRISM remains a bounded specialist pipeline. A new Career OS orchestration module may call it, but should not recode its agents. A claim relationship graph is a domain model implemented first in Postgres; it does not require a graph database.

The [domain map](docs/career-os/CAREER_OS_DOMAIN_MAP.md) records extension decisions. New persistence must include same-owner relationship constraints, indexes, quotas, retention, account lifecycle coverage, fixtures and rollback. A feature flag must guard both UI and its server mutation paths; entitlement checks must not hide existing user data.

**REQ-26.** Server-executed actions retain status, idempotency key, attempt, request ID, actor, context revisions, created/updated time, result reference, retryability and sanitized failure code. PRISM runs already offer partial precedent. A generalized durable scheduler is justified only for background work that must survive disconnected clients. Cache keys include user scope and material input revisions; deletion or revocation invalidates derived memory and results.

Do not claim the present PRISM checkpoint adapter provides full job durability: it logs checkpoint persistence errors as non-fatal. Qualify checkpoint failure and retry behavior before using it as the execution guarantee for Coach.

**REQ-27.** Extend existing metering rather than invent a second credits system. Separate plan entitlement, quota reservation, actual provider cost and user-visible charge. One logical action has a documented charging rule across retries and partial failures. Existing `consume_usage` / `release_usage` and PRISM phase charging must be reconciled before tool orchestration. No new paid bundle is assumed. Data access, export and recovery are preserved across downgrades.

**REQ-28.** Product events use stable names and a versioned envelope: event ID, actor ID, subject references, time, source, schema version and correlation ID. Avoid raw CVs, prompts, answers, contact details and salary text in telemetry. Operational Sentry/AI logs are not a substitute for product funnel events. Account deletion/export and log-retention contracts must be extended for every new object; approved retention decisions are prerequisites to persistence qualification.

## 7. Design and quality

**REQ-29.** Evolve the existing token generator and Tailwind mappings into semantic surface/text/action/status roles. Reuse Dialog, Toast, ErrorBoundary, mobile sheets and native behaviors. One dominant purpose/action per screen; avoid grids of equally weighted cards and decorative scores. The design contract is [DESIGN_SYSTEM.md](docs/career-os/DESIGN_SYSTEM.md).

**REQ-30.** Every workflow covers first use, populated, loading, partial, empty, recoverable error, offline/degraded, permission/entitlement denied, AI unavailable, large history and mobile. Preserve data while showing failures. Offline shell availability does not imply offline cloud or AI functionality.

**REQ-31.** Target WCAG 2.2 AA across complete journeys, with keyboard operation, focus management, accessible authentication, non-drag alternatives and announced status changes. Use the existing product's 44px touch-target rule. The token contrast generator alone does not establish conformance. Validate desktop, 320px reflow, tablet, mobile, 200% text zoom, reduced motion, both themes and screen-reader paths. The normative basis is [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

**REQ-32.** Establish measured navigation, data-fetch, preview, AI first-stage/total latency and bundle baselines on stated devices/network profiles before setting release budgets. The audited build succeeds but reports a large export chunk; build size is not measured user latency. Keep shell rendering independent of expensive AI/document modules. Persist resumable progress and show actual server stages.

## 8. Success measures and evaluation

**REQ-33.** Proposed north-star measure: **weekly users completing a meaningful, goal-linked career action**. Count durable completion or a clearly labeled user-reported external completion, at most once per action ID. Exclude demo data, internal users, mere views, generated suggestions and duplicate retries. Report active-applicant and employed-development cohorts separately.

| Measure | Definition | Initial evidence policy |
| --- | --- | --- |
| Activation | New users with a reviewed fact, goal and first useful completed action / new users entering onboarding | Instrument before target setting; segment imports and manual entry |
| Continuity | Golden-journey transitions retaining correct context / tested transitions | 100% required in deterministic qualification fixtures |
| Trust | Unsupported factual assertions accepted without confirmation | Zero permitted in adversarial release suite |
| Execution integrity | Completed action receipts with an owned, reloadable result / completed receipts | 100% in retry/interruption qualification fixtures |
| Preservation | Expected legacy artifacts accessible after migration / fixture artifacts | 100%; compare IDs, content and associations, not only row counts |
| Useful recommendations | Eligible recommendations accepted/completed/dismissed with reason | Establish cohort baseline; do not optimize clicks alone |
| Outcomes | Responses, interviews and offers by submitted application cohort and observation window | Missing outcomes stay unknown; no invented conversion lift |
| Sustainability | Cost per successful action, retry rate, p50/p95 latency | Measure by action and plan; explicit budgets set before rollout |
| Continuing value | Users completing career-development actions outside application workflows | Test the “career OS beyond CVs” hypothesis |

**REQ-09.** Outcome learning begins with descriptive evidence and reviewed recommendations. Record observation date, denominator, missing outcomes, cohort and source. “Three of five reported interviews involved marketplace roles” is valid when supported; “marketplace experience caused success” is not. A rejection must not automatically downgrade a skill. Do not rank people using protected or inferred sensitive traits. Changes to recommendation rules require offline evaluation and controlled rollout against the deterministic baseline.

**REQ-34.** Extend PRISM's scripted-model/golden tests for stale context, contradiction, malicious JD instructions, unsupported claims, wrong-owner records, duplicate submission, quota failure and interrupted generation. Add held-out human-reviewed cases for goal fit, useful prioritization and scenario tradeoffs. Record rubric, test-set version, model configuration, sample counts and failure breakdown. Live model tests remain opt-in with controlled cost; passing unit tests is not a model-quality claim.

## 9. Releases and exit conditions

No calendar estimates are invented before implementation spikes establish team capacity. Release boundaries describe independently verifiable outcomes. The task DAG is authoritative for dependency order.

| Release | User-visible outcome | Exit condition |
| --- | --- | --- |
| R0 — Foundations | Existing data remains dependable while the new model is introduced | Ownership, migration fixtures, context contracts, safe persistence, tokens and baseline gates verified |
| R1 — Connected application slice | Set goal → import role → start application → PRISM CV → return from Today | Same IDs/revisions survive reload, auth and back navigation; linked reviewed CV; recoverable failure; old path still works |
| R2 — Complete Career OS | All six spaces support the full journey through Coach, interview and recorded outcome | New/existing/anonymous fixtures, mobile/a11y, account lifecycle, cost and release gates pass |
| R3 — Frontier intelligence | Evidence impact, scenario comparison, outcome-informed actions and opted-in proactivity | Human-reviewed evaluations show useful behavior; uncertainty, consent, freshness and budgets qualified |
| Retirement | Superseded tools disappear safely | Replacement parity, route coverage, migration, observation window and rollback evidence recorded |

R1 is a limited release, not completion of the Career OS. R2 must support the source PRD's canonical journey. R3 expands the frontier behavior without making external job feeds or mail/calendar access a prerequisite for R1/R2.

**REQ-35.** Rollout uses cohort flags, expand/backfill/validate/switch/contract migration, deterministic ID mappings and a tested rollback preserving post-switch writes. Release gates and the scenario matrix are defined in [RELEASE_PLAN.md](docs/career-os/RELEASE_PLAN.md). No task is qualified merely because code exists.

## 10. Decisions, assumptions and orchestrator

Resolved planning decisions: retain the stack; reuse PRISM and ATS; keep `job_applications`; add a canonical career extension only after claim ownership is designed; start with imported opportunities; begin with deterministic priorities and manual outcome recording; implement the application slice before broad new intelligence.

Implementation decisions to close in R0: canonical claim schema, tracker migration identity mapping, conflict policy, old-client compatibility, raw-source retention, product telemetry destination, action charging semantics and measured performance budgets. Each has an owner task in [tasks.md](tasks.md); unknown production configuration is never treated as missing infrastructure.

Repository evidence outranks historical implementation notes for descriptions of current behavior. The source invariants outrank this document's convenience decisions. Material conflicts are resolved at the parent requirement, then propagated to the plan, graph and acceptance ledger.

The [plan manifest](docs/career-os/plan.json) holds task records and statuses. Run `python3 scripts/career_os_plan.py --check` to validate dependencies, source paths, requirement coverage and generated views. Run `python3 scripts/career_os_plan.py --write` after an intentional manifest edit. The human entry point is always [tasks.md](tasks.md). Status transitions require evidence as specified there; a dependency graph schedules work, not people or production changes automatically.

The design choice to use bounded workflows and testable tool contracts is consistent with [Anthropic's engineering guidance on effective agents](https://www.anthropic.com/engineering/building-effective-agents). This is a design rationale, not evidence that CVBase currently implements a general agent runtime.
