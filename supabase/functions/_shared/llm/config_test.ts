import { assertEquals, assertThrows } from 'jsr:@std/assert';
import { estimateCostUsd, findModelPrice, getModelPrices, validateProviderBaseUrl } from './config.ts';
import { ProviderConfigError } from './errors.ts';

// Tests pass an explicit (empty) allowlist so a developer's LLM_ALLOWED_HOSTS
// cannot leak into the assertions; the env path gets its own test.
const NO_ALLOWLIST = { allowedHosts: [] };

Deno.test('validateProviderBaseUrl: accepts public https hosts and strips trailing slashes', () => {
  assertEquals(validateProviderBaseUrl('https://api.example.com/v1/', NO_ALLOWLIST), 'https://api.example.com/v1');
  assertEquals(validateProviderBaseUrl('  https://api.example.com  ', NO_ALLOWLIST), 'https://api.example.com');
});

Deno.test('validateProviderBaseUrl: rejects non-https, empty, malformed and credentialed URLs', () => {
  for (const bad of ['', 'not a url', 'http://api.example.com', 'ftp://api.example.com', 'https://user:pw@api.example.com']) {
    assertThrows(() => validateProviderBaseUrl(bad, NO_ALLOWLIST), ProviderConfigError, undefined, bad);
  }
});

Deno.test('validateProviderBaseUrl: rejects localhost, loopback, private, link-local and metadata addresses', () => {
  const bad = [
    'https://localhost', 'https://foo.localhost', 'https://127.0.0.1', 'https://127.1.2.3',
    'https://10.0.0.5', 'https://172.16.0.1', 'https://172.31.255.255', 'https://192.168.1.1',
    'https://169.254.169.254/latest/meta-data', 'https://metadata.google.internal', 'https://db.internal',
    'https://100.64.0.1', 'https://0.0.0.0', 'https://[::1]', 'https://[fd00::1]', 'https://[fe80::1]',
    'https://[::ffff:127.0.0.1]', 'https://[::ffff:7f00:1]',
  ];
  for (const url of bad) {
    assertThrows(() => validateProviderBaseUrl(url, NO_ALLOWLIST), ProviderConfigError, undefined, url);
  }
  // Public v4 boundary neighbours must still pass.
  assertEquals(validateProviderBaseUrl('https://172.32.0.1', NO_ALLOWLIST), 'https://172.32.0.1');
  assertEquals(validateProviderBaseUrl('https://8.8.8.8', NO_ALLOWLIST), 'https://8.8.8.8');
});

Deno.test('validateProviderBaseUrl: allowlist matches exact host or subdomain, rejects the rest', () => {
  const allowed = { allowedHosts: ['api.openai.com', '.example.com'] };
  assertEquals(validateProviderBaseUrl('https://api.openai.com/v1', allowed), 'https://api.openai.com/v1');
  assertEquals(validateProviderBaseUrl('https://llm.example.com', allowed), 'https://llm.example.com');
  assertEquals(validateProviderBaseUrl('https://example.com', allowed), 'https://example.com');
  assertThrows(() => validateProviderBaseUrl('https://evil-example.com', allowed), ProviderConfigError);
  assertThrows(() => validateProviderBaseUrl('https://api.anthropic.com', allowed), ProviderConfigError);
});

Deno.test('validateProviderBaseUrl: LLM_ALLOWED_HOSTS env is honoured when no explicit list is given', () => {
  Deno.env.set('LLM_ALLOWED_HOSTS', ' api.deepseek.com , api.moonshot.ai ');
  try {
    assertEquals(validateProviderBaseUrl('https://api.deepseek.com'), 'https://api.deepseek.com');
    assertThrows(() => validateProviderBaseUrl('https://api.example.com'), ProviderConfigError);
  } finally {
    Deno.env.delete('LLM_ALLOWED_HOSTS');
  }
});

// --- pricing -------------------------------------------------------------

Deno.test('findModelPrice: exact match, then longest prefix, else null', () => {
  const prices = { 'gpt-5': { in: 1, out: 2 }, 'gpt-5-mini': { in: 0.1, out: 0.2 } };
  assertEquals(findModelPrice('gpt-5', prices), { in: 1, out: 2 });
  assertEquals(findModelPrice('gpt-5-mini-2026-01-01', prices), { in: 0.1, out: 0.2 });
  assertEquals(findModelPrice('gpt-5-2026-01-01', prices), { in: 1, out: 2 });
  assertEquals(findModelPrice('mystery-model', prices), null);
  assertEquals(findModelPrice('', prices), null);
});

Deno.test('estimateCostUsd: per-million maths rounded to micro-dollars; null for unpriced', () => {
  const prices = { m: { in: 0.55, out: 2.19 } };
  assertEquals(estimateCostUsd('m', 1_000_000, 1_000_000, prices), 2.74);
  assertEquals(estimateCostUsd('m', 3, 2, prices), 0.000006);
  assertEquals(estimateCostUsd('unknown', 100, 100, prices), null);
});

Deno.test('getModelPrices: LLM_PRICES overrides per model, malformed entries and JSON are ignored', () => {
  Deno.env.set('LLM_PRICES', '{"deepseek-v4-pro":{"in":9,"out":9},"bad":{"in":"x"}}');
  try {
    const prices = getModelPrices();
    assertEquals(prices['deepseek-v4-pro'], { in: 9, out: 9 });
    assertEquals(prices['bad'], undefined);
    assertEquals(typeof prices['kimi-k2.6'].in, 'number'); // defaults still present
  } finally {
    Deno.env.delete('LLM_PRICES');
  }
  Deno.env.set('LLM_PRICES', '{not json');
  try {
    assertEquals(getModelPrices()['deepseek-v4-pro'].in, 0.55);
  } finally {
    Deno.env.delete('LLM_PRICES');
  }
});
