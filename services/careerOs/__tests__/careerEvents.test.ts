import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const insert = vi.fn(async () => undefined);
const listRecent = vi.fn(async () => []);
const captureException = vi.fn();
vi.mock('../eventRepo', () => ({ insert: (...a: unknown[]) => insert(...(a as [])), listRecent: (...a: unknown[]) => listRecent(...(a as [])) }));
vi.mock('../../../lib/monitoring', () => ({ captureException: (...a: unknown[]) => captureException(...(a as [])) }));

import {
  ACTIVITY_FEED_EVENTS, EVENT_DICTIONARY, EVENT_SCHEMA_VERSION, EventRedactionError, MEANINGFUL_ACTION_EVENTS, buildEvent,
  configureEvents, dedupeKeyFor, emit, endTimer, listActivity, newCorrelationId, redactPayload, startTimer, track,
} from '../careerEvents';
import type { ProductEventName } from '../types';

beforeEach(() => { insert.mockClear(); listRecent.mockClear(); captureException.mockClear(); configureEvents({ strict: true }); });
afterEach(() => configureEvents({ strict: null }));

describe('event dictionary', () => {
  it('covers every ProductEventName with subjects and feed/meaningful flags', () => {
    const names = Object.keys(EVENT_DICTIONARY) as ProductEventName[];
    expect(names).toHaveLength(38);
    for (const n of names) expect(EVENT_DICTIONARY[n].description.length).toBeGreaterThan(0);
    expect(ACTIVITY_FEED_EVENTS).toContain('application_submitted');
    expect(ACTIVITY_FEED_EVENTS).not.toContain('career_os_opened');
    expect(ACTIVITY_FEED_EVENTS).not.toContain('recommendation_opened');
    expect(MEANINGFUL_ACTION_EVENTS).toContain('career_action_completed');
    expect(MEANINGFUL_ACTION_EVENTS).not.toContain('recommendation_dismissed');
  });
});

describe('buildEvent', () => {
  it('produces the versioned envelope with redacted scalar payload and id-only subject refs', () => {
    const e = buildEvent('application_started', { subjectRefs: { application: 'a1', opportunity: 'o1' }, payload: { attempt: 1, reapply: false, campaign: null }, correlationId: 'corr', dedupeKey: 'k', occurredAt: '2026-09-20T00:00:00.000Z' });
    expect(e).toEqual({ eventName: 'application_started', schemaVersion: EVENT_SCHEMA_VERSION, subjectRefs: { application: 'a1', opportunity: 'o1' }, correlationId: 'corr', source: 'client', occurredAt: '2026-09-20T00:00:00.000Z', payload: { attempt: 1, reapply: false, campaign: null }, dedupeKey: 'k' });
    const auto = buildEvent('career_goal_created', { subjectRefs: { goal: 'g1' } });
    expect(auto.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(auto.dedupeKey).toBeNull();
    expect(Date.parse(auto.occurredAt)).not.toBeNaN();
    expect(() => buildEvent('not_an_event' as ProductEventName)).toThrow('unknown_event:not_an_event');
  });
  it('in strict (dev) mode a private-looking payload throws with the violations named', () => {
    expect(() => buildEvent('career_evidence_confirmed', { subjectRefs: { fact: 'f1' }, payload: { narrative: 'Led a ward' } })).toThrow(EventRedactionError);
    for (const key of ['jobDescriptionText', 'description', 'summary', 'email', 'phone', 'salary', 'compMin', 'answer', 'prompt', 'content', 'address']) {
      expect(() => buildEvent('career_goal_created', { payload: { [key]: 1 } })).toThrow(/is not allowed/);
    }
    expect(() => buildEvent('career_goal_created', { payload: { note: 'x'.repeat(121) } })).toThrow(/looks like private text/);
    expect(() => buildEvent('career_goal_created', { payload: { contactEmail: 'me@example.com' } })).toThrow(/is not allowed/);
    expect(() => buildEvent('career_goal_created', { payload: { who: 'me@example.com' } })).toThrow(/looks like private text/);
    expect(() => buildEvent('career_goal_created', { payload: { nested: { a: 1 } } })).toThrow(/must be a scalar/);
    expect(() => buildEvent('career_goal_created', { subjectRefs: { goal: 'has space' } })).toThrow(/is not an id/);
    expect(() => buildEvent('career_goal_created', { subjectRefs: { goal: '' } })).toThrow(/must be an id/);
    try { buildEvent('career_goal_created', { payload: { salary: 1, ok: 2 } }); } catch (err) {
      expect(err).toBeInstanceOf(EventRedactionError);
      expect((err as EventRedactionError).violations).toEqual(['payload key "salary" is not allowed']);
      expect((err as EventRedactionError).eventName).toBe('career_goal_created');
    }
  });
  it('in lenient (prod) mode the offending keys are dropped and the rest kept', () => {
    configureEvents({ strict: false });
    const e = buildEvent('career_evidence_confirmed', { subjectRefs: { fact: 'f1', bad: 'x y' }, payload: { narrative: 'Led a ward', revision: 2, long: 'x'.repeat(200), who: 'a@b.c' } });
    expect(e.payload).toEqual({ revision: 2 });
    expect(e.subjectRefs).toEqual({ fact: 'f1' });
  });
  it('redactPayload reports every violation without throwing', () => {
    const r = redactPayload({ ok: 1, description: 'x', big: 'y'.repeat(121) }, { a: 'id', b: 42 });
    expect(r.payload).toEqual({ ok: 1 });
    expect(r.subjectRefs).toEqual({ a: 'id' });
    expect(r.violations).toEqual(['payload key "description" is not allowed', 'payload "big" looks like private text', 'subject "b" must be an id']);
  });
});

describe('dedupe keys, correlation ids, emit and timers', () => {
  it('dedupeKeyFor is order-independent over subjects and accepts a suffix', () => {
    expect(dedupeKeyFor('application_submitted', { application: 'a1', opportunity: 'o1' })).toBe('application_submitted:application=a1,opportunity=o1');
    expect(dedupeKeyFor('application_submitted', { opportunity: 'o1', application: 'a1' })).toBe(dedupeKeyFor('application_submitted', { application: 'a1', opportunity: 'o1' }));
    expect(dedupeKeyFor('career_action_completed', { action: 'x' }, 'attempt-2')).toBe('career_action_completed:action=x:attempt-2');
    expect(dedupeKeyFor('career_os_opened', {})).toBe('career_os_opened');
    expect(newCorrelationId()).not.toBe(newCorrelationId());
  });
  it('emit persists through eventRepo and swallows failures into monitoring', async () => {
    const e = buildEvent('career_goal_created', { subjectRefs: { goal: 'g1' } });
    await emit('u1', e);
    expect(insert).toHaveBeenCalledWith('u1', e);
    insert.mockRejectedValueOnce(new Error('offline'));
    await expect(emit('u1', e)).resolves.toBeUndefined();
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), { eventName: 'career_goal_created', correlationId: e.correlationId });
    await track('u1', 'opportunity_saved', { subjectRefs: { opportunity: 'o1' } });
    expect(insert).toHaveBeenCalledTimes(3);
    expect(() => track('u1', 'opportunity_saved', { payload: { salary: 1 } })).toThrow(EventRedactionError);
  });
  it('listActivity asks only for feed events', async () => {
    await listActivity('u1', 5);
    expect(listRecent).toHaveBeenCalledWith('u1', 5, ACTIVITY_FEED_EVENTS);
  });
  it('timers produce a payload-safe perf record', () => {
    const t = startTimer('context_resolve');
    const perf = t.end({ route: 'application' });
    expect(perf).toMatchObject({ name: 'context_resolve', route: 'application' });
    expect(perf.ms).toBeGreaterThanOrEqual(0);
    expect(['dev', 'prod']).toContain(perf.sample);
    expect(endTimer(t).name).toBe('context_resolve');
    expect(() => buildEvent('career_os_opened', { payload: perf })).not.toThrow();
  });
});

describe('isForbiddenPayloadKey', () => {
  it('blocks compensation fields but allows metadata that merely contains "comp"', async () => {
    const { isForbiddenPayloadKey } = await import('../careerEvents');
    for (const k of ['compMin', 'comp_max', 'compensation', 'comp', 'jobDescriptionText']) expect(isForbiddenPayloadKey(k), k).toBe(true);
    for (const k of ['completionSource', 'company', 'actionType', 'source']) expect(isForbiddenPayloadKey(k), k).toBe(false);
  });
});
