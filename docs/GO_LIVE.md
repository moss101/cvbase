# Go-live checklist

Ordered by dependency — each phase assumes the one above it passed. Nothing
here is optional-but-nice; items that genuinely are judgement calls say so.

**Read this first:** several things below have never been executed, only
written. They are marked **⚠️ unverified** and are the real risk in this
release, not the routine steps.

---

## Phase 0 — What is unverified today

Be honest about this before scheduling a launch date.

| Area | State |
| --- | --- |
| Web app | Built, typechecked, 106 tests, rendered and clicked through |
| iOS | Builds and runs on the simulator; segments checked in both themes |
| Android | Builds; APK installed and driven on a real device |
| Edge functions | Typechecked by CI (`deno test` over `_shared/`) — but `admin/` is **not** in that path |
| Auth flows | **⚠️ Never run end to end.** No email sent, no Google consent completed, on any platform |
| Admin gate | **⚠️ Never exercised.** No request has hit it |
| Payments | **⚠️ Not re-tested** since the auth rework |

The auth rework replaced every sign-in path in the product. Treat phase 3 as
the gate for everything else.

---

## Phase 1 — Accounts and secrets

- [ ] Supabase production project created, separate from any dev project
- [ ] `.env.cvbase.local` filled for the production project — never committed
      (`.gitignore` covers `.env.*`; verify with `git check-ignore -v .env.cvbase.local`)
- [ ] Server secrets set (these must **never** appear in the client bundle):
      `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=… STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… GEMINI_API_KEY=…`
- [ ] LLM provider keys set — `DEEPSEEK_API_KEYS`, `KIMI_API_KEYS`, and any of
      `ANTHROPIC_API_KEYS` / `OPENAI_API_KEYS` you intend to route to.
      Comma-separate multiple keys to pool them.
- [ ] Client env present at build time: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
      `STRIPE_PUBLISHABLE_KEY`
- [ ] Confirm the anon key is the **anon** key. Shipping a service-role key in
      the bundle hands every visitor full database access.

---

## Phase 2 — Database

- [ ] `supabase db push` against production
- [ ] Verify RLS is enabled on every table holding user data:
      ```sql
      select tablename, rowsecurity from pg_tables
      where schemaname = 'public' order by rowsecurity, tablename;
      ```
      Anything `false` is world-readable through PostgREST.
- [ ] Confirm `llm_providers` has **zero** policies — that is deliberate, it
      holds API keys and only `service_role` may read it:
      ```sql
      select count(*) from pg_policies where tablename = 'llm_providers';  -- expect 0
      ```
- [ ] Grant yourself admin:
      ```sql
      update public.profiles set is_admin = true where email = 'you@example.com';
      ```
- [ ] **Verify the escalation guard actually holds.** Signed in as a
      *non*-admin, attempt to set the flag through the API and confirm it stays
      false — this is the one control standing between any user and admin:
      ```sql
      select id, is_admin from public.profiles where email = 'test@example.com';
      ```

---

## Phase 3 — Auth ⚠️ the highest-risk phase

Full detail in [AUTH.md](./AUTH.md). Configuration first:

- [ ] Email provider enabled, *Confirm email* on
- [ ] Google provider enabled with client ID + secret
- [ ] **Magic Link template replaced** with the one in AUTH.md. Skip this and
      the email carries a link but **no code**, so the code step can never work.
- [ ] Redirect URLs include all three:
      `https://cvbase.ai/**`, `http://localhost:3000/**`, `ai.cvbase.app://auth-callback`
- [ ] Google Cloud authorised redirect URI:
      `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] SMTP configured. **The built-in Supabase mailer is rate-limited and not
      for production** — a passwordless product sends an email on *every*
      sign-in, so this will throttle on day one. Use Resend/SES/Postmark.

Then exercise every path — none of these has run yet:

- [ ] Web: request a code → email arrives with **both** digits and a link →
      code signs you in
- [ ] Second device: tap the magic link → signed in without the code
- [ ] Web: Google → consent → land back signed in
- [ ] **Android: Google must open the system browser, not an in-app WebView**,
      and return through the deep link. This is where it is most likely to fail.
- [ ] **iOS: same.** `CFBundleURLTypes` was missing entirely until recently, so
      verify the callback actually reaches the app.
- [ ] Brand-new account lands on Profile and cannot navigate away until the
      required fields are filled
- [ ] Existing account with a complete profile is **not** gated

---

## Phase 4 — Edge functions

- [ ] `deno check --node-modules-dir=none supabase/functions/admin/index.ts supabase/functions/health/index.ts` (also run by CI)
- [ ] `supabase functions deploy` (all)
- [ ] Stripe webhook endpoint points at the deployed `stripe-webhook`, and its
      signing secret matches `STRIPE_WEBHOOK_SECRET`; subscribed events:
      `checkout.session.completed`, `customer.subscription.*` (created/updated/
      deleted/paused/resumed/trial_will_end), `invoice.paid`, `invoice.payment_failed`
- [ ] Migrations `20260901100000`–`20260901100200` pushed (`stripe_events`,
      `apply_stripe_subscription`, resume-limit trigger); optionally
      `supabase secrets set STRIPE_AUTOMATIC_TAX=1` once Stripe Tax is enabled
- [ ] **Admin gate probes** — both must hold:
      ```bash
      curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $NON_ADMIN_JWT" "$SUPABASE_URL/functions/v1/admin/providers"
      ```
      expect `403`; and the admin response must contain **no** `api_keys` field:
      ```bash
      curl -s -H "Authorization: Bearer $ADMIN_JWT" "$SUPABASE_URL/functions/v1/admin/providers" | grep -c api_keys
      ```
      expect `0`.
- [ ] One AI action end to end (generation actually reaches a provider)
- [ ] Provider failover: disable the primary in the admin panel, confirm the
      fallback serves the next request

---

## Phase 5 — Web deploy

- [ ] Build env vars set in the host (Vercel/Netlify project settings)
- [ ] Deploy, then confirm response headers are live:
      ```bash
      curl -sI https://cvbase.ai | grep -i "content-security-policy\|strict-transport"
      ```
- [ ] Confirm **zero third-party requests** on load — the whole point of
      bundling Tailwind, fonts and icons:
      ```js
      performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith(location.origin))
      ```
      expect `[]`.
- [ ] `cvbase.ai` DNS + TLS, apex and `www` both resolving
- [ ] Light and dark both render; a CV preview stays ink-on-white in dark mode
- [ ] PDF and DOCX export produce correct files

---

## Phase 6 — Mobile release

Detail in [MOBILE_RELEASE.md](./MOBILE_RELEASE.md).

- [ ] `npm run mobile:build` (this is what copies the web build into both
      native projects — skipping it ships a stale app)
- [ ] Confirm the embedded bundle matches:
      ```bash
      diff <(ls dist/assets) <(ls ios/App/App/public/assets) && echo "in sync"
      ```

**Android**

- [ ] `JAVA_HOME` on **JDK 21** — Gradle 8.14.3 rejects the Java 25 that
      Android Studio bundles and the system Java 26
- [ ] Release keystore created and its properties in `~/.gradle/gradle.properties`
      (never the repo)
- [ ] `versionCode` incremented
- [ ] `./gradlew bundleRelease`, install the release build on a device
- [ ] Only after that passes, consider `minifyEnabled true` — Capacitor
      resolves plugins reflectively, so a keep-rule mistake fails at runtime,
      not at build time

**iOS**

- [ ] Signing team set; `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` bumped
- [ ] Archive → validate → upload
- [ ] ⚠️ **Decide the `ai.cvbase.app` id now.** It is permanent: neither store
      lets you change it after the first upload.

**Store listings** — screenshots, description, privacy policy URL, data-safety
form, age rating, and a test account for review (passwordless: give reviewers
an address you can read the code from).

---

## Phase 7 — Before announcing

- [ ] Error monitoring wired (Sentry or equivalent) — there is none today, so
      right now a production crash is invisible
- [ ] Uptime check on the site and on the health probe:
      `GET $SUPABASE_URL/functions/v1/health` (deployed with `--no-verify-jwt`;
      `verify_jwt = false` in `supabase/config.toml`) — `200 { ok: true, db: "ok", llm: N }`
      when healthy, `503` when the database is unreachable. Alert on non-200
      and on `llm: 0` (routing has no keyed provider). The admin Overview tab's
      Health card reads the same URL
- [ ] `pg_cron` enabled on the hosted project (Dashboard → Database →
      Extensions) and the three jobs present in `cron.job`
      (`prism_alert_scan`, `prism_prune_runs`, `ops_prune_logs`) — see
      docs/ADMIN.md "Scheduled jobs"
- [ ] Supabase backups on, and a restore actually tested
- [ ] Rollback rehearsed: web is a host rollback; mobile is a phased release —
      **halt-and-fix, since a bad build cannot be recalled from installed devices**
- [ ] Legal pages reachable and current
- [ ] Someone who has never seen the app completes signup → profile → CV →
      export without help

---

## Known gaps at launch

Not blockers, but decide consciously rather than discovering them later.

| Gap | Impact |
| --- | --- |
| No error monitoring | Production failures are invisible |
| Android release build never installed | Only the debug build has run on hardware |
| `minifyEnabled false` | Larger APK; enabling it is untested |
| Material Symbols ships whole (3.9 MB) | App size; templates need its variable axes, so subsetting means moving 440 call sites to codepoints |
| Admin panel is read-only for users | User/subscription edits go through Supabase Studio |
