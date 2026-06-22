import { serviceClient } from './auth.ts';

/**
 * Insert a SAFE-metadata row into ai_logs (service_role). NEVER pass resume
 * content or AI output here — only function, model, prompt version, a token
 * estimate, and status. Failures are swallowed (logging must not break a call).
 */
export async function logAi(
  userId: string | null,
  meta: {
    function: string;
    model: string;
    promptVersion?: string;
    tokenEstimate?: number;
    status: 'ok' | 'error';
  },
): Promise<void> {
  try {
    await serviceClient().from('ai_logs').insert({
      user_id: userId,
      function: meta.function,
      model: meta.model,
      prompt_version: meta.promptVersion ?? 'v1',
      token_estimate: meta.tokenEstimate ?? null,
      status: meta.status,
    });
  } catch (e) {
    console.error('ai_logs insert failed (non-fatal):', e);
  }
}
