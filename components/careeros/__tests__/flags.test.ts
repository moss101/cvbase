import { beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();
vi.mock('../../../services/supabase', () => ({
    getSupabase: () => ({ from }),
}));

import { __resetFlagCache, isFlagEnabled, rolloutBucket } from '../../../services/careerOs/flags';

/** Builds the chained query the helper issues and resolves it with `row`. */
const flagRow = (row: { enabled: boolean; rollout_pct: number | null } | null, error?: Error) => {
    from.mockReturnValue({
        select: () => ({
            eq: () => ({
                maybeSingle: () => (error ? Promise.reject(error) : Promise.resolve({ data: row })),
            }),
        }),
    });
};

describe('rolloutBucket', () => {
    it('is a stable 0–99 bucket over the user id (FNV-1a, same as the PRISM gate)', () => {
        expect(rolloutBucket('user-a')).toBe(rolloutBucket('user-a'));
        for (const id of ['a', 'user-a', '3fa85f64-5717-4562-b3fc-2c963f66afa6', '']) {
            const bucket = rolloutBucket(id);
            expect(bucket).toBeGreaterThanOrEqual(0);
            expect(bucket).toBeLessThan(100);
        }
        // Reference value computed with the prismRepo implementation.
        let h = 0x811c9dc5;
        for (const ch of 'user-a') {
            h ^= ch.charCodeAt(0);
            h = Math.imul(h, 0x01000193);
        }
        expect(rolloutBucket('user-a')).toBe((h >>> 0) % 100);
    });
});

describe('isFlagEnabled', () => {
    beforeEach(() => {
        from.mockReset();
        __resetFlagCache();
    });

    it('is off without a user and never queries', async () => {
        await expect(isFlagEnabled('career_os', null)).resolves.toBe(false);
        expect(from).not.toHaveBeenCalled();
    });

    it('is off when the flag row is missing or disabled', async () => {
        flagRow(null);
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
        flagRow({ enabled: false, rollout_pct: 100 });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
    });

    it('follows the rollout percentage for the user bucket', async () => {
        const bucket = rolloutBucket('user-a');
        flagRow({ enabled: true, rollout_pct: 100 });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(true);
        flagRow({ enabled: true, rollout_pct: 0 });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
        flagRow({ enabled: true, rollout_pct: bucket + 1 });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(true);
        flagRow({ enabled: true, rollout_pct: bucket });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
        flagRow({ enabled: true, rollout_pct: null });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
    });

    it('fails closed when the lookup throws', async () => {
        flagRow(null, new Error('network'));
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
        from.mockImplementation(() => {
            throw new Error('client unavailable');
        });
        await expect(isFlagEnabled('career_os', 'user-a')).resolves.toBe(false);
    });
});
