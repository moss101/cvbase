import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { validateShape } from './validate.ts';
import { HttpError } from './respond.ts';

Deno.test('validateShape returns the value when every required field matches', () => {
    const input = { name: 'Jane', score: 80, tags: ['a'], meta: { x: 1 } };
    const out = validateShape<typeof input>(input, {
        name: 'string', score: 'number', tags: 'array', meta: 'object',
    });
    assertEquals(out, input);
});

Deno.test('validateShape throws bad_ai_output (502) on a missing field', () => {
    const err = assertThrows(
        () => validateShape({ name: 'Jane' }, { name: 'string', score: 'number' }),
        HttpError,
        'bad_ai_output',
    ) as HttpError;
    assertEquals(err.status, 502);
    assertEquals(err.extra?.field, 'score');
});

Deno.test('validateShape distinguishes arrays from objects', () => {
    // an array is not a valid "object"
    assertThrows(() => validateShape({ meta: [] }, { meta: 'object' }), HttpError);
    // ...and an object is not a valid "array"
    assertThrows(() => validateShape({ tags: {} }, { tags: 'array' }), HttpError);
    // matching kinds pass
    validateShape({ meta: {}, tags: [] }, { meta: 'object', tags: 'array' });
});

Deno.test('validateShape rejects non-object input', () => {
    assertThrows(() => validateShape(null, { a: 'string' }), HttpError, 'bad_ai_output');
    assertThrows(() => validateShape('nope', { a: 'string' }), HttpError, 'bad_ai_output');
});
