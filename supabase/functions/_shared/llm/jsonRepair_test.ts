import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { JsonRepairError, parseJsonLenient, repairJsonText } from './jsonRepair.ts';

Deno.test('parseJsonLenient: valid JSON passes straight through', () => {
  assertEquals(parseJsonLenient('{"a":1}'), { a: 1 });
  assertEquals(parseJsonLenient('[1,2]'), [1, 2]);
});

Deno.test('parseJsonLenient: strips a ```json fence', () => {
  assertEquals(parseJsonLenient('```json\n{"a": 1}\n```'), { a: 1 });
  assertEquals(parseJsonLenient('```\n{"a": 1}\n```'), { a: 1 });
});

Deno.test('parseJsonLenient: drops prose around the value', () => {
  assertEquals(parseJsonLenient('Here is the result:\n{"a": 1}\nHope that helps!'), { a: 1 });
});

Deno.test('parseJsonLenient: removes trailing commas outside strings', () => {
  assertEquals(parseJsonLenient('{"a": [1, 2,], "b": "x,}",}'), { a: [1, 2], b: 'x,}' });
});

Deno.test('parseJsonLenient: empty input is {} only with emptyAsObject, otherwise throws', () => {
  assertEquals(parseJsonLenient('', { emptyAsObject: true }), {});
  assertEquals(parseJsonLenient(undefined, { emptyAsObject: true }), {});
  assertThrows(() => parseJsonLenient('   '), JsonRepairError);
});

Deno.test('parseJsonLenient: hopeless output throws JsonRepairError carrying the raw text', () => {
  const err = assertThrows(() => parseJsonLenient('{"a": }'), JsonRepairError);
  assertEquals(err.raw, '{"a": }');
});

Deno.test('repairJsonText: is a single pass — fence, then span, then commas', () => {
  assertEquals(repairJsonText('```json\nsure: {"a": 1,}\n```'), '{"a": 1}');
});
