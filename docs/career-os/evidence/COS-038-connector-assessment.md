# COS-038 — Optional market and personal-data connectors: assessment and decision

21 September 2026 · Desk assessment plus the product record shipped in Settings → Integrations (`components/careeros/settings/connectorAssessment.ts`, `IntegrationsPage.tsx`, assessment version `connectors-assessment-1`). No credentials were collected, no provider was called and no external send capability exists anywhere in the codebase.

## Decision

**No-go for this release for every assessed source.** Manual import remains the complete path: paste a listing (source, date seen and captured content retained), record submissions and responses yourself, enter interview times once. COS-039 (implement one read-only connector) is therefore not started and is blocked on a future re-assessment with an authorised, permitted source.

## Sources assessed

| Source | Permission / rights | API, scope and rate | Retention | Cost | Disconnect behaviour required | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Job-board feeds (aggregators, public listing pages) | Aggregator terms restrict automated retrieval and redistribution; listing pages prohibit scraping. Public ATS board endpoints (per-company JSON) are permitted for that company's own board but give no discovery across employers. | Keyed aggregator APIs: per-key quotas, attribution clauses, country limits. Public ATS boards: unauthenticated GET per posting id. | Listing text would be a third-party copy needing refresh/expiry rules. | Aggregator keys: free tiers with quotas; paid above. | Purge cached listings; keep user-created opportunities (`source_kind` `paste`/`manual`; the schema already reserves `connector`). | **No-go** (rights). Future candidate: fetch-by-URL for public ATS boards only, with provenance `source_kind = connector`, `source_url` and the fetch date as `captured_at`. |
| Mailbox (Gmail / IMAP) for recruiter threads | Google restricted scopes require app verification and a paid CASA security assessment; IMAP needs standing credentials. | `gmail.readonly` exposes the whole mailbox to find a handful of threads; polling/push quotas. | Would retain unrelated mail fragments unless aggressively filtered. | Verification/assessment cost; provider quotas. | Token revocation + purge of every derived row. | **No-go** (scope): access far exceeds the value; classification of "application response" from mail is unreliable without a model call per message. |
| Calendar (Google / Apple) for interview dates | OAuth calendar read scope; EventKit on iOS needs user permission per app. | `calendar.readonly` returns all events; iOS EventKit is local-only. | Unrelated events would be retained with no deletion boundary. | Provider quotas; no paid tier needed. | Revoke + purge. | **No-go** (retention): the person already enters the interview time once; the value does not justify standing access. |
| LinkedIn account (profile, connections, applications) | No permitted read API for member profile/connections/applications; scraping violates the terms. | n/a | n/a | n/a | n/a | **No-go** (rights). Contacts are never inferred; the networking section stays a private note the user writes. |

## What the product does instead

* Opportunities: paste import with editable title/company/location, `captured_content`, `captured_at`; freshness (`fresh` < 14 days, `aging` < 45, then `stale`; `unknown` when no date) derives only from the listing date or capture date; no listing is fetched.
* Applications: submission and responses are user-recorded with `provenance = user_reported`; the "Open employer site" action never changes stage.
* Interviews: time recorded once with an IANA zone; reminders derive only from recorded dates.
* Settings → Integrations shows the four assessments and their constraint so the person knows why no connector is offered.

## What a future go would need

Source permission in writing, a read-only scope narrower than the whole mailbox/calendar/profile, provenance (`source_kind`, fetched-at, freshness) on every imported row, dedupe on external ids so out-of-order events cannot create duplicate applications or actions, disconnect that purges derived rows, and a separate reviewed send flow before any outbound message — none of which is implied by this decision.
