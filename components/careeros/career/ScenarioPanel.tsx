import React, { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as scenarioRepo from '../../../services/careerOs/scenarioRepo';
import { compareScenario, SCENARIO_ENGINE_VERSION } from '../../../services/careerOs/frontier/scenarios';
import { buildEvent, emit } from '../../../services/careerOs/careerEvents';
import { newId } from '../../../services/careerOs/util';
import {
    ConflictError, type ApplicationRecord, type CareerGoal, type CareerScenario, type GoalPriority, type Opportunity, type ScenarioAssumption, type ScenarioOption, type ScenarioResult,
} from '../../../services/careerOs/types';
import { captureException } from '../../../lib/monitoring';
import { Button, Pill, Skeleton, StatePanel, StatusChip } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery } from '../data/useOwnedQuery';
import { FIELD_CLASS, LABEL_CLASS } from './FactEditor';
import { PRIORITY_KEYS, priorityLabel } from './factFormat';
import { useOnline } from './useOnline';

/**
 * "Compare options" (REQ-11, COS-036): goals and imported opportunities
 * compared under the person's own priority weights and explicit assumptions.
 * Every input is shown as recorded, assumed or unknown; unknowns are excluded
 * from the score and listed. No market data, no promised outcome. Changing a
 * weight re-runs the comparison and says what changed in the ranking.
 */
export interface ScenarioPanelProps {
    goal: CareerGoal;
    goals: CareerGoal[];
}

type AssumedKey = 'growth' | 'stability' | 'flexibility' | 'mission' | 'learning';
const ASSUMED_KEYS: AssumedKey[] = ['growth', 'stability', 'flexibility', 'mission', 'learning'];

interface Draft {
    options: ScenarioOption[];
    priorities: Record<GoalPriority['key'], number>;
    note: string;
}

const weightsFromGoal = (goal: CareerGoal): Record<GoalPriority['key'], number> => {
    const out = Object.fromEntries(PRIORITY_KEYS.map((k) => [k, 0])) as Record<GoalPriority['key'], number>;
    for (const p of goal.priorities) out[p.key] = Math.round(p.weight * 5);
    return out;
};

const optionForGoal = (g: CareerGoal): ScenarioOption => ({ id: `goal:${g.id}`, label: g.title || g.role, refs: { goalId: g.id }, inputs: {} });
const optionForOpportunity = (o: Opportunity): ScenarioOption => ({ id: `opp:${o.id}`, label: [o.title, o.company].filter(Boolean).join(' at '), refs: { opportunityId: o.id }, inputs: {} });

export const ScenarioPanel: React.FC<ScenarioPanelProps> = ({ goal, goals }) => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const online = useOnline();
    const id = useId();
    const opportunities = useOwnedQuery<Opportunity[]>(userId, userId ? 'scenario:opportunities' : null, () => opportunityRepo.list(userId as string, 'all'));
    const applications = useOwnedQuery<ApplicationRecord[]>(userId, userId ? 'scenario:applications' : null, () => applicationRepo.list(userId as string));
    const saved = useOwnedQuery<CareerScenario[]>(userId, userId ? 'scenario:list' : null, () => scenarioRepo.list(userId as string));
    const [scenario, setScenario] = useState<CareerScenario | null>(null);
    const [draft, setDraft] = useState<Draft>({ options: [optionForGoal(goal)], priorities: weightsFromGoal(goal), note: '' });
    const [result, setResult] = useState<ScenarioResult | null>(null);
    const [previous, setPrevious] = useState<ScenarioResult | null>(null);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedFromSaved, setLoadedFromSaved] = useState(false);

    // Resume the latest saved comparison that includes this goal.
    useEffect(() => {
        if (loadedFromSaved || !saved.data) return;
        const existing = saved.data.find((s) => s.options.some((o) => o.refs.goalId === goal.id));
        if (existing) {
            setScenario(existing);
            const weights = Object.fromEntries(PRIORITY_KEYS.map((k) => [k, 0])) as Record<GoalPriority['key'], number>;
            for (const p of existing.priorities) weights[p.key] = Math.round(p.weight * 5);
            setDraft({ options: existing.options, priorities: weights, note: '' });
            setResult(existing.result);
        }
        setLoadedFromSaved(true);
    }, [saved.data, goal.id, loadedFromSaved]);

    const sources = useMemo(() => ({ goals, opportunities: opportunities.data ?? [], applications: applications.data ?? [] }), [goals, opportunities.data, applications.data]);
    const selected = new Set(draft.options.map((o) => o.id));

    const toggle = (option: ScenarioOption) => {
        setDraft((prev) => (prev.options.some((o) => o.id === option.id)
            ? { ...prev, options: prev.options.filter((o) => o.id !== option.id) }
            : { ...prev, options: [...prev.options, option] }));
    };

    const setAssumption = (optionId: string, key: AssumedKey, value: string) => {
        setDraft((prev) => ({
            ...prev,
            options: prev.options.map((o) => (o.id === optionId ? { ...o, inputs: { ...o.inputs, [key]: value === '' ? null : Number(value) } } : o)),
        }));
    };

    const buildScenario = (): CareerScenario => {
        const assumptions: ScenarioAssumption[] = [];
        for (const option of draft.options) {
            for (const key of ASSUMED_KEYS) {
                const value = option.inputs[key];
                if (typeof value === 'number') assumptions.push({ id: newId(), optionId: option.id, text: `${key}: ${value}/5`, source: 'user' });
            }
        }
        if (draft.note.trim()) assumptions.push({ id: newId(), text: draft.note.trim(), source: 'user' });
        const hasOpp = draft.options.some((o) => o.refs.opportunityId);
        const hasGoal = draft.options.some((o) => o.refs.goalId);
        return {
            id: scenario?.id ?? 'draft',
            name: scenario?.name ?? t('careeros.scenario.defaultName', 'Options for {goal}').replace('{goal}', goal.title || goal.role),
            kind: hasOpp && hasGoal ? 'mixed' : hasOpp ? 'offers' : 'goals',
            options: draft.options,
            priorities: PRIORITY_KEYS.filter((k) => draft.priorities[k] > 0).map((k) => ({ key: k, weight: draft.priorities[k] / 5, label: priorityLabel(t, k) })),
            assumptions,
            result: null,
            revision: scenario?.revision ?? 0,
            createdAt: scenario?.createdAt ?? '',
            updatedAt: scenario?.updatedAt ?? '',
        };
    };

    const run = async () => {
        if (!userId) return;
        if (draft.options.length < 2) {
            setError(t('careeros.scenario.needTwo', 'Pick at least two options to compare.'));
            return;
        }
        setRunning(true);
        setError(null);
        try {
            const built = buildScenario();
            const computed = compareScenario(built, sources, goal);
            setPrevious(result);
            setResult(computed);
            const payload = { name: built.name, kind: built.kind, options: built.options, priorities: built.priorities, assumptions: built.assumptions, result: computed };
            let persisted: CareerScenario;
            if (scenario && scenario.id !== 'draft') {
                try {
                    persisted = await scenarioRepo.update(userId, scenario.id, payload, scenario.revision);
                } catch (err) {
                    if (!(err instanceof ConflictError)) throw err;
                    const fresh = await scenarioRepo.get(userId, scenario.id);
                    persisted = await scenarioRepo.update(userId, scenario.id, payload, fresh.revision);
                }
            } else {
                persisted = await scenarioRepo.create(userId, payload);
            }
            setScenario(persisted);
            void emit(userId, buildEvent('career_scenario_compared', {
                subjectRefs: { scenario: persisted.id, goal: goal.id },
                payload: { options: built.options.length, assumptions: built.assumptions.length, engine: SCENARIO_ENGINE_VERSION, unknown: computed.ranking.reduce((s, r) => s + r.unknownInputs.length, 0) },
            }));
            void saved.refresh();
        } catch (err) {
            captureException(err, { context: 'career-scenario' });
            setError(t('careeros.scenario.saveFailed', 'The comparison ran but could not be saved. Try again to keep it.'));
        } finally {
            setRunning(false);
        }
    };

    const labelFor = (optionId: string): string => draft.options.find((o) => o.id === optionId)?.label ?? optionId;
    const changes = useMemo(() => {
        if (!result || !previous) return [];
        const before = previous.ranking.map((r) => r.optionId);
        const after = result.ranking.map((r) => r.optionId);
        const out: string[] = [];
        if (before[0] !== after[0]) out.push(t('careeros.scenario.topChanged', 'Top option changed from {before} to {after}').replace('{before}', labelFor(before[0] ?? '')).replace('{after}', labelFor(after[0] ?? '')));
        after.forEach((idValue, index) => {
            const was = before.indexOf(idValue);
            if (was !== -1 && was !== index) out.push(t('careeros.scenario.moved', '{option} moved from #{from} to #{to}').replace('{option}', labelFor(idValue)).replace('{from}', String(was + 1)).replace('{to}', String(index + 1)));
        });
        return out.length > 0 ? out : [t('careeros.scenario.unchanged', 'The ranking did not change.')];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result, previous]);

    const inputLabel: Record<string, string> = {
        compMin: t('careeros.scenario.input.compMin', 'pay minimum'), compMax: t('careeros.scenario.input.compMax', 'pay maximum'), compPeriod: t('careeros.scenario.input.compPeriod', 'pay period'),
        location: t('careeros.goal.form.location', 'Location').toLowerCase(), remote: t('careeros.scenario.input.remote', 'remote'), growth: t('careeros.goal.priority.growth', 'Growth').toLowerCase(),
        stability: t('careeros.goal.priority.stability', 'Stability').toLowerCase(), flexibility: t('careeros.goal.priority.flexibility', 'Flexibility').toLowerCase(),
        mission: t('careeros.goal.priority.mission', 'Mission').toLowerCase(), learning: t('careeros.goal.priority.learning', 'Learning').toLowerCase(), evidenceGaps: t('careeros.scenario.input.evidenceGaps', 'evidence gaps'),
    };
    const listInputs = (keys: string[]): string => keys.map((k) => inputLabel[k] ?? k).join(', ');

    const loadingSources = (opportunities.loading && opportunities.data === null) || (saved.loading && saved.data === null);

    return (
        <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-border-default bg-surface-panel p-5">
            <h2 id={`${id}-title`} className="text-base font-semibold text-content-primary">{t('careeros.scenario.title', 'Compare options')}</h2>
            <p className="mt-1 text-sm text-content-secondary">{t('careeros.scenario.description', 'Weigh this goal against other goals or imported roles using your own priorities. Nothing here predicts an outcome and no market data is used.')}</p>

            {loadingSources ? (
                <div className="mt-4 space-y-2" aria-busy="true"><Skeleton variant="title" width="50%" /><Skeleton variant="text" lines={3} /></div>
            ) : (
                <>
                    <fieldset className="mt-4">
                        <legend className={LABEL_CLASS}>{t('careeros.scenario.options', 'Options to compare')}</legend>
                        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                            {goals.map((g) => {
                                const option = optionForGoal(g);
                                return (
                                    <li key={option.id}>
                                        <label className="tap-target flex items-center gap-2 rounded-lg px-2 text-sm text-content-primary hover:bg-surface-canvas">
                                            <input type="checkbox" checked={selected.has(option.id)} onChange={() => toggle(option)} className="h-4 w-4 rounded border-border-strong accent-action-primary" />
                                            <span className="truncate">{option.label}</span>
                                            <Pill mono>{t('careeros.context.goal', 'Goal')}</Pill>
                                        </label>
                                    </li>
                                );
                            })}
                            {(opportunities.data ?? []).slice(0, 30).map((o) => {
                                const option = optionForOpportunity(o);
                                return (
                                    <li key={option.id}>
                                        <label className="tap-target flex items-center gap-2 rounded-lg px-2 text-sm text-content-primary hover:bg-surface-canvas">
                                            <input type="checkbox" checked={selected.has(option.id)} onChange={() => toggle(option)} className="h-4 w-4 rounded border-border-strong accent-action-primary" />
                                            <span className="truncate">{option.label}</span>
                                            <Pill mono>{t('careeros.context.opportunity', 'Opportunity')}</Pill>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                        {opportunities.error !== null && <p className="mt-1 text-xs text-status-warning">{t('careeros.scenario.opportunitiesUnavailable', 'Opportunities could not be listed; goals can still be compared.')}</p>}
                        {(opportunities.data ?? []).length === 0 && goals.length < 2 && (
                            <p className="mt-2 text-[13px] text-content-secondary">{t('careeros.scenario.nothingToCompare', 'Add another goal or import an opportunity to have something to compare against.')}</p>
                        )}
                    </fieldset>

                    {draft.options.length > 0 && (
                        <fieldset className="mt-4">
                            <legend className={LABEL_CLASS}>{t('careeros.scenario.assumptions', 'Your assumptions (1–5, blank = unknown)')}</legend>
                            <p className="mt-0.5 text-xs text-content-muted">{t('careeros.scenario.assumptionsHint', 'Recorded pay, location and remote type come from the goal or listing; these ratings are yours and are labelled as assumed.')}</p>
                            <div className="mt-2 overflow-x-auto">
                                <table className="w-full min-w-[28rem] text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-content-muted">
                                            <th scope="col" className="py-1 pr-2 font-semibold">{t('careeros.scenario.option', 'Option')}</th>
                                            {ASSUMED_KEYS.map((key) => <th key={key} scope="col" className="py-1 pr-2 font-semibold">{priorityLabel(t, key)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {draft.options.map((option) => (
                                            <tr key={option.id}>
                                                <th scope="row" className="py-1 pr-2 text-left font-medium text-content-primary">{option.label}</th>
                                                {ASSUMED_KEYS.map((key) => (
                                                    <td key={key} className="py-1 pr-2">
                                                        <label htmlFor={`${id}-${option.id}-${key}`} className="sr-only">{`${option.label} ${priorityLabel(t, key)}`}</label>
                                                        <select id={`${id}-${option.id}-${key}`} value={option.inputs[key] ?? ''} onChange={(e) => setAssumption(option.id, key, e.target.value)} className={`${FIELD_CLASS} py-1.5`}>
                                                            <option value="">—</option>
                                                            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                                                        </select>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <label htmlFor={`${id}-note`} className={`${LABEL_CLASS} mt-3`}>{t('careeros.scenario.note', 'Other assumption (optional)')}</label>
                            <input id={`${id}-note`} value={draft.note} onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))} className={`${FIELD_CLASS} mt-1`} placeholder={t('careeros.scenario.notePlaceholder', 'e.g. assuming the hybrid role allows 3 days remote')} />
                        </fieldset>
                    )}

                    <fieldset className="mt-4">
                        <legend className={LABEL_CLASS}>{t('careeros.scenario.weights', 'Priority weights (from this goal; change to re-run)')}</legend>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {PRIORITY_KEYS.map((key) => (
                                <div key={key}>
                                    <label htmlFor={`${id}-w-${key}`} className="block text-xs text-content-secondary">{priorityLabel(t, key)}</label>
                                    <select id={`${id}-w-${key}`} value={draft.priorities[key]} onChange={(e) => setDraft((prev) => ({ ...prev, priorities: { ...prev.priorities, [key]: Number(e.target.value) } }))} className={`${FIELD_CLASS} mt-1 py-1.5`}>
                                        {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button variant="primary" onClick={() => void run()} loading={running} disabled={!online || draft.options.length < 2}>
                            {result ? t('careeros.scenario.rerun', 'Re-run comparison') : t('careeros.scenario.run', 'Run comparison')}
                        </Button>
                        {!online && <span className="text-xs text-status-warning">{t('careeros.scenario.offline', 'Saving a comparison needs a connection.')}</span>}
                    </div>
                    {error && <p role="alert" className="mt-2 text-sm text-status-danger">{error}</p>}
                </>
            )}

            {result && (
                <div className="mt-5 space-y-4" aria-live="polite">
                    {previous && (
                        <div className="rounded-xl bg-surface-canvas px-3.5 py-3 text-[13px] text-content-primary">
                            <p className="font-semibold">{t('careeros.scenario.whatChanged', 'What changed since the last run')}</p>
                            <ul className="mt-1 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-semibold text-content-primary">{t('careeros.scenario.ranking', 'Ranking')}</h3>
                        <ol className="mt-2 space-y-2">
                            {result.ranking.map((row, index) => (
                                <li key={row.optionId} className="rounded-xl border border-border-default bg-surface-canvas p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-content-primary">#{index + 1} {labelFor(row.optionId)}</p>
                                        <StatusChip label={row.score === null ? t('careeros.scenario.noScore', 'No score: inputs unknown') : t('careeros.scenario.score', 'Score {score}').replace('{score}', row.score.toFixed(2))} tone={row.score === null ? 'neutral' : 'info'} />
                                    </div>
                                    <dl className="mt-1 space-y-0.5 text-xs text-content-secondary">
                                        {row.verifiedInputs.length > 0 && <div><dt className="inline font-semibold">{t('careeros.scenario.recorded', 'Recorded')}: </dt><dd className="inline">{listInputs(row.verifiedInputs)}</dd></div>}
                                        {row.assumedInputs.length > 0 && <div><dt className="inline font-semibold">{t('careeros.scenario.assumed', 'Assumed')}: </dt><dd className="inline">{listInputs(row.assumedInputs)}</dd></div>}
                                        {row.unknownInputs.length > 0 && <div><dt className="inline font-semibold">{t('careeros.scenario.unknown', 'Unknown (excluded)')}: </dt><dd className="inline">{listInputs(row.unknownInputs)}</dd></div>}
                                    </dl>
                                    <ul className="mt-2 flex flex-wrap gap-1.5">
                                        {result.tradeoffs.filter((tr) => tr.optionId === row.optionId && tr.verdict !== 'unknown').map((tr) => (
                                            <li key={tr.key}><Pill tone={tr.verdict === 'better' ? 'success' : 'warning'} title={tr.detail}>{tr.label}: {tr.verdict === 'better' ? t('careeros.scenario.better', 'strongest') : t('careeros.scenario.worse', 'lower')}</Pill></li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-content-primary">{t('careeros.scenario.sensitivity', 'Sensitivity')}</h3>
                        <ul className="mt-1 space-y-1 text-[13px] text-content-secondary">
                            {result.sensitivity.length === 0 && <li>{t('careeros.scenario.noWeights', 'No priority weights set, so the ranking cannot be tested against them.')}</li>}
                            {result.sensitivity.map((s) => (
                                <li key={s.key} className="flex items-start gap-2">
                                    <StatusChip label={s.affectsRanking ? t('careeros.scenario.affects', 'Changes the top option') : t('careeros.scenario.stable', 'Stable')} tone={s.affectsRanking ? 'warning' : 'neutral'} />
                                    <span>{s.detail}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-content-primary">{t('careeros.scenario.caveats', 'Caveats')}</h3>
                        <ul className="mt-1 list-disc pl-5 text-[13px] text-content-secondary">{result.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
                    </div>
                </div>
            )}
            {!result && !loadingSources && (
                <div className="mt-4">
                    <StatePanel kind="empty" compact title={t('careeros.scenario.emptyTitle', 'No comparison run yet')} description={t('careeros.scenario.emptyDescription', 'Pick two or more options and run the comparison. The result is saved with your assumptions.')} />
                </div>
            )}
        </section>
    );
};

export default ScenarioPanel;
