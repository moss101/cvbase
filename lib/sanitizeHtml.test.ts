// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('strips <script> tags but keeps surrounding text', () => {
    const out = sanitizeHtml('<p>hi</p><script>alert(1)</script>');
    expect(out).toContain('<p>hi</p>');
    expect(out).not.toContain('script');
  });

  it('strips event-handler attributes and disallowed tags', () => {
    const out = sanitizeHtml('<img src=x onerror="alert(1)">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('<img');
  });

  it('strips javascript: URLs from links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('keeps safe rich-text formatting', () => {
    const out = sanitizeHtml('<p>Led <strong>5</strong> <em>teams</em></p><ul><li>Item</li></ul>');
    expect(out).toContain('<strong>5</strong>');
    expect(out).toContain('<li>Item</li>');
  });

  it('returns empty string for nullish input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});
