import { DAY_MS, msBetween } from '../../../services/careerOs/util';
import type { Freshness, Opportunity } from '../../../services/careerOs/types';

/**
 * Listing freshness from the dates the user actually recorded: the listing's
 * own date when supplied, otherwise when it was captured. Under 14 days is
 * fresh, under 45 aging, beyond that stale; a closed listing is closed
 * whatever its age; an unparsable date is unknown, never assumed fresh.
 */
export const FRESH_DAYS = 14;
export const AGING_DAYS = 45;

export function deriveFreshness(
    opportunity: Pick<Opportunity, 'sourceDate' | 'capturedAt' | 'listingStatus'>,
    now: Date = new Date(),
): Freshness {
    if (opportunity.listingStatus === 'closed') return 'closed';
    const basis = opportunity.sourceDate || opportunity.capturedAt;
    const age = msBetween(basis, now);
    if (age === null) return 'unknown';
    const days = age / DAY_MS;
    if (days < FRESH_DAYS) return 'fresh';
    if (days < AGING_DAYS) return 'aging';
    return 'stale';
}
