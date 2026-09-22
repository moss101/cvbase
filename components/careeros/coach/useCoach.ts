import * as coachRepo from './coachRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { NotFoundError, type CoachConversation, type CoachMessage, type Ref } from '../../../services/careerOs/types';
import type { CareerContextHints } from '../../NavigationProvider';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOwnedQuery, type OwnedQuery } from '../data/useOwnedQuery';

/**
 * Coach data loading (COS-027). Conversations and messages are read through
 * the owner-scoped repository and cached per conversation id, so a refresh
 * or re-auth resumes exactly the same thread and two conversations can never
 * share a cache entry. Opening the Coach from a subject (goal, campaign,
 * opportunity or application) resolves the persisted relations first — an
 * application's opportunity/campaign/goal are read from the application
 * record, never from the URL — and then finds or creates the one
 * conversation scoped to that subject.
 */
export const CONVERSATIONS_KEY = 'coach:conversations';
export const THREAD_KEY = 'coach:thread';

export type ContextKey = 'goal' | 'campaign' | 'opportunity' | 'application';
export const CONTEXT_KEYS: readonly ContextKey[] = ['goal', 'campaign', 'opportunity', 'application'];

export type ContextIds = Partial<Record<ContextKey, string>>;
export type ContextRefMap = CoachConversation['contextRefs'];

export interface ContextLabel {
    label: string;
    meta?: string;
    /** The referenced record could not be read (deleted or not owned). */
    missing?: boolean;
}

export type ContextLabels = Partial<Record<ContextKey, ContextLabel>>;

export interface Thread {
    conversation: CoachConversation;
    messages: CoachMessage[];
    hasEarlier: boolean;
}

export const useConversations = (status: coachRepo.ConversationStatusFilter = 'active'): OwnedQuery<CoachConversation[]> => {
    const { userId } = useCareerOs();
    return useOwnedQuery<CoachConversation[]>(userId, userId ? `${CONVERSATIONS_KEY}:${status}` : null, () =>
        coachRepo.listConversations(userId as string, { status }));
};

export const useThread = (conversationId: string | null): OwnedQuery<Thread> => {
    const { userId } = useCareerOs();
    return useOwnedQuery<Thread>(userId, userId && conversationId ? `${THREAD_KEY}:${conversationId}` : null, async () => {
        const conversation = await coachRepo.getConversation(userId as string, conversationId as string);
        const page = await coachRepo.listMessages(userId as string, conversation.id, { limit: 100 });
        return { conversation, messages: page.messages, hasEarlier: page.hasEarlier };
    });
};

const idsOf = (refs: ContextRefMap): ContextIds => {
    const out: ContextIds = {};
    for (const k of CONTEXT_KEYS) if (refs[k]?.id) out[k] = refs[k]?.id;
    return out;
};

export { idsOf as contextIds };

async function tryGet<T>(fn: () => Promise<T>): Promise<T | null> {
    try { return await fn(); } catch (err) { if (err instanceof NotFoundError) return null; throw err; }
}

/**
 * Persisted application relations outrank any other selection: choosing an
 * application fixes its opportunity, campaign and goal from the record.
 * Returns typed refs with revisions plus a title for a new conversation.
 */
export async function resolveContextRefs(userId: string, ids: ContextIds): Promise<{ refs: ContextRefMap; title: string; labels: ContextLabels }> {
    const refs: ContextRefMap = {};
    const labels: ContextLabels = {};
    let title = '';

    if (ids.application) {
        const app = await tryGet(() => applicationRepo.get(userId, ids.application as string));
        if (app) {
            refs.application = { id: app.id, revision: app.revision };
            labels.application = { label: app.jobTitle || app.company, meta: app.company };
            title = [app.jobTitle, app.company].filter(Boolean).join(' · ');
            ids = { ...ids, opportunity: app.opportunityId ?? undefined, campaign: app.campaignId ?? undefined, goal: app.goalId ?? undefined };
        } else {
            labels.application = { label: ids.application, missing: true };
            ids = { ...ids, application: undefined };
        }
    }
    if (ids.opportunity) {
        const opp = await tryGet(() => opportunityRepo.get(userId, ids.opportunity as string));
        if (opp) {
            refs.opportunity = { id: opp.id, revision: opp.revision };
            labels.opportunity = { label: opp.title, meta: opp.company };
            if (!title) title = [opp.title, opp.company].filter(Boolean).join(' · ');
        } else labels.opportunity = { label: ids.opportunity, missing: true };
    }
    if (ids.campaign) {
        const campaign = await tryGet(() => campaignRepo.get(userId, ids.campaign as string));
        if (campaign) {
            refs.campaign = { id: campaign.id, revision: campaign.revision };
            labels.campaign = { label: campaign.name };
            if (!title) title = campaign.name;
        } else labels.campaign = { label: ids.campaign, missing: true };
    }
    if (ids.goal) {
        const goal = await tryGet(() => goalRepo.get(userId, ids.goal as string));
        if (goal) {
            refs.goal = { id: goal.id, revision: goal.revision };
            labels.goal = { label: goal.title || goal.role, meta: goal.role };
            if (!title) title = goal.title || goal.role;
        } else labels.goal = { label: ids.goal, missing: true };
    }
    return { refs, title, labels };
}

/** Labels for a stored ref map (used by the context panel on every thread). */
export const loadContextLabels = async (userId: string, refs: ContextRefMap): Promise<ContextLabels> =>
    (await resolveContextRefs(userId, idsOf(refs))).labels;

/** The URL's validated hints as a plain id map. */
export const hintsToIds = (hints: CareerContextHints | undefined): ContextIds => {
    const out: ContextIds = {};
    if (!hints) return out;
    for (const k of CONTEXT_KEYS) if (hints[k]) out[k] = hints[k];
    return out;
};

export const hasAnyContext = (ids: ContextIds): boolean => CONTEXT_KEYS.some((k) => Boolean(ids[k]));

/**
 * Find the active conversation already scoped to exactly this subject, or
 * create one titled after it. Emits coach_conversation_started only after
 * the insert succeeded.
 */
export async function ensureScopedConversation(userId: string, ids: ContextIds): Promise<{ conversation: CoachConversation; created: boolean }> {
    const { refs, title } = await resolveContextRefs(userId, ids);
    const existing = await coachRepo.findActiveByContext(userId, idsOf(refs));
    if (existing) return { conversation: existing, created: false };
    const conversation = await coachRepo.createConversation(userId, { title, contextRefs: refs });
    void track(userId, 'coach_conversation_started', {
        subjectRefs: { conversation: conversation.id },
        payload: { scoped: true, hasApplication: Boolean(refs.application), hasOpportunity: Boolean(refs.opportunity), hasGoal: Boolean(refs.goal), hasCampaign: Boolean(refs.campaign) },
    });
    return { conversation, created: true };
}

/** A blank conversation with no subject (the "New conversation" button). */
export async function createBlankConversation(userId: string, title: string): Promise<CoachConversation> {
    const conversation = await coachRepo.createConversation(userId, { title, contextRefs: {} });
    void track(userId, 'coach_conversation_started', { subjectRefs: { conversation: conversation.id }, payload: { scoped: false } });
    return conversation;
}

export const refEquals = (a: Ref | undefined, b: Ref | undefined): boolean => (a?.id ?? null) === (b?.id ?? null);
