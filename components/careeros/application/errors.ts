import type { FnError } from '../../../services/api';
import { ConflictError, NotFoundError } from '../../../services/careerOs/types';
import type { StatePanelKind } from '../primitives';

/**
 * One place that turns a thrown value into the state the screen should show
 * (REQ-30). A revision conflict is never an "error" to retry blindly: the
 * record changed elsewhere and the person has to reload before writing
 * again. Plan/entitlement refusals are "denied"; model, gate and provider
 * failures are "AI unavailable"; a lost connection is "offline".
 */
export type FailureKind = 'conflict' | 'not_found' | 'offline' | 'denied' | 'ai-unavailable' | 'error';

const AI_CODES = new Set([
    'feature_disabled', 'bad_ai_output', 'rate_limited', 'model_refused', 'cost_cap_exceeded', 'llm_unavailable', 'timeout',
    'run_in_progress', 'internal_error',
]);
const DENIED_CODES = new Set(['limit_reached', 'feature_locked', 'not_authorized', 'invalid_token', 'forbidden']);

const codeOf = (err: unknown): string => {
    const code = (err as FnError | undefined)?.code;
    return typeof code === 'string' ? code : '';
};

const statusOf = (err: unknown): number => {
    const status = (err as FnError | undefined)?.status;
    return typeof status === 'number' ? status : 0;
};

export function isOffline(): boolean {
    try {
        return typeof navigator !== 'undefined' && navigator.onLine === false;
    } catch {
        return false;
    }
}

export function classifyError(err: unknown): FailureKind {
    if (err instanceof ConflictError || codeOf(err) === 'conflict') return 'conflict';
    if (err instanceof NotFoundError || codeOf(err) === 'not_found') return 'not_found';
    if (isOffline()) return 'offline';
    if (err instanceof TypeError && /fetch|network/i.test(err.message)) return 'offline';
    const code = codeOf(err);
    if (DENIED_CODES.has(code)) return 'denied';
    if (AI_CODES.has(code) || statusOf(err) >= 500) return 'ai-unavailable';
    return 'error';
}

/** StatePanel kind for a failure; conflicts and not-found render as `error` with their own copy. */
export function panelKindFor(kind: FailureKind): StatePanelKind {
    switch (kind) {
        case 'offline': return 'offline';
        case 'denied': return 'denied';
        case 'ai-unavailable': return 'ai-unavailable';
        default: return 'error';
    }
}

/** The failure kind when the operation was an AI call: anything that is not plan/offline reads as AI unavailable. */
export function classifyAiError(err: unknown): FailureKind {
    const kind = classifyError(err);
    if (kind === 'error' || kind === 'not_found') return 'ai-unavailable';
    return kind;
}
