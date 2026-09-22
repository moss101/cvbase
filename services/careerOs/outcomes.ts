/**
 * Outcome observations (COS-025 logic): stage effects of an observation,
 * history with corrections applied, and applications whose response is
 * still unknown. Unknown stays unknown; nothing is inferred from silence.
 */
import { DAY_MS, msBetween } from './util';
import type { ApplicationRecord, ApplicationStage, ClosedReason, OutcomeKind, OutcomeObservation } from './types';

export interface StageEffect { stage: ApplicationStage; closedReason: ClosedReason | null }

/** The stage an observation implies, or null when it changes nothing (no_response, correction). */
export function applyOutcomeToStage(kind: OutcomeKind): StageEffect | null {
  switch (kind) {
    case 'submitted': return { stage: 'submitted', closedReason: null };
    case 'response': return { stage: 'response', closedReason: null };
    case 'interview_scheduled':
    case 'interview_completed': return { stage: 'interview', closedReason: null };
    case 'offer': return { stage: 'final', closedReason: null };
    case 'accepted': return { stage: 'closed', closedReason: 'accepted' };
    case 'rejected': return { stage: 'closed', closedReason: 'rejected' };
    case 'withdrawn': return { stage: 'closed', closedReason: 'withdrawn' };
    case 'no_response':
    case 'correction':
    default: return null;
  }
}

export interface OutcomeHistoryEntry extends OutcomeObservation {
  /** A later correction replaced this observation. */
  superseded: boolean;
  supersededBy: string | null;
  /** For a correction: the kind it asserts (null = retraction); otherwise the observation's own kind. */
  effectiveKind: OutcomeKind | null;
  /** Retracted corrections carry no effective observation. */
  retracted: boolean;
}

const byTime = (a: OutcomeObservation, b: OutcomeObservation): number =>
  a.observedAt < b.observedAt ? -1 : a.observedAt > b.observedAt ? 1 : a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

/** Chronological history with superseded entries flagged and corrections resolved. */
export function outcomeHistory(observations: OutcomeObservation[]): OutcomeHistoryEntry[] {
  const sorted = [...observations].sort(byTime);
  const supersededBy = new Map<string, string>();
  for (const o of sorted) if (o.kind === 'correction' && o.supersedesId) supersededBy.set(o.supersedesId, o.id);
  return sorted.map((o) => {
    const corrected = o.kind === 'correction' ? o.details.correctedKind : undefined;
    const retracted = o.kind === 'correction' && (o.details.retracted === true || typeof corrected !== 'string');
    return {
      ...o,
      superseded: supersededBy.has(o.id),
      supersededBy: supersededBy.get(o.id) ?? null,
      effectiveKind: o.kind === 'correction' ? (typeof corrected === 'string' ? corrected as OutcomeKind : null) : o.kind,
      retracted,
    };
  });
}

/** Observations that still stand: superseded entries removed, corrections resolved to their asserted kind. */
export function effectiveOutcomes(observations: OutcomeObservation[]): Array<OutcomeObservation & { kind: OutcomeKind }> {
  return outcomeHistory(observations)
    .filter((e) => !e.superseded && !e.retracted && e.effectiveKind !== null)
    .map(({ superseded: _s, supersededBy: _b, effectiveKind, retracted: _r, ...o }) => ({ ...o, kind: effectiveKind as OutcomeKind }));
}

/** The latest standing observation, or null. */
export function latestOutcome(observations: OutcomeObservation[]): (OutcomeObservation & { kind: OutcomeKind }) | null {
  const standing = effectiveOutcomes(observations);
  return standing.length > 0 ? standing[standing.length - 1] : null;
}

export interface UnknownResponse {
  applicationId: string;
  submittedAt: string;
  daysWaiting: number;
}

const RESPONSE_KINDS = new Set<OutcomeKind>(['response', 'interview_scheduled', 'interview_completed', 'offer', 'rejected', 'withdrawn', 'accepted', 'no_response']);

/**
 * Applications submitted at least `days` ago (by their recorded submission
 * time) with no standing response observation. Undated submissions are not
 * listed: without a date there is nothing to count from.
 */
export function unknownResponses(applications: ApplicationRecord[], observations: OutcomeObservation[], now: Date, days = 21): UnknownResponse[] {
  const standing = effectiveOutcomes(observations);
  const responded = new Set(standing.filter((o) => RESPONSE_KINDS.has(o.kind)).map((o) => o.applicationId));
  const out: UnknownResponse[] = [];
  for (const app of applications) {
    if (app.stage !== 'submitted' && app.stage !== 'response') continue;
    if (!app.submittedAt || responded.has(app.id)) continue;
    const waited = msBetween(app.submittedAt, now);
    if (waited === null || waited < days * DAY_MS) continue;
    out.push({ applicationId: app.id, submittedAt: app.submittedAt, daysWaiting: Math.floor(waited / DAY_MS) });
  }
  return out.sort((a, b) => b.daysWaiting - a.daysWaiting || (a.applicationId < b.applicationId ? -1 : 1));
}
