import { describe, expect, it } from 'vitest';
import {
  actionToRow, analysisToRow, applicationToRow, artifactToRow, campaignToRow, conversationToRow, deriveStageFromStatus,
  eventToRow, factReferenceToRow, factToRow, goalToRow, insightToRow, interviewToRow, messageToRow, notificationToRow,
  opportunityToRow, outcomeToRow, preferencesToRow, profileToRow, rowToAction, rowToActionRun, rowToAnalysis,
  rowToApplication, rowToArtifact, rowToCampaign, rowToCampaignMembership, rowToConversation, rowToEvent, rowToFact,
  rowToFactReference, rowToGoal, rowToGoalRevision, rowToInsight, rowToInterview, rowToMessage, rowToMigration,
  rowToNotification, rowToOpportunity, rowToOutcome, rowToPreferences, rowToProfile, rowToScenario, scenarioToRow,
  statusForStage,
} from '../mappers';
import { action, analysis, application, artifact, campaign, fact, goal, interview, opportunity, outcome } from './fixtures';

describe('career_profiles', () => {
  it('round-trips and defaults unknown columns', () => {
    const row = profileToRow({ headline: 'RN', onboarding: { step: 'goal' }, factsRevision: 'abc' }, 'u1');
    expect(row).toEqual({ user_id: 'u1', headline: 'RN', onboarding: { step: 'goal' }, facts_revision: 'abc' });
    const p = rowToProfile({ ...row, revision: 3, migrated_at: null, migration_version: '2' });
    expect(p).toEqual({ userId: 'u1', headline: 'RN', onboarding: { step: 'goal' }, migrationVersion: 2, migratedAt: null, factsRevision: 'abc', revision: 3 });
    expect(rowToProfile({}).revision).toBe(1);
    expect(rowToProfile({ onboarding: 'junk' }).onboarding).toEqual({});
  });
});

describe('career_facts and references', () => {
  it('round-trips every column', () => {
    const f = fact({ id: 'f9', confirmationState: 'verified', verification: { method: 'document', source: 'HR letter', verifiedAt: '2026-01-01' }, extractionConfidence: 0.75, sourceFingerprint: 'fp', legacyId: 'L1', conflictGroup: 'cg', reviewState: 'conflict', status: 'withdrawn', sortOrder: 4, payload: { metric: '20', unit: '%' } });
    const row = factToRow(f, 'u1');
    expect(row.user_id).toBe('u1');
    expect(row.start_date).toBe('2019-01');
    expect(row.source_fingerprint).toBe('fp');
    const back = rowToFact({ ...row, id: 'f9', revision: 1, created_at: f.createdAt, updated_at: f.updatedAt });
    expect(back).toEqual(f);
  });
  it('drops an incomplete verification and falls back on bad enums', () => {
    const f = rowToFact({ id: 'x', kind: 'nonsense', confirmation_state: 'llm_sure', verification: { method: 'x' }, status: 'gone', review_state: 7, extraction_confidence: '0.5' });
    expect(f.kind).toBe('custom');
    expect(f.confirmationState).toBe('inferred');
    expect(f.verification).toBeNull();
    expect(f.status).toBe('active');
    expect(f.reviewState).toBe('reviewed');
    expect(f.extractionConfidence).toBe(0.5);
  });
  it('maps references with the unique edge columns', () => {
    const row = factReferenceToRow({ factId: 'f1', factRevision: 2, artifactKind: 'resume', artifactId: 'r1', artifactSection: 'experience' }, 'u1');
    expect(row).toEqual({ user_id: 'u1', fact_id: 'f1', fact_revision: 2, artifact_kind: 'resume', artifact_id: 'r1', artifact_section: 'experience' });
    expect(rowToFactReference({ ...row, id: 'ref1', created_at: 't' })).toEqual({ id: 'ref1', factId: 'f1', factRevision: 2, artifactKind: 'resume', artifactId: 'r1', artifactSection: 'experience', createdAt: 't' });
  });
});

describe('career_goals', () => {
  it('round-trips structured geography/compensation/constraints', () => {
    const g = goal({ remotePreference: 'hybrid', compMin: 45000, compMax: 55000, compCurrency: 'GBP', compPeriod: 'year', targetDate: '2027-01-01', targetEmployers: ['NHS'], constraints: [{ id: 'c1', kind: 'hard', text: 'London only', field: 'location', value: 'London' }], priorities: [{ key: 'compensation', weight: 0.8 }] });
    const row = goalToRow(g, 'u1');
    expect(row.comp_currency).toBe('GBP');
    expect(row.is_primary).toBe(true);
    const back = rowToGoal({ ...row, id: g.id, revision: 1, created_at: g.createdAt, updated_at: g.updatedAt });
    expect(back).toEqual(g);
  });
  it('accepts numeric strings from PostgREST and rejects bad enums', () => {
    const g = rowToGoal({ comp_min: '1200.50', remote_preference: 'moon', comp_period: 'week', target_employers: 'x', constraints: [null, 'bad', { id: 'k' }] });
    expect(g.compMin).toBe(1200.5);
    expect(g.remotePreference).toBeNull();
    expect(g.compPeriod).toBeNull();
    expect(g.targetEmployers).toEqual([]);
    expect(g.constraints).toEqual([{ id: 'k' }]);
  });
  it('maps a goal revision snapshot back to a goal at that revision', () => {
    const g = rowToGoalRevision({ goal_id: 'g1', revision: 4, created_at: 'snap', snapshot: { id: 'g1', title: 'Old', role: 'RN', is_primary: false } });
    expect(g.id).toBe('g1');
    expect(g.revision).toBe(4);
    expect(g.title).toBe('Old');
    expect(g.updatedAt).toBe('snap');
  });
});

describe('opportunities and campaigns', () => {
  it('round-trips an opportunity including merge metadata', () => {
    const o = opportunity({ remoteType: 'remote', sourceUrl: 'https://x', contentFingerprint: 'fp', sourceDate: '2026-08-01', listingStatus: 'open', compMin: 1, compMax: 2, compCurrency: 'EUR', compPeriod: 'month', requirements: [{ id: 'r', text: 'x', kind: 'must' }], legacyApplicationId: 'a0', mergedIntoId: 'o2', mergeUndo: { targetId: 'o2' }, notInterestedReason: 'far' });
    const row = opportunityToRow(o, 'u1');
    const back = rowToOpportunity({ ...row, id: o.id, revision: 1, created_at: o.createdAt, updated_at: o.updatedAt });
    expect(back).toEqual(o);
    expect(rowToOpportunity({ requirements: [{ id: 'x' }, { id: 'y', text: 'ok', kind: 'nice' }] }).requirements).toEqual([{ id: 'y', text: 'ok', kind: 'nice' }]);
  });
  it('round-trips a campaign and its memberships', () => {
    const c = campaign({ milestones: [{ id: 'm', title: 'Shortlist', state: 'doing', dueDate: '2026-10-01' }], closedReason: null });
    const row = campaignToRow(c, 'u1');
    expect(rowToCampaign({ ...row, id: c.id, revision: 1, created_at: c.createdAt, updated_at: c.updatedAt })).toEqual(c);
    expect(rowToCampaignMembership({ campaign_id: 'c1', opportunity_id: 'o1', created_at: 't' })).toEqual({ campaignId: 'c1', opportunityId: 'o1', createdAt: 't' });
  });
});

describe('job_applications', () => {
  it('keeps legacy columns verbatim and maps the extension', () => {
    const a = application({ jobUrl: 'https://j', status: 'applied', dateApplied: '2026-09-01', notes: 'n', matchScore: 70, campaignId: 'c1', goalId: 'g1', goalRevision: 2, goalSnapshot: goal({ revision: 2 }), stage: 'submitted', submittedAt: '2026-09-02T00:00:00Z', submissionSnapshot: { resumeId: 'r1', resumeVersionId: null, resumeRevision: 3, artifactIds: [], confirmedAt: '2026-09-02T00:00:00Z', method: 'export' }, currentResumeId: 'r1', prismRunId: 'p1', followUpAt: '2026-09-10', readiness: { items: [], computedAt: 't' } });
    const row = applicationToRow(a, 'u1');
    expect(row.role).toBe('Senior Nurse');
    expect(row.url).toBe('https://j');
    expect(row.stage).toBe('submitted');
    expect(row).not.toHaveProperty('attempt_no');
    const back = rowToApplication({ ...row, id: a.id, revision: 1, attempt_no: 1, goal_revision: 2, goal_snapshot: goalToRow(goal({ revision: 2 }), 'u1'), created_at: a.createdAt, updated_at: a.updatedAt });
    expect({ ...back, goalSnapshot: null }).toEqual({ ...a, goalSnapshot: null });
    expect(back.goalSnapshot?.revision).toBe(1);
    expect(back.goalSnapshot?.title).toBe('Senior nurse role');
  });
  it('derives stage from legacy status exactly like the SQL trigger', () => {
    expect(deriveStageFromStatus('wishlist', null, null)).toBe('saved');
    expect(deriveStageFromStatus('wishlist', 'preparing', null)).toBe('preparing');
    expect(deriveStageFromStatus('applied', null, null)).toBe('submitted');
    expect(deriveStageFromStatus('applied', 'response', null)).toBe('response');
    expect(deriveStageFromStatus('interview', null, null)).toBe('interview');
    expect(deriveStageFromStatus('offer', null, null)).toBe('final');
    expect(deriveStageFromStatus('offer', 'closed', 'accepted')).toBe('closed');
    expect(deriveStageFromStatus('rejected', null, null)).toBe('closed');
    const rejected = rowToApplication({ id: 'a', status: 'rejected' });
    expect(rejected.stage).toBe('closed');
    expect(rejected.closedReason).toBe('rejected');
    const applied = rowToApplication({ id: 'a', status: 'applied', closed_reason: 'withdrawn' });
    expect(applied.stage).toBe('submitted');
    expect(applied.closedReason).toBeNull();
    expect(rowToApplication({ id: 'a', status: 'nonsense' }).status).toBe('wishlist');
  });
  it('maps stages back to the five legacy statuses without upgrading a rejection', () => {
    expect(statusForStage('saved', null)).toBe('wishlist');
    expect(statusForStage('preparing', null)).toBe('wishlist');
    expect(statusForStage('submitted', null)).toBe('applied');
    expect(statusForStage('response', null)).toBe('applied');
    expect(statusForStage('interview', null)).toBe('interview');
    expect(statusForStage('final', null)).toBe('offer');
    expect(statusForStage('closed', 'rejected')).toBe('rejected');
    expect(statusForStage('closed', 'withdrawn')).toBe('rejected');
    expect(statusForStage('closed', 'accepted')).toBe('offer');
  });
});

describe('artifacts, interviews, outcomes', () => {
  it('round-trips an artifact', () => {
    const a = artifact({ kind: 'cover_letter', title: 'CL', content: { html: '<p>x</p>' }, plainText: 'x', source: 'ai', status: 'reviewed', snapshotOf: 'art0', provenance: { factIds: ['f1'], sourceRevisions: { f1: 2 } }, stale: true });
    const row = artifactToRow(a, 'u1');
    expect(row.plain_text).toBe('x');
    expect(rowToArtifact({ ...row, id: a.id, revision: 1, created_at: a.createdAt, updated_at: a.updatedAt })).toEqual(a);
  });
  it('round-trips an interview session with uuid[] story facts', () => {
    const s = interview({ scheduledAt: '2026-09-10T09:00:00Z', timeZone: 'Europe/London', interviewType: 'panel', themes: [{ id: 't', theme: 'Leadership', covered: false }], storyFactIds: ['f1', 'f2'], practice: [{ id: 'p', question: 'Q', answer: '', feedback: null, answeredAt: null }], readiness: { covered: 0 }, selfReportedResult: 'good', recruiterFeedback: null, status: 'prepared' });
    const row = interviewToRow(s, 'u1');
    expect(row.story_fact_ids).toEqual(['f1', 'f2']);
    expect(rowToInterview({ ...row, id: s.id, revision: 1, created_at: s.createdAt, updated_at: s.updatedAt })).toEqual(s);
    expect(rowToInterview({ story_fact_ids: [1, 'ok'] }).storyFactIds).toEqual(['ok']);
  });
  it('round-trips an outcome observation', () => {
    const o = outcome({ kind: 'correction', supersedesId: 'x0', details: { correctedKind: 'rejected' }, note: 'typo' });
    const row = outcomeToRow(o, 'u1');
    expect(row.supersedes_id).toBe('x0');
    expect(rowToOutcome({ ...row, id: o.id, created_at: o.createdAt })).toEqual(o);
    expect(rowToOutcome({ kind: 'hired' }).kind).toBe('response');
  });
});

describe('opportunity_analyses', () => {
  it('round-trips and rounds the ATS score to an int column', () => {
    const an = analysis({ qualification: { supported: [{ requirementId: 'r1', text: 'x', state: 'supported', evidence: [{ factId: 'f1', label: 'L', confirmationState: 'verified' }] }], partial: [], missing: [], unknown: [] }, direction: { factors: [{ key: 'role', label: 'Role', verdict: 'aligned', detail: 'd' }], constraints: [], missing: ['compensation'], unavailableReason: undefined }, atsScore: 71.6, hiddenByConstraint: { constraintId: 'c1', text: 'London only' } });
    const row = analysisToRow(an, 'u1');
    expect(row.ats_score).toBe(72);
    const back = rowToAnalysis({ ...row, id: an.id });
    expect(back.atsScore).toBe(72);
    expect(back.qualification.supported[0].evidence[0].factId).toBe('f1');
    expect(back.direction.missing).toEqual(['compensation']);
    expect(back.direction).not.toHaveProperty('unavailableReason');
    expect(back.hiddenByConstraint).toEqual({ constraintId: 'c1', text: 'London only' });
    expect(rowToAnalysis({ direction: { unavailableReason: 'no goal' } }).direction.unavailableReason).toBe('no goal');
    expect(rowToAnalysis({ qualification: 'junk' }).qualification).toEqual({ supported: [], partial: [], missing: [], unknown: [] });
  });
});

describe('career_actions and action_runs', () => {
  it('round-trips an action', () => {
    const a = action({ evidenceRefs: [{ kind: 'fact', id: 'f1', label: 'x' }], contextRefs: { application: { id: 'a1', revision: 2 } }, inputRevisions: { 'application:a1': 2 }, estimatedEffort: '~30 min', effortSource: 'rule_estimate', confidence: null, snoozedUntil: '2026-09-05T00:00:00Z', expiresAt: null, lastError: { code: 'quota', retryable: true, at: 't' }, resurfacedReason: 'date changed' });
    const row = actionToRow(a, 'u1');
    expect(row.dedupe_key).toBe(a.dedupeKey);
    expect(rowToAction({ ...row, id: a.id, revision: 1, created_at: a.createdAt, updated_at: a.updatedAt })).toEqual(a);
    expect(rowToAction({ last_error: { retryable: true } }).lastError).toBeNull();
    expect(rowToAction({ confidence: '0.42' }).confidence).toBe(0.42);
  });
  it('maps a run receipt including a partial confirmation object', () => {
    const r = rowToActionRun({ id: 'r', action_id: 'a', tool: 'tailor', status: 'waiting_confirmation', idempotency_key: 'k', attempt: 2, request_id: 'q', actor: 'coach', confirmation: { contentHash: 'h', expiresAt: 'e', token: 't' }, usage: { kind: 'aiActions', charged: true }, retryable: true, failure_code: null });
    expect(r.status).toBe('waiting_confirmation');
    expect(r.actor).toBe('coach');
    expect(r.confirmation).toEqual({ contentHash: 'h', expiresAt: 'e', token: 't' });
    expect(r.usage).toEqual({ kind: 'aiActions', charged: true });
    expect(rowToActionRun({ confirmation: { token: 'no-hash' } }).confirmation).toBeNull();
  });
});

describe('coach, events, notifications, preferences, scenarios, insights, migrations', () => {
  it('round-trips conversations and messages', () => {
    const row = conversationToRow({ title: 'T', contextRefs: { goal: { id: 'g1', revision: 1 } }, summary: 's', summarySourceIds: ['m1'], status: 'archived', lastMessageAt: 'l' }, 'u1');
    const c = rowToConversation({ ...row, id: 'c', revision: 2, created_at: 'a', updated_at: 'b' });
    expect(c).toEqual({ id: 'c', title: 'T', contextRefs: { goal: { id: 'g1', revision: 1 } }, summary: 's', summarySourceIds: ['m1'], status: 'archived', lastMessageAt: 'l', revision: 2, createdAt: 'a', updatedAt: 'b' });
    const mrow = messageToRow({ conversationId: 'c', role: 'assistant', content: 'hi', citations: [{ kind: 'fact', id: 'f1', label: 'x' }], proposals: [], actionRunId: null, abstained: true }, 'u1');
    expect(rowToMessage({ ...mrow, id: 'm', created_at: 't' })).toEqual({ id: 'm', conversationId: 'c', role: 'assistant', content: 'hi', citations: [{ kind: 'fact', id: 'f1', label: 'x' }], proposals: [], actionRunId: null, abstained: true, createdAt: 't' });
  });
  it('round-trips events keeping only scalar payload values', () => {
    const row = eventToRow({ eventName: 'application_started', schemaVersion: 1, subjectRefs: { application: 'a1' }, correlationId: 'c', source: 'client', occurredAt: 't', payload: { count: 1, ok: true }, dedupeKey: 'k' }, 'u1');
    expect(row.dedupe_key).toBe('k');
    const e = rowToEvent({ ...row, id: 'e', payload: { count: 1, nested: { a: 1 }, s: 'x', n: null } });
    expect(e.payload).toEqual({ count: 1, s: 'x', n: null });
    expect(e.subjectRefs).toEqual({ application: 'a1' });
  });
  it('round-trips notifications and preferences', () => {
    const nrow = notificationToRow({ kind: 'action_required', title: 'T', body: 'B', actionId: 'act', dedupeKey: 'k' }, 'u1');
    expect(rowToNotification({ ...nrow, id: 'n', created_at: 't' })).toEqual({ id: 'n', kind: 'action_required', title: 'T', body: 'B', actionId: 'act', dedupeKey: 'k', readAt: null, dismissedAt: null, createdAt: 't' });
    const prow = preferencesToRow({ proactiveEnabled: true, consentAt: 'c', timeZone: 'Europe/London', quietHours: { start: '22:00', end: '07:00' }, dailyActionCap: 2, triggers: { interview: true }, lastProactiveRunAt: null, checkpoint: { lastRunId: 'x' } }, 'u1');
    const p = rowToPreferences({ ...prow, revision: 3 });
    expect(p).toEqual({ userId: 'u1', proactiveEnabled: true, consentAt: 'c', timeZone: 'Europe/London', quietHours: { start: '22:00', end: '07:00' }, dailyActionCap: 2, triggers: { interview: true }, lastProactiveRunAt: null, checkpoint: { lastRunId: 'x' }, revision: 3 });
    expect(rowToPreferences({ quiet_hours: { start: '22:00' } }).quietHours).toBeNull();
    expect(rowToPreferences({}).timeZone).toBe('UTC');
  });
  it('round-trips scenarios and insights', () => {
    const srow = scenarioToRow({ name: 'S', kind: 'offers', options: [{ id: 'o', label: 'A', refs: {}, inputs: {} }], priorities: [], assumptions: [{ id: 'a', text: 'x', source: 'user' }], result: { computedAt: 't', ranking: [], tradeoffs: [], sensitivity: [], caveats: [] } }, 'u1');
    const s = rowToScenario({ ...srow, id: 's', revision: 1, created_at: 'a', updated_at: 'b' });
    expect(s.kind).toBe('offers');
    expect(s.result?.computedAt).toBe('t');
    expect(rowToScenario({ result: { junk: true } }).result).toBeNull();
    const irow = insightToRow({ kind: 'k', statement: 'Three of five', cohort: { c: 1 }, sampleSize: 3, denominator: 5, missingOutcomes: 2, observationWindow: { from: 'a', to: null }, sourceRefs: [], policyVersion: 'p1', status: 'active', computedAt: 't' }, 'u1');
    expect(rowToInsight({ ...irow, id: 'i' })).toEqual({ id: 'i', kind: 'k', statement: 'Three of five', cohort: { c: 1 }, sampleSize: 3, denominator: 5, missingOutcomes: 2, observationWindow: { from: 'a', to: null }, sourceRefs: [], policyVersion: 'p1', status: 'active', computedAt: 't' });
  });
  it('maps migration ledger rows', () => {
    expect(rowToMigration({ id: 'm', migration: 'career_os_v1', item_kind: 'job_application', old_id: 'a0', new_id: 'o1', status: 'done', error: null, created_at: 'c', updated_at: 'u' }))
      .toEqual({ id: 'm', migration: 'career_os_v1', itemKind: 'job_application', oldId: 'a0', newId: 'o1', status: 'done', error: null, createdAt: 'c', updatedAt: 'u' });
    expect(rowToMigration({ status: 'weird' }).status).toBe('done');
  });
});
