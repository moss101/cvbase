import { serviceClient } from './auth.ts';

export interface AiLogMeta {
  function: string;
  model: string;
  promptVersion?: string;
  /** Provider-reported prompt+completion tokens when the router exposes them
   *  (llmJsonMetered / routedCall), else a chars/4 estimate. */
  tokenEstimate?: number;
  status: 'ok' | 'error';
  /** Correlates with the `x-request-id` response header / structured logs. */
  requestId?: string;
  /** Wall-clock duration of the whole request. */
  latencyMs?: number;
}

/**
 * Insert a SAFE-metadata row into ai_logs (service_role). NEVER pass resume
 * content or AI output here — only function, model, prompt version, a token
 * estimate, status, request id and latency. Failures are swallowed (logging
 * must not break a call).
 */
export async function logAi(userId: string | null, meta: AiLogMeta): Promise<void> {
  const base = {
    user_id: userId,
    function: meta.function,
    model: meta.model,
    prompt_version: meta.promptVersion ?? 'v1',
    token_estimate: meta.tokenEstimate == null ? null : Math.max(0, Math.round(meta.tokenEstimate)),
    status: meta.status,
  };
  const extra = {
    request_id: meta.requestId ?? null,
    latency_ms: meta.latencyMs == null ? null : Math.max(0, Math.round(meta.latencyMs)),
  };
  try {
    const svc = serviceClient();
    const { error } = await svc.from('ai_logs').insert({ ...base, ...extra });
    if (!error) return;
    // request_id/latency_ms arrive with 20260901500200; until that migration
    // is applied PostgREST rejects the unknown columns — fall back to the
    // original row shape rather than losing the log line.
    if (/request_id|latency_ms|column/i.test(error.message ?? '')) {
      const retry = await svc.from('ai_logs').insert(base);
      if (retry.error) console.error('ai_logs insert failed (non-fatal):', retry.error.message);
      return;
    }
    console.error('ai_logs insert failed (non-fatal):', error.message);
  } catch (e) {
    console.error('ai_logs insert failed (non-fatal):', e);
  }
}
