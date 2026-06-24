import DOMPurify from 'dompurify';

// Resume rich text (TipTap editor output, AI suggestions, imported DOCX/PDF) is
// rendered via dangerouslySetInnerHTML throughout the templates and preview.
// Every such value MUST pass through sanitizeHtml() so a crafted resume or AI
// payload cannot inject <script>, event handlers, or javascript: URLs.
const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span',
  'b', 'strong', 'i', 'em', 'u', 's', 'mark', 'sub', 'sup',
  'ul', 'ol', 'li',
  'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'style'];

/** Sanitize a rich-text HTML string to a safe subset. Returns '' for nullish. */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(String(dirty), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#)/i,
  });
}
