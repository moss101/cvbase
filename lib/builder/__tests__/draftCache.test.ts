// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { installLocalStorage } from './localStorageStub';
import {
    ANON_SCOPE, LEGACY_KEYS, PRIMARY_DOC,
    claimAnonymousDraft, clearAnonymousDraft, draftDocKey, draftKey, draftScope, hasDraft,
    isBlankResumeData, listAnonymousDrafts, readDraft, readDraftPayload, readTemplateHint,
    writeDraft, writeDraftPayload,
} from '../draftCache';
import { INITIAL_STATE } from '../../../constants';
import type { ResumeData, ResumeSettings } from '../../../types';

installLocalStorage();

const cv = (firstName: string): ResumeData => ({ ...INITIAL_STATE, contact: { ...INITIAL_STATE.contact, firstName } });
const json = (v: unknown) => JSON.stringify(v);

beforeEach(() => localStorage.clear());

describe('draftCache keys', () => {
    it('scopes by account and document', () => {
        expect(draftKey('u1', 'r9', 'data')).toBe('cvbase:draft:u1:r9:data');
        expect(draftKey(ANON_SCOPE, PRIMARY_DOC, 'template')).toBe('cvbase:draft:anon:primary:template');
        expect(draftScope(null)).toBe('anon');
        expect(draftScope(undefined)).toBe('anon');
        expect(draftScope('u1')).toBe('u1');
        expect(draftDocKey(null)).toBe('primary');
        expect(draftDocKey('r9')).toBe('r9');
    });
    it('keeps two accounts and two documents apart', () => {
        writeDraft('u1', 'primary', 'data', json(cv('Ann')));
        writeDraft('u2', 'primary', 'data', json(cv('Bob')));
        writeDraft('u1', 'r2', 'data', json(cv('Ann tailored')));
        expect(readDraftPayload('u1', 'primary').formData?.contact.firstName).toBe('Ann');
        expect(readDraftPayload('u2', 'primary').formData?.contact.firstName).toBe('Bob');
        expect(readDraftPayload('u1', 'r2').formData?.contact.firstName).toBe('Ann tailored');
        expect(readDraftPayload('u3', 'primary').formData).toBeNull();
    });
});

describe('legacy adapter', () => {
    it('adopts the legacy keys into the anonymous primary draft only, without deleting them', () => {
        localStorage.setItem(LEGACY_KEYS.data, json(cv('Legacy')));
        localStorage.setItem(LEGACY_KEYS.template, 'harvard');
        expect(readDraft('anon', 'primary', 'data')).toBe(json(cv('Legacy')));
        expect(readDraft('anon', 'primary', 'template')).toBe('harvard');
        // copied, not moved
        expect(localStorage.getItem(draftKey('anon', 'primary', 'data'))).toBe(json(cv('Legacy')));
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBe(json(cv('Legacy')));
        // a signed-in account never inherits the shared key by itself
        expect(readDraft('u1', 'primary', 'data')).toBeNull();
        expect(readDraft('u1', 'r2', 'data')).toBeNull();
        expect(readDraft('anon', 'r2', 'data')).toBeNull();
        expect(localStorage.getItem(draftKey('u1', 'primary', 'data'))).toBeNull();
    });
    it('prefers an existing scoped value over the legacy key', () => {
        localStorage.setItem(LEGACY_KEYS.data, json(cv('Legacy')));
        localStorage.setItem(draftKey('anon', 'primary', 'data'), json(cv('Scoped')));
        expect(readDraft('anon', 'primary', 'data')).toBe(json(cv('Scoped')));
    });
    it('does not adopt a legacy value a signed-in session mirrored there', () => {
        // Account draft mirrored to the legacy key (Dashboard fallback)…
        writeDraft('u1', 'primary', 'data', json(cv('Account')));
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBe(json(cv('Account')));
        // …must not become the anonymous draft on a shared device.
        expect(readDraft('anon', 'primary', 'data')).toBeNull();
        expect(hasDraft('anon', 'primary')).toBe(false);
        // An anonymous mirror is adoptable again.
        writeDraft('anon', 'primary', 'data', json(cv('Visitor')));
        localStorage.removeItem(draftKey('anon', 'primary', 'data'));
        expect(readDraft('anon', 'primary', 'data')).toBe(json(cv('Visitor')));
    });
});

describe('mirror write', () => {
    it('writes the primary draft to the scoped key and the legacy key, any scope', () => {
        writeDraftPayload('u1', 'primary', {
            formData: cv('Ann'), visibleSections: ['skills'], settings: { fontSize: 'small' } as ResumeSettings, templateId: 'teal',
        });
        expect(localStorage.getItem(draftKey('u1', 'primary', 'data'))).toBe(json(cv('Ann')));
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBe(json(cv('Ann')));
        expect(localStorage.getItem(LEGACY_KEYS.visibleSections)).toBe(json(['skills']));
        expect(localStorage.getItem(LEGACY_KEYS.settings)).toBe(json({ fontSize: 'small' }));
        expect(localStorage.getItem(LEGACY_KEYS.template)).toBe('teal');
    });
    it('does not mirror a specific document', () => {
        writeDraft('u1', 'r2', 'data', json(cv('Tailored')));
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBeNull();
    });
});

describe('template hint', () => {
    it('lets the "use this template" key win for the primary document only', () => {
        localStorage.setItem(draftKey('u1', 'primary', 'template'), 'teal');
        localStorage.setItem(draftKey('u1', 'r2', 'template'), 'teal');
        localStorage.setItem(LEGACY_KEYS.template, 'harvard'); // App.handleCreateNew
        expect(readTemplateHint('u1', 'primary')).toBe('harvard');
        expect(readTemplateHint('anon', 'primary')).toBe('harvard');
        expect(readTemplateHint('u1', 'r2')).toBe('teal');
        localStorage.removeItem(LEGACY_KEYS.template);
        expect(readTemplateHint('u1', 'primary')).toBe('teal');
        expect(readTemplateHint('u9', 'primary')).toBeNull();
    });
});

describe('anonymous draft claim', () => {
    it('lists anonymous drafts and tells blank ones apart', () => {
        writeDraft('anon', 'primary', 'data', json(INITIAL_STATE));
        expect(listAnonymousDrafts()).toEqual([{ docKey: 'primary', blank: true }]);
        writeDraft('anon', 'primary', 'data', json(cv('Visitor')));
        expect(listAnonymousDrafts()).toEqual([{ docKey: 'primary', blank: false }]);
        writeDraft('u1', 'primary', 'data', json(cv('Ann')));
        expect(listAnonymousDrafts()).toHaveLength(1);
    });
    it('returns the payload with the duplicate decision inputs and clears only scoped keys', () => {
        writeDraftPayload('anon', 'primary', {
            formData: cv('Visitor'), visibleSections: ['projects'], settings: { fontSize: 'large' } as ResumeSettings, templateId: 'teal',
        });
        let claim = claimAnonymousDraft('u1');
        expect(claim.draft?.formData?.contact.firstName).toBe('Visitor');
        expect(claim.draft?.visibleSections).toEqual(['projects']);
        expect(claim.draft?.templateId).toBe('teal');
        expect(claim.existing).toBeNull();
        expect(claim.hasDuplicate).toBe(false);
        expect(claim.identical).toBe(false);

        writeDraft('u1', 'primary', 'data', json(cv('Ann')));
        claim = claimAnonymousDraft('u1');
        expect(claim.hasDuplicate).toBe(true);
        expect(claim.identical).toBe(false);

        writeDraft('u1', 'primary', 'data', json(cv('Visitor')));
        expect(claimAnonymousDraft('u1').identical).toBe(true);

        // The account draft is not read as anonymous; nothing is auto-applied.
        expect(localStorage.getItem(draftKey('u1', 'primary', 'settings'))).toBeNull();

        clearAnonymousDraft();
        expect(localStorage.getItem(draftKey('anon', 'primary', 'data'))).toBeNull();
        expect(localStorage.getItem(draftKey('anon', 'primary', 'template'))).toBeNull();
        expect(claimAnonymousDraft('u1').draft).toBeNull();
        // legacy keys survive (mirror of the last primary write)
        expect(localStorage.getItem(LEGACY_KEYS.data)).toBe(json(cv('Visitor')));
    });
    it('treats a blank anonymous draft as nothing to claim', () => {
        writeDraft('anon', 'primary', 'data', json(INITIAL_STATE));
        expect(claimAnonymousDraft('u1').draft).toBeNull();
    });
});

describe('isBlankResumeData', () => {
    it('ignores the never-empty defaults', () => {
        expect(isBlankResumeData(INITIAL_STATE)).toBe(true);
        expect(isBlankResumeData(cv('X'))).toBe(false);
        expect(isBlankResumeData({ ...INITIAL_STATE, skills: ['ts'] })).toBe(false);
        expect(isBlankResumeData({ ...INITIAL_STATE, summary: { professionalSummary: 'Hi' } })).toBe(false);
        expect(isBlankResumeData(null)).toBe(true);
        expect(isBlankResumeData('nope')).toBe(true);
    });
});

describe('storage failures', () => {
    it('degrade to "no draft" instead of throwing', () => {
        const broken = {
            getItem: () => { throw new Error('blocked'); },
            setItem: () => { throw new Error('blocked'); },
            removeItem: () => { throw new Error('blocked'); },
            key: () => { throw new Error('blocked'); },
            clear: () => {},
            length: 0,
        } as unknown as Storage;
        Object.defineProperty(globalThis, 'localStorage', { value: broken, configurable: true, writable: true });
        try {
            expect(readDraft('anon', 'primary', 'data')).toBeNull();
            expect(() => writeDraft('anon', 'primary', 'data', '{}')).not.toThrow();
            expect(listAnonymousDrafts()).toEqual([]);
            expect(claimAnonymousDraft('u1').draft).toBeNull();
            expect(() => clearAnonymousDraft()).not.toThrow();
        } finally {
            installLocalStorage();
        }
    });
});
