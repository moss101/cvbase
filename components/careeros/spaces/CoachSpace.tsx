import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import { useMobileShell } from '../../../lib/useMobileShell';
import BottomSheet from '../../mobile/BottomSheet';
import { SpaceHeader, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { FailureNotice } from '../application/FailureNotice';
import ConversationList from '../coach/ConversationList';
import CoachThread from '../coach/CoachThread';
import { CONVERSATIONS_KEY, createBlankConversation, ensureScopedConversation, hasAnyContext, hintsToIds, useConversations } from '../coach/useCoach';

/**
 * Coach (REQ-21, COS-027): one persistent, context-aware conversation
 * surface. `/app/coach` opens the conversation list and, on desktop, the
 * most recent active thread; `/app/coach/:id` opens that thread. Opening the
 * coach from a subject (goal, campaign, opportunity or application hints in
 * the URL) finds or creates the conversation scoped to exactly that subject
 * and moves to its id, so a refresh lands on the same thread.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const CoachSpace: React.FC<SpaceProps> = ({ route }) => {
    const { t } = useTranslation();
    const { navigate, replace } = useNavigation();
    const { userId, invalidate } = useCareerOs();
    const isMobile = useMobileShell();
    const [showArchived, setShowArchived] = useState(false);
    const conversations = useConversations(showArchived ? 'archived' : 'active');
    const [listOpen, setListOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<unknown>(null);
    const [scoping, setScoping] = useState(false);
    const scopedFor = useRef<string | null>(null);

    const hints = hintsToIds(route.context);
    const hintsKey = JSON.stringify(hints);
    const conversationId = route.id ?? null;

    // Opened from a subject: resolve persisted relations, then find or create
    // the scoped conversation and replace the URL with its id.
    useEffect(() => {
        if (!userId || conversationId || !hasAnyContext(hints) || scopedFor.current === hintsKey) return;
        scopedFor.current = hintsKey;
        let cancelled = false;
        setScoping(true);
        setCreateError(null);
        ensureScopedConversation(userId, hints)
            .then(({ conversation, created }) => {
                if (cancelled) return;
                if (created) invalidate(CONVERSATIONS_KEY);
                replace(careerPath.toCoach(conversation.id));
            })
            .catch((err: unknown) => { if (!cancelled) setCreateError(err); })
            .finally(() => { if (!cancelled) setScoping(false); });
        return () => {
            // A cancelled run (StrictMode re-run, unmount) must not leave the
            // dedupe marker behind, or the re-run would skip the resolution
            // and the screen would wait forever. find-or-create is idempotent.
            cancelled = true;
            if (scopedFor.current === hintsKey) scopedFor.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, conversationId, hintsKey]);

    // Desktop with no id: open the most recent active conversation in place.
    useEffect(() => {
        if (isMobile || conversationId || hasAnyContext(hints) || !conversations.data || conversations.data.length === 0 || showArchived) return;
        replace(careerPath.toCoach(conversations.data[0].id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMobile, conversationId, hintsKey, conversations.data, showArchived]);

    const startNew = useCallback(async () => {
        if (!userId) return;
        setCreating(true);
        setCreateError(null);
        try {
            const conversation = await createBlankConversation(userId, t('careeros.coach.newTitle', 'New conversation'));
            invalidate(CONVERSATIONS_KEY);
            setListOpen(false);
            navigate(careerPath.toCoach(conversation.id));
        } catch (err) {
            setCreateError(err);
        } finally {
            setCreating(false);
        }
    }, [userId, t, invalidate, navigate]);

    const open = useCallback((id: string) => {
        setListOpen(false);
        if (id !== conversationId) navigate(careerPath.toCoach(id));
    }, [conversationId, navigate]);

    const onGone = useCallback(() => {
        invalidate(CONVERSATIONS_KEY);
        replace(careerPath.toCoach());
    }, [invalidate, replace]);

    if (!userId) return null;

    const list = (
        <ConversationList
            conversations={conversations.data}
            error={conversations.error}
            loading={conversations.loading}
            currentId={conversationId}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived((v) => !v)}
            onOpen={open}
            onNew={() => { void startNew(); }}
            creating={creating}
            onRetry={() => { void conversations.refresh(); }}
        />
    );

    const thread = conversationId ? (
        <CoachThread conversationId={conversationId} onGone={onGone} onOpenList={isMobile ? () => setListOpen(true) : undefined} />
    ) : scoping ? (
        <StatePanel kind="loading" title={t('careeros.coach.scoping', 'Opening the conversation for this context')} />
    ) : createError !== null ? null : (
        <StatePanel
            kind="empty"
            title={t('careeros.coach.pickTitle', 'Pick a conversation or start a new one')}
            description={t('careeros.coach.pickDescription', 'The coach keeps one thread per subject, so opening it from a goal, opportunity or application resumes the right one.')}
            action={{ label: t('careeros.coach.startNew', 'Start a conversation'), onClick: () => { void startNew(); } }}
        />
    );

    return (
        <div className="mx-auto flex h-[calc(100dvh-6.5rem)] w-full max-w-6xl flex-col lg:h-[calc(100dvh-9.5rem)] xl:h-[calc(100dvh-10.5rem)]">
            {/* On mobile the pushed-screen top bar already names the space; the thread needs the height. */}
            {!(isMobile && conversationId) && (
                <SpaceHeader
                    compact
                    eyebrow={t('careeros.shell.eyebrow', 'Career OS')}
                    title={t('careeros.space.coach', 'Coach')}
                    description={t('careeros.coach.description', 'One conversation per subject, grounded in your own records. Actions run through the same tools you use yourself.')}
                />
            )}
            {createError !== null && (
                <FailureNotice error={createError} className="mb-3" title={t('careeros.coach.createFailed', 'The conversation could not be created')} onRetry={() => { setCreateError(null); scopedFor.current = null; if (!hasAnyContext(hints)) void startNew(); }} onDismiss={() => setCreateError(null)} />
            )}
            {isMobile ? (
                <>
                    {conversationId || scoping ? thread : (
                        <div className="flex min-h-0 flex-1 flex-col">
                            {list}
                        </div>
                    )}
                    <BottomSheet isOpen={listOpen} onClose={() => setListOpen(false)} title={t('careeros.coach.conversations', 'Conversations')}>
                        <div className="max-h-[60vh] overflow-y-auto pb-safe">{list}</div>
                    </BottomSheet>
                </>
            ) : (
                <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
                    <aside className="min-h-0 rounded-2xl border border-border-default bg-surface-panel p-3">{list}</aside>
                    <section aria-label={t('careeros.coach.threadLabel', 'Conversation')} className="flex min-h-0 flex-col">{thread}</section>
                </div>
            )}
        </div>
    );
};

export default CoachSpace;
