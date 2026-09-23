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
    const chip = 'inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-border-default bg-surface-canvas px-2.5 text-[12px] transition-colors duration-150';
    return (
        <ul className="mt-1 flex flex-wrap gap-x-1.5" aria-label={t('careeros.coach.citations', 'Records cited')}>
            {citations.map((c, index) => {
                const route = citationRoute(c, applicationId);
                const text = c.label || `${c.kind} ${c.id.slice(0, 8)}`;
                const inner = (
                    <>
                        <Link2 size={11} strokeWidth={2} className="shrink-0 text-content-muted" aria-hidden="true" />
                        <span className="text-[12px] text-content-muted">{c.kind}</span>
                        <span className="truncate">{text}</span>
                    </>
                );
                return (
                    <li key={`${c.kind}:${c.id}:${index}`} className="max-w-full">
                        {route ? (
                            <button
                                type="button"
                                onClick={() => navigate(route)}
                                className="group tap-target inline-flex max-w-full items-center focus-visible:outline-none"
                                aria-label={t('careeros.coach.openCitation', 'Open cited {kind}: {label}').replace('{kind}', c.kind).replace('{label}', text)}
                            >
                                <span className={`${chip} font-medium text-content-primary group-hover:border-border-strong group-focus-visible:ring-2 group-focus-visible:ring-focus-ring`}>{inner}</span>
                            </button>
                        ) : (
                            <span className={`${chip} my-2 text-content-secondary`}>{inner}</span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
};

const Bubble: React.FC<{ role: CoachMessage['role']; roleLabel: string; time: string; children: React.ReactNode; checkbox?: React.ReactNode; abstained?: boolean }> = ({ role, roleLabel, time, children, checkbox }) => {
    const mine = role === 'user';
    if (role === 'system') {
        // A system entry records an event in the thread (a context change), so
        // it reads as a quiet centred line rather than a speaker's bubble.
        return (
            <li className="flex items-start justify-center gap-2">
                {checkbox && <div className="flex items-start">{checkbox}</div>}
                <article aria-label={roleLabel} className="flex min-w-0 max-w-[92%] items-start gap-1.5 py-1 text-[12.5px] leading-relaxed text-content-muted sm:max-w-[80%]">
                    <span className="mt-[3px] shrink-0">{ROLE_ICON.system}</span>
                    <div className="min-w-0 whitespace-pre-wrap break-words text-content-secondary">{children}</div>
                    {time && <time className="shrink-0 cos-num">{time}</time>}
                </article>
            </li>
        );
    }
    return (
        <li className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
            {checkbox && <div className="flex items-start pt-2">{checkbox}</div>}
            <article
                aria-label={roleLabel}
                className={`max-w-[92%] rounded-2xl border px-3.5 py-2.5 sm:max-w-[80%] ${
                    mine ? 'border-action-primary/20 bg-action-primary/10' : 'border-border-default bg-surface-panel'
                }`}
            >
                <header className="flex items-center gap-2 text-[12px] text-content-muted">
                    <span className="inline-flex items-center gap-1 font-medium">{ROLE_ICON[role]}{roleLabel}</span>
                    {time && <time className="ml-auto cos-num">{time}</time>}
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
                                <p className="mb-1.5 flex items-start gap-1.5 text-[13px] font-medium text-content-secondary" role="status">
                                    <CircleHelp size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-status-warning" aria-hidden="true" />
                                    <span>
                                        {t('careeros.coach.abstained', "The coach didn't have enough evidence to answer this")}
                                        {abstainReasons[m.id] ? ` — ${abstainReasons[m.id]}` : ''}
                                    </span>
                                </p>
                            )}
                            {m.content}
                            <CitationChips citations={m.citations} applicationId={applicationId} />
                            {m.proposals.length > 0 && (
                                <div className="mt-3 space-y-3 whitespace-normal">
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
                        <div className="max-w-[80%] rounded-2xl border border-border-default bg-surface-panel px-3.5 py-2.5">
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
