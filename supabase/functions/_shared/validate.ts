import { HttpError } from './respond.ts';

export type ShapeKind = 'string' | 'number' | 'boolean' | 'array' | 'object';
export type Shape = Record<string, ShapeKind>;

function matches(actual: unknown, kind: ShapeKind): boolean {
  return kind === 'array' ? Array.isArray(actual)
    : kind === 'object' ? actual !== null && typeof actual === 'object' && !Array.isArray(actual)
    : typeof actual === kind;
}

/**
 * Minimal structural check on AI output: every required key must be present with
 * the right primitive/array/object type. Throws 502 `bad_ai_output` on mismatch
 * so callers fail loud instead of returning malformed data to the client.
 */
export function validateShape<T>(value: unknown, required: Shape): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(502, 'bad_ai_output');
  const v = value as Record<string, unknown>;
  for (const [key, kind] of Object.entries(required)) {
    if (!matches(v[key], kind)) throw new HttpError(502, 'bad_ai_output', { field: key });
  }
  return value as T;
}

/** Validate that `value` is an array whose every element matches `shape`
 *  (502 `bad_ai_output` with `field: "<field>[i].key"` otherwise). */
export function validateEach<T>(value: unknown, shape: Shape, field = 'items'): T[] {
  if (!Array.isArray(value)) throw new HttpError(502, 'bad_ai_output', { field });
  value.forEach((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new HttpError(502, 'bad_ai_output', { field: `${field}[${i}]` });
    }
    for (const [key, kind] of Object.entries(shape)) {
      if (!matches((item as Record<string, unknown>)[key], kind)) {
        throw new HttpError(502, 'bad_ai_output', { field: `${field}[${i}].${key}` });
      }
    }
  });
  return value as T[];
}

/** Validate that `value` is an array of strings (empty strings dropped). */
export function validateStringArray(value: unknown, field = 'items'): string[] {
  if (!Array.isArray(value)) throw new HttpError(502, 'bad_ai_output', { field });
  const out: string[] = [];
  value.forEach((s, i) => {
    if (typeof s !== 'string') throw new HttpError(502, 'bad_ai_output', { field: `${field}[${i}]` });
    if (s.trim()) out.push(s);
  });
  return out;
}

/** Coerce a model-returned score into an integer inside [min, max]; a
 *  non-numeric value is a 502 `bad_ai_output`. */
export function clampScore(value: unknown, field: string, min = 0, max = 100): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new HttpError(502, 'bad_ai_output', { field });
  return Math.min(max, Math.max(min, Math.round(n)));
}

// -------------------------------------------------------------------------
// ai-suggest output shapes. Derived from the client types the UI consumes
// (types.ts AIAnalysisResult / AIExperienceSuggestion / AtsAnalysisResult);
// anything the model adds beyond these keys is dropped.
// -------------------------------------------------------------------------

export interface ExperienceSuggestion {
  id: string;
  jobTitle: string;
  company: string;
  atsAnalysis: string;
  improvedDescription: string;
}
export interface AiAnalysisResult {
  summarySuggestion?: string;
  experienceSuggestions?: ExperienceSuggestion[];
  missingKeywords?: string[];
}
export interface AtsCheck {
  pass: boolean;
  feedback: string;
}
export const ATS_CHECK_KEYS = ['contactInfo', 'keywords', 'sectionHeaders', 'bulletPoints', 'fileFormat'] as const;
export type AtsCheckKey = (typeof ATS_CHECK_KEYS)[number];
export interface AtsComplianceResult {
  overallScore: number;
  checks: Record<AtsCheckKey, AtsCheck>;
}

const EXPERIENCE_SHAPE: Shape = {
  id: 'string', jobTitle: 'string', company: 'string', atsAnalysis: 'string', improvedDescription: 'string',
};

/** Validate one ai-suggest 'section' result and keep only the keys the UI reads. */
export function validateSectionResult(section: 'summary' | 'experience' | 'skills', value: unknown): AiAnalysisResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(502, 'bad_ai_output');
  const v = value as Record<string, unknown>;
  if (section === 'summary') {
    if (typeof v.summarySuggestion !== 'string' || !v.summarySuggestion.trim()) {
      throw new HttpError(502, 'bad_ai_output', { field: 'summarySuggestion' });
    }
    return { summarySuggestion: v.summarySuggestion };
  }
  if (section === 'experience') {
    const items = validateEach<ExperienceSuggestion>(v.experienceSuggestions, EXPERIENCE_SHAPE, 'experienceSuggestions');
    return {
      experienceSuggestions: items.map((i) => ({
        id: i.id, jobTitle: i.jobTitle, company: i.company,
        atsAnalysis: i.atsAnalysis, improvedDescription: i.improvedDescription,
      })),
    };
  }
  return { missingKeywords: validateStringArray(v.missingKeywords, 'missingKeywords') };
}

/** Validate an ai-suggest 'ats-compliance' result (score clamped to 0-100). */
export function validateAtsCompliance(value: unknown): AtsComplianceResult {
  const v = validateShape<{ overallScore: unknown; checks: Record<string, unknown> }>(value, {
    overallScore: 'number', checks: 'object',
  });
  const checks = {} as Record<AtsCheckKey, AtsCheck>;
  for (const key of ATS_CHECK_KEYS) {
    const c = validateShape<AtsCheck>(v.checks[key], { pass: 'boolean', feedback: 'string' });
    checks[key] = { pass: c.pass, feedback: c.feedback };
  }
  return { overallScore: clampScore(v.overallScore, 'overallScore'), checks };
}
