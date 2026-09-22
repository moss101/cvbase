import { describe, expect, it } from 'vitest';
import {
    decideHydration, isConflictError, isNotFoundError, resolveDocumentIdentity, serializeSnapshot, toHydrationPayload,
} from '../persistenceLogic';
import { ConflictError, NotFoundError } from '../../../services/careerOs/types';
import { INITIAL_STATE } from '../../../constants';
import type { ResumeData, ResumeSettings } from '../../../types';

const cv = (firstName: string): ResumeData => ({ ...INITIAL_STATE, contact: { ...INITIAL_STATE.contact, firstName } });

describe('resolveDocumentIdentity', () => {
    it('derives scope from the account and docKey from the requested resume', () => {
        expect(resolveDocumentIdentity(null, null)).toEqual({ scope: 'anon', docKey: 'primary', key: 'anon:primary' });
        expect(resolveDocumentIdentity('u1', undefined)).toEqual({ scope: 'u1', docKey: 'primary', key: 'u1:primary' });
        expect(resolveDocumentIdentity('u1', 'r2')).toEqual({ scope: 'u1', docKey: 'r2', key: 'u1:r2' });
    });
});

describe('decideHydration (two-device rule)', () => {
    const cloud = cv('Cloud');
    it('hydrates when there is no sync point, no timestamp or no local draft', () => {
        expect(decideHydration({ cloudUpdatedAt: undefined, syncedAt: 't1', localData: cv('Mine'), cloudData: cloud })).toBe('hydrate');
        expect(decideHydration({ cloudUpdatedAt: 't2', syncedAt: null, localData: cv('Mine'), cloudData: cloud })).toBe('hydrate');
        expect(decideHydration({ cloudUpdatedAt: 't2', syncedAt: 't1', localData: null, cloudData: cloud })).toBe('hydrate');
    });
    it('hydrates when the cloud is not newer than the sync point', () => {
        expect(decideHydration({ cloudUpdatedAt: '2026-01-01T00:00:00Z', syncedAt: '2026-01-01T00:00:00Z', localData: cv('Mine'), cloudData: cloud })).toBe('hydrate');
        expect(decideHydration({ cloudUpdatedAt: '2025-12-31T00:00:00Z', syncedAt: '2026-01-01T00:00:00Z', localData: cv('Mine'), cloudData: cloud })).toBe('hydrate');
    });
    it('stages a conflict only when the newer cloud row differs from the local draft', () => {
        expect(decideHydration({ cloudUpdatedAt: '2026-01-02T00:00:00Z', syncedAt: '2026-01-01T00:00:00Z', localData: cv('Mine'), cloudData: cloud })).toBe('conflict');
        expect(decideHydration({ cloudUpdatedAt: '2026-01-02T00:00:00Z', syncedAt: '2026-01-01T00:00:00Z', localData: cv('Cloud'), cloudData: cloud })).toBe('hydrate');
    });
});

describe('snapshot + payload helpers', () => {
    it('serializeSnapshot is stable for equal content and sensitive to each part', () => {
        const base = { formData: cv('A'), visibleSections: ['skills' as const], settings: { fontSize: 'medium' } as ResumeSettings, templateId: 'default' };
        expect(serializeSnapshot(base)).toBe(serializeSnapshot({ ...base, formData: cv('A') }));
        expect(serializeSnapshot(base)).not.toBe(serializeSnapshot({ ...base, formData: cv('B') }));
        expect(serializeSnapshot(base)).not.toBe(serializeSnapshot({ ...base, templateId: 'teal' }));
        expect(serializeSnapshot(base)).not.toBe(serializeSnapshot({ ...base, visibleSections: [] }));
    });
    it('toHydrationPayload carries the row id and template', () => {
        const p = toHydrationPayload({
            id: 'r1', title: 'T', data: cv('A'), settings: {} as ResumeSettings, templateId: 'teal', visibleSections: ['skills'], isPrimary: true, revision: 3,
        });
        expect(p).toEqual({ resumeId: 'r1', formData: cv('A'), visibleSections: ['skills'], settings: {}, templateId: 'teal' });
    });
});

describe('error classification', () => {
    it('recognises the careerOs errors by code, not by class identity', () => {
        expect(isConflictError(new ConflictError('resume', 'r1', 2))).toBe(true);
        expect(isConflictError({ code: 'conflict' })).toBe(true);
        expect(isConflictError(new Error('x'))).toBe(false);
        expect(isNotFoundError(new NotFoundError('resume', 'r1'))).toBe(true);
        expect(isNotFoundError(null)).toBe(false);
    });
});
