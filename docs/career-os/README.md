# CVBase Career OS planning package

Use [tasks.md](../../tasks.md) as the main orchestrator. It joins product requirements, repository evidence, dependencies and acceptance criteria.

| Document | What it decides |
| --- | --- |
| [Enhanced PRD](../../PRD.md) | Product behavior, frontier scope, measurable outcomes and release boundaries |
| [Current product map](CURRENT_PRODUCT_MAP.md) | What exists, what is partial, verified gaps and runtime unknowns |
| [Domain map](CAREER_OS_DOMAIN_MAP.md) | Canonical ownership, justified schema extensions and migration invariants |
| [Information architecture](CAREER_OS_INFORMATION_ARCHITECTURE.md) | Every legacy route/subview and its canonical destination/disposition |
| [Context model](CAREER_OS_CONTEXT_MODEL.md) | Identity, revisions, navigation, action execution and recovery |
| [Design system](DESIGN_SYSTEM.md) | Reuse of existing tokens/primitives and required states |
| [Release plan](RELEASE_PLAN.md) | Qualification gates, fixtures, rollback, evaluation and integration boundaries |
| [Graphs](GRAPHS.md) | Program, architecture, domain, execution and action lifecycle |
| [Acceptance ledger](CAREER_OS_ACCEPTANCE_LEDGER.md) | Requirements → tasks → implementation/tests → evidence → status |
| [Source traceability](SOURCE_TRACEABILITY.md) | Coverage of all 88 original numbered sections |
| [Original authority](SOURCE_PRD.md) | Exact supplied PRD, retained without rewriting |
| [Plan manifest](plan.json) | Machine-readable task records; edit here to update orchestration |
| [Baseline evidence](evidence/BASELINE.md) | What was actually run and what remains unverified |

| [Delivery report](evidence/DELIVERY_REPORT.md) | What shipped, what was verified and how, migration/rollback readiness, remaining blockers |

Status (21 September 2026): R0–R2 are implemented and verified on the local Supabase stack (see [COS-034](evidence/COS-034-r2-gate.md) for the gate verdict); R3 is implemented with deterministic evaluation ([COS-040](evidence/COS-040-g8-verdict.md)); optional connectors are a recorded no-go ([COS-038](evidence/COS-038-connector-assessment.md)). Nothing has been deployed: the hosted project was not read or modified, no live-model call was made, and no legacy surface was retired. Production qualification (G7) is blocked until an authorised environment and hosted schema read exist.
