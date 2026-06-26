import { describe, it, expect } from 'vitest';
import { parseRichText, decodeEntities, richTextToPlain } from '../richText.ts';

describe('lib/export/richText', () => {
    it('decodes named and numeric HTML entities', () => {
        expect(decodeEntities('Tom &amp; Jerry &lt;3 &#39;quote&#39; &#x2014;')).toBe("Tom & Jerry <3 'quote' —");
    });

    it('parses a plain paragraph into one block with one run', () => {
        const blocks = parseRichText('<p>Led the team.</p>');
        expect(blocks).toHaveLength(1);
        expect(blocks[0].list).toBeUndefined();
        expect(blocks[0].runs.map(r => r.text).join('')).toBe('Led the team.');
    });

    it('marks <li> inside <ul> as bullet blocks (even when wrapped in <p>)', () => {
        const blocks = parseRichText('<ul><li><p>First</p></li><li>Second</li></ul>');
        expect(blocks).toHaveLength(2);
        expect(blocks.every(b => b.list === 'bullet')).toBe(true);
        expect(blocks.map(b => b.runs.map(r => r.text).join(''))).toEqual(['First', 'Second']);
    });

    it('marks <ol> items as numbered', () => {
        const blocks = parseRichText('<ol><li>One</li><li>Two</li></ol>');
        expect(blocks.every(b => b.list === 'number')).toBe(true);
    });

    it('captures bold / italic / underline formatting on runs', () => {
        const blocks = parseRichText('<p>Built <strong>fast</strong> and <em>clean</em> and <u>tested</u> code.</p>');
        const runs = blocks[0].runs;
        expect(runs.find(r => r.text === 'fast')?.bold).toBe(true);
        expect(runs.find(r => r.text === 'clean')?.italic).toBe(true);
        expect(runs.find(r => r.text === 'tested')?.underline).toBe(true);
        // Plain text in the same paragraph carries no formatting flags.
        expect(runs.find(r => r.text.startsWith('Built'))?.bold).toBeUndefined();
    });

    it('combines nested formatting flags', () => {
        const blocks = parseRichText('<p><strong><em>both</em></strong></p>');
        const run = blocks[0].runs[0];
        expect(run.bold).toBe(true);
        expect(run.italic).toBe(true);
    });

    it('keeps anchor text but drops the tag', () => {
        const blocks = parseRichText('<p>See <a href="https://x.com">my site</a>.</p>');
        expect(blocks[0].runs.map(r => r.text).join('')).toBe('See my site.');
    });

    it('drops whitespace-only blocks and returns [] for empty input', () => {
        expect(parseRichText('')).toEqual([]);
        expect(parseRichText('<p>   </p><p></p>')).toEqual([]);
    });

    it('richTextToPlain prefixes bullets and joins on newlines', () => {
        expect(richTextToPlain('<p>Intro</p><ul><li>a</li><li>b</li></ul>')).toBe('Intro\n• a\n• b');
    });
});
