import { serviceClient } from '../auth.ts';
import type { ProviderId } from './types.ts';

/**
 * Fire-and-forget insert into llm_call_logs — a global operational signal
 * (how often fallback fires, which provider is actually serving traffic),
 * not a per-request audit trail. Deliberately has no user_id/function
 * column: this shared module has no caller/user context, and threading one
 * in would mean adding an argument to every llmJson/llmText call site, which
 * the "don't rewrite call sites" migration goal rules out. Per-request/user
 * attribution is what ai_logs and the enriched prism_agent_logs already
 * give. Errors are swallowed exactly like logAi/onAgent already do —
 * logging must never break a call.
 */
export async function logLlmCall(meta: {
  provider: ProviderId;
  model: string;
  keySlot?: number;
  usedFallback: boolean;
  fallbackReason?: string;
  tokens: number;
  status: 'ok' | 'error';
  latencyMs: number;
}): Promise<void> {
  try {
    await serviceClient().from('llm_call_logs').insert({
      provider: meta.provider,
      model: meta.model,
      key_slot: meta.keySlot ?? null,
      used_fallback: meta.usedFallback,
      fallback_reason: meta.fallbackReason ?? null,
      tokens: meta.tokens,
      status: meta.status,
      latency_ms: meta.latencyMs,
    });
  } catch (e) {
    console.error('llm_call_logs insert failed (non-fatal):', e);
  }
}
