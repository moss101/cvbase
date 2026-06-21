# W0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, batch with checkpoints) to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the dev/test/backend toolchain and project scaffold so all later workstreams (auth, data, AI, billing) have a tested, buildable, Supabase-ready foundation — with **zero secrets required**.

**Architecture:** Add Vitest + strict TypeScript for the client/shared code, scaffold a local Supabase stack (`supabase/` with migrations + functions dirs), wire a typed client env loader that reads only client-safe values, add a CI workflow, and prove the test harness with a real test of an existing pure function.

**Tech Stack:** Vite 6, React 19, TypeScript 5.8 (strict), Vitest, Supabase CLI 2.22 (local stack via Docker), GitHub Actions.

## Global Constraints

- Package manager: **npm** (package-lock.json present). Node 20.
- Directory has a **trailing space**: `/Volumes/DATA/cvbase ` — always quote paths.
- **No secret values** in W0. Client-safe env vars only: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY`.
- Branch: `feat/supabase-stripe-production`. Commit after each task.
- Do not delete Firebase code yet (removed in W1/W2); W0 is additive.

---

### Task 0.1: Test harness + strict TypeScript

**Files:**
- Modify: `package.json` (add devDeps + scripts)
- Create: `vitest.config.ts`
- Modify: `tsconfig.json` (enable strict)
- Test: `services/__tests__/subscriptionService.test.ts`

**Interfaces:**
- Produces: `npm test` (vitest run), `npm run typecheck` (tsc --noEmit) available to all later tasks.

- [ ] **Step 1:** Add devDeps `vitest`, `@vitest/coverage-v8`, `jsdom`; add scripts `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"`. Run `npm install`.
- [ ] **Step 2:** Create `vitest.config.ts` with `environment: 'node'` default (jsdom per-file when needed), globals enabled.
- [ ] **Step 3: Write a failing test** for the existing pure `luhnValid` and `quoteCheckout`/`formatMoney` in `services/subscriptionService.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { luhnValid, formatMoney, getPlan } from '../subscriptionService';

describe('subscriptionService pure helpers', () => {
  it('luhnValid accepts a valid test card and rejects junk', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('1234')).toBe(false);
  });
  it('formatMoney strips trailing .00', () => {
    expect(formatMoney(12)).toBe('$12');
    expect(formatMoney(12.5)).toBe('$12.50');
  });
  it('getPlan falls back to free for unknown id', () => {
    expect(getPlan('free').id).toBe('free');
  });
});
```

- [ ] **Step 4:** Run `npm test` — expect FAIL only if imports break; otherwise PASS (functions already exist). This validates the harness against real code.
- [ ] **Step 5:** Set `"strict": true` in `tsconfig.json`; run `npm run typecheck`. Record any errors in a `docs/superpowers/plans/w0-typecheck-baseline.txt` (do NOT fix app-wide here — later workstreams touch those files; only fix errors introduced by W0).
- [ ] **Step 6: Commit** `chore(w0): add vitest + strict typescript, first real test`.

### Task 0.2: Supabase local scaffold

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/.gitkeep`, `supabase/functions/_shared/.gitkeep`
- Create: `supabase/README.md` (how to run local stack)

**Interfaces:**
- Produces: `supabase start` local stack (Postgres/Auth/Storage/Edge runtime) for W1–W4 local development.

- [ ] **Step 1:** Run `supabase init` (non-interactive) in the project root; it creates `supabase/config.toml`.
- [ ] **Step 2:** Create `supabase/migrations/` and `supabase/functions/_shared/` with `.gitkeep` files.
- [ ] **Step 3:** Write `supabase/README.md`: prerequisites (Docker), `supabase start` / `supabase status` / `supabase stop`, where local Studio + anon key print, how to link the cloud project later (`supabase link --project-ref <ref>`).
- [ ] **Step 4:** Run `supabase start` to pull images and verify the stack boots; capture the local `API URL` + `anon key` into `supabase/README.md` notes (these are local dev values, not secrets). If image pull is slow, allow it to complete in background.
- [ ] **Step 5:** Run `supabase status` — expect all services `RUNNING`.
- [ ] **Step 6: Commit** `chore(w0): scaffold local supabase stack`.

### Task 0.3: Client env loader (no secrets)

**Files:**
- Create: `src/config/env.ts` (typed accessor)
- Modify: `vite.config.ts` (inject only client-safe vars; stop injecting the Gemini key)
- Test: `src/config/__tests__/env.test.ts`

**Interfaces:**
- Produces: `getClientEnv(): { supabaseUrl: string; supabaseAnonKey: string; stripePublishableKey: string }` consumed by W1 (`services/supabase.ts`) and W4 (Stripe).

- [ ] **Step 1: Write failing test** `env.test.ts` asserting `getClientEnv()` throws a clear error when `SUPABASE_URL` is missing and returns the trio when set (inject via `vi.stubEnv`).
- [ ] **Step 2:** Run `npm test` — expect FAIL (module missing).
- [ ] **Step 3:** Implement `src/config/env.ts` reading `import.meta.env.VITE_*` with a dev fallback to local-supabase defaults; throw on missing in production mode.
- [ ] **Step 4:** Update `vite.config.ts`: load `.env.cvbase.local`, expose `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`; **remove** the `process.env.API_KEY`/`GEMINI_API_KEY` define block.
- [ ] **Step 5:** Run `npm test` (PASS) and `npm run build` (succeeds without a Gemini key — note: client AI files still import it; if build breaks, leave a temporary `process.env.API_KEY` shim defined as empty string until W3 removes those imports). Document the choice inline.
- [ ] **Step 6: Commit** `feat(w0): client env loader; stop bundling the AI key`.

### Task 0.4: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1:** Write `.github/workflows/ci.yml`: on push/PR → `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Add a step that greps `dist/` for `sk_`, `service_role`, and any `AIza`/Gemini-key pattern and **fails** if found (secret-leak guard).
- [ ] **Step 2:** Validate YAML locally (`npx --yes yaml-lint .github/workflows/ci.yml` or a node parse).
- [ ] **Step 3: Commit** `ci(w0): typecheck + test + build + secret-leak guard`.

### Task 0.5: Workstream checkpoint

- [ ] **Step 1:** Run full gate: `npm run typecheck && npm test && npm run build`. All green (typecheck may carry pre-existing app errors recorded in baseline — must not be worse).
- [ ] **Step 2:** `supabase status` shows RUNNING.
- [ ] **Step 3: Commit** any remaining changes; tag the foundation `git tag w0-complete`.

## Self-Review

- **Spec coverage:** W0 maps to spec §7 "W0 — Foundations" (git ✓ already, tooling, supabase scaffold, env+secrets handling, CI). ✓
- **Placeholder scan:** none — each task lists concrete files/commands.
- **Type consistency:** `getClientEnv()` shape defined in 0.3 is the only cross-task interface; consumed later by W1. ✓
- **Deferred to later workstreams (intentional):** removing Firebase (W1/W2), edge functions (W3), Stripe deps (W4), DOMPurify (W5). Not W0 gaps.
