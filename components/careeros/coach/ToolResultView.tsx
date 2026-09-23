import React from 'react';
import { useTranslation } from '../../../services/translationService';
import type { ToolName, ToolResults } from '../../../services/careerOs/gateway';
import type { CoverageState } from '../../../services/careerOs/gatewayMappers';
import { Pill, StatusChip, type Tone } from '../primitives';

/**
 * Inline rendering for the read-only explanation tools (inspect_context,
 * explain_priorities, compare_opportunities, review_evidence). Only typed
 * fields from the gateway result are shown — never free text the model
 * produced — so the view cannot present an unsupported claim as a record.
 */
export interface ToolResultViewProps {
    tool: ToolName;
    result: ToolResults[ToolName];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '');

const COVERAGE_TONE: Record<CoverageState, Tone> = {
    supported: 'success', partial: 'warning', missing: 'danger', unknown: 'neutral', not_analyzed: 'neutral', not_required: 'info',
};

export const ToolResultView: React.FC<ToolResultViewProps> = ({ tool, result }) => {
    const { t } = useTranslation();
    const coverageLabel: Record<CoverageState, string> = {
        supported: t('careeros.fit.supported', 'Supported'),
        partial: t('careeros.fit.partial', 'Partial'),
        missing: t('careeros.fit.missing', 'Missing'),
        unknown: t('careeros.fit.unknown', 'Unknown'),
        not_analyzed: t('careeros.coach.result.notAnalyzed', 'Not analysed'),
        not_required: t('careeros.coach.result.notRequired', 'Not required'),
    };

    if (tool === 'compare_opportunities') {
        const r = result as ToolResults['compare_opportunities'];
        const ids = r.coverage.opportunityIds;
        const titleFor = (id: string): string => {
            const opp = r.opportunities.find((o) => o.id === id);
            return opp ? [str(opp.title), str(opp.company)].filter(Boolean).join(' · ') || id : id;
        };
        if (r.coverage.rows.length === 0) {
            return <p className="text-sm text-content-secondary">{t('careeros.coach.result.noComparison', 'No requirement coverage to compare yet. Review each opportunity to analyse its fit first.')}</p>;
        }
        return (
            <div className="overflow-x-auto">
                <table className="w-full min-w-[20rem] border-collapse text-left text-[13px]">
                    <caption className="sr-only">{t('careeros.coach.result.comparisonCaption', 'Requirement coverage by opportunity')}</caption>
                    <thead>
                        <tr className="border-b border-border-default">
                            <th scope="col" className="py-1.5 pr-3 font-semibold text-content-secondary">{t('careeros.coach.result.requirement', 'Requirement')}</th>
                            {ids.map((id) => <th key={id} scope="col" className="py-1.5 pr-3 font-semibold text-content-secondary">{titleFor(id)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {r.coverage.rows.map((row, index) => (
                            <tr key={`${row.text}:${index}`} className="border-b border-border-default/60 align-top">
                                <th scope="row" className="py-1.5 pr-3 font-normal text-content-primary">{row.text}</th>
                                {ids.map((id) => {
                                    const state = row.states[id] ?? 'unknown';
                                    return <td key={id} className="py-1.5 pr-3"><StatusChip label={coverageLabel[state] ?? state} tone={COVERAGE_TONE[state] ?? 'neutral'} /></td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (tool === 'review_evidence') {
        const r = result as ToolResults['review_evidence'];
        if (r.facts.length === 0) return <p className="text-sm text-content-secondary">{t('careeros.coach.result.noEvidence', 'No evidence records matched.')}</p>;
        return (
            <ul className="space-y-1.5">
                {r.facts.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="font-semibold text-content-primary">{f.title || f.kind}</span>
                        {f.organization && <span className="text-content-secondary">{f.organization}</span>}
                        <Pill mono>{f.confirmationState.replace('_', ' ')}</Pill>
                        {f.reviewState !== 'reviewed' && <Pill tone="warning">{f.reviewState}</Pill>}
                        <span className="text-xs text-content-muted">{t('careeros.coach.result.references', '{count} references').replace('{count}', String(f.referenceCount))}</span>
                        {f.staleReferences.length > 0 && <Pill tone="warning">{t('careeros.coach.result.staleReferences', '{count} stale').replace('{count}', String(f.staleReferences.length))}</Pill>}
                    </li>
                ))}
            </ul>
        );
    }

    if (tool === 'explain_priorities') {
        const r = result as ToolResults['explain_priorities'];
        if (r.actions.length === 0) return <p className="text-sm text-content-secondary">{t('careeros.coach.result.noPriorities', 'No eligible actions right now.')}</p>;
        return (
            <ol className="list-decimal space-y-1.5 pl-5">
                {r.actions.map((a, index) => (
                    <li key={str(a.id) || index} className="text-[13px]">
                        <span className="font-semibold text-content-primary">{str(a.title) || str(a.actionType) || str(a.action_type)}</span>
                        {str(a.reason) && <span className="block text-content-secondary">{str(a.reason)}</span>}
                        {str(a.priorityBand ?? a.priority_band) && <Pill mono className="mt-1">{str(a.priorityBand ?? a.priority_band)}</Pill>}
                    </li>
                ))}
            </ol>
        );
    }

    // inspect_context: a shallow key/value listing of the projection (ids, titles, counts).
    const entries = Object.entries(result as Record<string, unknown>);
    if (entries.length === 0) return <p className="text-sm text-content-secondary">{t('careeros.coach.result.emptyContext', 'No context is selected.')}</p>;
    return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            {entries.map(([key, value]) => (
                <React.Fragment key={key}>
                    <dt className="text-[12px] font-medium text-content-muted">{key}</dt>
                    <dd className="min-w-0 break-words text-content-primary">
                        {value === null || value === undefined ? '—'
                            : typeof value === 'object'
                                ? Array.isArray(value)
                                    ? t('careeros.coach.result.items', '{count} items').replace('{count}', String(value.length))
                                    : str((value as Record<string, unknown>).title) || str((value as Record<string, unknown>).name) || str((value as Record<string, unknown>).id) || t('careeros.coach.result.record', 'Record')
                                : str(value)}
                    </dd>
                </React.Fragment>
            ))}
        </dl>
    );
};

export default ToolResultView;
