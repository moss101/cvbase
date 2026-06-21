# W1 — Auth Migration (Firebase Auth → Supabase Auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Firebase Authentication with Supabase Auth (email/password + Google OAuth) behind the **identical `useAuth` contract**, with profiles persisted in a Postgres `profiles` table and email verification enabled — leaving zero `firebase/auth` imports.

**Architecture:** A new `services/supabase.ts` client (built from the W0 `getClientEnv()`) backs a new `components/AuthProvider.tsx` that exposes the same context shape as the current `FirebaseProvider`. Profiles auto-provision via a Postgres trigger on `auth.users` insert (server-side, robust for both email and OAuth signups); the client reads/updates the owner-scoped `profiles` row under RLS. Firebase's Firestore (`db`) stays for now (billing, removed in W2/W4) — only the **auth path** is cut over in W1.

**Tech Stack:** `@supabase/supabase-js` v2, Supabase Auth + Postgres + RLS, Vite 6 / React 19, Vitest, local Supabase stack (Docker) with Inbucket for email testing.

## Global Constraints

- Package manager: **npm** (package-lock.json present). Node 20.
- Directory has a **trailing space**: `/Volumes/DATA/cvbase ` — always quote paths in shell (`cd "/Volumes/DATA/cvbase "`) and include the trailing space in absolute file-tool paths. Never use the no-space path (it silently creates a stray duplicate dir).
- Run tests via `npm test` or `./node_modules/.bin/vitest` (project vitest **2.1.9**) — never `npx vitest` (pulls a different version, ignores config).
- **No secret values** added to the client bundle. Client env stays: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLISHABLE_KEY` (via `config/env.ts` → `getClientEnv()`).
- Branch: `feat/supabase-stripe-production`. Commit after each task. Co-author line on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Preserve the `useAuth` contract exactly:** `{ user, userProfile, loading, error, clearError, signUpWithEmail, signInWithEmail, signInWithGoogle, logout, updateUserProfile }`. Additive members are allowed (e.g. `resetPassword`); existing names/shapes must not change. Verified consumer usage of `user` is **`user.email` only** (Dashboard.tsx, UserProfileForm.tsx); all `user.uid` usage was internal to the replaced provider.
- Local Supabase stack must be **running** (`supabase status`). Local emails land in **Inbucket** at http://127.0.0.1:54324. `site_url` is `http://127.0.0.1:3000` (Vite dev port).
- Typecheck carries a recorded **24-error baseline** (`docs/superpowers/plans/w0-typecheck-baseline.txt`). W1 must **not increase** it; fixing W1-touched files toward 0 is welcome.

---

### Task 1: Supabase client singleton

**Files:**
- Modify: `package.json` (add `@supabase/supabase-js` dependency)
- Create: `services/supabase.ts`
- Test: `services/__tests__/supabase.test.ts`

**Interfaces:**
- Consumes: `getClientEnv()` from `config/env.ts` (returns `{ supabaseUrl, supabaseAnonKey, stripePublishableKey }`).
- Produces: `export const supabase: SupabaseClient` and `export function getSupabase(): SupabaseClient` consumed by Task 3 (AuthProvider) and all W2 repos.

- [ ] **Step 1:** Add the dependency. Run:
```bash
cd "/Volumes/DATA/cvbase " && npm install @supabase/supabase-js@^2
```
Expected: `@supabase/supabase-js` appears under `dependencies` in `package.json`; install succeeds.

- [ ] **Step 2: Write the failing test** `services/__tests__/supabase.test.ts`:
```ts
import { describe, it, expect, afterEach, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('supabase client', () => {
  it('constructs a client with auth configured from client env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'local-anon-key');
    const { getSupabase } = await import('../supabase');
    const client = getSupabase();
    expect(client).toBeTruthy();
    expect(typeof client.auth.getSession).toBe('function');
    expect(typeof client.from).toBe('function');
  });

  it('returns the same memoized instance', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'local-anon-key');
    const { getSupabase } = await import('../supabase');
    expect(getSupabase()).toBe(getSupabase());
  });
});
```

- [ ] **Step 3: Run the test to verify it fails.** Run:
```bash
cd "/Volumes/DATA/cvbase " && ./node_modules/.bin/vitest run services/__tests__/supabase.test.ts
```
Expected: FAIL — `Cannot find module '../supabase'`.

- [ ] **Step 4: Implement** `services/supabase.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getClientEnv } from '../config/env';

let client: SupabaseClient | null = null;

/** Lazily create and memoize the browser Supabase client (anon key only). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = getClientEnv();
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // completes the OAuth redirect on return
    },
  });
  return client;
}

/** Convenience singleton for non-test callers. */
export const supabase: SupabaseClient = getSupabase();
```

- [ ] **Step 5: Run the test to verify it passes.** Run the Step 3 command. Expected: PASS (2 tests).

- [ ] **Step 6: Commit.**
```bash
cd "/Volumes/DATA/cvbase " && git add package.json package-lock.json services/supabase.ts services/__tests__/supabase.test.ts && git commit -m "$(printf 'feat(w1): supabase client singleton from client env\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: `profiles` table + RLS + auto-provision trigger

**Files:**
- Create: `supabase/migrations/<timestamp>_profiles.sql` (use `supabase migration new profiles`)

**Interfaces:**
- Produces: `public.profiles` table (owner-RLS) and an `on_auth_user_created` trigger that inserts a profile row for every new `auth.users` row. Consumed by Task 3 (AuthProvider read/update) and W2 (`profileRepo`).

- [ ] **Step 1:** Create the migration file:
```bash
cd "/Volumes/DATA/cvbase " && supabase migration new profiles
```
Expected: prints a path like `supabase/migrations/20260622######_profiles.sql`.

- [ ] **Step 2:** Write the migration body into that file (replace its empty contents):
```sql
-- profiles: one row per auth user. Snake_case columns map to the TS UserProfile.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  job_title text not null default '',
  industry text not null default '',
  experience_years text not null default '',
  bio text not null default '',
  care_specialties text[] not null default '{}',
  certifications text[] not null default '{}',
  availability text not null default '',
  licensed_state text not null default '',
  linkedin text not null default '',
  github text not null default '',
  portfolio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Auto-provision a profile whenever a new auth user is created (email OR OAuth).
-- Names come from sign-up metadata (email) or Google identity (given/family name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'given_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name',  new.raw_user_meta_data ->> 'family_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3:** Apply migrations to the local DB:
```bash
cd "/Volumes/DATA/cvbase " && supabase db reset
```
Expected: migrations apply cleanly; output lists the `profiles` migration (no "must match pattern" skip, since this is a real timestamped file).

- [ ] **Step 4: Verify the schema + RLS landed.** Run:
```bash
cd "/Volumes/DATA/cvbase " && supabase db reset >/dev/null 2>&1; psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) as cols from information_schema.columns where table_schema='public' and table_name='profiles';" -c "select tgname from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created';" -c "select relrowsecurity from pg_class where relname='profiles';"
```
Expected: `cols` = 18; trigger `on_auth_user_created` listed; `relrowsecurity` = `t`. (If `psql` is unavailable, run the same SQL in Studio at http://127.0.0.1:54323.)

- [ ] **Step 5: Verify the trigger provisions a profile.** Create a throwaway auth user and confirm a profile row appears:
```bash
cd "/Volumes/DATA/cvbase " && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "insert into auth.users (id, email, raw_user_meta_data, aud, role) values (gen_random_uuid(), 'trigger-test@example.com', '{\"first_name\":\"Tess\",\"last_name\":\"Trigger\"}'::jsonb, 'authenticated', 'authenticated') returning id;" -c "select email, first_name, last_name from public.profiles where email='trigger-test@example.com';"
```
Expected: the select returns `trigger-test@example.com | Tess | Trigger`. Clean up: `delete from auth.users where email='trigger-test@example.com';` (cascades to profiles).

- [ ] **Step 6: Commit.**
```bash
cd "/Volumes/DATA/cvbase " && git add supabase/migrations && git commit -m "$(printf 'feat(w1): profiles table with owner RLS + auto-provision trigger\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: Profile mapping + Supabase `AuthProvider`

**Files:**
- Create: `services/profileMapping.ts` (pure DB↔TS mapping, reused by W2 repos)
- Test: `services/__tests__/profileMapping.test.ts`
- Create: `components/AuthProvider.tsx` (Supabase-backed; same `useAuth` contract)

**Interfaces:**
- Consumes: `getSupabase()` (Task 1); `public.profiles` (Task 2).
- Produces:
  - `services/profileMapping.ts`: `export interface UserProfile { userId; email; firstName; lastName; phone; jobTitle; industry; experienceYears; bio; careSpecialties: string[]; certifications: string[]; availability; licensedState; linkedin?; github?; portfolio?; updatedAt? }`, `export function rowToProfile(row: Record<string, unknown>): UserProfile`, `export function profileToRow(p: Partial<UserProfile>, uid: string): Record<string, unknown>`.
  - `components/AuthProvider.tsx`: `export const AuthProvider`, `export const useAuth`, and (additive) `resetPassword(email: string): Promise<void>`. `signUpWithEmail` returns `Promise<{ needsEmailVerification: boolean }>` (existing sole caller AuthModal is updated in Task 5; other consumers ignore the return).

- [ ] **Step 1: Write the failing mapping test** `services/__tests__/profileMapping.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rowToProfile, profileToRow } from '../profileMapping';

describe('profileMapping', () => {
  it('rowToProfile maps snake_case DB row to camelCase profile', () => {
    const p = rowToProfile({
      id: 'uid-1', email: 'a@b.com', first_name: 'Ann', last_name: 'Lee',
      phone: '', job_title: 'Nurse', industry: 'Health', experience_years: '5',
      bio: '', care_specialties: ['ICU'], certifications: [], availability: '',
      licensed_state: 'CA', linkedin: 'l', github: '', portfolio: '',
      updated_at: '2026-06-22T00:00:00Z',
    });
    expect(p.userId).toBe('uid-1');
    expect(p.firstName).toBe('Ann');
    expect(p.jobTitle).toBe('Nurse');
    expect(p.careSpecialties).toEqual(['ICU']);
    expect(p.licensedState).toBe('CA');
    expect(p.updatedAt).toBe('2026-06-22T00:00:00Z');
  });

  it('profileToRow maps camelCase updates to snake_case row keyed by uid', () => {
    const row = profileToRow({ firstName: 'Bob', careSpecialties: ['ER'] }, 'uid-2');
    expect(row.id).toBe('uid-2');
    expect(row.first_name).toBe('Bob');
    expect(row.care_specialties).toEqual(['ER']);
    expect('firstName' in row).toBe(false);
  });

  it('profileToRow omits undefined fields (no accidental nulling)', () => {
    const row = profileToRow({ bio: 'hi' }, 'uid-3');
    expect(row.bio).toBe('hi');
    expect('first_name' in row).toBe(false);
  });
});
```

- [ ] **Step 2: Run the mapping test to verify it fails.** Run:
```bash
cd "/Volumes/DATA/cvbase " && ./node_modules/.bin/vitest run services/__tests__/profileMapping.test.ts
```
Expected: FAIL — `Cannot find module '../profileMapping'`.

- [ ] **Step 3: Implement** `services/profileMapping.ts`:
```ts
export interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  industry: string;
  experienceYears: string;
  bio: string;
  careSpecialties: string[];
  certifications: string[];
  availability: string;
  licensedState: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  updatedAt?: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    userId: str(row.id),
    email: str(row.email),
    firstName: str(row.first_name),
    lastName: str(row.last_name),
    phone: str(row.phone),
    jobTitle: str(row.job_title),
    industry: str(row.industry),
    experienceYears: str(row.experience_years),
    bio: str(row.bio),
    careSpecialties: arr(row.care_specialties),
    certifications: arr(row.certifications),
    availability: str(row.availability),
    licensedState: str(row.licensed_state),
    linkedin: str(row.linkedin),
    github: str(row.github),
    portfolio: str(row.portfolio),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

const CAMEL_TO_SNAKE: Record<string, string> = {
  email: 'email', firstName: 'first_name', lastName: 'last_name', phone: 'phone',
  jobTitle: 'job_title', industry: 'industry', experienceYears: 'experience_years',
  bio: 'bio', careSpecialties: 'care_specialties', certifications: 'certifications',
  availability: 'availability', licensedState: 'licensed_state', linkedin: 'linkedin',
  github: 'github', portfolio: 'portfolio',
};

/** Build a snake_case row for upsert. Always sets id; omits undefined fields. */
export function profileToRow(p: Partial<UserProfile>, uid: string): Record<string, unknown> {
  const row: Record<string, unknown> = { id: uid };
  for (const [camel, snake] of Object.entries(CAMEL_TO_SNAKE)) {
    const value = (p as Record<string, unknown>)[camel];
    if (value !== undefined) row[snake] = value;
  }
  return row;
}
```

- [ ] **Step 4: Run the mapping test to verify it passes.** Run the Step 2 command. Expected: PASS (3 tests).

- [ ] **Step 5: Implement** `components/AuthProvider.tsx` (Supabase-backed, contract-preserving):
```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '../services/supabase';
import { rowToProfile, profileToRow, type UserProfile } from '../services/profileMapping';

export type { UserProfile };

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signUpWithEmail: (
    email: string, password: string, firstName: string, lastName: string,
  ) => Promise<{ needsEmailVerification: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const loadProfile = async (uid: string): Promise<UserProfile | null> => {
    const { data, error: e } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (e) { setError(e.message); return null; }
    return data ? rowToProfile(data as Record<string, unknown>) : null;
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) setUserProfile(await loadProfile(sessionUser.id));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setUserProfile(sessionUser ? await loadProfile(sessionUser.id) : null);
      setLoading(false);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signUpWithEmail = async (
    email: string, password: string, firstName: string, lastName: string,
  ): Promise<{ needsEmailVerification: boolean }> => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (e) { setError(e.message); throw e; }
      // With email confirmations on, no session is returned until verified.
      return { needsEmailVerification: !data.session };
    } finally { setLoading(false); }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError(e.message); throw e; }
      // onAuthStateChange populates user + profile.
    } finally { setLoading(false); }
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (e) { setError(e.message); throw e; }
    // Browser redirects to Google; session is detected on return (detectSessionInUrl).
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signOut();
      if (e) setError(e.message);
      setUser(null); setUserProfile(null);
    } finally { setLoading(false); }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user');
    setLoading(true); setError(null);
    try {
      const row = { ...profileToRow(updates, user.id), updated_at: new Date().toISOString() };
      const { data, error: e } = await supabase
        .from('profiles').upsert(row).select('*').single();
      if (e) { setError(e.message); throw e; }
      setUserProfile(rowToProfile(data as Record<string, unknown>));
    } finally { setLoading(false); }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (e) { setError(e.message); throw e; }
  };

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, error, clearError,
      signUpWithEmail, signInWithEmail, signInWithGoogle, logout, updateUserProfile, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 6: Typecheck the new files** (must not raise the 24-error baseline). Run:
```bash
cd "/Volumes/DATA/cvbase " && npm run typecheck 2>&1 | grep -c "error TS"
```
Expected: `24` (unchanged). If higher, the new errors are in `services/supabase.ts`, `services/profileMapping.ts`, or `components/AuthProvider.tsx` — fix them before continuing.

- [ ] **Step 7: Commit.**
```bash
cd "/Volumes/DATA/cvbase " && git add services/profileMapping.ts services/__tests__/profileMapping.test.ts components/AuthProvider.tsx && git commit -m "$(printf 'feat(w1): supabase AuthProvider + profile mapping (same useAuth contract)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: Big-bang auth cutover (swap providers, strip Firebase auth)

**Files:**
- Modify: `App.tsx:13` (import `AuthProvider` from `./components/AuthProvider`)
- Modify imports (`useAuth` path `./FirebaseProvider` → `./AuthProvider`, `../FirebaseProvider` → `../AuthProvider`) in: `components/ResumeBuilder.tsx:17`, `components/Dashboard.tsx:7`, `components/AuthModal.tsx:2`, `components/SubscriptionProvider.tsx:2`, `components/UserProfileForm.tsx:2`, `components/billing/CheckoutPage.tsx:13`, `components/billing/BillingDashboard.tsx:3`
- Modify: `services/firebase.ts` (drop auth: keep only Firestore `db` for `subscriptionService`)
- Delete: `components/FirebaseProvider.tsx`

**Interfaces:**
- Consumes: `components/AuthProvider.tsx` (Task 3).
- Produces: app wired to Supabase auth; `services/firebase.ts` exports only `db`.

- [ ] **Step 1:** In `App.tsx` change line 13 from `import { AuthProvider } from './components/FirebaseProvider';` to `import { AuthProvider } from './components/AuthProvider';`.

- [ ] **Step 2:** Swap the seven `useAuth` import lines (exact replacements):
  - `components/ResumeBuilder.tsx:17`, `components/Dashboard.tsx:7`, `components/AuthModal.tsx:2`, `components/SubscriptionProvider.tsx:2`, `components/UserProfileForm.tsx:2`: `from './FirebaseProvider'` → `from './AuthProvider'`.
  - `components/billing/CheckoutPage.tsx:13`, `components/billing/BillingDashboard.tsx:3`: `from '../FirebaseProvider'` → `from '../AuthProvider'`.

- [ ] **Step 3:** Replace `services/firebase.ts` entirely with a Firestore-only module (removes all `firebase/auth` usage; keeps `db` for `subscriptionService`, which W2/W4 will retire):
```ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Firestore remains ONLY for legacy billing reads in subscriptionService.ts;
// it is removed entirely in W2/W4. No Firebase Auth is used anywhere anymore.
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
```

- [ ] **Step 4:** Delete the old provider:
```bash
cd "/Volumes/DATA/cvbase " && git rm components/FirebaseProvider.tsx
```

- [ ] **Step 5: Verify no `firebase/auth` imports remain anywhere** in source:
```bash
cd "/Volumes/DATA/cvbase " && grep -rn "firebase/auth" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist || echo "no firebase/auth imports ✓"
```
Expected: `no firebase/auth imports ✓`.

- [ ] **Step 6: Typecheck + build** (catches any missed import or `db`/`auth` usage). Run:
```bash
cd "/Volumes/DATA/cvbase " && npm run typecheck 2>&1 | grep -c "error TS"; npm run build >/tmp/w1b.log 2>&1; echo "build exit: $?"; tail -2 /tmp/w1b.log
```
Expected: typecheck `≤ 24`; build exit `0`. (If `subscriptionService.ts` referenced `handleFirestoreError`/`OperationType`/`auth`, the build fails — those were only used by the deleted provider; confirm `subscriptionService.ts` imports only `db`.)

- [ ] **Step 7: Verify the AI-key guard still holds** (no Gemini key in the new bundle):
```bash
cd "/Volumes/DATA/cvbase " && grep -rhoE "AIzaSy[0-9A-Za-z_-]{33}" dist/ | grep -vx "AIzaSyBsR6oi1Z-7SrFW-JEX7BycpD3nSelRzu4" | head -n1 | grep -q . && echo "LEAK" || echo "no leaked key ✓"
```
Expected: `no leaked key ✓`.

- [ ] **Step 8: Commit.**
```bash
cd "/Volumes/DATA/cvbase " && git add -A && git commit -m "$(printf 'feat(w1): cut over to supabase AuthProvider; remove firebase auth\n\nSwaps all useAuth import sites + App.tsx to components/AuthProvider, deletes\nFirebaseProvider.tsx, and reduces services/firebase.ts to Firestore-only (db)\nfor the legacy billing path (removed in W2/W4). No firebase/auth imports remain.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: AuthModal Supabase UX + email confirmation + Google provider config

**Files:**
- Modify: `components/AuthModal.tsx` (email-verification-sent screen; wire `resetPassword`; remove Firebase-specific copy)
- Modify: `supabase/config.toml` (`[auth.email] enable_confirmations = true`; configure `[auth.external.google]`)
- Modify: `.env.example` (document the Google OAuth env keys the Supabase CLI reads)

**Interfaces:**
- Consumes: `useAuth()` from `components/AuthProvider` (now includes `resetPassword` and the `signUpWithEmail` verification result).

- [ ] **Step 1:** In `components/AuthModal.tsx`, add a `verificationSent` state and use the sign-up result. Replace the `handleSubmit` success branch:
  - Add near the other `useState` calls: `const [verificationSent, setVerificationSent] = useState(false);`
  - In `handleSubmit`, replace the `try { ... }` body with:
```tsx
    try {
      if (isSignUp) {
        const { needsEmailVerification } = await signUpWithEmail(email, password, firstName, lastName);
        if (needsEmailVerification) { setVerificationSent(true); return; }
        onClose();
      } else {
        await signInWithEmail(email, password);
        onClose();
      }
    } catch (err) {
      // Error surfaced via context `error`.
    }
```
  - Update the destructure on line 10 to include reset: `const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, loading, error, clearError } = useAuth();`

- [ ] **Step 2:** Render the verification-sent screen. Immediately after `if (!isOpen) return null;`, add:
```tsx
  if (verificationSent) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center">
          <div className="inline-flex w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl items-center justify-center shadow-lg mb-4">
            <span className="material-symbols-outlined text-white text-2xl">mark_email_read</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Verify your email</h2>
          <p className="text-slate-500 text-sm mt-2">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate
            your account, then sign in.
          </p>
          <button
            onClick={() => { setVerificationSent(false); setIsSignUp(false); onClose(); }}
            className="mt-6 w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }
```

- [ ] **Step 3:** Replace the Firebase-specific "Forgot Password?" button (around line 160-167) with a real Supabase reset:
```tsx
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) { setFormError('Enter your email above first, then click Forgot Password.'); return; }
                      setFormError(null); clearError();
                      try { await resetPassword(email); setFormError('Password reset link sent — check your email.'); }
                      catch { /* error surfaced via context */ }
                    }}
                    className="text-[11px] text-slate-400 hover:text-primary font-semibold"
                  >
                    Forgot Password?
                  </button>
```

- [ ] **Step 4:** Replace the Firebase footer note (lines ~233-238 block) with a provider-neutral note:
```tsx
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-slate-400 text-sm mt-0.5 shrink-0">info</span>
          <p className="text-[10px] text-slate-500 leading-normal font-medium">
            <strong>Note:</strong> New accounts require email verification. After signing up,
            check your inbox for a confirmation link before signing in.
          </p>
        </div>
```

- [ ] **Step 5:** Enable email confirmations + configure Google in `supabase/config.toml`:
  - Under `[auth.email]`, set `enable_confirmations = true`.
  - Replace the `[auth.external.google]` block with:
```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"
secret = "env(GOOGLE_OAUTH_CLIENT_SECRET)"
redirect_uri = ""
skip_nonce_check = false
```

- [ ] **Step 6:** Document the Google env keys in `.env.example` if not already present (they are listed; confirm these two lines exist, add if missing):
```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
```

- [ ] **Step 7:** Restart the stack to apply config + typecheck/build:
```bash
cd "/Volumes/DATA/cvbase " && supabase stop && supabase start >/dev/null 2>&1; supabase status | grep -i "running"; npm run typecheck 2>&1 | grep -c "error TS"; npm run build >/tmp/w1b2.log 2>&1; echo "build exit: $?"
```
Expected: stack running; typecheck `≤ 24`; build exit `0`.

- [ ] **Step 8: Commit.**
```bash
cd "/Volumes/DATA/cvbase " && git add components/AuthModal.tsx supabase/config.toml .env.example && git commit -m "$(printf 'feat(w1): email-verification UX, supabase password reset, google provider config\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: Manual auth smoke test + workstream checkpoint

**Files:** none (verification + tag).

- [ ] **Step 1: Full gate.** Run:
```bash
cd "/Volumes/DATA/cvbase " && npm run typecheck 2>&1 | grep -c "error TS"; npm test 2>&1 | grep -E "Test Files|Tests "; npm run build >/tmp/w1g.log 2>&1; echo "build exit: $?"
```
Expected: typecheck `≤ 24`; all test files pass (now includes `supabase`, `profileMapping`, plus W0 tests); build exit `0`.

- [ ] **Step 2: Manual email-auth smoke test** (local stack + Inbucket). With `npm run dev` running on http://127.0.0.1:3000:
  1. Open the app, open the auth modal, **Sign Up** with a test email + name. Expect the "Verify your email" screen.
  2. Open Inbucket at http://127.0.0.1:54324, open the confirmation email, click/visit the confirm link.
  3. Back in the app, **Sign In** with the same credentials. Expect authenticated state.
  4. Open the profile form, edit a field (e.g. job title), save. Confirm it persists.
  5. Verify persistence in the DB:
```bash
cd "/Volumes/DATA/cvbase " && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select email, first_name, job_title from public.profiles order by created_at desc limit 3;"
```
  Expect your test user's row with the edited job title.
  6. **Log out**; reload; confirm signed-out state.

- [ ] **Step 3: RLS spot check** (a user cannot read another user's profile). In the browser console while signed in as user A:
```js
const { data, error } = await window.__sb ? window.__sb.from('profiles').select('*') : { data: 'n/a' };
```
  (If `window.__sb` is not exposed, skip — full cross-user RLS testing is a W2 deliverable.) Expect a signed-in user to see **only their own** row.

- [ ] **Step 4: Note the Google operator step.** Google sign-in requires the user to: create an OAuth client in Google Cloud, set the authorized redirect URI to the Supabase callback (`<SUPABASE_URL>/auth/v1/callback` for cloud, or `http://127.0.0.1:54321/auth/v1/callback` for local), and put the client id/secret into `.env.cvbase.local` as `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (read by `supabase/config.toml`). Record this in the W1 completion note.

- [ ] **Step 5: Tag the workstream.**
```bash
cd "/Volumes/DATA/cvbase " && git tag w1-complete && git tag -l "w*-complete"
```

## Self-Review

- **Spec coverage (§7 W1):**
  - "`services/supabase.ts` replaces `services/firebase.ts`" → Task 1 (client) + Task 4 (firebase.ts reduced to Firestore-only; auth fully on Supabase). ✓
  - "New AuthProvider, same `useAuth` contract; profile auto-provision on first sign-in" → Task 3 (provider) + Task 2 (trigger provisions for email + OAuth). ✓
  - "`AuthModal.tsx` updated; email verification enabled" → Task 5 (verify UX + `enable_confirmations`). ✓
  - "Remove `firebase` SDK usage from auth path; provide Google redirect URL" → Task 4 (no `firebase/auth`) + Task 5/6 (Google config + operator redirect URI). ✓
  - "Done when: sign up / sign in (email + Google) / logout / profile read+write work; no `firebase/auth` imports remain" → Task 4 Step 5 grep + Task 6 smoke test. ✓ (Google is config-gated on the operator step, noted in Task 6 Step 4.)
- **Dependency note:** the spec lists `profiles` under W2, but W1 auth requires it; Task 2 creates the `profiles` table now and W2 adds the remaining tables. Intentional, documented here.
- **Placeholder scan:** none — every code step contains full content; SQL, TSX, and commands are concrete.
- **Type consistency:** `UserProfile` is defined once in `services/profileMapping.ts` and re-exported from `AuthProvider`; `rowToProfile`/`profileToRow` names match between Task 3 definition and Task 3 provider usage; `signUpWithEmail` return type `{ needsEmailVerification: boolean }` is defined in Task 3 and consumed in Task 5. ✓
- **Contract safety:** `user` exposed as Supabase `User`; consumers use only `user.email` (verified) which Supabase `User` provides. Additive `resetPassword` does not break existing consumers. ✓
- **Deferred to later workstreams (intentional):** full repositories + remaining tables + localStorage import (W2); removing Firestore `db` entirely (W2/W4); cross-user RLS integration tests (W2/W5).
