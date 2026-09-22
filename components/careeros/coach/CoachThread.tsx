import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Brain, Trash2, X } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useNavigation } from '../../NavigationProvider';
import { sendCoachMessage } from '../../../services/careerOs/coachApi';
import { isGatewayError, type ToolName } from '../../../services/careerOs/gateway';
import { track } from '../../../services/careerOs/careerEvents';
import { ConflictError, type ActionRun, type CoachConversation, type CoachMessage } from '../../../services/careerOs/types';
import { triggerDownload } from '../../../services/repos/accountRepo';
import ConfirmDialog from '../../common/ConfirmDialog';
import { Button, Pill, Skeleton, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from '../career/useOnline';
import { FailureNotice } from '../application/FailureNotice';
import { classifyError } from '../application/errors';
import * as coachRepo from './coachRepo';
import CoachContextPanel from './CoachContextPanel';
import Composer from './Composer';
import MemoryMenu from './MemoryMenu';
import MessageList from './MessageList';
import { buildConversationExport, exportFilename } from './coachFormat';
import { CONTEXT_KEYS, CONVERSATIONS_KEY, THREAD_KEY, loadContextLabels, resolveContextRefs, useThread, type ContextIds, type ContextLabels } from './useCoach';

/**
 * One conversation: its editable context, the derived summary (clearly a
 * derivation, never an authority over facts), the message thread with
 * citations and proposals, memory controls and the composer. Sending is
 * optimistic; the draft survives every failure. Refresh or re-auth reload
 * exactly this conversation by id — no other thread is ever mixed in.
 */
export interface CoachThreadProps {
    conversationId: string;
    /** Called after the conversation was deleted or archived so the space can move on. */
    onGone: () => void;
    /** Opens the conversation list (mobile). */
    onOpenList?: () => void;
}

type SendFailure =
    | { kind: 'limit' }
    | { kind: 'ai-unavailable'; stored: boolean }
    | { kind: 'offline' }
    | { kind: 'error'; error: unknown };

const DRAFT_PREFIX = 'cvbase-coach-draft:';

const readDraft = (id: string): string => { try { return sessionStorage.getItem(`${DRAFT_PREFIX}${id}`) ?? ''; } catch { return ''; } };
const writeDraft = (id: string, value: string): void => {
    try { if (value) sessionStorage.setItem(`${DRAFT_PREFIX}${id}`, value); else sessionStorage.removeItem(`${DRAFT_PREFIX}${id}`); } catch { /* storage unavailable */ }
};

const prefersReducedMotion = (): boolean => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export const CoachThread: React.FC<CoachThreadProps> = ({ conversationId, onGone, onOpenList }) => {
    const { t, language } = useTranslation();
    const { navigate } = useNavigation();
    const { userId, invalidate } = useCareerOs();
    const online = useOnline();
    const thread = useThread(conversationId);

    const [labels, setLabels] = useState<ContextLabels | null>(null);
    const [labelsError, setLabelsError] = useState(false);
    const [draft, setDraft] = useState(() => readDraft(conversationId));
    const [pending, setPending] = useState<{ content: string } | null>(null);
    const [sending, setSending] = useState(false);
    const [failure, setFailure] = useState<SendFailure | null>(null);
    const [abstainReasons, setAbstainReasons] = useState<Record<string, string | null>>({});
    const [mutationError, setMutationError] = useState<unknown>(null);
    const [busy, setBusy] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);
    const [earlier, setEarlier] = useState<{ messages: CoachMessage[]; hasEarlier: boolean } | null>(null);
    const [loadingEarlier, setLoadingEarlier] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    // Reset per-conversation state when the id changes so nothing bleeds across threads.
    useEffect(() => {
        setDraft(readDraft(conversationId));
        setPending(null);
        setFailure(null);
        setSelectMode(false);
        setSelected(new Set());
        setEarlier(null);
        setLabels(null);
        setLabelsError(false);
        setMutationError(null);
    }, [conversationId]);

    useEffect(() => { writeDraft(conversationId, draft); }, [conversationId, draft]);

    const conversation = thread.data?.conversation ?? null;
    const refsKey = conversation ? JSON.stringify(conversation.contextRefs) : '';

    useEffect(() => {
        if (!userId || !conversation) return;
        let cancelled = false;
        setLabelsError(false);
        loadContextLabels(userId, conversation.contextRefs)
            .then((next) => { if (!cancelled) setLabels(next); })
            .catch(() => { if (!cancelled) { setLabelsError(true); setLabels({}); } });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, conversation?.id, refsKey]);

    const messageCount = thread.data?.messages.length ?? 0;
    useEffect(() => {
        const el = endRef.current;
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, [messageCount, pending, sending]);

    const refreshAll = useCallback(async () => {
        invalidate(CONVERSATIONS_KEY);
        await thread.refresh();
    }, [invalidate, thread]);

    const contextIds = useCallback((c: CoachConversation): ContextIds => {
        const out: ContextIds = {};
        for (const k of CONTEXT_KEYS) if (c.contextRefs[k]?.id) out[k] = c.contextRefs[k]?.id;
        return out;
    }, []);

    // ---- sending ----------------------------------------------------------
    const send = useCallback(async () => {
        if (!userId || !conversation) return;
        const message = draft.trim();
        if (!message) return;
        if (!online) { setFailure({ kind: 'offline' }); return; }
        setSending(true);
        setFailure(null);
        setPending({ content: message });
        try {
            const reply = await sendCoachMessage({ conversationId: conversation.id, message, contextRefs: contextIds(conversation), locale: language });
            setDraft('');
            if (reply.abstained && reply.abstainReason) setAbstainReasons((prev) => ({ ...prev, [reply.message.id]: reply.abstainReason }));
            if (reply.released) setFailure({ kind: 'ai-unavailable', stored: true });
            await refreshAll();
        } catch (err) {
            if (isGatewayError(err) && err.code === 'limit_reached') setFailure({ kind: 'limit' });
            else if (isGatewayError(err) && (err.code === 'llm_unavailable' || err.code === 'timeout' || err.code === 'bad_ai_output' || err.status >= 500)) setFailure({ kind: 'ai-unavailable', stored: false });
            else if (classifyError(err) === 'offline') setFailure({ kind: 'offline' });
            else setFailure({ kind: 'error', error: err });
            // The draft stays in the composer; nothing is lost.
        } finally {
            setPending(null);
            setSending(false);
        }
    }, [userId, conversation, draft, online, contextIds, language, refreshAll]);

    // ---- context change ---------------------------------------------------
    const changeContext = useCallback(async (ids: ContextIds) => {
        if (!userId || !conversation) return;
        setMutationError(null);
        try {
            const { refs, labels: nextLabels } = await resolveContextRefs(userId, ids);
            const updated = await coachRepo.setContextRefs(userId, conversation.id, refs, conversation.revision);
            const kindLabel = { goal: t('careeros.context.goal', 'Goal'), campaign: t('careeros.context.campaign', 'Campaign'), opportunity: t('careeros.context.opportunity', 'Opportunity'), application: t('careeros.context.application', 'Application') };
            const summary = CONTEXT_KEYS.filter((k) => refs[k]).map((k) => `${kindLabel[k]}: ${nextLabels[k]?.label ?? refs[k]?.id}`).join(' · ');
            await coachRepo.insertSystemMessage(userId, conversation.id, t('careeros.coach.contextChanged', 'Context changed to {context}').replace('{context}', summary || t('careeros.context.none', 'None selected')));
            setLabels(nextLabels);
            thread.setData({ ...(thread.data as NonNullable<typeof thread.data>), conversation: updated });
            await refreshAll();
        } catch (err) {
            setMutationError(err);
            if (err instanceof ConflictError) await thread.refresh();
        }
    }, [userId, conversation, t, thread, refreshAll]);

    // ---- memory -----------------------------------------------------------
    const mutate = useCallback(async (fn: (c: CoachConversation) => Promise<CoachConversation | void>, after?: 'gone' | 'refresh') => {
        if (!userId || !conversation) return;
        setBusy(true);
        setMutationError(null);
        try {
            const updated = await fn(conversation);
            if (after === 'gone') { invalidate(CONVERSATIONS_KEY); invalidate(`${THREAD_KEY}:${conversation.id}`); onGone(); return; }
            if (updated && thread.data) thread.setData({ ...thread.data, conversation: updated });
            invalidate(CONVERSATIONS_KEY);
            if (after === 'refresh') await thread.refresh();
        } catch (err) {
            setMutationError(err);
            if (err instanceof ConflictError) await thread.refresh();
        } finally {
            setBusy(false);
        }
    }, [userId, conversation, invalidate, onGone, thread]);

    const exportJson = useCallback(() => {
        if (!conversation || !thread.data) return;
        const all = [...(earlier?.messages ?? []), ...thread.data.messages];
        const doc = buildConversationExport(conversation, all);
        triggerDownload(JSON.stringify(doc, null, 2), exportFilename(conversation));
    }, [conversation, thread.data, earlier]);

    const deleteSelected = useCallback(async () => {
        if (!userId || !conversation || selected.size === 0) return;
        setBusy(true);
        try {
            await coachRepo.deleteMessages(userId, conversation.id, Array.from(selected));
            setSelected(new Set());
            setSelectMode(false);
            setEarlier(null);
            await refreshAll();
        } catch (err) {
            setMutationError(err);
        } finally {
            setBusy(false);
        }
    }, [userId, conversation, selected, refreshAll]);

    const loadEarlier = useCallback(async () => {
        if (!userId || !thread.data) return;
        const first = earlier?.messages[0] ?? thread.data.messages[0];
        if (!first) return;
        setLoadingEarlier(true);
        try {
            const page = await coachRepo.listMessages(userId, conversationId, { limit: 100, before: first.createdAt });
            setEarlier((prev) => ({ messages: [...page.messages, ...(prev?.messages ?? [])], hasEarlier: page.hasEarlier }));
        } catch (err) {
            setMutationError(err);
        } finally {
            setLoadingEarlier(false);
        }
    }, [userId, thread.data, earlier, conversationId]);

    const onExecuted = useCallback((run: ActionRun, tool: ToolName) => {
        if (!userId) return;
        void track(userId, 'coach_action_executed', {
            subjectRefs: { conversation: conversationId, run: run.id },
            payload: { tool, status: run.status, actor: run.actor, attempt: run.attempt },
            dedupeKey: `coach_action_executed:${run.id}`,
        });
        // Material tools change owned records elsewhere (applications, interviews, plans).
        if (tool !== 'inspect_context' && tool !== 'explain_priorities' && tool !== 'compare_opportunities' && tool !== 'review_evidence') invalidate('');
    }, [userId, conversationId, invalidate]);

    // ---- render -----------------------------------------------------------
    if (thread.error !== null) {
        const kind = classifyError(thread.error);
        return (
            <StatePanel
                kind={kind === 'not_found' ? 'empty' : kind === 'offline' ? 'offline' : 'error'}
                title={kind === 'not_found' ? t('careeros.coach.notFound', 'This conversation is not in your account') : undefined}
                description={kind === 'not_found' ? t('careeros.coach.notFoundDescription', 'It may have been deleted, or the link belongs to another account. Nothing else was opened.') : undefined}
                onRetry={kind === 'not_found' ? undefined : () => { void thread.refresh(); }}
                action={{ label: t('careeros.coach.backToList', 'All conversations'), onClick: onGone }}
            />
        );
    }
    if (!conversation || !thread.data) {
        return (
            <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
                <span className="sr-only">{t('label.loading', 'Loading')}</span>
                <Skeleton variant="block" className="h-16" />
                <Skeleton variant="block" className="h-12 w-3/4" />
                <Skeleton variant="block" className="ml-auto h-12 w-2/3" />
                <Skeleton variant="block" className="h-12 w-3/4" />
            </div>
        );
    }

    const messages = [...(earlier?.messages ?? []), ...thread.data.messages];
    const archived = conversation.status === 'archived';
    const composerDisabledReason = !online
        ? t('careeros.coach.offline', 'You are offline. Your draft stays here until you reconnect.')
        : archived ? t('careeros.coach.archivedHint', 'This conversation is archived. Reopen it to continue.') : undefined;

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <header className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    {onOpenList && <Button variant="quiet" size="sm" onClick={onOpenList}>{t('careeros.coach.conversations', 'Conversations')}</Button>}
                    <h2 className="min-w-0 truncate text-base font-semibold text-content-primary">{conversation.title || t('careeros.coach.untitled', 'Untitled conversation')}</h2>
                    {archived && <Pill tone="neutral">{t('careeros.coach.archived', 'Archived')}</Pill>}
                </div>
                <MemoryMenu
                    conversation={conversation}
                    busy={busy}
                    onRename={(title) => { void mutate((c) => coachRepo.rename(userId as string, c.id, title, c.revision)); }}
                    onArchive={() => { void mutate((c) => coachRepo.archive(userId as string, c.id, c.revision)); }}
                    onReopen={() => { void mutate((c) => coachRepo.reopen(userId as string, c.id, c.revision)); }}
                    onExport={exportJson}
                    onForgetSummary={() => { void mutate((c) => coachRepo.forgetSummary(userId as string, c.id, c.revision)); }}
                    onStartSelect={() => { setSelectMode(true); setSelected(new Set()); }}
                    onDelete={() => { void mutate(async (c) => { await coachRepo.deleteConversation(userId as string, c.id); }, 'gone'); }}
                />
            </header>

            <CoachContextPanel conversation={conversation} labels={labels} labelsError={labelsError} onChange={changeContext} disabled={busy || archived} defaultCollapsed={Boolean(onOpenList)} />

            {conversation.summary && (
                <aside aria-label={t('careeros.coach.summaryLabel', 'Derived summary')} className="rounded-2xl border border-border-default bg-surface-canvas p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Brain size={14} strokeWidth={2} className="text-content-muted" aria-hidden="true" />
                        <span className="font-label text-[10px] uppercase tracking-[0.14em] text-content-muted">
                            {t('careeros.coach.summaryFrom', 'Derived summary (from {count} messages)').replace('{count}', String(conversation.summarySourceIds.length))}
                        </span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-content-primary">{conversation.summary}</p>
                    <p className="mt-1 text-[11px] text-content-muted">{t('careeros.coach.summaryCaveat', 'A summary of earlier turns, not a source of truth: your career facts always take precedence over it.')}</p>
                </aside>
            )}

            {mutationError !== null && (
                <FailureNotice error={mutationError} onReload={() => { void thread.refresh(); }} onRetry={() => setMutationError(null)} onDismiss={() => setMutationError(null)} />
            )}

            {selectMode && (
                <div role="toolbar" aria-label={t('careeros.coach.selectToolbar', 'Message selection')} className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-surface-panel p-2">
                    <span className="text-[13px] text-content-secondary">{t('careeros.coach.selectedCount', '{count} selected').replace('{count}', String(selected.size))}</span>
                    <Button variant="danger" size="sm" icon={<Trash2 size={14} strokeWidth={2} />} disabled={selected.size === 0 || busy} onClick={() => setConfirmDeleteSelected(true)}>
                        {t('careeros.coach.deleteSelected', 'Delete selected')}
                    </Button>
                    <Button variant="quiet" size="sm" icon={<X size={14} strokeWidth={2} />} onClick={() => { setSelectMode(false); setSelected(new Set()); }}>{t('btn.cancel', 'Cancel')}</Button>
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                {messages.length === 0 && !pending && !sending ? (
                    <StatePanel
                        kind="empty"
                        title={t('careeros.coach.firstUse', 'Ask the coach anything about your career')}
                        description={t('careeros.coach.firstUseDescription', 'Answers cite your own records. Where the coach cannot find evidence it says so instead of guessing, and every suggested action runs through the same tools you use yourself.')}
                    />
                ) : (
                    <MessageList
                        conversation={conversation}
                        messages={messages}
                        pending={pending}
                        thinking={sending}
                        hasEarlier={earlier ? earlier.hasEarlier : thread.data.hasEarlier}
                        loadingEarlier={loadingEarlier}
                        onLoadEarlier={() => { void loadEarlier(); }}
                        selectMode={selectMode}
                        selected={selected}
                        onToggleSelect={(id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
                        onExecuted={onExecuted}
                        abstainReasons={abstainReasons}
                    />
                )}
                <div ref={endRef} />
            </div>

            {failure?.kind === 'limit' && (
                <StatePanel
                    kind="denied"
                    compact
                    title={t('careeros.coach.limitTitle', 'No AI actions left on your plan')}
                    description={t('careeros.coach.limitDescription', 'Your message was not sent and stays in the composer. Upgrade to keep talking to the coach.')}
                    action={{ label: t('careeros.coach.upgrade', 'See plans'), onClick: () => navigate({ view: 'pricing' }) }}
                    secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: () => setFailure(null) }}
                />
            )}
            {failure?.kind === 'ai-unavailable' && (
                <StatePanel
                    kind="ai-unavailable"
                    compact
                    description={failure.stored
                        ? t('careeros.coach.aiUnavailableStored', 'Your message and context are saved and nothing was charged. Ask again in a moment.')
                        : t('careeros.coach.aiUnavailableKept', 'Nothing was sent. Your draft stays in the composer.')}
                    action={{ label: t('careeros.state.retry', 'Retry'), onClick: () => { setFailure(null); if (!failure.stored) void send(); } }}
                    secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: () => setFailure(null) }}
                />
            )}
            {failure?.kind === 'offline' && (
                <StatePanel kind="offline" compact description={t('careeros.coach.offline', 'You are offline. Your draft stays here until you reconnect.')} onRetry={() => { setFailure(null); void send(); }} />
            )}
            {failure?.kind === 'error' && (
                <FailureNotice error={failure.error} title={t('careeros.coach.sendFailed', 'The message could not be sent')} onRetry={() => { setFailure(null); void send(); }} onDismiss={() => setFailure(null)} />
            )}

            <Composer value={draft} onChange={setDraft} onSend={() => { void send(); }} sending={sending} disabled={!online || archived || selectMode} disabledReason={composerDisabledReason} />

            <ConfirmDialog
                open={confirmDeleteSelected}
                destructive
                title={t('careeros.coach.deleteSelectedTitle', 'Delete {count} messages?').replace('{count}', String(selected.size))}
                description={t('careeros.coach.deleteSelectedDescription', 'They are removed from this conversation and from any future summary. Records they cited are not touched.')}
                confirmLabel={t('careeros.coach.deleteSelected', 'Delete selected')}
                onConfirm={() => { setConfirmDeleteSelected(false); void deleteSelected(); }}
                onCancel={() => setConfirmDeleteSelected(false)}
            />
        </div>
    );
};

export default CoachThread;
