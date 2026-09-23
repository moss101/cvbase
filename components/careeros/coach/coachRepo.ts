import { getSupabase } from '../../../services/supabase';
import { rowToConversation, rowToMessage, conversationToRow, messageToRow, type ConversationInput } from '../../../services/careerOs/mappers';
import { deleteOwned, getOwned, insertOne, isUuid, rows, updateWithRevision } from '../../../services/careerOs/repoUtils';
import type { CoachConversation, CoachMessage } from '../../../services/careerOs/types';

/**
 * Owner-scoped reads and writes for `coach_conversations` / `coach_messages`
 * (COS-027). The career-coach Edge Function writes the assistant turns; this
 * repository owns everything the person does to their own memory: listing,
 * creating a scoped conversation, renaming, archiving, changing the selected
 * context, forgetting the derived summary, deleting selected messages and
 * deleting a whole conversation (messages cascade on the server).
 *
 * Every read filters on `user_id` and every update sends the revision that
 * was read; a stale revision is a `ConflictError`, never a silent overwrite.
 */

const CONVERSATIONS = 'coach_conversations';
const MESSAGES = 'coach_messages';
const ENTITY = 'coach_conversation';

export type ConversationStatusFilter = 'active' | 'archived' | 'any';

export async function listConversations(
    userId: string,
    opts: { status?: ConversationStatusFilter; limit?: number } = {},
): Promise<CoachConversation[]> {
    let q = getSupabase().from(CONVERSATIONS).select('*').eq('user_id', userId);
    const status = opts.status ?? 'active';
    if (status !== 'any') q = q.eq('status', status);
    q = q.order('last_message_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
        .limit(Math.max(1, Math.min(opts.limit ?? 100, 200)));
    return (await rows(q)).map(rowToConversation);
}

export async function getConversation(userId: string, id: string): Promise<CoachConversation> {
    return rowToConversation(await getOwned(CONVERSATIONS, ENTITY, userId, id));
}

export async function createConversation(userId: string, input: ConversationInput): Promise<CoachConversation> {
    const row = conversationToRow({
        title: '', contextRefs: {}, summary: '', summarySourceIds: [], status: 'active', lastMessageAt: null, ...input,
    }, userId);
    return rowToConversation(await insertOne(CONVERSATIONS, row));
}

export async function updateConversation(
    userId: string, id: string, patch: ConversationInput, expectedRevision: number,
): Promise<CoachConversation> {
    const row = conversationToRow(patch, userId);
    delete row.user_id;
    return rowToConversation(await updateWithRevision(CONVERSATIONS, ENTITY, userId, id, expectedRevision, row));
}

export const rename = (userId: string, id: string, title: string, expectedRevision: number) =>
    updateConversation(userId, id, { title: title.trim().slice(0, 120) }, expectedRevision);

export const archive = (userId: string, id: string, expectedRevision: number) =>
    updateConversation(userId, id, { status: 'archived' }, expectedRevision);

export const reopen = (userId: string, id: string, expectedRevision: number) =>
    updateConversation(userId, id, { status: 'active' }, expectedRevision);

/** Selective memory: the derived summary and the ids it was built from are cleared; facts are untouched. */
export const forgetSummary = (userId: string, id: string, expectedRevision: number) =>
    updateConversation(userId, id, { summary: '', summarySourceIds: [] }, expectedRevision);

export const setContextRefs = (userId: string, id: string, contextRefs: CoachConversation['contextRefs'], expectedRevision: number) =>
    updateConversation(userId, id, { contextRefs }, expectedRevision);

/** Deletes the conversation; its messages cascade on the server (same owner). */
export const deleteConversation = (userId: string, id: string) => deleteOwned(CONVERSATIONS, userId, id);

export interface MessagePage {
    messages: CoachMessage[];
    /** True when older messages exist before the first one returned. */
    hasEarlier: boolean;
}

/**
 * The newest `limit` messages of one conversation in chronological order.
 * Pass `before` (an ISO created_at) to page further back for large histories.
 * Never mixes conversations: the filter is user + conversation id.
 */
export async function listMessages(
    userId: string, conversationId: string, opts: { limit?: number; before?: string } = {},
): Promise<MessagePage> {
    if (!isUuid(conversationId)) return { messages: [], hasEarlier: false };
    const limit = Math.max(1, Math.min(opts.limit ?? 100, 200));
    let q = getSupabase().from(MESSAGES).select('*').eq('user_id', userId).eq('conversation_id', conversationId);
    if (opts.before) q = q.lt('created_at', opts.before);
    q = q.order('created_at', { ascending: false }).limit(limit + 1);
    const found = (await rows(q)).map(rowToMessage);
    const hasEarlier = found.length > limit;
    return { messages: found.slice(0, limit).reverse(), hasEarlier };
}

/**
 * A system note the person's own action produced (e.g. "Context changed to
 * …"). Stored so it survives a refresh and is exported with the thread; it
 * carries no citations or proposals and is never an assistant claim.
 */
export async function insertSystemMessage(userId: string, conversationId: string, content: string): Promise<CoachMessage> {
    return rowToMessage(await insertOne(MESSAGES, messageToRow({
        conversationId, role: 'system', content: content.slice(0, 2000), citations: [], proposals: [], actionRunId: null, abstained: false,
    }, userId)));
}

/** Deletes the chosen messages of one conversation (owner and conversation scoped). */
export async function deleteMessages(userId: string, conversationId: string, ids: string[]): Promise<number> {
    const clean = ids.filter(isUuid);
    if (!isUuid(conversationId) || clean.length === 0) return 0;
    const { data, error } = await getSupabase().from(MESSAGES).delete()
        .eq('user_id', userId).eq('conversation_id', conversationId).in('id', clean).select('id');
    if (error) throw error;
    return (data ?? []).length;
}

/** A conversation is scoped to a subject when its stored refs name exactly the same ids. */
export function matchesContext(
    conversation: Pick<CoachConversation, 'contextRefs'>,
    refs: Partial<Record<'goal' | 'campaign' | 'opportunity' | 'application', string>>,
): boolean {
    const keys = ['goal', 'campaign', 'opportunity', 'application'] as const;
    return keys.every((k) => (conversation.contextRefs[k]?.id ?? undefined) === (refs[k] ?? undefined));
}

/** The most recent active conversation whose stored context equals `refs`, or null. */
export async function findActiveByContext(
    userId: string,
    refs: Partial<Record<'goal' | 'campaign' | 'opportunity' | 'application', string>>,
): Promise<CoachConversation | null> {
    const active = await listConversations(userId, { status: 'active', limit: 100 });
    return active.find((c) => matchesContext(c, refs)) ?? null;
}
