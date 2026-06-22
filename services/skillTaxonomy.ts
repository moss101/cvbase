// Moved to the runtime-neutral shared module lib/ats/skillTaxonomy.ts (used by
// both the browser and the ats-analyze Edge Function). Re-exported here so
// existing client imports of './skillTaxonomy' keep working.
export * from '../lib/ats/skillTaxonomy.ts';
