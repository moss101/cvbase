import { assertEquals } from 'jsr:@std/assert';
import { sanitizeText, sanitizeDeep, sanitizeHtml } from './sanitize.ts';

Deno.test('sanitizeText strips control chars, trims, and coerces non-strings', () => {
    assertEquals(sanitizeText('  hi\x00the\x07re  '), 'hithere');
    // tabs/newlines inside the text are preserved; only outer whitespace trims.
    assertEquals(sanitizeText('a\tb\nc'), 'a\tb\nc');
    assertEquals(sanitizeText(123 as unknown), '');
    assertEquals(sanitizeText(null as unknown), '');
});

Deno.test('sanitizeDeep recurses through objects and arrays, leaving non-strings', () => {
    const out = sanitizeDeep({ a: ' x\x00 ', b: [{ c: 'y\x07' }], n: 5, ok: true });
    assertEquals(out, { a: 'x', b: [{ c: 'y' }], n: 5, ok: true });
});

Deno.test('sanitizeHtml removes scripts, inline handlers and javascript: urls', () => {
    assertEquals(sanitizeHtml('<b>hi</b><script>steal()</script>'), '<b>hi</b>');
    assertEquals(sanitizeHtml('<a onclick="x()">link</a>'), '<a>link</a>');
    assertEquals(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a href="alert(1)">x</a>');
    assertEquals(sanitizeHtml(42 as unknown), '');
});
