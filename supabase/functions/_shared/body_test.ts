import { assert, assertEquals, assertRejects } from 'jsr:@std/assert';
import {
  base64DecodedBytes, base64Schema, boundedText, CAPS, DEFAULT_MAX_BODY_BYTES, looksLikeBase64,
  readJsonBody, resumeDataSchema, serializedChars,
} from './body.ts';
import { HttpError } from './respond.ts';

function post(body: string | ReadableStream<Uint8Array> | null, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/fn', { method: 'POST', headers, body });
}

Deno.test('readJsonBody parses a JSON body', async () => {
  assertEquals(await readJsonBody(post('{"a":1,"b":[true]}')), { a: 1, b: [true] });
});

Deno.test('readJsonBody: empty or whitespace body → {}', async () => {
  assertEquals(await readJsonBody(post(null)), {});
  assertEquals(await readJsonBody(post('')), {});
  assertEquals(await readJsonBody(post('  \n ')), {});
});

Deno.test('readJsonBody: malformed JSON → 400 invalid_json', async () => {
  const err = await assertRejects(() => readJsonBody(post('{oops')), HttpError, 'invalid_json') as HttpError;
  assertEquals(err.status, 400);
});

Deno.test('readJsonBody: declared Content-Length over the cap → 413 before reading', async () => {
  const err = await assertRejects(
    () => readJsonBody(post('{}', { 'content-length': String(DEFAULT_MAX_BODY_BYTES + 1) }), DEFAULT_MAX_BODY_BYTES),
    HttpError,
    'payload_too_large',
  ) as HttpError;
  assertEquals(err.status, 413);
  assertEquals(err.extra?.maxBytes, DEFAULT_MAX_BODY_BYTES);
});

Deno.test('readJsonBody: a stream that overruns the cap (no/forged Content-Length) → 413 mid-read', async () => {
  let pulled = 0;
  const chunk = new TextEncoder().encode('"' + 'x'.repeat(1000));
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled++;
      if (pulled > 100) controller.close(); // would be ~100 KB if fully read
      else controller.enqueue(chunk);
    },
  });
  const err = await assertRejects(() => readJsonBody(post(stream), 4096), HttpError, 'payload_too_large') as HttpError;
  assertEquals(err.status, 413);
  assert(pulled < 20, `stream should be aborted early, pulled ${pulled} chunks`);
});

Deno.test('readJsonBody: exactly at the cap is accepted', async () => {
  const body = JSON.stringify({ t: 'y'.repeat(90) });
  assertEquals((await readJsonBody(post(body), body.length) as { t: string }).t.length, 90);
});

Deno.test('base64DecodedBytes matches real decoded sizes, with/without padding and data: prefix', () => {
  const enc = (s: string) => btoa(s);
  assertEquals(base64DecodedBytes(enc('a')), 1);
  assertEquals(base64DecodedBytes(enc('ab')), 2);
  assertEquals(base64DecodedBytes(enc('abc')), 3);
  assertEquals(base64DecodedBytes(enc('abcd')), 4);
  assertEquals(base64DecodedBytes(`data:image/png;base64,${enc('hello')}`), 5);
  assertEquals(base64DecodedBytes(enc('hello world').replace(/(.{4})/g, '$1\n')), 11);
  assertEquals(base64DecodedBytes(''), 0);
});

Deno.test('looksLikeBase64 accepts standard/url-safe alphabets and rejects junk', () => {
  assert(looksLikeBase64('aGVsbG8='));
  assert(looksLikeBase64('aGVs-bG8_'));
  assert(looksLikeBase64('data:application/pdf;base64,JVBERi0='));
  assertEquals(looksLikeBase64(''), false);
  assertEquals(looksLikeBase64('not base64!'), false);
  assertEquals(looksLikeBase64('{"json":true}'), false);
});

Deno.test('base64Schema enforces the DECODED size, not the wire size', () => {
  const schema = base64Schema(6);
  assert(schema.safeParse(btoa('123456')).success); // 6 bytes = 8 chars on the wire
  const over = schema.safeParse(btoa('1234567'));
  assertEquals(over.success, false);
  assertEquals(schema.safeParse('###').success, false);
  assertEquals(schema.safeParse('').success, false);
});

Deno.test('resumeDataSchema caps the serialised size and requires an object', () => {
  const s = resumeDataSchema(50);
  assert(s.safeParse({ name: 'Ann' }).success);
  assertEquals(s.safeParse({ name: 'x'.repeat(100) }).success, false);
  assertEquals(s.safeParse('string').success, false);
  assertEquals(s.safeParse(['array']).success, false);
  // Default cap is the shared prompt cap.
  const big = { summary: 'z'.repeat(CAPS.resumeDataChars) };
  assertEquals(resumeDataSchema().safeParse(big).success, false);
  assert(serializedChars(big) > CAPS.resumeDataChars);
});

Deno.test('boundedText trims then bounds', () => {
  const t = boundedText(1, 5);
  assertEquals(t.parse('  hey '), 'hey');
  assertEquals(t.safeParse('   ').success, false);
  assertEquals(t.safeParse('toolong').success, false);
});

Deno.test('CAPS carry the agreed limits', () => {
  assertEquals(CAPS.resumeDataChars, 12_000);
  assertEquals(CAPS.freeTextChars, 20_000);
  assertEquals(CAPS.jobDescriptionChars, 15_000);
  assertEquals(CAPS.legacyPromptChars, 4_000);
  assertEquals(CAPS.headshotBytes, 8 * 1024 * 1024);
  assertEquals(CAPS.pdfBytes, 10 * 1024 * 1024);
});
