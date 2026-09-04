# Your data: export and account deletion

Everything a signed-in user owns can be downloaded as one JSON file or removed
for good from **Settings → Your data**. Both actions are Edge Functions that run
with the caller's session; no support ticket or operator step is involved.

| Surface | Where |
| --- | --- |
| UI | `components/SettingsPanel.tsx` ("Your data" section) |
| Client | `services/repos/accountRepo.ts` — `exportAccount()`, `deleteAccount(confirmEmail)` |
| Server | `supabase/functions/account-export`, `supabase/functions/account-delete` |
| Schema | `supabase/migrations/20260901300000_account_lifecycle.sql` |
| Smoke | `bash supabase/tests/w8-account-lifecycle-smoke.sh` (local stack only) |

## What a user owns

Every table below carries `user_id` (or `id` for `profiles`) with
`references auth.users on delete cascade`, so deleting the auth user removes the
lot in one statement. The migration header keeps the audit list current.

| Table | Written by | Read/delete by the user? |
| --- | --- | --- |
| `profiles` | client (RLS) | yes |
| `resumes`, `resume_versions`, `job_applications` | client (RLS) | yes |
| `subscriptions`, `usage_counters` | service role (webhooks / metering) | read only |
| `prism_runs`, `prism_line_flags` | service role | read only |
| `ats_reports` | `ats-analyze` (service role) | select + delete |
| `headshots` (+ objects under `headshots/{uid}/`) | `ai-headshot` (service role) | select + delete |

Deliberately **not** cascaded: `ai_logs.user_id` and `admin_audit_log.actor_id`
go to `null` on delete. Those are operational/audit rows; they carry no CV
content and must outlive the account.

## `account-export`

`POST /functions/v1/account-export` with a user JWT, empty body.

Returns `200` with `Content-Type: application/json` and
`Content-Disposition: attachment; filename="cvbase-export-YYYY-MM-DD.json"`:

```json
{
  "format": "cvbase-account-export", "version": 1, "exportedAt": "...",
  "account": { "id", "email", "createdAt", "lastSignInAt", "providers" },
  "profile": {...},
  "resumes": [...], "resumeVersions": [...], "jobApplications": [...],
  "subscription": { "plan_id", "cycle", "status", "current_period_*", "cancel_at_period_end", ... },
  "usageCounters": [...],
  "prismRuns": [ /* metadata only: id, status, template_id, resume_id, tokens_used, ... */ ],
  "prismLineFlags": [...],
  "atsReports": [...],
  "headshots": [ { "storagePath", "createdAt", "signedUrl", "expiresInSeconds": 3600 } ]
}
```

Excluded on purpose: Stripe identifiers, PRISM run bodies (JD/CV text,
checkpoints, drafts, results), `ai_logs`, and every operator-only table. The
headshot links are signed for one hour; the file itself does not embed images.

Errors: `401 missing_authorization | invalid_token`, `500 export_failed`
(`{ table }` names the failing read).

## `account-delete`

`POST /functions/v1/account-delete` with a user JWT and `{ "confirm": "<email>" }`.
`confirm` is compared (trimmed, case-insensitive) with the **JWT's** email, never
the client's idea of it.

Order of operations — each step aborts the whole request on failure, so a
partial delete is not possible:

1. Cancel the live Stripe subscription (`stripe_subscription_id` on the
   `subscriptions` row). Already-canceled / missing subscriptions are skipped.
   A Stripe API failure returns `502 stripe_cancel_failed` and nothing is deleted.
   The Stripe *customer* is kept: invoices and tax records must survive.
2. Remove every storage object under `headshots/{uid}/` (nothing else links
   them to the user).
3. `auth.admin.deleteUser(uid)` — the cascades above take every table row.

Response: `200 { "deleted": true, "subscriptionCancelled": bool, "headshotsRemoved": n }`.
Errors: `400 confirm_mismatch`, `401 …`, `502 stripe_cancel_failed`,
`500 delete_failed` (`{ step }`).

The client signs out afterwards (the session's user no longer exists, so the
server-side sign-out is expected to be refused and is ignored).

## Saved ATS reports and headshots in the app

- `services/repos/atsReportRepo.ts` — `listRecent(userId, n)`, `getById`,
  `remove`. The ATS analyzer shows the latest ten under "Recent reports" with
  reopen/delete; the on-device `cvbase-last-ats-score` cache stands in when
  nothing is saved to the account.
- `services/repos/headshotRepo.ts` — `list(userId)`, `signedUrl(path)`.

Neither table has a client insert policy: only the metered Edge Functions write.
