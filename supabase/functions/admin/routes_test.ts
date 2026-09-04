import { assertEquals } from 'jsr:@std/assert';
import { isUuid, pageParams, parseAdminRoute, stripFunctionPrefix, userSearchFilter } from './routes.ts';

const UID = '4f1c2b3a-9d8e-4c7b-a6f5-0e1d2c3b4a59';

Deno.test('stripFunctionPrefix drops the function name and stray slashes', () => {
  assertEquals(stripFunctionPrefix('/admin'), '');
  assertEquals(stripFunctionPrefix('/admin/'), '');
  assertEquals(stripFunctionPrefix('/admin/users/'), 'users');
  assertEquals(stripFunctionPrefix('/admin/ops/llm-calls'), 'ops/llm-calls');
  // Only the exact segment is a prefix — /administrators is not /admin.
  assertEquals(stripFunctionPrefix('/administrators'), 'administrators');
});

Deno.test('parseAdminRoute matches every fixed route by method + path', () => {
  assertEquals(parseAdminRoute('GET', '/admin/stats'), { kind: 'stats' });
  assertEquals(parseAdminRoute('GET', '/admin/providers'), { kind: 'providers.list' });
  assertEquals(parseAdminRoute('POST', '/admin/providers'), { kind: 'providers.upsert' });
  assertEquals(parseAdminRoute('POST', '/admin/providers/delete'), { kind: 'providers.delete' });
  assertEquals(parseAdminRoute('GET', '/admin/users'), { kind: 'users.list' });
  assertEquals(parseAdminRoute('GET', '/admin/audit'), { kind: 'audit.list' });
  assertEquals(parseAdminRoute('GET', '/admin/ops/alerts'), { kind: 'ops.alerts' });
  assertEquals(parseAdminRoute('GET', '/admin/ops/llm-calls'), { kind: 'ops.llmCalls' });
  assertEquals(parseAdminRoute('GET', '/admin/ops/prism-runs'), { kind: 'ops.prismRuns' });
  // Method is case-insensitive, trailing slash tolerated.
  assertEquals(parseAdminRoute('get', '/admin/ops/alerts/'), { kind: 'ops.alerts' });
});

Deno.test('parseAdminRoute extracts a lower-cased user id from users/<uuid>/usage', () => {
  assertEquals(parseAdminRoute('GET', `/admin/users/${UID.toUpperCase()}/usage`), {
    kind: 'users.usage',
    userId: UID,
  });
});

Deno.test('parseAdminRoute rejects wrong methods, bad ids and unknown paths', () => {
  assertEquals(parseAdminRoute('POST', '/admin/stats'), null);
  assertEquals(parseAdminRoute('DELETE', '/admin/providers'), null);
  assertEquals(parseAdminRoute('POST', '/admin/ops/alerts'), null);
  assertEquals(parseAdminRoute('GET', '/admin/users/not-a-uuid/usage'), null);
  assertEquals(parseAdminRoute('GET', `/admin/users/${UID}`), null);
  assertEquals(parseAdminRoute('GET', `/admin/users/${UID}/usage/extra`), null);
  assertEquals(parseAdminRoute('POST', `/admin/users/${UID}/usage`), null);
  assertEquals(parseAdminRoute('GET', '/admin/ops'), null);
  assertEquals(parseAdminRoute('GET', '/admin/../providers'), null);
  assertEquals(parseAdminRoute('GET', '/admin'), null);
});

Deno.test('isUuid', () => {
  assertEquals(isUuid(UID), true);
  assertEquals(isUuid(UID.toUpperCase()), true);
  assertEquals(isUuid('4f1c2b3a9d8e4c7ba6f50e1d2c3b4a59'), false);
  assertEquals(isUuid(''), false);
});

Deno.test('pageParams clamps limit and offset into a safe window', () => {
  const d = { limit: 50, max: 200 };
  assertEquals(pageParams(new URLSearchParams(''), d), { limit: 50, offset: 0 });
  assertEquals(pageParams(new URLSearchParams('limit=10&offset=20'), d), { limit: 10, offset: 20 });
  assertEquals(pageParams(new URLSearchParams('limit=9999'), d), { limit: 200, offset: 0 });
  assertEquals(pageParams(new URLSearchParams('limit=0'), d), { limit: 50, offset: 0 });
  assertEquals(pageParams(new URLSearchParams('limit=-5&offset=-1'), d), { limit: 50, offset: 0 });
  assertEquals(pageParams(new URLSearchParams('limit=abc&offset=NaN'), d), { limit: 50, offset: 0 });
  assertEquals(pageParams(new URLSearchParams('limit=2.9&offset=3.7'), d), { limit: 2, offset: 3 });
});

Deno.test('userSearchFilter: blank is no filter, uuid is an exact id match', () => {
  assertEquals(userSearchFilter(''), null);
  assertEquals(userSearchFilter('   '), null);
  assertEquals(userSearchFilter(`  ${UID.toUpperCase()} `), { column: 'id', value: UID });
});

Deno.test('userSearchFilter: text is an email prefix with wildcards neutralised', () => {
  assertEquals(userSearchFilter('jane'), { column: 'email', pattern: 'jane%' });
  assertEquals(userSearchFilter('jane.doe@ex'), { column: 'email', pattern: 'jane.doe@ex%' });
  // A caller cannot widen the search into a wildcard scan.
  assertEquals(userSearchFilter('%'), { column: 'email', pattern: '\\%%' });
  assertEquals(userSearchFilter('a_b'), { column: 'email', pattern: 'a\\_b%' });
  assertEquals(userSearchFilter('a\\b'), { column: 'email', pattern: 'a\\\\b%' });
  // PostgREST turns `*` into `%`, so it is stripped rather than escaped.
  assertEquals(userSearchFilter('*'), null);
  assertEquals(userSearchFilter('jo*'), { column: 'email', pattern: 'jo%' });
  // Long input is capped.
  const long = 'x'.repeat(500);
  const capped = userSearchFilter(long);
  assertEquals(capped?.column, 'email');
  assertEquals(capped?.column === 'email' ? capped.pattern.length : -1, 121);
});
