import { describe, expect, it } from 'vitest';

/**
 * Mirror of `maskKey` in supabase/functions/admin/index.ts.
 *
 * The edge functions are Deno and cannot run under vitest, but this rule is the
 * one thing standing between the admin panel and a leaked provider key, so it is
 * covered here. Keep the two in sync — if the masking rule changes, change both.
 */
function maskKey(key: string): string {
    if (key.length <= 8) return '••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

describe('maskKey', () => {
    it('never reveals the middle of a key', () => {
        const key = 'sk-proj-SUPERSECRETMIDDLE-1f9c';
        const masked = maskKey(key);
        expect(masked).not.toContain('SUPERSECRETMIDDLE');
        expect(masked).toBe('sk-p••••1f9c');
    });

    it('reveals nothing at all for a short key', () => {
        // Below the threshold, first-4 + last-4 would be the entire string.
        expect(maskKey('sk-12345')).toBe('••••');
        expect(maskKey('')).toBe('••••');
    });

    it('keeps enough to tell two keys apart', () => {
        expect(maskKey('sk-aaaaaaaaaaaa1111')).not.toBe(maskKey('sk-bbbbbbbbbbbb2222'));
    });

    it('leaks at most 8 characters regardless of key length', () => {
        const key = 'x'.repeat(200);
        const revealed = maskKey(key).replace(/•/g, '');
        expect(revealed.length).toBeLessThanOrEqual(8);
    });
});
