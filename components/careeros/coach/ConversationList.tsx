import React from 'react';
import { Archive, MessageCircle, Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CoachConversation } from '../../../services/careerOs/types';
import { Button, Pill, SkeletonCard, StatePanel } from '../primitives';
import { timeLabel } from './coachFormat';

/**
 * The conversation index: newest activity first, the current one marked
 * with aria-current, scoped conversations showing their context as chips.
 * On mobile this renders inside a sheet; on desktop it is the left column.
 */
export interface ConversationListProps {
    conversations: CoachConversation[] | null;
    error: unknown;
    loading: boolean;
    currentId: string | null;
    showArchived: boolean;
    onToggleArchived: () => void;
    onOpen: (id: string) => void;
    onNew: () => void;
    creating?: boolean;
    onRetry: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations, error, loading, currentId, showArchived, onToggleArchived, onOpen, onNew, creating = false, onRetry,
}) => {
    const { t } = useTranslation();
    return (
        <nav aria-label={t('careeros.coach.conversations', 'Conversations')} className="flex h-full min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-content-primary">{t('careeros.coach.conversations', 'Conversations')}</h2>
                <Button variant="primary" size="sm" icon={<Plus size={14} strokeWidth={2} />} loading={creating} onClick={onNew}>{t('careeros.coach.new', 'New')}</Button>
            </div>
            {error !== null ? (
                <StatePanel kind="error" compact onRetry={onRetry} />
            ) : loading && conversations === null ? (
                <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <SkeletonCard compact action={false} />
                    <SkeletonCard compact action={false} />
                </div>
            ) : !conversations || conversations.length === 0 ? (
                <StatePanel
                    kind="empty"
                    compact
                    title={showArchived ? t('careeros.coach.noArchived', 'No archived conversations') : t('careeros.coach.noConversations', 'No conversations yet')}
                    description={showArchived ? undefined : t('careeros.coach.noConversationsDescription', 'Start one here, or open the coach from a goal, opportunity or application to keep it in context.')}
                />
            ) : (
                <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {conversations.map((c) => {
                        const current = c.id === currentId;
                        const refs = (['application', 'opportunity', 'campaign', 'goal'] as const).filter((k) => c.contextRefs[k]);
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpen(c.id)}
                                    aria-current={current ? 'page' : undefined}
                                    className={`tap-target flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${current ? 'border-action-primary bg-action-primary/10' : 'border-border-default bg-surface-panel hover:bg-surface-canvas'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <MessageCircle size={14} strokeWidth={2} className="shrink-0 text-content-muted" aria-hidden="true" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-content-primary">{c.title || t('careeros.coach.untitled', 'Untitled conversation')}</span>
                                        {c.status === 'archived' && <Archive size={13} strokeWidth={2} className="shrink-0 text-content-muted" aria-label={t('careeros.coach.archived', 'Archived')} />}
                                    </span>
                                    <span className="flex flex-wrap items-center gap-1 text-[11px] text-content-muted">
                                        {c.lastMessageAt ? timeLabel(c.lastMessageAt) : t('careeros.coach.noMessagesYet', 'No messages yet')}
                                        {refs.map((k) => <Pill key={k} mono>{k}</Pill>)}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="mt-3 border-t border-border-default pt-2">
                <Button variant="quiet" size="sm" onClick={onToggleArchived} aria-pressed={showArchived}>
                    {showArchived ? t('careeros.coach.showActive', 'Show active') : t('careeros.coach.showArchived', 'Show archived')}
                </Button>
            </div>
        </nav>
    );
};

export default ConversationList;
