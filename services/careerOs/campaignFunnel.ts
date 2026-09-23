/**
 * Campaign funnel and milestone summaries (COS-021). Observed counts over
 * owned data only — no synthetic progress percentage, no inferred stages.
 */
import { isoDate } from './util';
import type { ApplicationRecord, Campaign, CampaignFunnel, CampaignMilestone, Opportunity, OutcomeObservation } from './types';

const NON_OUTCOME_KINDS = new Set<OutcomeObservation['kind']>(['submitted', 'correction']);

/**
 * Stage counts come from `job_applications.stage`; offers and rejections
 * are counted once per application from observations or the closed reason;
 * `unknownOutcome` is every submitted application with no response observed.
 */
export function computeFunnel(applications: ApplicationRecord[], opportunities: Opportunity[], outcomes: OutcomeObservation[]): CampaignFunnel {
  const funnel: CampaignFunnel = {
    opportunities: new Set(opportunities.map((o) => o.id)).size,
    preparing: 0, submitted: 0, response: 0, interview: 0, final: 0, closed: 0, offers: 0, rejected: 0, unknownOutcome: 0,
  };
  const observedByApp = new Map<string, Set<OutcomeObservation['kind']>>();
  for (const o of outcomes) {
    const set = observedByApp.get(o.applicationId) ?? new Set<OutcomeObservation['kind']>();
    set.add(o.kind);
    observedByApp.set(o.applicationId, set);
  }
  for (const app of applications) {
    switch (app.stage) {
      case 'preparing': funnel.preparing += 1; break;
      case 'submitted': funnel.submitted += 1; break;
      case 'response': funnel.response += 1; break;
      case 'interview': funnel.interview += 1; break;
      case 'final': funnel.final += 1; break;
      case 'closed': funnel.closed += 1; break;
      default: break;
    }
    const observed = observedByApp.get(app.id) ?? new Set<OutcomeObservation['kind']>();
    if (observed.has('offer') || observed.has('accepted') || app.closedReason === 'accepted') funnel.offers += 1;
    if (observed.has('rejected') || app.closedReason === 'rejected') funnel.rejected += 1;
    const anyResponse = Array.from(observed).some((k) => !NON_OUTCOME_KINDS.has(k));
    if (app.stage === 'submitted' && !anyResponse) funnel.unknownOutcome += 1;
  }
  return funnel;
}

export interface MilestoneSummary {
  total: number;
  todo: number;
  doing: number;
  done: number;
  /** Milestones past their due date and not done (dates as recorded, never inferred). */
  overdue: CampaignMilestone[];
  /** The next milestone to work on: doing first, then the earliest due todo. */
  next: CampaignMilestone | null;
}

export function milestoneSummary(campaign: Pick<Campaign, 'milestones'>, now: Date = new Date()): MilestoneSummary {
  const today = isoDate(now);
  const milestones = campaign.milestones ?? [];
  const byState = (state: CampaignMilestone['state']) => milestones.filter((m) => m.state === state);
  const overdue = milestones.filter((m) => m.state !== 'done' && m.dueDate && m.dueDate.slice(0, 10) < today);
  const doing = byState('doing');
  const todo = [...byState('todo')].sort((a, b) => (a.dueDate ?? '9999') < (b.dueDate ?? '9999') ? -1 : 1);
  return {
    total: milestones.length,
    todo: todo.length,
    doing: doing.length,
    done: byState('done').length,
    overdue,
    next: doing[0] ?? todo[0] ?? null,
  };
}
