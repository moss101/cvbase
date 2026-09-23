/**
 * Career OS client domain layer. Pure logic modules and owner-scoped
 * repositories; no UI. Files owned by other workstreams (flags, gateway,
 * coach/interview APIs, frontier) are not re-exported here.
 */
export * from './types';
export * from './mappers';
export * from './util';

export * as careerProfileRepo from './careerProfileRepo';
export * as factRepo from './factRepo';
export * as goalRepo from './goalRepo';
export * as opportunityRepo from './opportunityRepo';
export * as campaignRepo from './campaignRepo';
export * as applicationRepo from './applicationRepo';
export * as artifactRepo from './artifactRepo';
export * as interviewRepo from './interviewRepo';
export * as outcomeRepo from './outcomeRepo';
export * as analysisRepo from './analysisRepo';
export * as actionRepo from './actionRepo';
export * as eventRepo from './eventRepo';
export * as notificationRepo from './notificationRepo';
export * as preferencesRepo from './preferencesRepo';
export * as scenarioRepo from './scenarioRepo';
export * as insightRepo from './insightRepo';
export * as migrationRepo from './migrationRepo';
export { SubmissionLockedError } from './applicationRepo';

export * from './careerFacts';
export * from './careerContext';
export * from './careerActions';
export * from './careerFit';
export * as careerEvents from './careerEvents';
export * from './campaignFunnel';
export * from './readiness';
export * from './outcomes';
