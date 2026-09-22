/**
 * Product events (COS-017): a typed dictionary, a versioned envelope and a
 * redaction gate. Payloads may carry ids, revisions, counts, flags and
 * timings only. A key or value that looks like private text (CV/JD text,
 * answers, contact details, pay) is rejected in development and dropped in
 * production — it never reaches the event store.
 */
import { captureException } from '../../lib/monitoring';
import * as eventRepo from './eventRepo';
import type { ProductEventInput } from './mappers';
import { newId } from './util';
import type { ProductEvent, ProductEventName } from './types';

export const EVENT_SCHEMA_VERSION = 1;

export interface EventDefinition {
  description: string;
  /** Subject reference keys expected (ids only). */
  subjects: string[];
  /** Shown in the Today activity feed. */
  activity: boolean;
  /** Counts toward the north-star measure (meaningful, goal-linked completion). */
  meaningful: boolean;
}

export const EVENT_DICTIONARY: Record<ProductEventName, EventDefinition> = {
  career_os_opened: { description: 'Career OS shell opened', subjects: [], activity: false, meaningful: false },
  career_import_reviewed: { description: 'Imported facts reviewed', subjects: ['resume'], activity: true, meaningful: true },
  career_profile_completed: { description: 'Profile basics completed', subjects: [], activity: true, meaningful: false },
  career_goal_created: { description: 'Goal created', subjects: ['goal'], activity: true, meaningful: true },
  career_goal_updated: { description: 'Goal revised', subjects: ['goal'], activity: true, meaningful: false },
  opportunity_saved: { description: 'Opportunity saved', subjects: ['opportunity'], activity: true, meaningful: false },
  opportunity_reviewed: { description: 'Opportunity reviewed', subjects: ['opportunity'], activity: true, meaningful: true },
  opportunity_fit_reviewed: { description: 'Fit analysis reviewed', subjects: ['opportunity', 'analysis'], activity: false, meaningful: true },
  application_started: { description: 'Application started', subjects: ['application', 'opportunity'], activity: true, meaningful: true },
  application_submitted: { description: 'Submission recorded', subjects: ['application'], activity: true, meaningful: true },
  application_ready: { description: 'All necessary readiness items complete', subjects: ['application'], activity: true, meaningful: false },
  application_artifact_saved: { description: 'Preparation artifact saved', subjects: ['application', 'artifact'], activity: false, meaningful: true },
  cv_tailoring_started: { description: 'PRISM tailoring started', subjects: ['application', 'run'], activity: false, meaningful: false },
  cv_tailored: { description: 'Tailored CV accepted', subjects: ['application', 'resume', 'run'], activity: true, meaningful: true },
  recommendation_opened: { description: 'Action opened', subjects: ['action'], activity: false, meaningful: false },
  recommendation_accepted: { description: 'Action started', subjects: ['action'], activity: false, meaningful: false },
  recommendation_dismissed: { description: 'Action dismissed', subjects: ['action'], activity: false, meaningful: false },
  career_action_completed: { description: 'Action completed (durable or user-reported)', subjects: ['action'], activity: true, meaningful: true },
  campaign_created: { description: 'Campaign created', subjects: ['campaign', 'goal'], activity: true, meaningful: false },
  campaign_completed: { description: 'Campaign closed', subjects: ['campaign'], activity: true, meaningful: false },
  career_achievement_updated: { description: 'Achievement added or edited', subjects: ['fact'], activity: true, meaningful: true },
  career_evidence_confirmed: { description: 'Fact confirmed by the user', subjects: ['fact'], activity: false, meaningful: true },
  career_claim_corrected: { description: 'Fact corrected or withdrawn', subjects: ['fact'], activity: true, meaningful: false },
  artifact_update_reviewed: { description: 'Stale artifact reviewed after a fact change', subjects: ['artifact', 'fact'], activity: false, meaningful: false },
  interview_preparation_started: { description: 'Interview preparation started', subjects: ['application', 'interview'], activity: true, meaningful: true },
  interview_practice_completed: { description: 'Practice answer submitted', subjects: ['interview'], activity: false, meaningful: true },
  application_response_recorded: { description: 'Employer response recorded', subjects: ['application', 'outcome'], activity: true, meaningful: false },
  offer_recorded: { description: 'Offer recorded', subjects: ['application', 'outcome'], activity: true, meaningful: false },
  career_outcome_recorded: { description: 'Outcome observation recorded', subjects: ['application', 'outcome'], activity: true, meaningful: false },
  coach_conversation_started: { description: 'Coach conversation started', subjects: ['conversation'], activity: false, meaningful: false },
  coach_action_executed: { description: 'Coach tool executed with a receipt', subjects: ['conversation', 'run'], activity: true, meaningful: true },
  library_asset_opened: { description: 'Library asset opened', subjects: ['asset'], activity: false, meaningful: false },
  career_search_used: { description: 'Command search used', subjects: [], activity: false, meaningful: false },
  notification_action_opened: { description: 'Notification opened', subjects: ['notification', 'action'], activity: false, meaningful: false },
  career_onboarding_completed: { description: 'Onboarding completed', subjects: [], activity: true, meaningful: false },
  career_insight_reviewed: { description: 'Insight reviewed', subjects: ['insight'], activity: false, meaningful: false },
  career_scenario_compared: { description: 'Scenario comparison run', subjects: ['scenario'], activity: false, meaningful: false },
  career_reminder_opened: { description: 'Reminder opened', subjects: ['notification'], activity: false, meaningful: false },
};

export const ACTIVITY_FEED_EVENTS: readonly ProductEventName[] = (Object.keys(EVENT_DICTIONARY) as ProductEventName[])
  .filter((name) => EVENT_DICTIONARY[name].activity);

export const MEANINGFUL_ACTION_EVENTS: readonly ProductEventName[] = (Object.keys(EVENT_DICTIONARY) as ProductEventName[])
  .filter((name) => EVENT_DICTIONARY[name].meaningful);

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

// Keys that would carry private content. Compensation fields (compMin,
// comp_max, compensation, comp) are forbidden; words that merely contain
// "comp" (completionSource, company) are metadata and allowed.
export const FORBIDDEN_PAYLOAD_KEY_RE = /(text|description|narrative|summary|email|phone|salary|compensation|answer|prompt|content|address)/i;
const COMP_FIELD_RE = /^comp$|^comp(?=[A-Z_])/;
export const isForbiddenPayloadKey = (key: string): boolean => FORBIDDEN_PAYLOAD_KEY_RE.test(key) || COMP_FIELD_RE.test(key);
export const MAX_PAYLOAD_STRING = 120;

export class EventRedactionError extends Error {
  readonly code = 'event_redaction';
  constructor(public readonly eventName: string, public readonly violations: string[]) {
    super(`event ${eventName} payload rejected: ${violations.join('; ')}`);
    this.name = 'EventRedactionError';
  }
}

let strictMode: boolean | null = null;

function isDevBuild(): boolean {
  try { return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV); } catch { return false; }
}

/** Test/dev hook: force strict (throw) or lenient (drop) redaction. `null` restores the build default. */
export function configureEvents(opts: { strict: boolean | null }): void {
  strictMode = opts.strict;
}

const isStrict = (): boolean => (strictMode === null ? isDevBuild() : strictMode);

const looksPrivate = (value: string): boolean => value.length > MAX_PAYLOAD_STRING || value.includes('@');

export interface RedactionResult {
  payload: ProductEvent['payload'];
  subjectRefs: Record<string, string>;
  violations: string[];
}

/** Drop (and list) every payload key/value that could carry private text. */
export function redactPayload(payload: Record<string, unknown> | undefined, subjectRefs: Record<string, unknown> | undefined): RedactionResult {
  const out: ProductEvent['payload'] = {};
  const refs: Record<string, string> = {};
  const violations: string[] = [];
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (isForbiddenPayloadKey(key)) { violations.push(`payload key "${key}" is not allowed`); continue; }
    if (value === null || typeof value === 'number' || typeof value === 'boolean') { out[key] = value; continue; }
    if (typeof value === 'string') {
      if (looksPrivate(value)) { violations.push(`payload "${key}" looks like private text`); continue; }
      out[key] = value;
      continue;
    }
    violations.push(`payload "${key}" must be a scalar`);
  }
  for (const [key, value] of Object.entries(subjectRefs ?? {})) {
    if (typeof value !== 'string' || value === '') { violations.push(`subject "${key}" must be an id`); continue; }
    if (looksPrivate(value) || /\s/.test(value)) { violations.push(`subject "${key}" is not an id`); continue; }
    refs[key] = value;
  }
  return { payload: out, subjectRefs: refs, violations };
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface BuildEventOptions {
  subjectRefs?: Record<string, string>;
  payload?: Record<string, unknown>;
  correlationId?: string;
  dedupeKey?: string | null;
  occurredAt?: string;
  source?: ProductEvent['source'];
}

export function newCorrelationId(): string {
  return newId();
}

/** `name:subjectKey=id,...` — stable for the same subjects regardless of key order. */
export function dedupeKeyFor(name: ProductEventName, subjectRefs: Record<string, string>, suffix?: string): string {
  const refs = Object.keys(subjectRefs).sort().map((k) => `${k}=${subjectRefs[k]}`).join(',');
  return [name, refs, suffix].filter((p) => p !== undefined && p !== '').join(':');
}

/**
 * Build a versioned, redacted envelope. In development a private-looking
 * payload throws so it is fixed at the source; in production it is dropped.
 */
export function buildEvent(name: ProductEventName, opts: BuildEventOptions = {}): ProductEventInput {
  if (!(name in EVENT_DICTIONARY)) throw new Error(`unknown_event:${name}`);
  const { payload, subjectRefs, violations } = redactPayload(opts.payload, opts.subjectRefs);
  if (violations.length > 0 && isStrict()) throw new EventRedactionError(name, violations);
  return {
    eventName: name,
    schemaVersion: EVENT_SCHEMA_VERSION,
    subjectRefs,
    correlationId: opts.correlationId ?? newCorrelationId(),
    source: opts.source ?? 'client',
    occurredAt: opts.occurredAt ?? new Date().toISOString(),
    payload,
    dedupeKey: opts.dedupeKey === undefined ? null : opts.dedupeKey,
  };
}

/** Fire-and-forget persistence; a failure is reported to monitoring and never thrown to the caller. */
export function emit(userId: string, event: ProductEventInput): Promise<void> {
  return eventRepo.insert(userId, event).catch((err: unknown) => {
    captureException(err, { eventName: event.eventName, correlationId: event.correlationId });
  });
}

/** Build and emit in one step; redaction errors (dev) still surface synchronously. */
export function track(userId: string, name: ProductEventName, opts: BuildEventOptions = {}): Promise<void> {
  return emit(userId, buildEvent(name, opts));
}

/** Genuine milestone events for the Today activity feed. */
export function listActivity(userId: string, limit = 20): Promise<ProductEvent[]> {
  return eventRepo.listRecent(userId, limit, ACTIVITY_FEED_EVENTS);
}

// ---------------------------------------------------------------------------
// Timings
// ---------------------------------------------------------------------------

export interface PerfPayload extends Record<string, string | number | boolean | null> {
  name: string;
  ms: number;
  sample: 'dev' | 'prod';
}

export interface Timer { name: string; startedAt: number; end(extra?: Record<string, string | number | boolean | null>): PerfPayload }

const nowMs = (): number => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

/** Start a timer; `end()` yields a payload-safe `{ name, ms, sample }`. */
export function startTimer(name: string): Timer {
  const startedAt = nowMs();
  return {
    name,
    startedAt,
    end(extra = {}) {
      return { ...extra, name, ms: Math.max(0, Math.round(nowMs() - startedAt)), sample: isDevBuild() ? 'dev' : 'prod' };
    },
  };
}

export const endTimer = (timer: Timer, extra?: Record<string, string | number | boolean | null>): PerfPayload => timer.end(extra);
