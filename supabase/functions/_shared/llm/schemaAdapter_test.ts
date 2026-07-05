import { assertEquals } from 'jsr:@std/assert';
import { z } from 'npm:zod@3.24.1';
import { buildToolSpec, fromGeminiStyleSchema, normalizeSchema, zodToJsonSchema } from './schemaAdapter.ts';

Deno.test('zodToJsonSchema: converts the zod subset to standard lowercase JSON Schema', () => {
  const schema = zodToJsonSchema(z.object({
    title: z.string(),
    count: z.number().int(),
    ratio: z.number(),
    flag: z.boolean(),
    kind: z.enum(['a', 'b']),
    items: z.array(z.object({ id: z.string() })),
  }));
  assertEquals(schema.type, 'object');
  assertEquals((schema.properties as Record<string, unknown>).title, { type: 'string' });
  assertEquals((schema.properties as Record<string, unknown>).count, { type: 'integer' });
  assertEquals((schema.properties as Record<string, unknown>).ratio, { type: 'number' });
  assertEquals((schema.properties as Record<string, unknown>).flag, { type: 'boolean' });
  assertEquals((schema.properties as Record<string, unknown>).kind, { type: 'string', enum: ['a', 'b'] });
  const items = (schema.properties as Record<string, { type: string; items: { type: string; required: string[] } }>).items;
  assertEquals(items.type, 'array');
  assertEquals(items.items.required, ['id']);
  assertEquals((schema.required as string[]).length, 6);
});

Deno.test('fromGeminiStyleSchema: lowercases Gemini-dialect type strings recursively, structure untouched', () => {
  const geminiStyle = {
    type: 'OBJECT',
    properties: {
      overallScore: { type: 'INTEGER' },
      checks: {
        type: 'OBJECT',
        properties: { pass: { type: 'BOOLEAN' }, feedback: { type: 'STRING' } },
        required: ['pass', 'feedback'],
      },
      tags: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['overallScore', 'checks'],
  };
  const out = fromGeminiStyleSchema(geminiStyle) as Record<string, unknown>;
  assertEquals(out.type, 'object');
  assertEquals(out.required, ['overallScore', 'checks']); // untouched, not a type field
  const props = out.properties as Record<string, unknown>;
  assertEquals(props.overallScore, { type: 'integer' });
  const checks = props.checks as Record<string, unknown>;
  assertEquals(checks.type, 'object');
  assertEquals((checks.properties as Record<string, unknown>).pass, { type: 'boolean' });
  const tags = props.tags as Record<string, unknown>;
  assertEquals(tags.type, 'array');
  assertEquals(tags.items, { type: 'string' });
});

Deno.test('normalizeSchema: dispatches zod schemas to zodToJsonSchema, plain objects to fromGeminiStyleSchema', () => {
  const viaZod = normalizeSchema(z.object({ a: z.string() }));
  assertEquals(viaZod, { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] });

  const viaGeminiLiteral = normalizeSchema({ type: 'ARRAY', items: { type: 'STRING' } });
  assertEquals(viaGeminiLiteral, { type: 'array', items: { type: 'string' } });

  assertEquals(normalizeSchema(undefined), undefined);
});

Deno.test('buildToolSpec: object schema passes through as tool parameters unchanged', () => {
  const schema = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] };
  const { tool, unwrap } = buildToolSpec('return_result', 'desc', schema);
  assertEquals(tool.parameters, schema);
  assertEquals(unwrap({ a: 'x' }), { a: 'x' });
});

Deno.test('buildToolSpec: bare top-level array schema is wrapped for tool-calling and unwrapped after', () => {
  const bareArray = { type: 'array', items: { type: 'string' } };
  const { tool, unwrap } = buildToolSpec('return_result', 'desc', bareArray);
  // Tool parameters must themselves be an object — the array must be nested.
  assertEquals(tool.parameters.type, 'object');
  assertEquals((tool.parameters.properties as Record<string, unknown>).__result, bareArray);
  // Round-trip: the caller gets the plain array back, wrapping is invisible.
  assertEquals(unwrap({ __result: ['x', 'y'] }), ['x', 'y']);
});
