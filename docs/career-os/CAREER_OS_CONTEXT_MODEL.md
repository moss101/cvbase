# Career OS context and execution contract

This is the proposed shared contract for [REQ-02/08/25/26](../../PRD.md). Extend `NavigationProvider`, `services/api.ts`, repositories and existing AI handlers. Do not place whole career records in URLs or rely on component memory for identity.

## Reference envelope

Illustrative TypeScript contract, not an implementation module:

```typescript
type Ref = { id: string; revision: string };
type ContextRef = {
  schemaVersion: 1;
  career: Ref;
  goal?: Ref;
  campaign?: Ref;
  opportunity?: Ref;
  application?: Ref;
  document?: Ref;
};
type CareerContext = {
  refs: ContextRef;
  source: 'route' | 'selection' | 'action' | 'conversation';
  completeness: 'ready' | 'partial' | 'stale' | 'unavailable';
  missing: string[];
  projection: Record<string, unknown>; // replace with per-consumer types
};
```

The authenticated user comes from the session/server token, not a trusted client-supplied `userId`. Permissions and entitlements are recomputed on the server. A frontend envelope may advertise available operations for UX but never grants them.

| Context | Route identity | Derived fields / persistence |
| --- | --- | --- |
| Career | `/app/career` | Authenticated user's canonical career; no arbitrary other-user selector |
| Goal | `/app/career/goals/:goalId` | Saved revision and primary status |
| Campaign | `/app/campaigns/:campaignId` | Goal association and owned memberships |
| Opportunity | `/app/opportunities/:opportunityId` | Source snapshot/revision; optional selected goal or campaign query |
| Application | `/app/applications/:applicationId/:section` | Opportunity, owning campaign and decision-time goal; server authoritative |
| Document | `/app/library/cvs/:resumeId/edit` | Existing resume ID; optional originating application validated through relationship |
| Coach | `/app/coach/:conversationId` | Conversation context; opening from a subject creates/reuses an explicitly scoped conversation |

Allowed context query keys are IDs such as `goal`, `campaign`, `application` or `opportunity`. They are hints and must be ownership/relationship validated; URL context never overrides the application's persisted relationship. Do not include CV/JD text, access tokens, email addresses or compensation in URLs. Never put context identifiers into public analytics URLs without redaction.

## Resolution and state ownership

1. Parse and validate route shape. Retain encoded-ID handling, same-origin sign-in continuation and native back behavior. Extend parser depth for nested routes.
2. Resolve the main owned object, then its related context server-side or through same-owner repositories. If a provided query contradicts persisted relations, show a context conflict and retain the authoritative application; do not silently apply the hint.
3. Project the minimum data each consumer needs. Tailoring receives relevant facts/JD; a campaign card receives counts. A conversation summary is derived memory, not authority.
4. React context holds selection/references and cache status; server records own persisted entities; component state owns unsaved inputs and local disclosure. Cache keys include user ID + entity ID + revision + projection version. Clear sensitive selections on sign-out/account switch.
5. Mutations carry expected revision. Reject stale writes with conflict data and offer review/retry. Invalidate dependent fit/recommendations when facts, goals, JD or document input versions change.
6. Preserve unsaved work in a correctly scoped draft with visible save status. Never switch to the primary CV because a requested ID is missing. Show unavailable/deleted/permission states without leaking record existence across accounts.
7. Reload, browser back/forward, native hardware back, deep link and re-auth all resolve the same subject. A user may intentionally switch context; show the change and keep prior artifacts in their original context.

## Actions and tools

Initial vocabulary: `REVIEW_OPPORTUNITY`, `IMPROVE_ACHIEVEMENT`, `PREPARE_INTERVIEW`, `TAILOR_CV`, `FOLLOW_UP_APPLICATION`, `UPDATE_SKILL`, `START_CAMPAIGN`, `REVIEW_PROFILE`, `COMPARE_ROLES`. Add `START_APPLICATION`, `RECORD_OUTCOME` and `REVIEW_IMPORT` for the explicit execution and onboarding journeys.

An action record includes ID/type, context, title/reason, evidence IDs, source/rule version, input revisions, priority band, destination, optional estimated effort, status, dedupe key, created/updated/expiry time, snooze time, last error and result reference. Effort estimates need provenance or a clear estimate label. A recommendation may be informational; it is not automatically an executable tool.

| Status | Entry condition | Allowed exits |
| --- | --- | --- |
| PROPOSED | Candidate computed, prerequisites not yet validated | READY, DISMISSED, EXPIRED |
| READY | Context and prerequisites valid | IN_PROGRESS, DISMISSED, EXPIRED |
| IN_PROGRESS | Durable execution started | WAITING_FOR_USER, COMPLETED, FAILED, DISMISSED after cancellation reconciliation |
| WAITING_FOR_USER | Fact review, confirmation or external step required | IN_PROGRESS, DISMISSED, EXPIRED |
| FAILED | Structured failure and retryability stored | READY on revalidation, DISMISSED, EXPIRED |
| COMPLETED | Durable owned result or explicit external outcome receipt | Terminal; correction creates a linked event |
| DISMISSED | User declined/cancelled remaining work | Terminal for this input revision |
| EXPIRED | Deadline/input/permission changed | Terminal; recompute a new proposal if appropriate |

Snooze defers an eligible action with `snoozed_until`; it is not completion. Cancelling an in-progress run records cancellation separately, halts further steps, then dismisses the remaining action after reconciliation. A timeout with unknown side effects enters recovery, not blind retry. Tool and action status vocabularies can differ if the mapping is explicit.

Each registered tool declares input/output schema, scope, prerequisites, side-effect class, confirmation policy, handler, idempotency behavior, quota rule, result type and recovery path. Validate runtime payloads; generic `callFn<T>` compile-time typing alone is insufficient. Sanitize external text and reject instructions embedded in imported documents that try to drive tools.

## Execution and charging sequence

Resolve auth/context → validate revisions/ownership/entitlement → construct plan → obtain required content-specific confirmation → create/reuse logical action run → reserve usage per contract → invoke registered handler → checkpoint → persist artifact + relationship + receipt → settle/release usage → emit domain event → invalidate derived views.

Cross-system effects cannot generally be one transaction. Use durable pending receipts and reconciliation for artifact save/finalize/usage steps; retries query the receipt and underlying PRISM run first. Never promise atomic rollback of external submissions. Confirmation tokens are scoped, expiring and bound to the proposed content/destination/revision.

PRISM is reused as a specialist handler. Its current analyze/generate/finalize phases and statuses must map to general action status without rewriting its graph. A client disconnect is not success or cancellation. Resume by application-associated run ID; report actual stored stages only.

## Mandatory continuity fixtures

Opportunity O1 + goal G1 → application A1 → CV D1 → conversation C1 → interview I1 → outcome X1 must keep owned references after each reload. Add competing O2/A2/D2 to prove selection cannot bleed. Revise G1 mid-application, delete D1, expire auth, deny quota, interrupt PRISM and switch accounts; each has an explicit recoverable or permission state. Submitted D1 keeps its submission snapshot even after the Career changes.
