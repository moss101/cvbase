# Authentication

Passwordless only: an emailed 6-digit code, the magic link in that same email,
and Google. There is no password anywhere in the app, and no separate sign-up —
an email either matches an account or creates one.

| Surface | Component |
| --- | --- |
| Web | `components/AuthModal.tsx` (modal) |
| Android / iOS | `components/AuthGate.tsx` (full screen) |
| Shared plumbing | `services/authFlow.ts` |

## The one thing to understand before configuring

**`signInWithOtp` does not choose between a code and a link — the email
template does.** Supabase sends a magic link unless the template renders
`{{ .Token }}`, in which case it sends a code. There is no per-request flag, and
a project has one template per email type.

So a single template renders **both**: the 6-digit code *and* a link built from
`{{ .TokenHash }}`. One email arrives, and the user takes whichever suits —
typing the code on the device they requested it from, or tapping the link from
their mail app on another device. `verifyOtp` accepts either.

### Magic Link template

Authentication → Emails → **Magic Link**:

```html
<h2>Sign in to CVBase</h2>

<p>Your code is:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700">{{ .Token }}</p>
<p>It expires in 10 minutes.</p>

<p>Or just tap this link on this device:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
    Sign in to CVBase
  </a>
</p>
```

## Dashboard configuration

### Providers

Authentication → Providers:

- **Email** — enabled. Turn *Confirm email* on; with passwordless it is the
  sign-in step itself, so there is no extra friction.
- **Google** — enabled, with the client ID and secret from a Google Cloud OAuth
  client.

### URL configuration

Authentication → URL Configuration:

| Setting | Value |
| --- | --- |
| Site URL | `https://cvbase.ai` |
| Redirect URLs | `https://cvbase.ai/**`, `http://localhost:3000/**`, `ai.cvbase.app://auth-callback` |

The third entry is what makes the mobile apps work — without it the provider
refuses to redirect back into the app and the user is stranded in a browser tab.
`**` matches across `/` and `.`, so the localhost entry covers any dev path.

### Google Cloud Console

Authorised redirect URI — Google always calls Supabase, never the app directly:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Authorised JavaScript origins: `https://cvbase.ai` and `http://localhost:3000`.

**The mobile apps need no separate Google client.** They open the same web
consent screen in the system browser and come back over the deep link, so one
Web client ID covers all three platforms.

## Why PKCE

`services/supabase.ts` sets `flowType: 'pkce'`. The default implicit flow
returns tokens in the URL *fragment*, which a native deep link never delivers to
the app and which leaks into browser history on the web. PKCE returns a
short-lived `code` in the query string that is exchanged for a session, so one
code path serves both platforms.

## How mobile returns from the browser

Google refuses OAuth inside an embedded WebView (`disallowed_useragent`), so the
consent screen must open in the system browser:

1. `signInWithOAuth({ skipBrowserRedirect: true })` returns a URL instead of
   navigating.
2. `@capacitor/browser` opens it in the system browser.
3. Google → Supabase → `ai.cvbase.app://auth-callback?code=…`.
4. The OS routes that to the app as an `appUrlOpen` event, which
   `listenForAuthDeepLinks` picks up.
5. `exchangeCodeForSession(code)` establishes the session and the browser closes.

The custom scheme is already registered — Capacitor derives it from `appId` in
`capacitor.config.ts` (`ai.cvbase.app`), and `strings.xml` carries the matching
`custom_url_scheme`.

## First-run profile gate

A signed-in user whose profile is missing required details is held on the
**Profile** page. The CV generator produces nonsense without a name or a target
role, so this is the one place the app is opinionated about order.

Required fields live in one place — `services/profileCompleteness.ts`:

| Field | Why |
| --- | --- |
| First name, Last name | The CV header |
| Phone number | Contact block |
| Target job title | Drives tailoring and ATS matching |
| Industry | Template and keyword selection |
| Years of experience | Seniority framing |

Everything else on the profile page stays optional, so the gate never becomes
busywork. The banner names exactly what is still blank, and the guard re-asserts
on every tab change so tapping another nav item cannot slip past it.

To change what counts as complete, edit `REQUIRED_PROFILE_FIELDS` — the gate and
the banner both read it, so they cannot disagree.

## Local development

`supabase start` serves auth on `http://127.0.0.1:54321`. Emails are not sent —
open **Inbucket** at `http://127.0.0.1:54324` to read them and copy the code.

## Not verified

The flows are wired and typecheck, and the sign-in UI is confirmed rendering
with working validation, but **no end-to-end sign-in has been exercised** — that
needs the dashboard configuration above plus a real Google client. Before
trusting it:

1. Email code, web — request a code, confirm it arrives with both the digits and
   the link, and that the code signs you in.
2. Magic link on a second device — the link should sign you in without the code.
3. Google, web — consent, then land back signed in.
4. Google, Android/iOS — must open the **system browser**, not an in-app
   WebView, and return through the deep link.
5. First run — a brand-new account should land on Profile and be unable to
   navigate away until the required fields are filled.
