import { z } from 'npm:zod@3.24.1';
import { HttpError } from './respond.ts';

/** Default request-body cap for JSON AI calls (resume JSON + a job description
 *  comfortably fits; only the file-carrying functions raise it). */
export const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MiB

/**
 * Read and parse a JSON request body with a hard byte cap.
 *
 * - `Content-Length` above the cap → 413 `payload_too_large` before reading.
 * - The stream is consumed incrementally and aborted the moment the running
 *   total passes the cap (a missing/forged Content-Length can't bypass it).
 * - Empty body → `{}` (parity with the old `req.json().catch(() => ({}))`);
 *   malformed JSON → 400 `invalid_json`.
 */
export async function readJsonBody(req: Request, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, 'payload_too_large', { maxBytes });
  }
  if (!req.body) return {};

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new HttpError(413, 'payload_too_large', { maxBytes });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  if (total === 0) return {};

  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  const text = new TextDecoder().decode(buf);
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

/** Decoded byte length of a base64 string without decoding it (used to cap
 *  uploaded files by their real size rather than the ~4/3 larger wire size).
 *  Tolerates a `data:...;base64,` prefix and whitespace. */
export function base64DecodedBytes(b64: string): number {
  const comma = b64.indexOf(',');
  const raw = (b64.startsWith('data:') && comma > 0 ? b64.slice(comma + 1) : b64).replace(/\s+/g, '');
  if (raw.length === 0) return 0;
  const padding = raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0;
  return Math.floor((raw.length * 3) / 4) - padding;
}

/** Loose base64 syntax check (standard or URL-safe alphabet, optional padding). */
export function looksLikeBase64(b64: string): boolean {
  const comma = b64.indexOf(',');
  const raw = (b64.startsWith('data:') && comma > 0 ? b64.slice(comma + 1) : b64).replace(/\s+/g, '');
  return raw.length > 0 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(raw);
}

// -------------------------------------------------------------------------
// Field-level caps shared by the AI functions' zod schemas. Everything here is
// VALIDATED (400 `invalid_request`), never silently sliced, so a client that
// sends too much learns about it instead of getting advice on half a resume.
// -------------------------------------------------------------------------
export const CAPS = {
  /** Serialised `resumeData` JSON going into a prompt. */
  resumeDataChars: 12_000,
  /** Free-form user text (cover letter, About, context, currentValue). */
  freeTextChars: 20_000,
  /** Job description text. */
  jobDescriptionChars: 15_000,
  /** Legacy raw `prompt` accepted by ai-suggest 'suggestion' as context data. */
  legacyPromptChars: 4_000,
  /** ai-headshot source image, decoded bytes. */
  headshotBytes: 8 * 1024 * 1024,
  /** ai-parse-pdf source document, decoded bytes. */
  pdfBytes: 10 * 1024 * 1024,
} as const;

/** Serialised size of a JSON value in characters (what a prompt would carry). */
export function serializedChars(value: unknown): number {
  try {
    return JSON.stringify(value ?? null)?.length ?? 0;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/** zod schema for a structured `resumeData` object whose JSON form must fit in
 *  `maxChars` (default CAPS.resumeDataChars). Keys are not enumerated on
 *  purpose: the client's ResumeData evolves and the model only sees JSON. */
export function resumeDataSchema(maxChars: number = CAPS.resumeDataChars) {
  return z.record(z.string(), z.unknown()).refine(
    (v) => serializedChars(v) <= maxChars,
    { message: `resumeData exceeds ${maxChars} serialised characters` },
  );
}

/** zod schema for a base64 payload whose DECODED size must fit in `maxBytes`. */
export function base64Schema(maxBytes: number) {
  return z.string().min(1).refine(looksLikeBase64, { message: 'not base64' }).refine(
    (v) => base64DecodedBytes(v) <= maxBytes,
    { message: `decoded size exceeds ${maxBytes} bytes` },
  );
}

/** Trimmed non-empty string with a max length (the prism-tailor `text` helper). */
export const boundedText = (min: number, max: number) => z.string().trim().min(min).max(max);
