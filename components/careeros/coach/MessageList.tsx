import React from 'react';
import { CircleHelp, Link2, User, Sparkles, Terminal, Info } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useNavigation } from '../../NavigationProvider';
import type { ToolName } from '../../../services/careerOs/gateway';
import type { ActionRun, CoachCitation, CoachConversation, CoachMessage } from '../../../services/careerOs/types';
import { Button, Skeleton } from '../primitives';
import AgentSuggestion from './AgentSuggestion';
import { citationRoute, timeLabel } from './coachFormat';

/**
 * The thread: user, assistant, tool and system messages with their time,
 * citation chips that open the cited record, abstentions marked honestly
 * with the stored reason, and proposals rendered as AgentSuggestion cards.
 * Multi-select mode adds a checkbox per message for selective deletion.
 */
export interface MessageListProps {
    conversation: CoachConversation;
    messages: CoachMessage[];
    /** A message being sent (optimistic) — rendered at the end without an id. */
    pending?: { content: string } | null;
    thinking?: boolean;
    hasEarlier?: boolean;
    loadingEarlier?: boolean;
    onLoadEarlier?: () => void;
    selectMode?: boolean;
    selected?: ReadonlySet<string>;
    onToggleSelect?: (id: string) => void;
    onExecuted: (run: ActionRun, tool: ToolName, messageId: string) => void;
    /** Reason stored beside the last abstained reply, when the server returned one. */
    abstainReasons?: Record<string, string | null>;
}

const ROLE_ICON: Record<CoachMessage['role'], React.ReactNode> = {
    user: <User size={14} strokeWidth={2} aria-hidden="true" />,
    assistant: <Sparkles size={14} strokeWidth={2} aria-hidden="true" />,
    tool: <Terminal size={14} strokeWidth={2} aria-hidden="true" />,
    system: <Info size={14} strokeWidth={2} aria-hidden="true" />,
};

export const CitationChips: React.FC<{ citations: CoachCitation[]; applicationId: string | null }> = ({ citations, applicationId }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    if (citations.length === 0) return null;
    return (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('careeros.coach.citations', 'Records cited')}>
            {citations.map((c, index) => {
                const route = citationRoute(c, applicationId);
                const text = c.label || `${c.kind} ${c.id.slice(0, 8)}`;
                const inner = (
                    <>
                        <Link2 size={11} strokeWidth={2} aria-hidden="true" />
                        <span className="font-label text-[10px] uppercase tracking-[0.08em] text-content-muted">{c.kind}</span>
                        <span className="truncate">{text}</span>
                    </>
                );
                return (
                    <li key={`${c.kind}:${c.id}:${index}`} className="max-w-full">
                        {route ? (
                            <button
                                type="button"
                                onClick={() => navigate(route)}
                                className="tap-target inline-flex max-w-full items-center gap-1 rounded-full border border-border-default bg-surface-canvas px-2 py-1 text-[12px] text-content-primary transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                                aria-label={t('careeros.coach.openCitation', 'Open cited {kind}: {label}').replace('{kind}', c.kind).replace('{label}', text)}
                            >
                                {inner}
                            </button>
                        ) : (
                            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-default bg-surface-canvas px-2 py-1 text-[12px] text-content-secondary">{inner}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};

const Bubble: React.FC<{ role: CoachMessage['role']; roleLabel: string; time: string; children: React.ReactNode; checkbox?: React.ReactNode; abstained?: boolean }> = ({ role, roleLabel, time, children, checkbox, abstained }) => {
    const mine = role === 'user';
    return (
        <li className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
            {checkbox && <div className="flex items-start pt-2">{checkbox}</div>}
            <article
                aria-label={roleLabel}
                className={`max-w-[92%] rounded-2xl border px-3 py-2 sm:max-w-[80%] ${
                    mine ? 'border-action-primary/20 bg-action-primary/10' : role === 'system' ? 'border-border-default bg-surface-canvas' : abstained ? 'border-status-warning/30 bg-status-warning/10' : 'border-border-default bg-surface-panel'
                }`}
            >
                <header className="flex items-center gap-2 text-[11px] text-content-muted">
                    <span className="inline-flex items-center gap-1 font-label uppercase tracking-[0.08em]">{ROLE_ICON[role]}{roleLabel}</span>
                    {time && <time className="ml-auto">{time}</time>}
                </header>
                <div className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-content-primary">{children}</div>
            </article>
        </li>
    );
};

export const MessageList: React.FC<MessageListProps> = ({
    conversation, messages, pending, thinking = false, hasEarlier = false, loadingEarlier = false, onLoadEarlier,
    selectMode = false, selected, onToggleSelect, onExecuted, abstainReasons = {},
}) => {
    const { t } = useTranslation();
    const roleLabel: Record<CoachMessage['role'], string> = {
        user: t('careeros.coach.role.you', 'You'),
        assistant: t('careeros.coach.role.coach', 'Coach'),
        tool: t('careeros.coach.role.tool', 'Tool'),
        system: t('careeros.coach.role.system', 'System'),
    };
    const applicationId = conversation.contextRefs.application?.id ?? null;

    return (
        <div>
            {hasEarlier && (
                <div className="mb-3 flex justify-center">
                    <Button variant="quiet" size="sm" loading={loadingEarlier} onClick={onLoadEarlier}>{t('careeros.coach.loadEarlier', 'Load earlier messages')}</Button>
                </div>
            )}
            <ol className="space-y-3" aria-label={t('careeros.coach.messages', 'Messages')}>
                {messages.map((m) => {
                    const checkbox = selectMode && onToggleSelect ? (
                        <input
                            type="checkbox"
                            className="tap-target h-5 w-5 accent-action-primary"
                            checked={selected?.has(m.id) ?? false}
                            onChange={() => onToggleSelect(m.id)}
                            aria-label={t('careeros.coach.selectMessage', 'Select message from {role} at {time}').replace('{role}', roleLabel[m.role]).replace('{time}', timeLabel(m.createdAt))}
                        />
                    ) : undefined;
                    return (
                        <Bubble key={m.id} role={m.role} roleLabel={roleLabel[m.role]} time={timeLabel(m.createdAt)} checkbox={checkbox} abstained={m.abstained}>
                            {m.abstained && (
                                <p className="mb-1 flex items-start gap-1.5 text-[13px] font-semibold text-status-warning" role="status">
                                    <CircleHelp size={14} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                                    <span>
                                        {t('careeros.coach.abstained', "The coach didn't have enough evidence to answer this")}
                                        {abstainReasons[m.id] ? ` — ${abstainReasons[m.id]}` : ''}
                                    </span>
                                </p>
                            )}
                            {m.content}
                            <CitationChips citations={m.citations} applicationId={applicationId} />
                            {m.proposals.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {m.proposals.map((p, index) => (
                                        <AgentSuggestion
                                            key={`${m.id}:${index}`}
                                            proposal={p}
                                            messageId={m.id}
                                            index={index}
                                            conversationId={conversation.id}
                                            onExecuted={(run, tool) => onExecuted(run, tool, m.id)}
                                            disabled={selectMode}
                                        />
                                    ))}
                                </div>
                            )}
                        </Bubble>
                    );
                })}
                {pending && (
                    <Bubble role="user" roleLabel={roleLabel.user} time={t('careeros.coach.sending', 'Sending…')}>{pending.content}</Bubble>
                )}
                {thinking && (
                    <li className="flex justify-start" role="status" aria-live="polite">
                        <div className="max-w-[80%] rounded-2xl border border-border-default bg-surface-panel px-3 py-2">
                            <p className="text-[13px] text-content-secondary">{t('careeros.coach.thinking', 'Coach is thinking…')}</p>
                            <Skeleton variant="text" lines={2} className="mt-2 w-56 max-w-full" />
                        </div>
                    </li>
                )}
            </ol>
        </div>
    );
};

export default MessageList;
