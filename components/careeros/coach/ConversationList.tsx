import React from 'react';
import { Archive, Plus } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { CoachConversation } from '../../../services/careerOs/types';
import { Button, Skeleton, StatePanel } from '../primitives';
import { timeLabel } from './coachFormat';

/**
 * The conversation index: newest activity first, the current one marked
 * with aria-current, scoped conversations naming their context in a muted
 * meta line. Rows are flat inside the column (no card-on-card); the current
 * one sits on the canvas step with a primary-weight title. On mobile this
 * renders inside a sheet or a panel; on desktop it is the left column.
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

/** A state inside the column is part of the column, not a second frame. */
const UNFRAMED = 'min-h-0 flex-1 !border-0 !bg-transparent !px-3 !py-3';

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations, error, loading, currentId, showArchived, onToggleArchived, onOpen, onNew, creating = false, onRetry,
}) => {
    const { t } = useTranslation();
    const kindLabel = {
        application: t('careeros.context.application', 'Application'),
        opportunity: t('careeros.context.opportunity', 'Opportunity'),
        campaign: t('careeros.context.campaign', 'Campaign'),
        goal: t('careeros.context.goal', 'Goal'),
    } as const;
    return (
        <nav aria-label={t('careeros.coach.conversations', 'Conversations')} className="flex h-full min-h-0 flex-col">
            <div className="mb-1 flex items-center justify-between gap-2 pl-3">
                <h2 className="text-[15px] font-semibold text-content-primary">{t('careeros.coach.conversations', 'Conversations')}</h2>
                <Button variant="secondary" size="sm" icon={<Plus size={14} strokeWidth={2} />} loading={creating} onClick={onNew}>{t('careeros.coach.new', 'New')}</Button>
            </div>
            {error !== null ? (
                <StatePanel kind="error" compact className={UNFRAMED} onRetry={onRetry} />
            ) : loading && conversations === null ? (
                <div className="min-h-0 flex-1 space-y-5 px-3 py-3" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <Skeleton variant="text" lines={2} width="85%" />
                    <Skeleton variant="text" lines={2} width="70%" />
                </div>
            ) : !conversations || conversations.length === 0 ? (
                <StatePanel
                    kind="empty"
                    compact
                    className={UNFRAMED}
                    title={showArchived ? t('careeros.coach.noArchived', 'No archived conversations') : t('careeros.coach.noConversations', 'No conversations yet')}
                    description={showArchived ? undefined : t('careeros.coach.noConversationsDescription', 'Start one here, or open the coach from a goal, opportunity or application to keep it in context.')}
                />
            ) : (
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto py-1">
                    {conversations.map((c) => {
                        const current = c.id === currentId;
                        const refs = (['application', 'opportunity', 'campaign', 'goal'] as const).filter((k) => c.contextRefs[k]);
                        const when = c.lastMessageAt ? timeLabel(c.lastMessageAt) : t('careeros.coach.noMessagesYet', 'No messages yet');
                        return (
                            <li key={c.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpen(c.id)}
                                    aria-current={current ? 'page' : undefined}
                                    className={`group tap-target flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${current ? 'bg-surface-canvas' : 'hover:bg-surface-canvas'}`}
                                >
                                    <span className="flex w-full items-center gap-2">
                                        <span className={`min-w-0 flex-1 truncate text-[13.5px] ${current ? 'font-semibold text-content-primary' : 'font-medium text-content-secondary group-hover:text-content-primary'}`}>
                                            {c.title || t('careeros.coach.untitled', 'Untitled conversation')}
                                        </span>
                                        {c.status === 'archived' && <Archive size={13} strokeWidth={2} className="shrink-0 text-content-muted" aria-label={t('careeros.coach.archived', 'Archived')} />}
                                    </span>
                                    <span className="text-[12px] leading-snug text-content-muted cos-num">
                                        {[when, ...refs.map((k) => kindLabel[k])].join(' · ')}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="mt-1 border-t border-border-default pt-1.5">
                <Button variant="quiet" size="sm" onClick={onToggleArchived} aria-pressed={showArchived}>
                    {showArchived ? t('careeros.coach.showActive', 'Show active') : t('careeros.coach.showArchived', 'Show archived')}
                </Button>
            </div>
        </nav>
    );
};

export default ConversationList;
