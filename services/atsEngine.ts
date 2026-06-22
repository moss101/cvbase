// Moved to the runtime-neutral shared module lib/ats/atsEngine.ts (used by both
// the browser live preview and the metered ats-analyze Edge Function).
// Re-exported here so existing client imports of './atsEngine' keep working.
export * from '../lib/ats/atsEngine.ts';
