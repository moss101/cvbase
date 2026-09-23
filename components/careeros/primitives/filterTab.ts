/**
 * The one filter / view control in Career OS: quiet tabs whose selection is an
 * emerald tint (never a filled emerald — that is reserved for the screen's one
 * action). Used for Opportunities views, Applications and Campaigns filters,
 * Library types, Goals active/archived and the campaign Board/List toggle.
 */
export const FILTER_GROUP = 'flex flex-wrap gap-1';

export const filterTabClass = (active: boolean): string =>
    `tap-target inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
        active ? 'bg-action-primary/10 text-content-primary' : 'text-content-secondary hover:bg-surface-canvas hover:text-content-primary'
    }`;
