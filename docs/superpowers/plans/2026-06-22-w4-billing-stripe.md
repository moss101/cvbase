# W4 — Billing (Stripe) + Server-Enforced Entitlements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulated payment gateway with real Stripe Checkout + Customer Portal + webhooks, making the Postgres `subscriptions` table (written only by the webhook) the single source of truth for plan entitlements — so the `requireFeature`/`checkAndMeter` gates built in W3 become real, unspoofable revenue.

**Architecture:** A one-off script creates Stripe **test-mode** products/prices from the `PLANS` catalog. `stripe-checkout` creates a Checkout Session for a plan+cycle (with promo support); `stripe-webhook` verifies the signature and reduces Stripe events into an upsert of `subscriptions` (service_role); `stripe-portal` opens the Customer Portal. The client billing UI (`PricingPage`/`CheckoutPage`/`BillingDashboard`) re-points to Checkout/Portal, and `SubscriptionProvider` reads entitlements **read-only** from `subscriptions` + `usage_counters`. The simulated gateway in `subscriptionService.ts` is removed.

**Tech Stack:** Stripe (Checkout + Customer Portal + webhooks), `npm:stripe` in Deno Edge Functions, Stripe CLI for local webhook forwarding, Postgres (`subscriptions` from W2), React/Vite client.

## ⚠️ OPERATOR PREREQUISITES — do these before executing (W4 is blocked without them)

1. **Use Stripe TEST keys, not live.** `.env.cvbase.local` currently holds `sk_live`/`pk_live`. **Rotate those exposed live keys** in the Stripe dashboard, then put **test-mode** keys in `.env.cvbase.local`:
   `STRIPE_SECRET_KEY=sk_test_…`, `STRIPE_PUBLISHABLE_KEY=pk_test_…` (the publishable one is the client `VITE_STRIPE_PUBLISHABLE_KEY`).
   **No Stripe API call may run against a live key during development.**
2. **Install the Stripe CLI** (`brew install stripe/stripe-cli/stripe`) and `stripe login` — needed to forward webhooks locally and to `stripe trigger` test events.
3. **Webhook secret:** `stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook` prints a `whsec_…`; put it in `.env.cvbase.local` as `STRIPE_WEBHOOK_SECRET`.
4. Push server secrets to the local function runtime via `supabase functions serve --env-file .env.cvbase.local` (and `supabase secrets set --env-file .env.cvbase.local` for cloud later).

## Global Constraints

- npm + Node 20; **trailing-space dir** `/Volumes/DATA/cvbase ` (quote it; include the space in absolute file-tool paths). Tests via `npm test`/`./node_modules/.bin/vitest`.
- Branch `feat/supabase-stripe-production`; commit per task; co-author `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **`subscriptions` is service_role-write-only** (W2 RLS): ONLY `stripe-webhook` writes it. The client reads it; it NEVER grants entitlements.
- **No secret in the client bundle.** Client gets only `VITE_STRIPE_PUBLISHABLE_KEY`. `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` live only in function env.
- Reuse W3 `_shared` (auth, respond, cors). Plan catalog is `subscriptionService.PLANS`; entitlement limits already mirrored in `_shared/entitlement.ts`.
- Typecheck baseline is **13** (post-W3); W4 must not increase it.

## Reference — current state

- `services/subscriptionService.ts`: `PLANS` (Free $0 / Pro $12mo,$8yr / Elite $24mo,$16yr), `getPlan`, `formatMoney`, promo codes (CVBASE20 20%, LAUNCH50 50%, FRIEND10 10%), and the SIMULATED gateway `processCardPayment` (`:335`, approves any Luhn-valid card) + `usageLimit/usageRemaining/recordUsage`.
- W2 `subscriptions` columns: `user_id`(PK), `stripe_customer_id`, `stripe_subscription_id`, `plan_id`(free/pro/elite), `cycle`(monthly/yearly), `status`, `current_period_start/end`, `cancel_at_period_end`, timestamps.
- Billing UI: `components/billing/PricingPage.tsx`, `CheckoutPage.tsx`, `BillingDashboard.tsx`; `components/SubscriptionProvider.tsx`.

---

### Task 1: Stripe products/prices from the PLANS catalog (test mode)

**Files:** Create `scripts/stripe-setup.ts` (Node script run with `tsx`/`node`), output `config/stripe-prices.json` (committed: maps `plan+cycle` → Stripe price id).

- [ ] **Step 1:** Implement `scripts/stripe-setup.ts`: read `PLANS` from `services/subscriptionService`; for each paid plan (pro, elite) create (idempotently, by lookup_key) a Product and two recurring Prices (monthly = `monthlyPrice`, yearly = `yearlyPrice*12` billed yearly), in **test mode** using `STRIPE_SECRET_KEY`. Write `{ "pro:monthly": "price_…", "pro:yearly": "price_…", "elite:monthly": "...", "elite:yearly": "..." }` to `config/stripe-prices.json`.
- [ ] **Step 2:** Run `STRIPE_SECRET_KEY=sk_test_… npx tsx scripts/stripe-setup.ts`; verify `config/stripe-prices.json` has 4 price ids. **Commit** `feat(w4): stripe product/price setup script + price map (test mode)`.

### Task 2: `stripe-checkout` Edge Function + shared Stripe client

**Files:** Create `supabase/functions/_shared/stripe.ts` (`new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {apiVersion})`), `supabase/functions/stripe-checkout/index.ts`.

**Interfaces:** Request `{ planId: 'pro'|'elite', cycle: 'monthly'|'yearly', promoCode?: string }` → `{ url }` (Checkout Session URL).

- [ ] **Step 1:** `stripe-checkout`: auth (`getUser`); look up the price id from the committed price map; find-or-create the Stripe Customer (store `stripe_customer_id` on first use via service_role); create a Checkout Session (`mode:'subscription'`, `line_items:[{price, quantity:1}]`, `success_url`/`cancel_url` to the app, `client_reference_id = user.id`, `metadata:{user_id, plan_id, cycle}`, `allow_promotion_codes:true` or apply the mapped promo). Return `{ url }`.
- [ ] **Step 2:** Serve + curl with a test JWT → returns a `checkout.stripe.com` URL. **Commit** `feat(w4): stripe-checkout edge function`.

### Task 3: `stripe-webhook` Edge Function (the source-of-truth reducer)  ⚠️ critical

**Files:** Create `supabase/functions/stripe-webhook/index.ts`. (Add `[functions.stripe-webhook] verify_jwt = false` in `supabase/config.toml` — Stripe calls it without a Supabase JWT; it authenticates via the Stripe signature instead.)

- [ ] **Step 1:** Verify the signature with `stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET)`; on failure 400. Use the **raw** request body.
- [ ] **Step 2:** Reduce events → upsert `subscriptions` (service_role): `checkout.session.completed` (map `client_reference_id`→user, set customer/subscription ids + plan/cycle from metadata, status active); `customer.subscription.created/updated/deleted` (status, current_period_start/end, cancel_at_period_end, plan_id/cycle from the price→plan reverse map); `invoice.paid`/`invoice.payment_failed` (status). Always key by `user_id`.
- [ ] **Step 3:** Test with the Stripe CLI: `stripe trigger checkout.session.completed` / `customer.subscription.updated`; assert the `subscriptions` row upserts with the right plan/status. **Commit** `feat(w4): stripe-webhook -> subscriptions (source of truth)`.

### Task 4: `stripe-portal` Edge Function

**Files:** Create `supabase/functions/stripe-portal/index.ts`.

- [ ] **Step 1:** auth; load `stripe_customer_id` from `subscriptions`; create a Billing Portal session (`return_url` to the app); return `{ url }`. 400 if no customer yet.
- [ ] **Step 2:** Serve + curl with a JWT (after a test checkout) → portal URL. **Commit** `feat(w4): stripe-portal edge function`.

### Task 5: Client cutover — real billing, read-only entitlements  ⚠️ CHECKPOINT BEFORE STARTING

**Files:** Modify `components/billing/PricingPage.tsx`, `CheckoutPage.tsx`, `BillingDashboard.tsx`, `components/SubscriptionProvider.tsx`, `services/subscriptionService.ts`.

- [ ] **Step 1:** `PricingPage`/`CheckoutPage`: replace the simulated card form with a "Subscribe" button → `api.callFn('stripe-checkout', {planId, cycle})` → redirect to `url`. Remove `processCardPayment`, the Luhn/card UI, and client proration logic from `subscriptionService.ts` (keep `PLANS`, `getPlan`, `formatMoney`, promo metadata for display).
- [ ] **Step 2:** `BillingDashboard`: "Manage billing" → `api.callFn('stripe-portal')` → redirect.
- [ ] **Step 3:** `SubscriptionProvider`: read entitlements from `billingRepo.getSubscription` + `usageRepo.getUsage` (W2 repos), read-only — drop the localStorage/simulated billing state. The UI reflects the plan but never grants it.
- [ ] **Step 4:** Reconcile the job-tracker placement: tracker is a **Free** feature, surfaced outside the Elite-gated Smart Studio shell (move/ungate as needed).
- [ ] **Step 5:** typecheck (≤13) + build. **Commit** `feat(w4): client billing on Stripe Checkout/Portal; read-only entitlements; remove simulated gateway`.

### Task 6: End-to-end verification + tag

- [ ] **Step 1:** With `stripe listen` forwarding + functions served: do a **test-mode** Checkout (card `4242 4242 4242 4242`) for Pro → webhook fires → `subscriptions` row shows `pro/active` → a previously-403 `ai-linkedin` call now succeeds for that user. Downgrade/cancel via Portal → webhook updates the row → entitlement revoked.
- [ ] **Step 2:** Write `supabase/tests/w4-billing-smoke.sh`: `stripe trigger` the key events, assert `subscriptions` upserts and that entitlement flips (free→pro unlocks Smart Studio; cancel re-locks). Assert the client cannot write `subscriptions` (RLS denies).
- [ ] **Step 3:** Full gate (typecheck ≤13, test, build) + **tag** `git tag w4-complete`.

## Self-Review

- **Spec coverage (§7 W4):** products/prices script (T1); stripe-checkout (T2), stripe-webhook→subscriptions (T3), stripe-portal (T4); client re-pointed to Checkout/Portal + `SubscriptionProvider` read-only + remove simulated gateway + tracker reconcile (T5); entitlement guards already enforced server-side in W3 (`requireFeature`/`checkAndMeter`); test purchase drives plan via webhook + unspoofable (T6). ✓
- **Security:** `subscriptions` written only by the webhook (service_role); signature-verified; no secret in the bundle; entitlements server-enforced. ✓
- **Risk:** T5 is the user-facing cutover (CHECKPOINT). All Stripe work is **test-mode only**; the live keys must be rotated + replaced first (see prerequisites).
- **Deferred:** live (non-test) Stripe go-live is an operator step (§10); DOCX/version-manager/etc. are W5–W6.
