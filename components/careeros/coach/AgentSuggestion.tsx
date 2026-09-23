import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Ban, CheckCircle2, LoaderCircle, ShieldAlert, Wand2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useNavigation } from '../../NavigationProvider';
import {
    cancelRun, confirmTool, isGatewayError, newIdempotencyKey, runTool, type ToolInputs, type ToolName, type ToolResults,
} from '../../../services/careerOs/gateway';
import type { ConfirmationRequired, GatewayResponse } from '../../../services/careerOs/gatewayMappers';
import type { ActionRun, CoachProposal } from '../../../services/careerOs/types';
import Dialog from '../../common/Dialog';
import { Button, Pill, StatePanel, StatusChip } from '../primitives';
import { isDone, isExplainOnly, isToolName, resultRoute, toolLabel } from './coachFormat';
import ToolResultView from './ToolResultView';

/**
 * AgentSuggestion: one registered-tool proposal from the coach, executed
 * through the action gateway with a client-minted idempotency key (REQ-21,
 * REQ-08). Read-only explanations run at once and render inline. Material
 * tools that answer `confirmationRequired` open a confirmation bound to the
 * exact summary, destination and content hash the server returned; an
 * edited proposal is a different hash and is rejected. "Done" appears only
 * when the receipt is `completed` with a persisted result reference, and
 * the receipt links to the owned result. Failures show the failure code with
 * Retry when the receipt says it is retryable; Cancel stops future steps.
 */
export interface AgentSuggestionProps {
    proposal: CoachProposal;
    /** Message and index make the idempotency key stable across a reload. */
    messageId: string;
    index: number;
    conversationId: string;
    /** Emits coach_action_executed and invalidates caches; called once per completed receipt. */
    onExecuted: (run: ActionRun, tool: ToolName) => void;
    disabled?: boolean;
}

type Phase =
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'confirming'; run: ActionRun; confirmation: ConfirmationRequired }
    | { kind: 'in_progress'; run: ActionRun }
    | { kind: 'completed'; run: ActionRun; result?: ToolResults[ToolName] }
    | { kind: 'failed'; run: ActionRun | null; code: string; retryable: boolean }
    | { kind: 'cancelled'; run: ActionRun };

const keyStorage = (messageId: string, index: number): string => `cvbase-coach-idem:${messageId}:${index}`;

/** One idempotency key per proposal, persisted for the session so a retry after a reload replays the same receipt. */
function loadOrMintKey(messageId: string, index: number): string {
    const storageKey = keyStorage(messageId, index);
    try {
        const existing = sessionStorage.getItem(storageKey);
        if (existing) return existing;
    } catch { /* storage unavailable */ }
    const minted = newIdempotencyKey('coach');
    try { sessionStorage.setItem(storageKey, minted); } catch { /* storage unavailable */ }
    return minted;
}

const shortHash = (hash: string): string => (hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash);

export const AgentSuggestion: React.FC<AgentSuggestionProps> = ({ proposal, messageId, index, onExecuted, disabled = false }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
    const keyRef = useRef<string | null>(null);
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    const tool = proposal.tool;
    const registered = isToolName(tool);
    const explainOnly = isExplainOnly(tool);
    const key = () => {
        if (!keyRef.current) keyRef.current = loadOrMintKey(messageId, index);
        return keyRef.current;
    };

    const settle = useCallback((res: GatewayResponse<ToolResults[ToolName]>, toolName: ToolName) => {
        if (!mounted.current) return;
        if (res.confirmationRequired) {
            setPhase({ kind: 'confirming', run: res.run, confirmation: res.confirmationRequired });
            return;
        }
        if (res.run.status === 'completed') {
            setPhase({ kind: 'completed', run: res.run, result: res.result });
            onExecuted(res.run, toolName);
            return;
        }
        if (res.run.status === 'failed') {
            setPhase({ kind: 'failed', run: res.run, code: res.run.failureCode ?? 'failed', retryable: res.run.retryable });
            return;
        }
        if (res.run.status === 'cancelled') {
            setPhase({ kind: 'cancelled', run: res.run });
            return;
        }
        setPhase({ kind: 'in_progress', run: res.run });
    }, [onExecuted]);

    const fail = useCallback((err: unknown) => {
        if (!mounted.current) return;
        if (isGatewayError(err)) {
            setPhase({ kind: 'failed', run: err.run, code: err.code, retryable: err.retryable });
            return;
        }
        setPhase({ kind: 'failed', run: null, code: 'network_error', retryable: true });
    }, []);

    const run = useCallback(async () => {
        if (!registered) return;
        setPhase({ kind: 'running' });
        try {
            const res = await runTool(tool as ToolName, proposal.input as ToolInputs[ToolName], { idempotencyKey: key() });
            settle(res, tool as ToolName);
        } catch (err) {
            fail(err);
        }
    }, [registered, tool, proposal.input, settle, fail]);

    const confirm = useCallback(async (confirmation: ConfirmationRequired) => {
        if (!registered) return;
        setPhase({ kind: 'running' });
        try {
            const res = await confirmTool(tool as ToolName, proposal.input as ToolInputs[ToolName], { token: confirmation.token, contentHash: confirmation.contentHash }, { idempotencyKey: key() });
            settle(res, tool as ToolName);
        } catch (err) {
            fail(err);
        }
    }, [registered, tool, proposal.input, settle, fail]);

    const cancel = useCallback(async (current: ActionRun) => {
        setPhase({ kind: 'running' });
        try {
            const cancelled = await cancelRun(current.id);
            if (mounted.current) setPhase({ kind: 'cancelled', run: cancelled });
        } catch (err) {
            fail(err);
        }
    }, [fail]);

    const label = toolLabel(t, tool);
    const busy = phase.kind === 'running';
    const failureCopy = (code: string): string => {
        switch (code) {
            case 'confirmation_mismatch': return t('careeros.coach.run.mismatch', 'The proposal changed after it was confirmed. Ask the coach to propose it again.');
            case 'confirmation_expired': return t('careeros.coach.run.expired', 'The confirmation expired. Run it again to get a fresh one.');
            case 'limit_reached': return t('careeros.coach.run.limit', 'Your plan has no remaining actions for this.');
            case 'stale_context': return t('careeros.coach.run.stale', 'The records changed since the coach looked at them. Refresh and ask again.');
            case 'llm_unavailable': return t('careeros.state.aiUnavailable.title', 'AI assistance is unavailable');
            case 'network_error': return t('careeros.coach.run.network', 'The request did not reach CVBase. Nothing was run.');
            default: return t('careeros.coach.run.failedWithCode', 'The action failed ({code}).').replace('{code}', code);
        }
    };

    return (
        <article aria-label={t('careeros.coach.suggestion.label', 'Suggested action: {tool}').replace('{tool}', label)} className="rounded-2xl border border-action-primary/30 bg-surface-panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-1 text-[12px] font-medium text-content-muted">
                    <Wand2 size={12} strokeWidth={2} aria-hidden="true" />
                    {t('careeros.coach.suggestion.eyebrow', 'Suggested action')}
                </p>
                <Pill mono>{label}</Pill>
                {proposal.confirmationRequired && phase.kind === 'idle' && <Pill tone="warning">{t('careeros.coach.suggestion.needsConfirmation', 'Needs your confirmation')}</Pill>}
                {explainOnly && <Pill tone="info">{t('careeros.coach.suggestion.readOnly', 'Read-only')}</Pill>}
            </div>
            <p className="mt-2 text-sm text-content-primary">{proposal.summary || label}</p>

            {!registered && (
                <StatePanel kind="denied" compact className="mt-3" title={t('careeros.coach.suggestion.unregistered', 'This tool is not registered')} description={t('careeros.coach.suggestion.unregisteredDescription', 'Only registered tools can run. Nothing was executed.')} />
            )}

            {phase.kind === 'completed' && (
                <div className="mt-3 rounded-xl border border-status-success/30 bg-status-success/10 p-3" role="status" aria-live="polite">
                    <div className="flex flex-wrap items-center gap-2">
                        <CheckCircle2 size={16} strokeWidth={2} className="text-status-success" aria-hidden="true" />
                        <span className="text-sm font-semibold text-content-primary">
                            {isDone(phase.run) ? t('careeros.coach.run.done', 'Done') : t('careeros.coach.run.completedNoResult', 'Completed')}
                        </span>
                        <StatusChip label={phase.run.status} tone="success" />
                        {phase.run.usage.charged && <Pill tone="neutral">{t('careeros.coach.run.charged', '1 AI action used')}</Pill>}
                    </div>
                    {explainOnly && phase.result !== undefined && (
                        <div className="mt-3"><ToolResultView tool={tool as ToolName} result={phase.result} /></div>
                    )}
                    {!explainOnly && (() => {
                        const route = resultRoute(tool as ToolName, phase.result, phase.run);
                        return route ? (
                            <Button variant="secondary" size="sm" className="mt-3" trailingIcon={<ArrowRight size={14} strokeWidth={2} />} onClick={() => navigate(route)}>
                                {t('careeros.coach.run.openResult', 'Open result')}
                            </Button>
                        ) : null;
                    })()}
                </div>
            )}

            {phase.kind === 'in_progress' && (
                <div className="mt-3 rounded-xl border border-status-info/30 bg-status-info/10 p-3" role="status" aria-live="polite">
                    <div className="flex flex-wrap items-center gap-2">
                        <LoaderCircle size={16} strokeWidth={2} className="animate-spin text-status-info motion-reduce:animate-none" aria-hidden="true" />
                        <span className="text-sm font-semibold text-content-primary">{t('careeros.coach.run.inProgress', 'Started — finish it in its workflow')}</span>
                        <StatusChip label={phase.run.status} tone="info" />
                    </div>
                    <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.coach.run.inProgressDescription', 'The receipt is recorded. It completes when the destination workflow saves its result; this card will not say “Done” before then.')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {(() => {
                            const route = resultRoute(tool as ToolName, undefined, phase.run);
                            return route ? <Button variant="primary" size="sm" trailingIcon={<ArrowRight size={14} strokeWidth={2} />} onClick={() => navigate(route)}>{t('careeros.coach.run.continue', 'Continue there')}</Button> : null;
                        })()}
                        <Button variant="quiet" size="sm" icon={<Ban size={14} strokeWidth={2} />} onClick={() => { void cancel(phase.run); }}>{t('btn.cancel', 'Cancel')}</Button>
                    </div>
                </div>
            )}

            {phase.kind === 'cancelled' && (
                <p className="mt-3 text-[13px] text-content-secondary" role="status">
                    {t('careeros.coach.run.cancelled', 'Cancelled. Steps that already completed stay visible in their workflow.')}
                </p>
            )}

            {phase.kind === 'failed' && (
                <div className="mt-3" role="alert">
                    <StatePanel
                        kind={phase.code === 'limit_reached' ? 'denied' : phase.code === 'llm_unavailable' ? 'ai-unavailable' : 'error'}
                        compact
                        title={failureCopy(phase.code)}
                        description={phase.run ? t('careeros.coach.run.receiptId', 'Receipt {id} · {status}').replace('{id}', phase.run.id.slice(0, 8)).replace('{status}', phase.run.status) : undefined}
                        action={phase.code === 'limit_reached' ? { label: t('careeros.coach.upgrade', 'See plans'), onClick: () => navigate({ view: 'pricing' }) } : undefined}
                        onRetry={phase.retryable && phase.code !== 'limit_reached' ? () => { void run(); } : undefined}
                    />
                </div>
            )}

            {(phase.kind === 'idle' || phase.kind === 'running') && registered && (
                <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        loading={busy}
                        disabled={disabled}
                        onClick={() => { void run(); }}
                    >
                        {explainOnly ? t('careeros.coach.run.explain', 'Show') : t('careeros.coach.run.run', 'Run')}
                    </Button>
                </div>
            )}

            {phase.kind === 'confirming' && (
                <Dialog
                    open
                    onClose={() => setPhase({ kind: 'idle' })}
                    title={<><ShieldAlert className="h-[1em] w-[1em] text-status-warning" aria-hidden="true" />{t('careeros.coach.confirm.title', 'Confirm this action')}</>}
                    panelClassName="max-w-lg"
                >
                    <p className="text-sm text-content-primary">{phase.confirmation.summary || proposal.summary}</p>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                        <dt className="text-[12px] font-medium text-content-muted">{t('careeros.coach.confirm.tool', 'Tool')}</dt>
                        <dd className="text-content-primary">{label}</dd>
                        {phase.confirmation.destination && (
                            <>
                                <dt className="text-[12px] font-medium text-content-muted">{t('careeros.coach.confirm.destination', 'Destination')}</dt>
                                <dd className="break-words text-content-primary">{phase.confirmation.destination}</dd>
                            </>
                        )}
                        <dt className="text-[12px] font-medium text-content-muted">{t('careeros.coach.confirm.policy', 'Policy')}</dt>
                        <dd className="text-content-primary">{phase.confirmation.policy === 'explicit' ? t('careeros.coach.confirm.explicit', 'Explicit confirmation (external or destructive)') : t('careeros.coach.confirm.diff', 'Review of a material change')}</dd>
                        <dt className="text-[12px] font-medium text-content-muted">{t('careeros.coach.confirm.contentHash', 'Content hash')}</dt>
                        <dd className="font-mono text-xs text-content-secondary" title={phase.confirmation.contentHash}>{shortHash(phase.confirmation.contentHash)}</dd>
                        {phase.confirmation.expiresAt && (
                            <>
                                <dt className="text-[12px] font-medium text-content-muted">{t('careeros.coach.confirm.expires', 'Valid until')}</dt>
                                <dd className="text-content-secondary">{new Date(phase.confirmation.expiresAt).toLocaleString()}</dd>
                            </>
                        )}
                    </dl>
                    <p className="mt-3 text-xs text-content-secondary">{t('careeros.coach.confirm.bound', 'Your confirmation is tied to exactly this content and destination. If the proposal changes, it must be confirmed again.')}</p>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button variant="secondary" onClick={() => setPhase({ kind: 'idle' })}>{t('btn.cancel', 'Cancel')}</Button>
                        <Button variant="primary" onClick={() => { void confirm(phase.confirmation); }}>{t('careeros.coach.confirm.confirm', 'Confirm and run')}</Button>
                    </div>
                </Dialog>
            )}
        </article>
    );
};

export default AgentSuggestion;
