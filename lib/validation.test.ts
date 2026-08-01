import { describe, expect, it } from 'vitest';
import {
    compose,
    email,
    maxLength,
    minLength,
    password,
    phone,
    required,
    url,
    urlOnDomain,
} from './validation';

describe('required', () => {
    it('rejects empty and whitespace-only values', () => {
        expect(required('First name')('')).toBe('First name is required.');
        expect(required('First name')('   ')).toBe('First name is required.');
    });

    it('accepts any non-blank value', () => {
        expect(required()('a')).toBeNull();
    });
});

describe('email', () => {
    it('accepts ordinary and subdomain addresses', () => {
        expect(email('you@example.com')).toBeNull();
        expect(email('first.last@mail.example.co.uk')).toBeNull();
        expect(email('  spaced@example.com  ')).toBeNull();
    });

    it('rejects the shapes a naive pattern would let through', () => {
        // No TLD, trailing dot, double dot, missing local or domain part.
        expect(email('you@example')).not.toBeNull();
        expect(email('you@example.')).not.toBeNull();
        expect(email('you@@example.com')).not.toBeNull();
        expect(email('@example.com')).not.toBeNull();
        expect(email('you@ example.com')).not.toBeNull();
    });

    it('defers emptiness to `required`', () => {
        expect(email('')).toBeNull();
    });
});

describe('password', () => {
    it('accepts a password meeting every rule', () => {
        expect(password('Str0ngPass')).toBeNull();
    });

    it('names every unmet requirement at once', () => {
        const result = password('short');
        expect(result).toContain('at least 8 characters');
        expect(result).toContain('an uppercase letter');
        expect(result).toContain('a number');
    });

    it('defers emptiness to `required`', () => {
        expect(password('')).toBeNull();
    });
});

describe('phone', () => {
    it('accepts international formats', () => {
        expect(phone('+44 20 7946 0958')).toBeNull();
        expect(phone('(555) 123-4567')).toBeNull();
    });

    it('rejects letters and out-of-range lengths', () => {
        expect(phone('call me')).not.toBeNull();
        expect(phone('12345')).not.toBeNull();
        expect(phone('1234567890123456789')).not.toBeNull();
    });
});

describe('url', () => {
    it('accepts addresses with and without a scheme', () => {
        expect(url('https://example.com/page')).toBeNull();
        expect(url('example.com')).toBeNull();
        expect(url('linkedin.com/in/someone')).toBeNull();
    });

    it('rejects values that are not addresses', () => {
        expect(url('not a url')).not.toBeNull();
        expect(url('localhost')).not.toBeNull();
    });
});

describe('urlOnDomain', () => {
    const linkedin = urlOnDomain('linkedin.com', 'LinkedIn');

    it('accepts the expected domain and its subdomains', () => {
        expect(linkedin('https://www.linkedin.com/in/someone')).toBeNull();
        expect(linkedin('uk.linkedin.com/in/someone')).toBeNull();
    });

    it('rejects a different domain', () => {
        expect(linkedin('https://example.com/in/someone')).toContain('LinkedIn');
    });

    it('does not reject a domain that merely ends with the same letters', () => {
        expect(linkedin('https://notlinkedin.com/in/someone')).toContain('LinkedIn');
    });
});

describe('length rules', () => {
    it('enforces a minimum only on non-empty values', () => {
        expect(minLength(3, 'Title')('ab')).toContain('at least 3');
        expect(minLength(3, 'Title')('')).toBeNull();
    });

    it('enforces a maximum', () => {
        expect(maxLength(5, 'Title')('abcdef')).toContain('5 characters or fewer');
        expect(maxLength(5, 'Title')('abcde')).toBeNull();
    });
});

describe('compose', () => {
    it('returns the first failure in order', () => {
        const validate = compose(required('Email'), email);
        expect(validate('')).toBe('Email is required.');
        expect(validate('nope')).toContain('valid email');
        expect(validate('you@example.com')).toBeNull();
    });
});
