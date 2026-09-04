import { GoogleGenAI } from 'npm:@google/genai';
import { logLlmCall } from './llm/callLog.ts';
import { estimateCostUsd } from './llm/config.ts';

const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') ?? '' });

export const IMAGE_MODEL = 'gemini-2.5-flash-image';
/** Only remaining text-capable model in this file — used solely for PDF/
 *  image-only-document text extraction (ai-parse-pdf), a vision/file-input
 *  capability DeepSeek/Kimi's text-only chat APIs don't confirm supporting.
 *  All other text generation now goes through _shared/llm.ts. */
const PDF_EXTRACT_MODEL = 'gemini-2.5-flash';

/** Retry transient Gemini errors (503 high-demand, 429 rate limit) with backoff. */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String((e as { message?: string })?.message ?? e);
      const transient = /\b(503|429)\b|UNAVAILABLE|high demand|RESOURCE_EXHAUSTED|overloaded/i.test(msg);
      if (!transient || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

/** The subset of `GenerateContentResponse.usageMetadata` we meter. */
interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
}

/**
 * Gemini bypasses the router, so its spend would otherwise be invisible in
 * `llm_call_logs`. This writes the same row shape the router does (provider
 * `gemini`, split token counts, estimated cost from the shared price table)
 * — fire-and-forget, never affecting the call. Runs `fn` and meters it
 * whether it succeeds or throws.
 */
async function metered<T extends { usageMetadata?: GeminiUsage }>(model: string, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const res = await fn();
    const promptTokens = res.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = res.usageMetadata?.candidatesTokenCount ?? 0;
    void logLlmCall({
      provider: 'gemini', model, usedFallback: false,
      tokens: promptTokens + completionTokens, promptTokens, completionTokens,
      costUsd: estimateCostUsd(model, promptTokens, completionTokens),
      status: 'ok', latencyMs: Date.now() - started,
    });
    return res;
  } catch (e) {
    void logLlmCall({
      provider: 'gemini', model, usedFallback: false, tokens: 0,
      status: 'error', latencyMs: Date.now() - started,
    });
    throw e;
  }
}

/** Image-to-image (headshot). Returns base64 image data, or '' if none. */
export async function geminiImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await metered(IMAGE_MODEL, () => withRetry(() =>
    ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: prompt }] }],
      config: { responseModalities: ['IMAGE'] },
    }),
  ));
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) if (p.inlineData?.data) return p.inlineData.data as string;
  return '';
}

/** Extract text from an inline document/image (e.g. an image-only PDF). */
export async function geminiFromFile(
  base64Data: string,
  mimeType: string,
  prompt: string,
  model: string = PDF_EXTRACT_MODEL,
): Promise<string> {
  const res = await metered(model, () => withRetry(() =>
    ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] }],
    }),
  ));
  return res.text ?? '';
}
