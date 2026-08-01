/**
 * Renders the CVBase brand mark to the source PNGs that @capacitor/assets fans
 * out into every Android and iOS icon and splash size.
 *
 * Why this exists
 * ---------------
 * Every icon and splash in android/ and ios/ — 60 files — was corrupt: each one
 * began with `EF BF BD 50 4E 47` instead of the PNG magic `89 50 4E 47`. `EF BF
 * BD` is the UTF-8 replacement character, so the files had been read as text and
 * re-encoded at some point, destroying every byte above 0x7F. The `icons/*.webp`
 * sources were damaged the same way, leaving no usable original anywhere in the
 * repo. `actool` refused them outright and the iOS build failed with "the app
 * icon set named AppIcon did not have any applicable content".
 *
 * The mark is redrawn here from its definition rather than recovered: an ink
 * field, the CV monogram in Georgia, and the ember dot — the same shapes as the
 * favicon in index.html.
 *
 * Usage:
 *   node scripts/generate-brand-assets.mjs
 *   npx @capacitor/assets generate --iconBackgroundColor '#1B1713' \
 *       --iconBackgroundColorDark '#1B1713' --splashBackgroundColor '#FAF7F2' \
 *       --splashBackgroundColorDark '#15130F'
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

const INK = '#1B1713';
const PAPER = '#FAF7F2';
const EMBER = '#C8442C';
const INK_DARK = '#15130F';

/**
 * The monogram, drawn as an SVG group at a nominal 1024 box.
 *
 * @param scale  Fraction of the canvas the mark occupies. Android adaptive icons
 *               mask aggressively, so the foreground layer uses a smaller value
 *               to stay inside the safe zone.
 */
const monogram = (fg, accent, scale = 1) => {
  // Proportions taken straight from the favicon in index.html (a 32px box with
  // 14px type on a 21.5 baseline and a 3px dot at 25,25), scaled to 1024 so the
  // app icon and the browser tab show the identical mark.
  const c = 1024 / 2;
  const fontSize = 448 * scale;
  const baseline = c + 176 * scale;
  const dotR = 96 * scale;
  const dotX = c + 288 * scale;
  const dotY = c + 288 * scale;
  return `
    <text x="${c}" y="${baseline}" font-family="Georgia, 'Times New Roman', serif"
          font-size="${fontSize}" font-weight="600" fill="${fg}"
          text-anchor="middle">CV</text>
    <circle cx="${dotX}" cy="${dotY}" r="${dotR}" fill="${accent}" />
  `;
};

const iconSvg = ({ background, foreground, accent, scale = 1 }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${background ? `<rect width="1024" height="1024" fill="${background}" />` : ''}
  ${monogram(foreground, accent, scale)}
</svg>`;

/** Splash: the wordmark centred on a plain field, sized for the 2732 square. */
const splashSvg = (background, foreground) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732">
  <rect width="2732" height="2732" fill="${background}" />
  <text x="1366" y="1400" font-family="Georgia, 'Times New Roman', serif"
        font-size="300" font-weight="600" fill="${foreground}"
        text-anchor="middle" letter-spacing="-6">CVbase</text>
  <circle cx="1690" cy="1400" r="26" fill="${EMBER}" />
</svg>`;

const TARGETS = [
  // Full-bleed app icon. iOS and Android both mask this themselves.
  { file: 'icon.png', size: 1024, svg: iconSvg({ background: INK, foreground: PAPER, accent: EMBER }) },
  // Android adaptive layers. The foreground is inset to survive the mask.
  {
    file: 'icon-foreground.png',
    size: 1024,
    svg: iconSvg({ background: null, foreground: PAPER, accent: EMBER, scale: 0.62 }),
  },
  { file: 'icon-background.png', size: 1024, svg: iconSvg({ background: INK, foreground: 'none', accent: 'none' }) },
  { file: 'splash.png', size: 2732, svg: splashSvg(PAPER, INK) },
  { file: 'splash-dark.png', size: 2732, svg: splashSvg(INK_DARK, PAPER) },
];

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const main = async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    // Puppeteer's own Chromium download was skipped by npm's script policy, so
    // drive the system Chrome instead.
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    headless: true,
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });

  try {
    for (const target of TARGETS) {
      const page = await browser.newPage();
      await page.setViewport({ width: target.size, height: target.size, deviceScaleFactor: 1 });
      await page.setContent(
        `<!doctype html><html><body style="margin:0;background:transparent">${target.svg}</body></html>`,
        { waitUntil: 'load' },
      );
      // Georgia is a system face; give the renderer a beat to bind it.
      await page.evaluate(() => document.fonts.ready);

      const buffer = await page.screenshot({
        type: 'png',
        omitBackground: true,
        clip: { x: 0, y: 0, width: target.size, height: target.size },
      });
      const outPath = path.join(OUT, target.file);
      fs.writeFileSync(outPath, buffer);

      // Guard against reintroducing the very corruption this script exists to
      // fix: assert the PNG magic on the bytes we just wrote.
      const header = fs.readFileSync(outPath).subarray(0, 8);
      const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (!header.equals(expected)) {
        throw new Error(`${target.file} is not a valid PNG (header ${header.toString('hex')})`);
      }

      console.log(`✓ ${target.file} — ${target.size}×${target.size}, ${buffer.length} bytes`);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\nNow fan out to every platform size:');
  console.log('  npx @capacitor/assets generate');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
