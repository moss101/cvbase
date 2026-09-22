/**
 * Small pure helpers shared by the Career OS domain modules: a synchronous,
 * dependency-free content hash, HTML stripping for fingerprints/search text,
 * id generation and ISO time. Nothing here touches the network.
 */

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;

/** FNV-1a 64-bit over the UTF-8 bytes of `input`, as 16 lowercase hex chars. */
export function fnv1a64Hex(input: string): string {
  let h = FNV_OFFSET;
  const bytes = new TextEncoder().encode(input);
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]);
    h = (h * FNV_PRIME) & MASK_64;
  }
  return h.toString(16).padStart(16, '0');
}

/**
 * Stable 32-hex fingerprint (two independent FNV-1a-64 lanes). This is NOT
 * md5: the SQL backfill (`career_os_migrate_user`) fingerprints legacy imports
 * with `md5(...)` over the same normalised string, so client and server
 * fingerprints never collide by accident and never dedupe against each other
 * either. Cross-source dedupe therefore happens on the normalised identity key
 * (see careerFacts.reconcileCandidates), not on the hash.
 */
export function fingerprint(input: string): string {
  return fnv1a64Hex(input) + fnv1a64Hex(`${input.length}${input}`);
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

/** Rich-text (HTML) to plain text; block boundaries become newlines. */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .trim();
}

/** Lowercase, whitespace-collapsed comparison form. */
export function normaliseText(value: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Lowercased word tokens (letters, digits, +, #) at least two characters long. */
export function tokenise(value: string): string[] {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter((t) => t.length >= 2);
}

/** Sorted unique copy of a string list. */
export function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

// ---------------------------------------------------------------------------
// Ids and time
// ---------------------------------------------------------------------------

/** RFC 4122 v4 id; uses the platform generator and falls back to Math.random. */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const nowIso = (): string => new Date().toISOString();

/** Calendar date (YYYY-MM-DD, UTC) for a Date or ISO string. */
export function isoDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Milliseconds between two ISO strings/dates, or null when either is unparsable. */
export function msBetween(from: string | Date | null, to: string | Date): number | null {
  if (!from) return null;
  const a = typeof from === 'string' ? Date.parse(from) : from.getTime();
  const b = typeof to === 'string' ? Date.parse(to) : to.getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return b - a;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
