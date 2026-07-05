import { GoogleGenAI } from 'npm:@google/genai';

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

/** Image-to-image (headshot). Returns base64 image data, or '' if none. */
export async function geminiImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await withRetry(() =>
    ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: prompt }] }],
      config: { responseModalities: ['IMAGE'] },
    }),
  );
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
  const res = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] }],
    }),
  );
  return res.text ?? '';
}
