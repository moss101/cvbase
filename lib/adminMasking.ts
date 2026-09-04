/**
 * Mirror of `supabase/functions/admin/mask.ts`.
 *
 * The edge functions are Deno and cannot run under vitest, but this rule is the
 * one thing standing between the admin panel and a leaked provider key, so it is
 * covered by the web test suite too. Keep the two in sync — if the masking rule
 * changes, change both.
 */

/** Shows enough of a key to recognise it, never enough to use it. */
export function maskKey(key: string): string {
    if (key.length <= 8) return '••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * Replace a provider row's `api_keys` array with a count and masked previews.
 * The returned object never carries an `api_keys` field, whatever the input.
 */
export function maskProviderRow<T extends { api_keys?: unknown }>(
    row: T,
): Omit<T, 'api_keys'> & { key_count: number; key_previews: string[] } {
    const keys: string[] = Array.isArray(row.api_keys)
        ? row.api_keys.filter((k): k is string => typeof k === 'string')
        : [];
    const { api_keys: _dropped, ...rest } = row;
    return { ...rest, key_count: keys.length, key_previews: keys.map(maskKey) };
}
