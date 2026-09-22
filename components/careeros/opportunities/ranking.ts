import type { Opportunity, OpportunityAnalysis } from '../../../services/careerOs/types';

/**
 * "For You" ranks the person's own imported opportunities: those with a fit
 * analysis first by the share of supported requirements, then by recency.
 * Rows hidden by a broken hard constraint are separated out with their
 * reason so the person can inspect them and revise the constraint.
 */
export interface RankedOpportunity {
    opportunity: Opportunity;
    analysis: OpportunityAnalysis | null;
    /** supported / total requirements, or null without an analysis. */
    supportedRatio: number | null;
}

export interface ForYouResult {
    ranked: RankedOpportunity[];
    hidden: RankedOpportunity[];
}

export function supportedRatio(analysis: OpportunityAnalysis | null): number | null {
    if (!analysis) return null;
    const q = analysis.qualification;
    const total = q.supported.length + q.partial.length + q.missing.length + q.unknown.length;
    return total === 0 ? null : q.supported.length / total;
}

export function rankForYou(opportunities: Opportunity[], analyses: OpportunityAnalysis[]): ForYouResult {
    const latest = new Map<string, OpportunityAnalysis>();
    for (const a of analyses) {
        const current = latest.get(a.opportunityId);
        if (!current || a.computedAt > current.computedAt) latest.set(a.opportunityId, a);
    }
    const rows: RankedOpportunity[] = opportunities.map((opportunity) => {
        const analysis = latest.get(opportunity.id) ?? null;
        return { opportunity, analysis, supportedRatio: supportedRatio(analysis) };
    });
    const hidden = rows.filter((r) => r.analysis?.hiddenByConstraint);
    const ranked = rows
        .filter((r) => !r.analysis?.hiddenByConstraint)
        .sort((a, b) => {
            const ra = a.supportedRatio ?? -1;
            const rb = b.supportedRatio ?? -1;
            if (rb !== ra) return rb - ra;
            return b.opportunity.updatedAt < a.opportunity.updatedAt ? -1 : b.opportunity.updatedAt > a.opportunity.updatedAt ? 1 : 0;
        });
    return { ranked, hidden };
}
