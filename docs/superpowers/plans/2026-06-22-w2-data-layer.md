# W2 — Data Layer (Postgres schema + RLS; persistence off localStorage) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all user data (resumes, resume versions, job tracker, plus schema for subscriptions/usage/ai-logs) into Supabase Postgres under Row-Level Security, migrate the resume builder and job tracker off localStorage (with a one-time import), and remove the last of Firebase.

**Architecture:** Add migrations for every remaining §5 table + a private `headshots` Storage bucket, all RLS-protected. Add a thin repository layer (`services/repos/*`) over `supabase-js`, with pure row↔TS mappers (unit-tested). The resume builder and tracker read/write Postgres when authenticated (localStorage stays as the anonymous/offline fallback), importing any existing localStorage data once on first authenticated load. Finally strip Firestore from `subscriptionService` (simulated billing becomes localStorage-only until W4), delete `services/firebase.ts`, and retire `firestore.rules`.

**Tech Stack:** Supabase Postgres + RLS + Storage, `@supabase/supabase-js` v2, React 19 / Vite 6, Vitest, local Supabase stack (Docker).

## Global Constraints

- Package manager **npm**, Node 20. Directory has a **trailing space** `/Volumes/DATA/cvbase ` — quote it in shell (`cd "/Volumes/DATA/cvbase "`) and include it in absolute file-tool paths; never use the no-space path.
- Tests via `npm test` / `./node_modules/.bin/vitest` (project vitest **2.1.9**), never `npx vitest`.
- Branch `feat/supabase-stripe-production`; commit after each task; co-author line `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Local Supabase stack must be **running** (`supabase status`); apply schema with `supabase db reset`. Local mail = Mailpit on :54324.
- **No secret** added to the client bundle. **Server is source of truth** for `subscriptions`/`usage_counters` — those are **owner-read-only**; only `service_role` (W3/W4 Edge Functions + Stripe webhook) writes them. `ai_logs` is **service_role-only** (no client access).
- Reuse W1's `getSupabase()` (`services/supabase.ts`) and `services/profileMapping.ts`. Preserve the `useAuth` contract.
- Typecheck baseline is **24** (`docs/superpowers/plans/w0-typecheck-baseline.txt`); W2 must not increase it (lowering it for touched files is welcome).
- **Persistence rule:** authenticated users → Postgres is source of truth; anonymous users → localStorage unchanged. UI-only state (`cvbase-active-section`, `cvbase-language`, `cvbase-resources-checklist`, `cvbase-last-ats-score`) stays in localStorage and is NOT migrated.

---

### Task 1: Schema migration — data tables, RLS, Storage bucket

**Files:**
- Create: `supabase/migrations/<timestamp>_data_layer.sql` (via `supabase migration new data_layer`)

**Interfaces:**
- Produces tables `public.resumes`, `public.resume_versions`, `public.job_applications`, `public.subscriptions`, `public.usage_counters`, `public.ai_logs`, a private `headshots` Storage bucket, and a shared `public.set_updated_at()` trigger fn. Consumed by Task 2 repos.

- [ ] **Step 1:** Create the migration file:
```bash
cd "/Volumes/DATA/cvbase " && supabase migration new data_layer
```

- [ ] **Step 2:** Write this SQL into that file:
```sql
-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- resumes ---------------------------------------------------------------
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'My Resume',
  data jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  template_id text not null default 'default',
  visible_sections jsonb not null default '[]'::jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resumes_user_id_idx on public.resumes (user_id);
create unique index resumes_one_primary_per_user on public.resumes (user_id) where is_primary;
create trigger resumes_set_updated_at before update on public.resumes
  for each row execute function public.set_updated_at();
alter table public.resumes enable row level security;
create policy "resumes_select_own" on public.resumes for select using (auth.uid() = user_id);
create policy "resumes_insert_own" on public.resumes for insert with check (auth.uid() = user_id);
create policy "resumes_update_own" on public.resumes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resumes_delete_own" on public.resumes for delete using (auth.uid() = user_id);

-- resume_versions -------------------------------------------------------
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index resume_versions_resume_id_idx on public.resume_versions (resume_id);
alter table public.resume_versions enable row level security;
create policy "rv_select_own" on public.resume_versions for select using (auth.uid() = user_id);
create policy "rv_insert_own" on public.resume_versions for insert with check (auth.uid() = user_id);
create policy "rv_delete_own" on public.resume_versions for delete using (auth.uid() = user_id);

-- job_applications ------------------------------------------------------
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null default '',
  role text not null default '',
  status text not null default 'wishlist'
    check (status in ('wishlist','applied','interview','offer','rejected')),
  match_score int,
  url text,
  notes text,
  date_applied text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_applications_user_id_idx on public.job_applications (user_id);
create trigger job_applications_set_updated_at before update on public.job_applications
  for each row execute function public.set_updated_at();
alter table public.job_applications enable row level security;
create policy "ja_select_own" on public.job_applications for select using (auth.uid() = user_id);
create policy "ja_insert_own" on public.job_applications for insert with check (auth.uid() = user_id);
create policy "ja_update_own" on public.job_applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ja_delete_own" on public.job_applications for delete using (auth.uid() = user_id);

-- subscriptions (owner READ only; writes are service_role only) ----------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text not null default 'free' check (plan_id in ('free','pro','elite')),
  cycle text not null default 'monthly' check (cycle in ('monthly','yearly')),
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
alter table public.subscriptions enable row level security;
create policy "subs_select_own" on public.subscriptions for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only service_role (which bypasses RLS) writes.

-- usage_counters (owner READ only; writes are service_role only) ----------
create table public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  ats_scans int not null default 0,
  ai_actions int not null default 0,
  primary key (user_id, month)
);
alter table public.usage_counters enable row level security;
create policy "usage_select_own" on public.usage_counters for select using (auth.uid() = user_id);
-- No write policies: service_role only.

-- ai_logs (service_role ONLY — no client access at all) ------------------
create table public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  function text not null,
  model text,
  prompt_version text,
  token_estimate int,
  status text,
  created_at timestamptz not null default now()
);
alter table public.ai_logs enable row level security;
-- No policies at all: only service_role (bypasses RLS) can read/write.

-- Storage: private per-user headshots bucket ----------------------------
insert into storage.buckets (id, name, public) values ('headshots','headshots', false)
  on conflict (id) do nothing;
create policy "headshots_owner_rw" on storage.objects for all
  using (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'headshots' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 3:** Apply: `cd "/Volumes/DATA/cvbase " && supabase db reset`. Expect both migrations (`profiles`, `data_layer`) apply cleanly.

- [ ] **Step 4: Verify** tables, RLS, and the service_role-only intent:
```bash
cd "/Volumes/DATA/cvbase " && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tA \
  -c "select 'tables='||count(*) from information_schema.tables where table_schema='public' and table_name in ('resumes','resume_versions','job_applications','subscriptions','usage_counters','ai_logs');" \
  -c "select 'rls_off='||count(*) from pg_class where relname in ('resumes','resume_versions','job_applications','subscriptions','usage_counters','ai_logs') and relrowsecurity=false;" \
  -c "select 'subs_write_policies='||count(*) from pg_policies where tablename='subscriptions' and cmd in ('INSERT','UPDATE','DELETE');" \
  -c "select 'ai_logs_policies='||count(*) from pg_policies where tablename='ai_logs';" \
  -c "select 'headshots_bucket='||count(*) from storage.buckets where id='headshots';"
```
Expect: `tables=6`, `rls_off=0`, `subs_write_policies=0`, `ai_logs_policies=0`, `headshots_bucket=1`.

- [ ] **Step 5: Commit** `feat(w2): data-layer schema (resumes, versions, tracker, subs, usage, ai_logs) + RLS + headshots bucket`.

---

### Task 2: Repository layer + pure mappers

**Files:**
- Create: `services/repos/resumeRepo.ts`, `services/repos/trackerRepo.ts`, `services/repos/billingRepo.ts`, `services/repos/usageRepo.ts`
- Create: `services/repos/mappers.ts` (pure row↔TS)
- Test: `services/repos/__tests__/mappers.test.ts`

**Interfaces:**
- Consumes: `getSupabase()`; types from `types.ts` (`ResumeData`, `ResumeSettings`, `SectionId`, `JobApplication`, `JobStatus`, `Subscription`, `UsageCounters`, `PlanId`, `BillingCycle`).
- Produces:
  - `mappers.ts`: `rowToResume(row): StoredResume`, `resumeToRow(r: Partial<StoredResume>, userId): Record<string,unknown>`, `rowToJob(row): JobApplication`, `jobToRow(j: Partial<JobApplication>, userId): Record<string,unknown>`, `rowToSubscription(row): Subscription | null`, `rowToUsage(row): UsageCounters`. `export interface StoredResume { id?: string; title: string; data: ResumeData; settings: ResumeSettings; templateId: string; visibleSections: SectionId[]; isPrimary: boolean }`.
  - `resumeRepo.ts`: `getPrimary(userId): Promise<StoredResume | null>`, `upsertPrimary(userId, r: StoredResume): Promise<StoredResume>`, `list(userId): Promise<StoredResume[]>`.
  - `trackerRepo.ts`: `list(userId): Promise<JobApplication[]>`, `upsert(userId, job: JobApplication): Promise<JobApplication>`, `remove(userId, id): Promise<void>`.
  - `billingRepo.ts`: `getSubscription(userId): Promise<Subscription | null>`.
  - `usageRepo.ts`: `getUsage(userId, month): Promise<UsageCounters>`.

- [ ] **Step 1: Write failing mapper tests** `services/repos/__tests__/mappers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rowToResume, resumeToRow, rowToJob, jobToRow, rowToSubscription } from '../mappers';

describe('repo mappers', () => {
  it('rowToResume parses jsonb columns into typed shapes', () => {
    const r = rowToResume({
      id: 'r1', title: 'Dev CV', data: { skills: ['ts'] }, settings: { fontSize: 'medium' },
      template_id: 'harvard', visible_sections: ['contact', 'summary'], is_primary: true,
    });
    expect(r.id).toBe('r1');
    expect(r.templateId).toBe('harvard');
    expect(r.visibleSections).toEqual(['contact', 'summary']);
    expect(r.isPrimary).toBe(true);
    expect(r.data.skills).toEqual(['ts']);
  });
  it('resumeToRow keys by user_id and serializes camelCase fields to columns', () => {
    const row = resumeToRow({ title: 'X', templateId: 'teal', visibleSections: ['skills'], data: {} as any, settings: {} as any, isPrimary: true }, 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.template_id).toBe('teal');
    expect(row.visible_sections).toEqual(['skills']);
    expect(row.is_primary).toBe(true);
  });
  it('rowToJob maps role/url/match_score to JobApplication', () => {
    const j = rowToJob({ id: 'j1', company: 'Acme', role: 'RN', status: 'applied', url: 'http://x', match_score: 80, date_applied: '2026-06-01' });
    expect(j.jobTitle).toBe('RN');
    expect(j.jobUrl).toBe('http://x');
    expect(j.matchScore).toBe(80);
    expect(j.dateApplied).toBe('2026-06-01');
  });
  it('jobToRow maps JobApplication back to columns keyed by user_id', () => {
    const row = jobToRow({ id: 'j1', jobTitle: 'RN', company: 'Acme', status: 'offer', jobUrl: 'u', matchScore: 5 }, 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.role).toBe('RN');
    expect(row.url).toBe('u');
    expect(row.match_score).toBe(5);
  });
  it('rowToSubscription returns null for no row', () => {
    expect(rowToSubscription(null)).toBeNull();
  });
});
```

- [ ] **Step 2:** Run `./node_modules/.bin/vitest run services/repos/__tests__/mappers.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** `services/repos/mappers.ts`:
```ts
import type {
  ResumeData, ResumeSettings, SectionId, JobApplication, JobStatus,
  Subscription, UsageCounters, PlanId, BillingCycle, SubscriptionStatus,
} from '../../types';

export interface StoredResume {
  id?: string;
  title: string;
  data: ResumeData;
  settings: ResumeSettings;
  templateId: string;
  visibleSections: SectionId[];
  isPrimary: boolean;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function rowToResume(row: Record<string, unknown>): StoredResume {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    title: str(row.title) || 'My Resume',
    data: obj(row.data) as unknown as ResumeData,
    settings: obj(row.settings) as unknown as ResumeSettings,
    templateId: str(row.template_id) || 'default',
    visibleSections: arr<SectionId>(row.visible_sections),
    isPrimary: row.is_primary === true,
  };
}
export function resumeToRow(r: Partial<StoredResume>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (r.id !== undefined) row.id = r.id;
  if (r.title !== undefined) row.title = r.title;
  if (r.data !== undefined) row.data = r.data;
  if (r.settings !== undefined) row.settings = r.settings;
  if (r.templateId !== undefined) row.template_id = r.templateId;
  if (r.visibleSections !== undefined) row.visible_sections = r.visibleSections;
  if (r.isPrimary !== undefined) row.is_primary = r.isPrimary;
  return row;
}

export function rowToJob(row: Record<string, unknown>): JobApplication {
  return {
    id: str(row.id),
    jobTitle: str(row.role),
    company: str(row.company),
    jobUrl: typeof row.url === 'string' ? row.url : undefined,
    status: (str(row.status) || 'wishlist') as JobStatus,
    dateApplied: typeof row.date_applied === 'string' ? row.date_applied : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    matchScore: typeof row.match_score === 'number' ? row.match_score : undefined,
  };
}
export function jobToRow(j: Partial<JobApplication>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (j.id !== undefined) row.id = j.id;
  if (j.jobTitle !== undefined) row.role = j.jobTitle;
  if (j.company !== undefined) row.company = j.company;
  if (j.jobUrl !== undefined) row.url = j.jobUrl;
  if (j.status !== undefined) row.status = j.status;
  if (j.dateApplied !== undefined) row.date_applied = j.dateApplied;
  if (j.notes !== undefined) row.notes = j.notes;
  if (j.matchScore !== undefined) row.match_score = j.matchScore;
  return row;
}

export function rowToSubscription(row: Record<string, unknown> | null): Subscription | null {
  if (!row) return null;
  return {
    planId: (str(row.plan_id) || 'free') as PlanId,
    cycle: (str(row.cycle) || 'monthly') as BillingCycle,
    status: (str(row.status) || 'active') as SubscriptionStatus,
    currentPeriodStart: str(row.current_period_start),
    currentPeriodEnd: str(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}
export function rowToUsage(row: Record<string, unknown> | null, month: string): UsageCounters {
  if (!row) return { month, atsScans: 0, aiActions: 0 };
  return {
    month: str(row.month) || month,
    atsScans: typeof row.ats_scans === 'number' ? row.ats_scans : 0,
    aiActions: typeof row.ai_actions === 'number' ? row.ai_actions : 0,
  };
}
```

- [ ] **Step 4:** Run the mapper test → PASS (5 tests).

- [ ] **Step 5: Implement the repos** (thin supabase-js wrappers; no tests — they're I/O, covered by Task 6 integration check):
  - `services/repos/resumeRepo.ts`:
```ts
import { getSupabase } from '../supabase';
import { rowToResume, resumeToRow, type StoredResume } from './mappers';

export async function getPrimary(userId: string): Promise<StoredResume | null> {
  const { data, error } = await getSupabase().from('resumes')
    .select('*').eq('user_id', userId).eq('is_primary', true).maybeSingle();
  if (error) throw error;
  return data ? rowToResume(data as Record<string, unknown>) : null;
}
export async function upsertPrimary(userId: string, r: StoredResume): Promise<StoredResume> {
  const existing = await getPrimary(userId);
  const row = { ...resumeToRow({ ...r, isPrimary: true }, userId), ...(existing?.id ? { id: existing.id } : {}) };
  const { data, error } = await getSupabase().from('resumes').upsert(row).select('*').single();
  if (error) throw error;
  return rowToResume(data as Record<string, unknown>);
}
export async function list(userId: string): Promise<StoredResume[]> {
  const { data, error } = await getSupabase().from('resumes')
    .select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => rowToResume(d as Record<string, unknown>));
}
```
  - `services/repos/trackerRepo.ts`:
```ts
import { getSupabase } from '../supabase';
import { rowToJob, jobToRow } from './mappers';
import type { JobApplication } from '../../types';

export async function list(userId: string): Promise<JobApplication[]> {
  const { data, error } = await getSupabase().from('job_applications')
    .select('*').eq('user_id', userId).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => rowToJob(d as Record<string, unknown>));
}
export async function upsert(userId: string, job: JobApplication): Promise<JobApplication> {
  const { data, error } = await getSupabase().from('job_applications')
    .upsert(jobToRow(job, userId)).select('*').single();
  if (error) throw error;
  return rowToJob(data as Record<string, unknown>);
}
export async function remove(userId: string, id: string): Promise<void> {
  const { error } = await getSupabase().from('job_applications').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
```
  - `services/repos/billingRepo.ts`:
```ts
import { getSupabase } from '../supabase';
import { rowToSubscription } from './mappers';
import type { Subscription } from '../../types';

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await getSupabase().from('subscriptions')
    .select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return rowToSubscription((data ?? null) as Record<string, unknown> | null);
}
```
  - `services/repos/usageRepo.ts`:
```ts
import { getSupabase } from '../supabase';
import { rowToUsage } from './mappers';
import type { UsageCounters } from '../../types';

export async function getUsage(userId: string, month: string): Promise<UsageCounters> {
  const { data, error } = await getSupabase().from('usage_counters')
    .select('*').eq('user_id', userId).eq('month', month).maybeSingle();
  if (error) throw error;
  return rowToUsage((data ?? null) as Record<string, unknown> | null, month);
}
```

- [ ] **Step 6:** `npm run typecheck` (≤24) and `npm test` (mapper tests pass). **Commit** `feat(w2): repository layer + pure row mappers`.

---

### Task 3: Resume builder → Postgres (authed) with one-time localStorage import  ⚠️ CHECKPOINT BEFORE STARTING

**Files:**
- Modify: `components/ResumeBuilder.tsx` (load effect ~190-245; save effect ~431-486)

**Interfaces:**
- Consumes: `useAuth()` (`user`), `resumeRepo.getPrimary/upsertPrimary`, `StoredResume`.

- [ ] **Step 1:** Read `components/ResumeBuilder.tsx` fully to capture current state vars (`formData`, `visibleSections`, `settings`, `selectedTemplate`) and the load/save effects.
- [ ] **Step 2:** On mount, branch on `user`:
  - **Anonymous** (`!user`): keep the existing localStorage load (lines ~193-237) unchanged.
  - **Authenticated**: `const stored = await resumeRepo.getPrimary(user.id)`. If `stored` → hydrate `formData=stored.data`, `visibleSections=stored.visibleSections`, `settings=stored.settings`, `selectedTemplate=stored.templateId`. If `null` → **one-time import**: read the existing localStorage values (`cvbase-resume-data`, `cvbase-visible-sections`, `cvbase-settings`, `cvbase-selected-template`), build a `StoredResume`, call `resumeRepo.upsertPrimary(user.id, ...)`, then hydrate from the result. Guard the import so it runs once (e.g. only when `getPrimary` returns null).
- [ ] **Step 3:** Replace the localStorage **save** effect (lines ~441-444, ~486) so that when `user` is set, a debounced `resumeRepo.upsertPrimary(user.id, { data: formData, visibleSections, settings, templateId: selectedTemplate, title })` runs (300–500ms debounce); when anonymous, keep the localStorage writes. Keep `cvbase-active-section` in localStorage in both cases (UI-only).
- [ ] **Step 4: Manual verify:** signed in, edit the resume → reload → data persists from Postgres; sign out → sign in on a different browser profile → same data. SQL check:
```bash
cd "/Volumes/DATA/cvbase " && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tA -c "select title, template_id, jsonb_array_length(visible_sections) from public.resumes order by updated_at desc limit 3;"
```
- [ ] **Step 5:** `npm run typecheck` (≤24) + `npm run build` (exit 0). **Commit** `feat(w2): resume builder persists to postgres with one-time localStorage import`.

---

### Task 4: Job tracker → Postgres with one-time import

**Files:**
- Modify: `components/SmartStudio.tsx` (tracker load ~210-212; save ~226; key const line 20)

**Interfaces:**
- Consumes: `useAuth()`, `trackerRepo.list/upsert/remove`.

- [ ] **Step 1:** Read the tracker section of `components/SmartStudio.tsx` (the `SMART_STUDIO_JOBS_KEY` load/save and the add/update/delete handlers).
- [ ] **Step 2:** Authenticated: load via `trackerRepo.list(user.id)`. If it returns `[]` and localStorage `smart-studio-jobs-v1` has jobs, **one-time import** each via `trackerRepo.upsert`, then reload. Anonymous: keep localStorage.
- [ ] **Step 3:** Route add/edit/delete through `trackerRepo.upsert` / `trackerRepo.remove` when authed (optimistic UI ok); keep localStorage writes only for anonymous.
- [ ] **Step 4: Manual verify:** add/move/delete a card while signed in → reload → persists. SQL: `select company, role, status from public.job_applications order by updated_at desc limit 5;`
- [ ] **Step 5:** Typecheck (≤24) + build. **Commit** `feat(w2): job tracker persists to postgres with one-time import`.

---

### Task 5: Remove the last of Firebase

**Files:**
- Modify: `services/subscriptionService.ts` (drop Firestore persistence; simulated billing stays localStorage-only until W4)
- Delete: `services/firebase.ts`, `firestore.rules`, `firebase-applet-config.json`
- Modify: `package.json` (remove `firebase` dependency)

**Interfaces:** none new.

- [ ] **Step 1:** In `services/subscriptionService.ts`, remove `import { doc, setDoc, getDoc } from 'firebase/firestore'` and `import { db } from './firebase'`. Replace the Firestore write at `:317` (`setDoc(doc(db,'users',uid,'billing','state'), …)`) with a no-op/comment, and the Firestore read at `:323` (`getDoc(...)`) so cloud billing reads return `null` (the function already falls back to localStorage). Leave the localStorage simulated-billing path intact (W4 replaces it with Stripe + `billingRepo`).
- [ ] **Step 2:** `git rm services/firebase.ts firestore.rules firebase-applet-config.json`.
- [ ] **Step 3:** Remove `"firebase": "^12.14.0"` from `package.json` dependencies; run `npm install` to update the lockfile.
- [ ] **Step 4: Verify no Firebase remains:**
```bash
cd "/Volumes/DATA/cvbase " && (grep -rn "from 'firebase\|firebase/firestore\|firebase/app" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist || echo "no firebase imports ✓")
```
Expect `no firebase imports ✓`.
- [ ] **Step 5:** `npm run typecheck` (≤24), `npm test` (all pass), `npm run build` (exit 0). **Commit** `chore(w2): remove firebase entirely (firestore, config, dep); simulated billing is localStorage-only until W4`.

---

### Task 6: RLS audit + workstream checkpoint

**Files:** Create `supabase/tests/w2-rls-smoke.sh` (cross-user isolation).

- [ ] **Step 1:** Write `supabase/tests/w2-rls-smoke.sh` modeled on `w1-auth-smoke.sh`: create two confirmed users A and B (admin-confirm via service_role), insert a resume + a job for each via their JWT, then assert A's token reading `resumes`/`job_applications` returns only A's rows (not B's), and A cannot `update`/`delete` B's row id (expect 0 rows affected / error). Assert an anon/authed client cannot select `ai_logs` and cannot `insert` into `subscriptions` (RLS denies). Clean up both users.
- [ ] **Step 2:** Run it → ALL PASS.
- [ ] **Step 3: Full gate:** `npm run typecheck` (≤24) · `npm test` (all pass) · `npm run build` (exit 0) · `grep` firebase imports = none.
- [ ] **Step 4: Commit** `test(w2): cross-user RLS isolation smoke test` and **tag** `git tag w2-complete`.

## Self-Review

- **Spec coverage (§7 W2 + §5):** all §5 tables created (profiles in W1; the rest in Task 1) with RLS; `subscriptions`/`usage_counters` owner-read-only + service_role writes; `ai_logs` service_role-only; `headshots` Storage bucket + owner policy (Task 1). Repos `profileRepo`(W1 mapping reused)/`resumeRepo`/`trackerRepo`/`billingRepo`(read)/`usageRepo`(read) (Task 2). Builder + tracker on Postgres with one-time import (Tasks 3–4). Firestore removed, `firestore.rules` retired (Task 5). RLS verified cross-user (Task 6). ✓
- **Placeholder scan:** SQL and mapper/repos are full code; builder/tracker integration gives exact files + line ranges + the repo calls + import logic (implementer reads the component first, per Task 3/4 Step 1). ✓
- **Type consistency:** `StoredResume` defined in `mappers.ts`, consumed by `resumeRepo` and the builder; `rowToJob`/`jobToRow` match `JobApplication`; `rowToSubscription` returns the `types.ts` `Subscription`. ✓
- **Risk note:** Tasks 3–4 change core persistence — Task 3 is marked CHECKPOINT BEFORE STARTING (human review, mirroring the W1 cutover). Anonymous localStorage path is preserved, so the change is additive for logged-out users.
- **Deferred (intentional):** real billing writes to `subscriptions` (W4 Stripe webhook); `ai_logs`/`usage_counters` writes (W3 Edge Functions); multi-resume/version-manager UI (W6 — schema is ready now).
