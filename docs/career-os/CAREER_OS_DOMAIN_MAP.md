# Career OS domain map

Planning contract, not a deployed schema. Read with [PRD](../../PRD.md), [current map](CURRENT_PRODUCT_MAP.md) and [context contract](CAREER_OS_CONTEXT_MODEL.md). R0 schema tasks must turn these proposals into migration designs and fixtures before implementation is called ready.

## Ownership decisions

| Concept | Existing persistence / API / state | Canonical owner and proposal | Gap / migration |
| --- | --- | --- | --- |
| User/account | `auth.users`, `profiles`; AuthProvider | Keep Supabase user ID and profile account fields | No new user identity |
| Career | Profile fields + primary `resumes.data`; profile mapping + builder sync | One `career` aggregate owned by user, extending existing profile identity; new career-fact records proposed | Seed candidate facts from chosen source CV with provenance; no automatic union of every tailored document |
| Experience/education/skills | `ResumeData` JSON; skills taxonomy | Canonical fact/entry IDs beneath Career; CVs become projections/snapshots | Map legacy IDs to career IDs deterministically; retain custom sections and rich text |
| Achievement/evidence | Experience description HTML, projects, PRISM answers/flags | Proposed claim/evidence records and reference edges in Postgres | Preserve sources and review state; claim correction must not rewrite submitted CVs |
| Goal | Only target-role inputs and trajectory output | Proposed `career_goals` scoped to user/Career, revisioned | Primary uniqueness and null-primary state; extract suggested goals only with user confirmation |
| Opportunity | JD component state, `job_applications.url/company/role`, ATS JD text | Proposed user-owned `opportunities`; identity independent of application | Backfill source links/JD where actually available; never reconstruct missing JD from title |
| Campaign | No owner found | Proposed `campaigns`, owned by user and linked to goal | Existing applications initially unassigned; user chooses grouping |
| Application | `job_applications`; trackerRepo; JobApplication | Extend existing table and repository | Add opportunity/campaign links, stage detail, attempt identity, revision and submission metadata |
| CV/document | `resumes`, `resume_versions`; resumeRepo/versionRepo | Retain CV owners; proposed document metadata/associations for heterogeneous artifacts | References to existing resume IDs rather than copying CV blobs into new document tables |
| Cover/LinkedIn/questions | Smart Studio transient results; PRISM clarification arrays | Proposed application artifacts, typed by purpose and source | Employer questions and PRISM evidence questions stay distinct; store reviewed content and revision |
| Interview/outcome | `interview/offer/rejected` statuses; notes | Proposed interview sessions and outcome observations referencing existing application | Historical stage remains; do not invent interview dates or feedback |
| Action/recommendation | No shared durable owner | Proposed actions with lifecycle, evidence and input revisions; recommendation projection | Dedupe rules, expiry, decline/snooze and durable result receipts |
| Run | `prism_runs`, PRISM APIs and client | Retain PRISM runs; proposed general action-run metadata only for multi-step/durable work | General run references specialist PRISM run; never clone graph checkpoints unnecessarily |
| Conversation | No durable owner | Proposed conversation/message/tool-receipt records in Supabase | Context snapshots plus source references; summaries derived and revocable |
| Activity | Operational logs; local dashboard signals | Proposed domain events and user-facing projection | Store only needed metadata; do not expose operational prompts/logs |
| Notification | Operator `ops_alerts` only | Proposed user notification projection referencing Actions/events | Separate operator incidents from user inbox |
| Preferences | Device keys + profile; Theme/Translation providers | Keep local appearance preference; extend account career/notification preferences where sync needed | Explicit import precedence and sign-out behavior |
| Entitlement/usage | subscriptions, usage_counters, billing/usage repos | Retain current owners and consume/release functions | Document action charging; no duplicate credits system |

## Relational constraints to qualify

The graph in [GRAPHS](GRAPHS.md) describes conceptual relationships, not mandatory table names. R0 should choose the smallest schema satisfying these rules:

- Every owned object has authenticated `user_id` ownership. Reference existence alone is insufficient: referenced goal, campaign, opportunity, application and artifact must belong to the same user. Enforce with same-owner composite constraints or equivalent transaction-side checks, plus RLS tests.
- A Career has many goals; at most one primary active goal. A campaign references one goal. Opportunity-to-campaign association can be many-to-many. An application has one owning campaign or none, one opportunity once mapped, and one explicit attempt identity. Reapplication is intentional, not an idempotency failure.
- One legacy application ID remains one application ID after migration, including wishlist rows. New saved opportunities do not create application rows until preparation starts. A legacy wishlist row can be projected as a saved opportunity with a dormant application shell; starting it activates that same shell.
- `JobStatus` compatibility values remain readable. New stages `preparing/response/final/closed` need additive detail or a coordinated version migration; old clients must not receive status values their mapper cannot understand. `closed_reason` distinguishes rejected, withdrawn, accepted and archived. Existing `rejected` is never silently changed to a successful outcome.
- Career facts are versioned. Document references record source fact revisions. Submitted document snapshots are immutable in product behavior, with separate later revisions allowed. Deleting a source removes or redacts its content and derived caches according to lifecycle policy while retaining only permitted references/tombstones.
- Source imports record format, capture time and a content fingerprint for dedupe. Auto-merge is reversible and does not imply factual verification. A conflict is a first-class review state.
- A unique idempotency key is scoped to user + action kind + logical request. Retrying returns the original application/run/artifact/receipt. Handle concurrent requests at the database boundary rather than through UI disabling alone.

## New subsystem justification register

| Proposal | Alternatives inspected / why insufficient | Consumers | Persistence and operational cost | Owner / removal strategy |
| --- | --- | --- | --- | --- |
| Career facts and evidence | Profile lacks history; resumes are tailored copies; PRISM runs prune text | Career, fit, Coach, CVs, interview | Relational claim/provenance records, import mapping, deletion graph; no vector store prerequisite | Domain; retire old profile-to-CV copy as canonical writer after migration |
| Goals/campaigns/opportunities | Tracker lacks these IDs, JD persistence and reusable objectives | Today, execution, Coach | New relational records and same-owner links; backfill sparse legacy rows | Domain + execution; retain legacy compatibility projections until old clients retire |
| Action gateway and receipts | `callFn` transports requests; PRISM only tailors and does not provide generalized action policy | Today, Coach, notifications | Typed registry and run/receipt metadata; transaction/idempotency/charging checks | Platform; reuse PRISM run data rather than a second checkpoint store |
| Conversation/session artifacts | Stateless endpoints and transient React state cannot resume conversations or interviews | Coach, applications, Library | Owned messages/sessions, bounded context summaries, export/delete | AI experience; remove temporary local drafts after confirmed persistence |
| Domain events and user inbox | AI/Sentry/ops logs have different meaning, ownership and retention | Today, outcomes, reminders | Minimal events, projection queries, dedupe and retention | Platform + analytics; keep disposable derived projections rebuildable |
| Optional connectors/scheduler | Existing cron is ops cleanup; no career connectors found | Later proactivity and imported signals | Token handling, scopes, webhook/poll dedupe, permissions, quotas, disconnect | Integrations; manual workflows remain the fallback |

Each schema task must document exact fields, alternatives, read/write consumers, RLS, indexes, retention, export/delete, migration fixtures, long-term owner and temporary-adapter removal before adding tables. This register is the planning rationale, not evidence that those implementations exist.

## Migration choices

1. Expand schemas and keep legacy reads/writes operational. Snapshot fixture IDs/content/associations.
2. Record per-user migration version and per-item old→new mapping; retry after partial failure without duplicate creation. Import guest data only after ownership confirmation.
3. Backfill candidate career facts, opportunity links and artifact relationships. Missing fields stay missing. Do not infer real employers, applications or outcomes from demo records.
4. Validate parity and same-owner relationships before switching a cohort. Existing originals remain reachable even if a projection fails.
5. Decide dual-write or read-adapter compatibility explicitly per object. Avoid indefinite two-way synchronization between two canonical owners.
6. Roll back the UI/read projection without discarding new user writes. Reconcile those writes through the recorded mappings. Delay contract/drop migrations until old native clients and supported deep links have passed retirement gates.
