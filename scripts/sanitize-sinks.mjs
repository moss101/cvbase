// Codemod: wrap every dangerouslySetInnerHTML rich-text value in sanitizeHtml()
// and add the import. Idempotent. Usage: node scripts/sanitize-sinks.mjs <files…>
import fs from 'node:fs';
import path from 'node:path';

let filesChanged = 0;
let wrapped = 0;

for (const file of process.argv.slice(2)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('dangerouslySetInnerHTML')) continue;
  const before = src;

  // __html: EXPR }}  ->  __html: sanitizeHtml(EXPR) }}   (EXPR has no '}')
  src = src.replace(/__html:\s*([^}]*?)\s*\}\}/g, (m, expr) => {
    const e = expr.trim();
    if (e.startsWith('sanitizeHtml(')) return m; // already wrapped
    wrapped++;
    return `__html: sanitizeHtml(${e}) }}`;
  });

  if (!/lib\/sanitizeHtml/.test(src)) {
    const rel = path.relative(path.dirname(file), 'lib/sanitizeHtml').split(path.sep).join('/');
    const spec = rel.startsWith('.') ? rel : './' + rel;
    src = src.replace(/^(import .*\n)/m, `$1import { sanitizeHtml } from '${spec}';\n`);
  }

  if (src !== before) {
    fs.writeFileSync(file, src);
    filesChanged++;
    console.log('processed', file);
  }
}
console.log(`\n${filesChanged} files changed, ${wrapped} sinks wrapped`);
