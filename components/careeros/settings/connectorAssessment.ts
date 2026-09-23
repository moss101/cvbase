/**
 * COS-038 assessment summary, as shown on the integrations page. Every
 * candidate source was assessed and recorded as a no-go for this release;
 * manual import remains complete. Nothing here collects credentials or
 * calls a provider — it is a static record of the decision.
 */
export type ConnectorDecision = 'no-go';

export interface ConnectorAssessment {
    key: 'job-boards' | 'mailbox' | 'calendar' | 'linkedin';
    /** Translation key + English default for the source name. */
    labelKey: string;
    label: string;
    decision: ConnectorDecision;
    /** Translation key + English default for the one-line reason. */
    reasonKey: string;
    reason: string;
    /** Which constraint decided it. */
    constraint: 'rights' | 'scope' | 'retention';
}

export const CONNECTOR_ASSESSMENTS: readonly ConnectorAssessment[] = [
    {
        key: 'job-boards', labelKey: 'careeros.integrations.source.jobBoards', label: 'Job-board feeds', decision: 'no-go', constraint: 'rights',
        reasonKey: 'careeros.integrations.reason.jobBoards', reason: 'Listing terms do not permit automated retrieval; pasting a listing keeps the source and date you saw it.',
    },
    {
        key: 'mailbox', labelKey: 'careeros.integrations.source.mailbox', label: 'Mailbox', decision: 'no-go', constraint: 'scope',
        reasonKey: 'careeros.integrations.reason.mailbox', reason: 'Reading mail needs broad, standing access to everything in the inbox to find a few recruiter threads.',
    },
    {
        key: 'calendar', labelKey: 'careeros.integrations.source.calendar', label: 'Calendar', decision: 'no-go', constraint: 'retention',
        reasonKey: 'careeros.integrations.reason.calendar', reason: 'Interview times are entered once by you; syncing would retain unrelated events with no clear deletion boundary.',
    },
    {
        key: 'linkedin', labelKey: 'careeros.integrations.source.linkedin', label: 'LinkedIn account', decision: 'no-go', constraint: 'rights',
        reasonKey: 'careeros.integrations.reason.linkedin', reason: 'No permitted read API for profile or connections; scraping is against the terms, and contacts are never inferred.',
    },
];

export const ASSESSMENT_VERSION = 'connectors-assessment-1';
