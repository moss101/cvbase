import { careerPath, type CareerRoute } from '../../NavigationProvider';
import { TOOL_NAMES, type ToolName, type ToolResults } from '../../../services/careerOs/gateway';
import type { ActionRun, ApplicationSection, ArtifactKind, CoachCitation, CoachConversation, CoachMessage } from '../../../services/careerOs/types';

/**
 * Pure helpers for the Coach screen: how a registered tool reads, where a
 * citation or a receipt opens, and the export document. No React, no
 * network; everything is unit-testable and every string still goes through
 * the caller's `t()` via the `[key, default]` pairs.
 */

export type Translate = (key: string, fallback: string) => string;

const TOOL_LABEL: Record<ToolName, [string, string]> = {
    inspect_context: ['careeros.coach.tool.inspectContext', 'Inspect context'],
    explain_priorities: ['careeros.coach.tool.explainPriorities', 'Explain priorities'],
    compare_opportunities: ['careeros.coach.tool.compareOpportunities', 'Compare opportunities'],
    start_application: ['careeros.coach.tool.startApplication', 'Start application'],
    resume_application: ['careeros.coach.tool.resumeApplication', 'Resume application'],
    request_tailoring: ['careeros.coach.tool.requestTailoring', 'Request PRISM tailoring'],
    report_result: ['careeros.coach.tool.reportResult', 'Report result'],
    review_evidence: ['careeros.coach.tool.reviewEvidence', 'Review evidence'],
    prepare_interview: ['careeros.coach.tool.prepareInterview', 'Prepare interview'],
    create_plan: ['careeros.coach.tool.createPlan', 'Create a reviewed plan'],
    record_outcome: ['careeros.coach.tool.recordOutcome', 'Record outcome'],
    save_artifact: ['careeros.coach.tool.saveArtifact', 'Save document'],
    generate_artifact: ['careeros.coach.tool.generateArtifact', 'Generate document draft'],
};

export const isToolName = (value: string): value is ToolName => (TOOL_NAMES as string[]).includes(value);

export const toolLabel = (t: Translate, tool: string): string =>
    isToolName(tool) ? t(TOOL_LABEL[tool][0], TOOL_LABEL[tool][1]) : tool;

/** Read-only explanations run immediately and render their result inline (REQ-21). */
export const EXPLAIN_ONLY_TOOLS: ReadonlySet<string> = new Set<ToolName>(['inspect_context', 'explain_priorities', 'compare_opportunities', 'review_evidence']);
export const isExplainOnly = (tool: string): boolean => EXPLAIN_ONLY_TOOLS.has(tool);

/** Where a citation chip opens; null when the kind has no owned screen. */
export function citationRoute(citation: Pick<CoachCitation, 'kind' | 'id'>, applicationId?: string | null): CareerRoute | null {
    switch (citation.kind) {
        case 'fact': return careerPath.toCareer('evidence');
        case 'goal': return careerPath.toGoal(citation.id);
        case 'opportunity': return careerPath.toOpportunity(citation.id);
        case 'application': return careerPath.toApplication(citation.id);
        case 'artifact': return applicationId ? careerPath.toApplication(applicationId) : null;
        case 'interview': return applicationId ? careerPath.toApplication(applicationId, 'interview') : null;
        case 'outcome': return applicationId ? careerPath.toApplication(applicationId, 'activity') : null;
        case 'analysis': return applicationId ? careerPath.toApplication(applicationId, 'analysis') : null;
        default: return null;
    }
}

const ARTIFACT_SECTION: Partial<Record<ArtifactKind, ApplicationSection>> = {
    cover_letter: 'cover-letter',
    employer_question: 'questions',
    linkedin: 'linkedin',
    networking_note: 'networking',
    note: 'notes',
    interview_story: 'interview',
    role_analysis: 'analysis',
    submission: 'activity',
};

/** The owned screen a completed receipt links to, from the typed tool result (never from free text). */
export function resultRoute<K extends ToolName>(tool: K, result: ToolResults[K] | undefined, run: ActionRun): CareerRoute | null {
    const ref = run.resultRef ?? {};
    const refId = typeof ref.id === 'string' ? ref.id : null;
    const refAppId = typeof ref.applicationId === 'string' ? ref.applicationId : null;
    switch (tool) {
        case 'start_application':
        case 'resume_application': {
            const r = result as ToolResults['start_application'] | undefined;
            const id = r?.application.id ?? refId;
            return id ? careerPath.toApplication(id) : null;
        }
        case 'request_tailoring': {
            const r = result as ToolResults['request_tailoring'] | undefined;
            const id = r?.applicationId ?? refAppId;
            return id ? careerPath.toApplication(id, 'cv') : null;
        }
        case 'prepare_interview': {
            const r = result as ToolResults['prepare_interview'] | undefined;
            const id = r?.session.applicationId ?? null;
            return id ? careerPath.toApplication(id, 'interview') : null;
        }
        case 'save_artifact':
        case 'generate_artifact': {
            const r = result as ToolResults['save_artifact'] | undefined;
            if (!r) return null;
            return careerPath.toApplication(r.artifact.applicationId, ARTIFACT_SECTION[r.artifact.kind] ?? 'analysis');
        }
        case 'record_outcome': {
            const r = result as ToolResults['record_outcome'] | undefined;
            const id = r?.application.id ?? refAppId;
            return id ? careerPath.toApplication(id, 'activity') : null;
        }
        case 'create_plan':
            return careerPath.toSpace('today');
        case 'report_result':
            return null;
        default:
            return null;
    }
}

/** "Done" is only truthful with a completed status and a persisted result reference (REQ-21). */
export const isDone = (run: ActionRun | null | undefined): boolean =>
    Boolean(run && run.status === 'completed' && run.resultRef && Object.keys(run.resultRef).length > 0);

export interface ConversationExport {
    format: 'cvbase-coach-conversation';
    version: 1;
    exportedAt: string;
    conversation: {
        id: string;
        title: string;
        contextRefs: CoachConversation['contextRefs'];
        summary: string;
        summarySourceIds: string[];
        status: CoachConversation['status'];
        createdAt: string;
        updatedAt: string;
    };
    messages: Array<{
        id: string;
        role: CoachMessage['role'];
        content: string;
        citations: CoachCitation[];
        proposals: CoachMessage['proposals'];
        actionRunId: string | null;
        abstained: boolean;
        createdAt: string;
    }>;
}

/** Exactly this conversation's messages and citations — nothing from any other conversation. */
export function buildConversationExport(conversation: CoachConversation, messages: CoachMessage[], exportedAt = new Date()): ConversationExport {
    return {
        format: 'cvbase-coach-conversation',
        version: 1,
        exportedAt: exportedAt.toISOString(),
        conversation: {
            id: conversation.id,
            title: conversation.title,
            contextRefs: conversation.contextRefs,
            summary: conversation.summary,
            summarySourceIds: conversation.summarySourceIds,
            status: conversation.status,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
        },
        messages: messages
            .filter((m) => m.conversationId === conversation.id)
            .map((m) => ({
                id: m.id, role: m.role, content: m.content, citations: m.citations, proposals: m.proposals,
                actionRunId: m.actionRunId, abstained: m.abstained, createdAt: m.createdAt,
            })),
    };
}

export const exportFilename = (conversation: Pick<CoachConversation, 'id'>, at = new Date()): string =>
    `cvbase-coach-${conversation.id.slice(0, 8)}-${at.toISOString().slice(0, 10)}.json`;

/** Short relative/absolute time for a message row. */
export function timeLabel(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
        ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * The stored reply when the gateway could not reach the model (mirrors
 * MODEL_UNAVAILABLE_REPLY in supabase/functions/career-coach/prompts.ts).
 * Such a reply is an outage, not a lack of evidence, and can be retried.
 */
export const MODEL_UNAVAILABLE_REPLY = "I can't reach the model right now; your context is saved.";
export const isModelUnavailable = (m: { abstained: boolean; content: string }): boolean => m.abstained && m.content.trim() === MODEL_UNAVAILABLE_REPLY;
