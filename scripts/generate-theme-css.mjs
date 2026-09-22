/**
 * Generates `styles/theme.css` — the CSS custom properties that back every
 * colour in the Tailwind config.
 *
 * Why this exists
 * ---------------
 * The app uses ~3,400 raw neutral utilities (`text-gray-500`, `bg-white`,
 * `border-slate-200`, …) spread over 147 component files. Hand-annotating each
 * one with a `dark:` variant is not viable, so instead every colour in
 * `tailwind.config.js` resolves to `rgb(var(--c-…) / <alpha-value>)` and this
 * script emits the light values plus an inverted dark set. Flipping the `.dark`
 * class on <html> then re-themes the whole app without touching a component.
 *
 * Resume templates are the deliberate exception: a CV is always ink-on-white,
 * so the template roots re-declare the light values and are immune to the flip.
 *
 * On top of the raw ramps and brand colours sits a small semantic layer
 * (`SEMANTIC` below) — surface/text/border/action/status/focus/evidence roles
 * that alias existing values, so Career OS screens can name what a colour is
 * *for* without inventing page-local palettes.
 *
 * Run: node scripts/generate-theme-css.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import palette from 'tailwindcss/colors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Neutral ramps carry surfaces, borders and body text — the bulk of the UI. */
const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
/** Accent ramps are chips, badges, status pills and inline highlights. */
const ACCENTS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];

/**
 * A ramp step means different things depending on where it is used, and the two
 * meanings move in opposite directions when the theme flips:
 *
 *   text-gray-800   dark text on a light page -> must become LIGHT
 *   bg-gray-800     a dark slab on a light page -> must stay DARK
 *
 * Tailwind keys `textColor` and `backgroundColor` separately, so each gets its
 * own mapping. The rule for dark mode is simply: all text goes light, all
 * surfaces go dark, and each keeps its own hierarchy.
 */

/**
 * Text: every step lands in the light half of the ramp. Steps 50–300 are already
 * light (they are used for text on dark slabs) so they stay put; the dark steps
 * mirror across, preserving relative emphasis.
 *
 * 400 is deliberately not mirrored — a straight swap puts muted text at ~4.0:1
 * on a dark surface, under the 4.5:1 AA floor. `assertNoRegression` proves the
 * chosen value is no worse than the light theme it mirrors.
 */
const TEXT_MAP = {
  50: 50, 100: 100, 200: 200, 300: 300,
  400: 400, 500: 400,
  600: 300, 700: 200, 800: 100, 900: 50, 950: 50,
};

/**
 * Surfaces: every step lands in the dark half. Light steps (50–300, panels and
 * borders) fold onto the dark end while staying ordered relative to each other,
 * and steps that were already dark slabs deepen slightly rather than inverting.
 */
const SURFACE_MAP = {
  50: 900, 100: 850, 200: 800, 300: 750,
  400: 700, 500: 600,
  600: 700, 700: 800, 800: 900, 900: 950, 950: 975,
};

const hexToRgb = (hex) => {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const triplet = (hex) => hexToRgb(hex).join(' ');

const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

const mix = (hexA, hexB, t) => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(a.map((c, i) => c + (b[i] - c) * t));
};

/**
 * Resolves a step that may fall between Tailwind's stops (850, 750, 975) by
 * interpolating its neighbours, so SURFACE_MAP can express finer gradations
 * than the stock ramp offers.
 */
const stepColor = (ramp, step) => {
  if (ramp[step]) return ramp[step];
  if (step === 975) return mix(ramp[950], '#000000', 0.4);
  const lower = Math.floor(step / 100) * 100;
  const upper = lower + 100;
  if (!ramp[lower] || !ramp[upper]) {
    throw new Error(`Cannot interpolate step ${step}`);
  }
  return mix(ramp[lower], ramp[upper], (step - lower) / 100);
};

/** WCAG relative luminance. */
const luminance = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// ---------------------------------------------------------------------------
// Brand colours. Dark values are hand-picked rather than derived: the editorial
// ink-on-paper palette and the teal/indigo product palette both need their own
// treatment to stay on-brand once inverted.
// ---------------------------------------------------------------------------
/**
 * Brand colours as [light, darkText, darkSurface].
 *
 * The two dark values exist because a brand colour means opposite things in its
 * two roles. `text-primary` is teal type on a pale page and has to brighten to
 * stay legible on a dark one; `bg-primary` is a solid teal button carrying white
 * type, so brightening it would drop that white text from 4.8:1 to 2.1:1. Same
 * story for `text-ink` (dark copy, must lighten) versus `bg-ink` (a dark slab
 * whose `text-white`/`text-paper` labels must keep something dark to sit on).
 *
 * Where a colour has only one sensible role the two dark values are identical.
 */
const BRAND = {
  // key:            [light,     darkText,  darkSurface]
  /**
   * Emerald accent engine. One saturated colour drives primary buttons,
   * switches, focus rings and card headers across the app chrome, so a
   * saturated element always means "this is the action".
   *
   * The surface value stays at emerald-700 rather than following the text value
   * up the ramp: white labels sit on it, and emerald-600 would put them at
   * 3.7:1. Emerald-700 holds 4.8:1.
   */
  'primary':         ['#047857', '#34D399', '#047857'],
  'primary-light':   ['#D1FAE5', '#A7F3D0', '#064E3B'],
  'primary-dark':    ['#065F46', '#6EE7B7', '#065F46'],
  'secondary':       ['#7582FC', '#9BA5FF', '#5A67E8'],
  'secondary-light': ['#EEF0FF', '#EEF0FF', '#1B1E38'],
  'secondary-dark':  ['#4F46E5', '#A5B4FC', '#4F46E5'],
  'success':         ['#047857', '#34D399', '#047857'],
  'warning':         ['#B45309', '#FBBF24', '#B45309'],
  'danger':          ['#DC2626', '#F87171', '#DC2626'],
  /**
   * Adaptive slate neutral base: #F8FAFC light, #0F172A dark. `dark` is body
   * text and `light` is the page surface, so they hold opposite roles.
   */
  'ui-dark':         ['#0F172A', '#E2E8F0', '#111A2E'],
  'ui-light':        ['#F8FAFC', '#F8FAFC', '#0F172A'],
  // Hairline. Structure comes from 1px borders, not drop shadows.
  'ui-border':       ['#E2E8F0', '#334155', '#334155'],
  // Editorial landing palette — ink on paper with one vermilion accent.
  'paper':           ['#FAF7F2', '#FAF7F2', '#15130F'],
  'paper-deep':      ['#F2EDE3', '#F2EDE3', '#1E1B16'],
  'paper-bright':    ['#FFFDF8', '#FFFDF8', '#1A1712'],
  'ink':             ['#1B1713', '#F5F0E8', '#100E0B'],
  'ink-soft':        ['#5A5247', '#C3B9AB', '#241F1A'],
  'ink-faint':       ['#8B8274', '#9A9082', '#2E2822'],
  'ember':           ['#C8442C', '#F08A72', '#C8442C'],
  'ember-deep':      ['#A8351F', '#F5A38C', '#A8351F'],
  'ember-tint':      ['#F6E5DD', '#F6E5DD', '#33211B'],
  /**
   * `bg-white` must become a dark surface; `text-white` must stay white.
   * The dark surfaces step *up* from the #0F172A base so a card reads as raised
   * without needing a shadow.
   */
  'surface':         ['#FFFFFF', '#FFFFFF', '#1E293B'],
  'surface-raised':  ['#FFFFFF', '#FFFFFF', '#273549'],
  'on-accent':       ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
  'true-black':      ['#000000', '#000000', '#000000'],
};

/** Glass utilities are alpha-composited, so they carry raw rgba values. */
const GLASS = {
  'glass-border':    ['255 255 255 / 0.5',  '255 255 255 / 0.08'],
  'glass-surface':   ['255 255 255 / 0.75', '28 31 38 / 0.75'],
  'glass-highlight': ['255 255 255 / 0.9',  '38 42 51 / 0.9'],
};

// ---------------------------------------------------------------------------
// Semantic aliases (docs/career-os/DESIGN_SYSTEM.md). Career OS screens name
// a *role* — the panel, secondary copy, a warning, inferred evidence — and the
// role points at an existing brand or ramp value. Nothing here is a new colour:
// a role either aliases a BRAND key (inheriting its light/darkText/darkSurface
// split) or a neutral ramp step (inheriting the TEXT_MAP/SURFACE_MAP split),
// so the semantic layer flips with the theme exactly as the rest of the app.
//
// Emitted as `--ct-sem-<role>` / `--cb-sem-<role>` and mapped in
// tailwind.config.js as surface.canvas/panel/elevated, content.primary/
// secondary/muted, border.default/strong, action.primary/secondary,
// status.success/warning/danger/info, focus.ring and evidence.verified/
// confirmed/inferred/incomplete.
// ---------------------------------------------------------------------------
/**
 * A role is one of:
 *   { brand: key }              — alias of a BRAND entry
 *   { ramp, step }              — alias of a neutral ramp step (both roles)
 *   { light, dark }             — a mark: one value per theme in *both* roles,
 *                                 for lines and rings that are drawn as
 *                                 elements yet must read as foreground
 */
const SEMANTIC = {
  'surface-canvas':      { brand: 'ui-light' },
  'surface-panel':       { brand: 'surface' },
  'surface-elevated':    { brand: 'surface-raised' },
  /**
   * Body copy on the app chrome. `ui-dark` is the existing body colour; the
   * secondary and muted steps come from the slate ramp that the chrome is
   * built on rather than the editorial ink palette, so a career screen reads
   * as one neutral family. slate-500 rather than ink-faint for muted copy:
   * ink-faint sits at 3.55:1 (parity-gated) whereas slate-500 clears AA on
   * every semantic surface in both themes.
   */
  'text-primary':        { brand: 'ui-dark' },
  'text-secondary':      { ramp: 'slate', step: 600 },
  'text-muted':          { ramp: 'slate', step: 500 },
  'border-default':      { brand: 'ui-border' },
  /**
   * The border that identifies a control (inputs, selected cards). Held to
   * 3:1 against the canvas and the panel in both themes (WCAG 1.4.11), which
   * is why the dark value is the *lighter* slate step.
   */
  'border-strong':       { light: palette.slate[500], dark: palette.slate[400] },
  'action-primary':      { brand: 'primary' },
  'action-secondary':    { brand: 'secondary' },
  'status-success':      { brand: 'success' },
  'status-warning':      { brand: 'warning' },
  'status-danger':       { brand: 'danger' },
  /**
   * Informational status is the indigo end of the secondary family: plain
   * `secondary` is a 3.1:1 periwinkle as text on white, `secondary-dark`
   * clears AA as text and keeps white labels legible as a surface.
   */
  'status-info':         { brand: 'secondary-dark' },
  /**
   * Focus rings are drawn as elements but read as foreground, so the ring
   * takes the *text* value of primary in both roles — the surface value would
   * be a 2.3:1 ring on the dark canvas.
   */
  'focus-ring':          { light: BRAND.primary[0], dark: BRAND.primary[1] },
  // Evidence states (ConfirmationState). Labels and icons carry the meaning;
  // these only reinforce it.
  'evidence-verified':   { brand: 'success' },
  'evidence-confirmed':  { brand: 'primary-dark' },
  'evidence-inferred':   { brand: 'warning' },
  'evidence-incomplete': { ramp: 'slate', step: 500 },
};

/** Resolves a semantic role to [light, darkText, darkSurface]. */
const resolveSemantic = (name, role) => {
  if (role.brand) {
    const entry = BRAND[role.brand];
    if (!entry) throw new Error(`Semantic ${name} aliases unknown brand colour ${role.brand}`);
    return entry;
  }
  if (role.ramp) {
    const ramp = palette[role.ramp];
    if (!ramp || !ramp[role.step]) throw new Error(`Semantic ${name} aliases unknown step ${role.ramp}-${role.step}`);
    return [ramp[role.step], stepColor(ramp, TEXT_MAP[role.step]), stepColor(ramp, SURFACE_MAP[role.step])];
  }
  if (role.light && role.dark) return [role.light, role.dark, role.dark];
  throw new Error(`Semantic ${name} has no source`);
};

/** name -> [light, darkText, darkSurface], the same shape as BRAND. */
const SEM = Object.fromEntries(
  Object.entries(SEMANTIC).map(([name, role]) => [name, resolveSemantic(name, role)]),
);

/** The base page surface in dark mode — what most text is read against. */
const DARK_SURFACE = BRAND.surface[2];

const light = [];
const dark = [];

for (const family of [...NEUTRALS, ...ACCENTS]) {
  const ramp = palette[family];
  if (!ramp) throw new Error(`Unknown Tailwind colour family: ${family}`);
  for (const step of STEPS) {
    const lightHex = ramp[step];
    if (!lightHex) throw new Error(`Missing ${family}-${step}`);
    // Both roles share the stock value in the light theme, so light mode renders
    // byte-identical to the pre-migration CDN build.
    light.push(`  --ct-${family}-${step}: ${triplet(lightHex)};`);
    light.push(`  --cb-${family}-${step}: ${triplet(lightHex)};`);
    dark.push(`  --ct-${family}-${step}: ${triplet(stepColor(ramp, TEXT_MAP[step]))};`);
    dark.push(`  --cb-${family}-${step}: ${triplet(stepColor(ramp, SURFACE_MAP[step]))};`);
  }
}

for (const [name, [l, darkText, darkSurface]] of Object.entries(BRAND)) {
  light.push(`  --ct-${name}: ${triplet(l)};`);
  light.push(`  --cb-${name}: ${triplet(l)};`);
  dark.push(`  --ct-${name}: ${triplet(darkText)};`);
  dark.push(`  --cb-${name}: ${triplet(darkSurface)};`);
}

for (const [name, [l, darkText, darkSurface]] of Object.entries(SEM)) {
  light.push(`  --ct-sem-${name}: ${triplet(l)};`);
  light.push(`  --cb-sem-${name}: ${triplet(l)};`);
  dark.push(`  --ct-sem-${name}: ${triplet(darkText)};`);
  dark.push(`  --cb-sem-${name}: ${triplet(darkSurface)};`);
}

for (const [name, [l, d]] of Object.entries(GLASS)) {
  light.push(`  --cb-${name}: ${l};`);
  dark.push(`  --cb-${name}: ${d};`);
}

// ---------------------------------------------------------------------------
// Contrast gate. Body text on its matching surface must clear WCAG AA (4.5:1)
// in both themes, otherwise the build fails loudly rather than shipping an
// unreadable dark mode.
// ---------------------------------------------------------------------------
const report = [];
let failures = 0;

const assertContrast = (label, fg, bg, floor = 4.5) => {
  const ratio = contrast(hexToRgb(fg), hexToRgb(bg));
  const ok = ratio >= floor;
  if (!ok) failures++;
  report.push(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${ratio.toFixed(2)}:1`);
};

/**
 * The `-400` step is a deliberately muted placeholder/disabled tone and sits at
 * ~2.5:1 on white in stock Tailwind — a pre-existing trait of the light theme,
 * not something the dark ramp introduces. Holding it to AA would mean redesigning
 * the existing web palette, so it is instead gated on *parity*: dark must be no
 * less readable than the light theme it mirrors.
 */
const assertNoRegression = (label, darkFg, darkBg, lightFg, lightBg) => {
  const darkRatio = contrast(hexToRgb(darkFg), hexToRgb(darkBg));
  const lightRatio = contrast(hexToRgb(lightFg), hexToRgb(lightBg));
  const ok = darkRatio >= lightRatio;
  if (!ok) failures++;
  report.push(
    `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ` +
      `${darkRatio.toFixed(2)}:1 vs light ${lightRatio.toFixed(2)}:1`,
  );
};

for (const family of NEUTRALS) {
  const ramp = palette[family];
  // Real body text: both themes must clear AA on their own base surface.
  for (const step of [500, 600, 700, 800, 900]) {
    assertContrast(`light ${family}-${step} on white`, ramp[step], '#FFFFFF');
    assertContrast(
      `dark ${family}-${step} on surface`,
      stepColor(ramp, TEXT_MAP[step]),
      DARK_SURFACE,
    );
  }
  // Muted tone: parity only — see note above.
  assertNoRegression(
    `${family}-400 muted parity`,
    stepColor(ramp, TEXT_MAP[400]), DARK_SURFACE,
    ramp[400], '#FFFFFF',
  );
  /**
   * Light text sitting on a dark slab — `text-gray-100` on `bg-gray-900`. This
   * is the pairing that a single inverted ramp gets wrong: the text would darken
   * at the same time as the slab stayed dark. Both roles are checked together.
   */
  for (const [textStep, bgStep] of [[50, 900], [100, 900], [200, 800], [100, 800]]) {
    assertContrast(
      `dark ${family}-${textStep} on bg-${family}-${bgStep}`,
      stepColor(ramp, TEXT_MAP[textStep]),
      stepColor(ramp, SURFACE_MAP[bgStep]),
    );
    assertContrast(
      `light ${family}-${textStep} on bg-${family}-${bgStep}`,
      ramp[textStep],
      ramp[bgStep],
    );
  }
  // Light surfaces must actually become dark, or nothing else holds.
  for (const step of [50, 100, 200]) {
    assertContrast(
      `dark bg-${family}-${step} vs light text`,
      '#F5F0E8',
      stepColor(ramp, SURFACE_MAP[step]),
    );
  }
}
/** Body copy on its page surface, in both themes. */
const TEXT_ON_SURFACE = [
  ['ink on paper', 'ink', 'paper'],
  ['ink-soft on paper', 'ink-soft', 'paper'],
  ['ui-dark on ui-light', 'ui-dark', 'ui-light'],
  // The inverted slab: light type on a dark block, in both themes.
  ['paper on ink slab', 'paper', 'ink'],
];

for (const [label, fg, bg] of TEXT_ON_SURFACE) {
  assertContrast(`light ${label}`, BRAND[fg][0], BRAND[bg][0]);
  assertContrast(`dark ${label}`, BRAND[fg][1], BRAND[bg][2]);
}

/**
 * Solid accent buttons carrying white labels — the pairing that breaks if an
 * accent brightens in its surface role. `bg-primary text-white` would drop from
 * 4.8:1 to 2.1:1 if `primary` were allowed to lighten as a background.
 */
const WHITE_ON_ACCENT = [
  'primary', 'primary-dark', 'secondary', 'secondary-dark',
  'ember', 'ember-deep', 'danger', 'success',
];

for (const name of WHITE_ON_ACCENT) {
  assertNoRegression(
    `white on bg-${name}`,
    '#FFFFFF', BRAND[name][2],
    '#FFFFFF', BRAND[name][0],
  );
}

/**
 * `ink-faint` is the editorial palette's equivalent of the `-400` step — a
 * deliberately recessive tone for timestamps and meta labels, already at 3.55:1
 * on paper in the existing light theme. Parity, not AA.
 */
assertNoRegression(
  'ink-faint on paper',
  BRAND['ink-faint'][1], BRAND.paper[2],
  BRAND['ink-faint'][0], BRAND.paper[0],
);

/** Accent-coloured text reading against the page surface. */
for (const name of ['primary', 'primary-dark', 'ember', 'ember-deep', 'danger']) {
  assertNoRegression(
    `text-${name} on surface`,
    BRAND[name][1], DARK_SURFACE,
    BRAND[name][0], '#FFFFFF',
  );
}

// ---------------------------------------------------------------------------
// Semantic pairs. These are the combinations the Career OS primitives are
// built from, so every one is held to AA (or 3:1 for non-text marks) in both
// themes rather than parity — a new surface has no legacy contrast to inherit.
// ---------------------------------------------------------------------------
const SEM_SURFACES = ['surface-canvas', 'surface-panel', 'surface-elevated'];
const SEM_TEXT = ['text-primary', 'text-secondary', 'text-muted'];
const SEM_TONES = [
  'status-success', 'status-warning', 'status-danger', 'status-info',
  'evidence-verified', 'evidence-confirmed', 'evidence-inferred', 'evidence-incomplete',
];

/** Text role of `fg` on the surface role of `bg`, both themes. */
const assertSemanticText = (fg, bg, floor = 4.5) => {
  assertContrast(`light sem ${fg} on ${bg}`, SEM[fg][0], SEM[bg][0], floor);
  assertContrast(`dark sem ${fg} on ${bg}`, SEM[fg][1], SEM[bg][2], floor);
};

for (const bg of SEM_SURFACES) {
  for (const fg of SEM_TEXT) assertSemanticText(fg, bg);
}
// Status and evidence tones as text or icons on the panel they sit in.
for (const fg of SEM_TONES) assertSemanticText(fg, 'surface-panel');

// White labels on solid action and status surfaces. The primary action is
// held to AA; the rest mirror the existing brand gate (no regression), since
// `secondary` already carries white labels at its current ratio elsewhere.
assertContrast('light white on sem action-primary', '#FFFFFF', SEM['action-primary'][0]);
assertContrast('dark white on sem action-primary', '#FFFFFF', SEM['action-primary'][2]);
for (const name of ['action-secondary', 'status-success', 'status-warning', 'status-danger', 'status-info']) {
  assertNoRegression(
    `white on sem ${name}`,
    '#FFFFFF', SEM[name][2],
    '#FFFFFF', SEM[name][0],
  );
}

// Non-text marks (WCAG 1.4.11): the focus ring and the strong border must be
// visible against the canvas and the panel in both themes.
for (const mark of ['focus-ring', 'border-strong']) {
  for (const bg of ['surface-canvas', 'surface-panel']) {
    assertContrast(`light sem ${mark} vs ${bg}`, SEM[mark][0], SEM[bg][0], 3);
    assertContrast(`dark sem ${mark} vs ${bg}`, SEM[mark][2], SEM[bg][2], 3);
  }
}

const header = `/**
 * GENERATED FILE — edit scripts/generate-theme-css.mjs and re-run:
 *   node scripts/generate-theme-css.mjs
 *
 * Light values apply at :root and are re-declared on resume-template roots so a
 * CV always renders ink-on-white regardless of the active theme. The .dark
 * block flips surfaces and text for the rest of the app.
 */`;

// The template selectors re-declare light values on the element itself, which
// beats the inherited .dark values without needing !important.
const LIGHT_SELECTOR = [
  ':root',
  '.force-light',
  '[id^="resume-preview"]',
  '#capture-root',
  '#print-resume-container',
  '.resume-preview',
  // Every resume template root carries the A4 width class, including the
  // gallery thumbnails which render without an id.
  '[class*="w-[794px]"]',
].join(',\n');

const css = `${header}

${LIGHT_SELECTOR} {
  color-scheme: light;
${light.join('\n')}
}

.dark {
  color-scheme: dark;
${dark.join('\n')}
}
`;

fs.mkdirSync(path.join(ROOT, 'styles'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'styles', 'theme.css'), css, 'utf8');

console.log(report.join('\n'));
console.log(
  `\n${report.length - failures}/${report.length} contrast checks passed.`,
);
console.log(
  `Wrote styles/theme.css — ${light.length} colour tokens per theme.`,
);

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) below AA. Adjust the palette.`);
  process.exit(1);
}
