/**
 * Career scenario comparison (REQ-11, COS-036). Compares goals and offers
 * under the user's own priorities and explicit assumptions. Every input is
 * classified as recorded (from an owned goal/opportunity/application),
 * assumed (typed by the user for this comparison) or unknown. Unknown inputs
 * are excluded from the score and listed; nothing is imputed from market data
 * and no outcome is promised.
 */
import type {
  ApplicationRecord, CareerGoal, CompPeriod, GoalPriority, Opportunity, ScenarioOption, ScenarioResult, CareerScenario,
} from '../types';

export const SCENARIO_ENGINE_VERSION = 'scenario-1.0.0';

export interface ScenarioSources {
  goals: CareerGoal[];
  opportunities: Opportunity[];
  applications: ApplicationRecord[];
}

type InputKey = keyof ScenarioOption['inputs'];
type Provenance = 'recorded' | 'assumed' | 'unknown';

interface ResolvedInput {
  key: InputKey;
  value: number | string | null;
  provenance: Provenance;
}

const PERIOD_TO_YEAR: Record<CompPeriod, number> = { year: 1, month: 12, day: 260, hour: 2080 };

/** Annualises a compensation midpoint when period is known; null when unknown. */
export function annualComp(min: number | null | undefined, max: number | null | undefined, period: CompPeriod | null | undefined): number | null {
  const values = [min, max].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (values.length === 0 || !period) return null;
  const mid = values.reduce((a, b) => a + b, 0) / values.length;
  return mid * PERIOD_TO_YEAR[period];
}

/** Resolves each option's inputs from owned records first, then assumptions. */
export function resolveOption(option: ScenarioOption, sources: ScenarioSources): { inputs: ResolvedInput[]; currency: string | null } {
  const goal = option.refs.goalId ? sources.goals.find((g) => g.id === option.refs.goalId) : undefined;
  const app = option.refs.applicationId ? sources.applications.find((a) => a.id === option.refs.applicationId) : undefined;
  const opp = option.refs.opportunityId
    ? sources.opportunities.find((o) => o.id === option.refs.opportunityId)
    : app?.opportunityId ? sources.opportunities.find((o) => o.id === app.opportunityId) : undefined;

  const recorded: Partial<Record<InputKey, number | string | null>> = {};
  let currency: string | null = null;
  if (opp) {
    recorded.compMin = opp.compMin; recorded.compMax = opp.compMax; recorded.compPeriod = opp.compPeriod;
    recorded.location = opp.location || null; recorded.remote = opp.remoteType;
    currency = opp.compCurrency;
  } else if (goal) {
    recorded.compMin = goal.compMin; recorded.compMax = goal.compMax; recorded.compPeriod = goal.compPeriod;
    recorded.location = goal.location || null;
    recorded.remote = goal.remotePreference === 'any' || !goal.remotePreference ? null : goal.remotePreference;
    currency = goal.compCurrency;
  }
  if (option.inputs.compCurrency) currency = currency ?? option.inputs.compCurrency;

  const keys: InputKey[] = ['compMin', 'compMax', 'compPeriod', 'location', 'remote', 'growth', 'stability', 'flexibility', 'mission', 'learning', 'evidenceGaps'];
  const inputs = keys.map<ResolvedInput>((key) => {
    const rec = recorded[key];
    if (rec !== undefined && rec !== null && rec !== '') return { key, value: rec, provenance: 'recorded' };
    const assumed = option.inputs[key];
    if (assumed !== undefined && assumed !== null && assumed !== '') return { key, value: assumed as number | string, provenance: 'assumed' };
    return { key, value: null, provenance: 'unknown' };
  });
  return { inputs, currency };
}

interface Dimension {
  key: GoalPriority['key'];
  label: string;
  /** 0..1 normalised value or null when unknown. */
  value: (r: Record<InputKey, ResolvedInput>, ctx: { maxComp: number | null; currencyMismatch: boolean; goal: CareerGoal | null }) => number | null;
}

const ratio = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v / 5)) : null);

const DIMENSIONS: Dimension[] = [
  {
    key: 'compensation', label: 'Compensation',
    value: (r, ctx) => {
      if (ctx.currencyMismatch) return null;
      const annual = annualComp(r.compMin.value as number | null, r.compMax.value as number | null, r.compPeriod.value as CompPeriod | null);
      if (annual === null || !ctx.maxComp) return null;
      return Math.max(0, Math.min(1, annual / ctx.maxComp));
    },
  },
  { key: 'growth', label: 'Growth', value: (r) => ratio(r.growth.value) },
  { key: 'stability', label: 'Stability', value: (r) => ratio(r.stability.value) },
  { key: 'flexibility', label: 'Flexibility', value: (r) => (r.remote.value ? (r.remote.value === 'remote' ? 1 : r.remote.value === 'hybrid' ? 0.6 : 0.2) : ratio(r.flexibility.value)) },
  { key: 'mission', label: 'Mission', value: (r) => ratio(r.mission.value) },
  { key: 'learning', label: 'Learning', value: (r) => ratio(r.learning.value) },
  {
    key: 'location', label: 'Location',
    value: (r, ctx) => {
      const loc = r.location.value as string | null;
      if (!loc) return null;
      if (!ctx.goal?.location) return null;
      return loc.toLowerCase().includes(ctx.goal.location.toLowerCase()) ? 1 : 0.3;
    },
  },
  { key: 'title', label: 'Role', value: () => null },
];

function score(dims: Array<{ key: string; value: number | null; weight: number }>): number | null {
  const known = dims.filter((d) => d.value !== null && d.weight > 0);
  const totalWeight = known.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return null;
  return Math.round((known.reduce((s, d) => s + (d.value as number) * d.weight, 0) / totalWeight) * 100) / 100;
}

/**
 * Compares the scenario's options. Returns a ranking with unknown/verified/
 * assumed inputs per option, per-dimension tradeoffs, and a sensitivity list
 * showing which priority weights would change the top option.
 */
export function compareScenario(scenario: CareerScenario, sources: ScenarioSources, goal: CareerGoal | null = null, now = new Date()): ScenarioResult {
  const resolved = scenario.options.map((o) => ({ option: o, ...resolveOption(o, sources) }));
  const currencies = new Set(resolved.map((r) => r.currency).filter(Boolean));
  const currencyMismatch = currencies.size > 1;
  const annuals = resolved.map((r) => {
    const rec = Object.fromEntries(r.inputs.map((i) => [i.key, i])) as Record<InputKey, ResolvedInput>;
    return annualComp(rec.compMin.value as number | null, rec.compMax.value as number | null, rec.compPeriod.value as CompPeriod | null);
  });
  const maxComp = annuals.some((a) => a !== null) ? Math.max(...annuals.filter((a): a is number => a !== null)) : null;
  const weights = new Map(scenario.priorities.map((p) => [p.key, p.weight]));

  const evaluate = (weightOverride?: Map<string, number>) => resolved.map((r) => {
    const rec = Object.fromEntries(r.inputs.map((i) => [i.key, i])) as Record<InputKey, ResolvedInput>;
    const dims = DIMENSIONS.map((d) => ({
      key: d.key, label: d.label,
      value: d.value(rec, { maxComp, currencyMismatch, goal }),
      weight: (weightOverride ?? weights).get(d.key) ?? 0,
    }));
    return { option: r.option, inputs: r.inputs, dims, score: score(dims) };
  });

  const evaluated = evaluate();
  const ranking = [...evaluated]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.option.label.localeCompare(b.option.label))
    .map((e) => ({
      optionId: e.option.id,
      score: e.score,
      unknownInputs: e.inputs.filter((i) => i.provenance === 'unknown').map((i) => i.key),
      verifiedInputs: e.inputs.filter((i) => i.provenance === 'recorded').map((i) => i.key),
      assumedInputs: e.inputs.filter((i) => i.provenance === 'assumed').map((i) => i.key),
    }));

  const tradeoffs: ScenarioResult['tradeoffs'] = [];
  for (const dim of DIMENSIONS) {
    const values = evaluated.map((e) => ({ id: e.option.id, v: e.dims.find((d) => d.key === dim.key)?.value ?? null }));
    const known = values.filter((x) => x.v !== null);
    const best = known.length ? Math.max(...known.map((x) => x.v as number)) : null;
    for (const x of values) {
      if (x.v === null) {
        tradeoffs.push({ optionId: x.id, key: dim.key, label: dim.label, verdict: 'unknown', detail: `${dim.label} is unknown for this option` });
      } else if (best !== null && known.length > 1) {
        tradeoffs.push({
          optionId: x.id, key: dim.key, label: dim.label,
          verdict: x.v === best ? 'better' : 'worse',
          detail: x.v === best ? `Strongest ${dim.label.toLowerCase()} among the compared options` : `Lower ${dim.label.toLowerCase()} than the best option`,
        });
      }
    }
  }

  const topId = ranking[0]?.optionId ?? null;
  const sensitivity: ScenarioResult['sensitivity'] = scenario.priorities.map((p) => {
    const doubled = new Map(weights); doubled.set(p.key, (weights.get(p.key) ?? 0) * 2 || 1);
    const removed = new Map(weights); removed.set(p.key, 0);
    const topWith = (w: Map<string, number>) => [...evaluate(w)].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0]?.option.id ?? null;
    const affects = topWith(doubled) !== topId || topWith(removed) !== topId;
    return {
      key: p.key,
      label: p.label ?? p.key,
      affectsRanking: affects,
      detail: affects ? `Changing the weight of ${p.label ?? p.key} changes which option ranks first` : `The ranking does not depend on ${p.label ?? p.key} within these inputs`,
    };
  });

  const caveats = [
    'Scores compare only the inputs you provided or recorded; they are not predictions of outcomes.',
    'No market or salary data was used.',
  ];
  if (currencyMismatch) caveats.push('Compensation is in different currencies and was left out of the score.');
  if (ranking.some((r) => r.unknownInputs.length)) caveats.push('Unknown inputs were excluded from the score and are listed per option.');

  return { computedAt: now.toISOString(), ranking, tradeoffs, sensitivity, caveats };
}
