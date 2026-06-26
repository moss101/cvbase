/**
 * Minimal, dependency-free rich-text → block parser for resume descriptions.
 *
 * Resume `description` fields hold tiptap-authored HTML that has already been
 * run through DOMPurify (see lib/sanitizeHtml.ts), so the tag set is small and
 * well-formed: <p>, <br>, <ul>/<ol>/<li>, <strong>/<b>, <em>/<i>, <u>, <a>.
 * We don't need a full DOM here — a tag tokenizer with a formatting stack maps
 * that HTML into flat blocks the DOCX exporter (and any other) can consume.
 */

export interface TextRunSpec {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export interface RichBlock {
    runs: TextRunSpec[];
    /** Set when the block is a list item; absent for ordinary paragraphs. */
    list?: 'bullet' | 'number';
}

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
};

export function decodeEntities(input: string): string {
    return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X'
                ? parseInt(body.slice(2), 16)
                : parseInt(body.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    });
}

/** Parse sanitized resume HTML into flat blocks (paragraphs + list items). */
export function parseRichText(html: string): RichBlock[] {
    if (!html || !html.trim()) return [];

    const blocks: RichBlock[] = [];
    let current: TextRunSpec[] = [];
    const fmt = { bold: 0, italic: 0, underline: 0 };
    const listStack: ('bullet' | 'number')[] = [];

    const flush = () => {
        // Drop blocks that are only whitespace; collapse runs of spaces.
        const runs = current
            .map(r => ({ ...r, text: r.text.replace(/\s+/g, ' ') }))
            .filter(r => r.text.length > 0);
        const joined = runs.map(r => r.text).join('').trim();
        if (joined) blocks.push({ runs, list: listStack[listStack.length - 1] });
        current = [];
    };

    const addText = (raw: string) => {
        const text = decodeEntities(raw);
        if (!text) return;
        current.push({
            text,
            bold: fmt.bold > 0 || undefined,
            italic: fmt.italic > 0 || undefined,
            underline: fmt.underline > 0 || undefined,
        });
    };

    const tokenizer = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>|([^<]+)/g;
    let m: RegExpExecArray | null;
    while ((m = tokenizer.exec(html)) !== null) {
        if (m[2] != null) { addText(m[2]); continue; }
        const tag = m[1].toLowerCase();
        const closing = m[0][1] === '/';
        switch (tag) {
            case 'br': current.push({ text: '\n' }); break;
            case 'strong': case 'b': fmt.bold += closing ? -1 : 1; break;
            case 'em': case 'i': fmt.italic += closing ? -1 : 1; break;
            case 'u': fmt.underline += closing ? -1 : 1; break;
            case 'ul': closing ? listStack.pop() : listStack.push('bullet'); break;
            case 'ol': closing ? listStack.pop() : listStack.push('number'); break;
            case 'li': case 'p': case 'div':
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
                flush(); break;
            default: break; // <a>, <span>, … — drop the tag, keep its text
        }
    }
    flush();
    return blocks;
}

/** Flatten rich HTML to plain text (used for previews / fallbacks). */
export function richTextToPlain(html: string): string {
    return parseRichText(html)
        .map(b => (b.list ? '• ' : '') + b.runs.map(r => r.text).join('').replace(/\n/g, ' ').trim())
        .join('\n');
}
