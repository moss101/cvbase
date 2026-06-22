import { GoogleGenAI } from 'npm:@google/genai';

const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') ?? '' });

export const TEXT_MODEL = 'gemini-2.5-flash';
export const IMAGE_MODEL = 'gemini-2.5-flash-image';

/** Anti-hallucination system instruction applied to every text generation. */
export const ANTI_HALLUCINATION =
  'You are an expert resume assistant. Use ONLY the information the user provides. ' +
  'For any metric, statistic, number, employer, or date the user did not supply, insert a ' +
  'clearly-marked placeholder like [X], [ADD METRIC], or [COMPANY] — never invent specific ' +
  'facts. Keep output truthful, concise, and ATS-friendly.';

/** Generate text (optionally JSON-schema-constrained). Returns the raw text. */
export async function geminiText(
  prompt: string,
  opts: { model?: string; schema?: unknown; system?: string } = {},
): Promise<string> {
  const res = await ai.models.generateContent({
    model: opts.model ?? TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: opts.system ?? ANTI_HALLUCINATION,
      ...(opts.schema ? { responseMimeType: 'application/json', responseSchema: opts.schema } : {}),
    },
  });
  return res.text ?? '';
}

/** Generate JSON and parse it. Throws if the model returns non-JSON. */
export async function geminiJson<T = unknown>(prompt: string, schema?: unknown, system?: string): Promise<T> {
  const text = await geminiText(prompt, { schema, system });
  return JSON.parse(text) as T;
}

/** Image-to-image (headshot). Returns base64 image data, or '' if none. */
export async function geminiImage(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  const res = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: 'user', parts: [{ inlineData: { data: imageBase64, mimeType } }, { text: prompt }] }],
    config: { responseModalities: ['IMAGE'] },
  });
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) if (p.inlineData?.data) return p.inlineData.data as string;
  return '';
}

/** Extract text from an inline document/image (e.g. an image-only PDF). */
export async function geminiFromFile(
  base64Data: string,
  mimeType: string,
  prompt: string,
  model: string = TEXT_MODEL,
): Promise<string> {
  const res = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] }],
  });
  return res.text ?? '';
}
