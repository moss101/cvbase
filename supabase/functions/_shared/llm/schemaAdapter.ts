import type { z } from 'npm:zod@3.24.1';
import type { ToolSpec } from './types.ts';

// =========================================================================
// The one place zod schemas (PRISM) and Gemini-dialect schema literals (the
// 4 direct-caller edge functions) both get turned into a standard JSON
// Schema object suitable for OpenAI-compatible forced tool-calling — the
// mechanism this router uses on both DeepSeek and Kimi instead of
// `response_format:{type:'json_object'}`, since forced tool-calling is the
// closest either provider gets to Gemini's `responseSchema` constrained-
// decoding guarantee (json_object mode only promises valid JSON, not a
// specific shape).
// =========================================================================

/** Mechanical port of prism-tailor/schemas.ts's (deleted) toGeminiSchema —
 *  same cases, lowercase standard JSON-Schema type names instead of
 *  Gemini's OBJECT/ARRAY/STRING/... */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // deno-lint-ignore no-explicit-any
  const def = schema._def as any;
  switch (def.typeName) {
    case 'ZodObject': {
      const shape = def.shape() as Record<string, z.ZodTypeAny>;
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(shape)) properties[key] = zodToJsonSchema(value);
      return { type: 'object', properties, required: Object.keys(shape) };
    }
    case 'ZodArray':
      return { type: 'array', items: zodToJsonSchema(def.type) };
    case 'ZodString':
      return { type: 'string' };
    case 'ZodNumber':
      return def.checks?.some((c: { kind: string }) => c.kind === 'int')
        ? { type: 'integer' }
        : { type: 'number' };
    case 'ZodBoolean':
      return { type: 'boolean' };
    case 'ZodEnum':
      return { type: 'string', enum: def.values };
    default:
      throw new Error(`zodToJsonSchema: unsupported zod type ${def.typeName}`);
  }
}

/** The 4 direct-caller functions' existing schema literals (SCHEMA,
 *  STRING_ARRAY, PASS_FEEDBACK, ATS_SCHEMA, sectionSpec()'s inline schemas)
 *  are already structurally standard JSON Schema — properties/required/
 *  items/enum all match. Only the `type` values are Gemini's uppercase
 *  dialect (OBJECT/ARRAY/STRING/INTEGER/NUMBER/BOOLEAN). This just
 *  lowercases them recursively; the literals themselves are never rewritten
 *  or duplicated. */
export function fromGeminiStyleSchema(schema: unknown): Record<string, unknown> {
  if (schema === null || typeof schema !== 'object') return schema as Record<string, unknown>;
  const s = schema as Record<string, unknown>;
  const out: Record<string, unknown> = { ...s };
  if (typeof s.type === 'string') out.type = s.type.toLowerCase();
  if (s.properties && typeof s.properties === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(s.properties as Record<string, unknown>)) {
      properties[key] = fromGeminiStyleSchema(value);
    }
    out.properties = properties;
  }
  if (s.items) out.items = fromGeminiStyleSchema(s.items);
  return out;
}

/**
 * Single entry point used by router.ts: accepts either a zod schema (PRISM,
 * via model.ts's ModelFn) or a plain Gemini-dialect object literal (the 4
 * direct-caller functions' SCHEMA/STRING_ARRAY/etc. constants) and returns a
 * standard lowercase JSON Schema either way. Detected at runtime by duck-
 * typing zod's `.safeParse` method — zod schema instances have it, plain
 * object literals never do.
 */
export function normalizeSchema(schema: unknown): Record<string, unknown> | undefined {
  if (schema === undefined || schema === null) return undefined;
  if (typeof (schema as { safeParse?: unknown }).safeParse === 'function') {
    return zodToJsonSchema(schema as z.ZodTypeAny);
  }
  return fromGeminiStyleSchema(schema);
}

/** Key used to wrap a bare top-level array/scalar schema, since a tool's
 *  `parameters` must itself be a JSON-Schema object. */
const WRAPPED_RESULT_KEY = '__result';

/**
 * Builds the forced-tool-call spec for a given (already-converted, lowercase)
 * JSON Schema, transparently wrapping non-object top-level schemas (e.g.
 * ai-suggest's bare STRING_ARRAY) since tool parameters must be an object.
 * Returns the tool spec plus an `unwrap` function that undoes the wrapping
 * on the parsed arguments — invisible to the caller either way.
 */
export function buildToolSpec(
  name: string,
  description: string,
  schema: Record<string, unknown>,
): { tool: ToolSpec; unwrap: (parsed: unknown) => unknown } {
  if (schema.type === 'object') {
    return { tool: { name, description, parameters: schema }, unwrap: (parsed) => parsed };
  }
  return {
    tool: {
      name,
      description,
      parameters: {
        type: 'object',
        properties: { [WRAPPED_RESULT_KEY]: schema },
        required: [WRAPPED_RESULT_KEY],
      },
    },
    unwrap: (parsed) => (parsed as Record<string, unknown>)?.[WRAPPED_RESULT_KEY],
  };
}
