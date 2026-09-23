# CVBase

The forward product requirements and implementation plan now live in [PRD.md](PRD.md) and [tasks.md](tasks.md). This document preserves the existing brand and design baseline; its description of CVBase as a CV builder is the pre-transformation state. Career OS changes must evolve these foundations rather than introduce a competing design system.

## Register

**Product.** The surfaces under active design — dashboard, resume builder, ATS
checker, Smart Studio, PRISM, settings and the new auth gate — are app UI where
design serves the work. The marketing landing page is the one brand surface and
keeps its own editorial treatment.

## What it is

A CV builder that gets people shortlisted. 75+ ATS-tested templates, an AI
writing assistant, a compliance meter that scores a CV the way a parser reads it,
and pixel-exact PDF/DOCX export. It ships as a web app at cvbase.ai and as
Android and iOS apps (`ai.cvbase.app`) built from the same React codebase via
Capacitor — there is no separate mobile codebase, so the platforms cannot drift.

## Who it's for

People applying for jobs, usually under time pressure and often on a phone. They
are not designers and not power users. The emotional context matters: job hunting
is stressful and repetitive, and the app is frequently opened for a ten-minute
editing session rather than a long one. Calm and legible beats clever.

## Brand personality

Precise, editorial, quietly confident. The product's claim is craft — "templates
typeset like fine print" — so the interface has to look like it was set by
someone who cares about type. Not playful, not corporate-SaaS, not gamified
(despite the existing CV-level component).

**Voice:** plain and specific. "Add your first name in the Contact section," not
"Complete your profile to unlock rewards."

## Anti-references

- Generic Android/Material default look — stock Material Symbols glyphs
  everywhere make it read as a template app rather than CVBase.
- Equal-weight button rows where four actions all compete for attention.
- Heavy drop shadows and stacked rounded cards as the only structural device.
- Gamification veneer (badges, levels) applied to a serious task.

## Design principles

1. **Hairlines, not shadows.** Structure comes from 1px borders and surface
   steps, not elevation. Depth is implied, not stacked.
2. **One primary action per screen.** Everything else recedes to secondary or
   quiet.
3. **The CV is always ink on white.** Resume previews never invert, in either
   theme or in export. The chrome themes; the document does not.
4. **Legibility is non-negotiable.** Body text clears WCAG AA in both themes,
   enforced by a contrast gate in the token build.
5. **Mobile is the primary target.** Touch targets ≥44px, safe-area insets on
   all fixed chrome, and no layout that assumes a mouse.

## Visual direction (current)

**Adaptive light/dark neutral base** on a slate spectrum — `#0F172A` dark,
`#F8FAFC` light — with subtle 1px hairline borders for depth instead of heavy
drop shadows.

**Emerald accent engine:** a single accent drives primary buttons, switches,
focus rings and card headers. It is the only saturated color in the app chrome,
so it always means "this is the action."

The marketing landing page retains the editorial ink-on-paper palette with the
vermilion ember accent; that is the brand surface and is deliberately not
converged with the app chrome.

## Accessibility

- WCAG AA for body text in both themes, verified by
  `scripts/generate-theme-css.mjs` (132 assertions, fails the build below AA).
- Every input has a label, `aria-invalid` and an associated error node.
- Respects `prefers-reduced-motion` and an in-app reduced-motion setting.
- Adjustable text size (15/16/18/20px root) as a first-class setting.

## Constraints

- Everything ships bundled: no runtime CDN, so the packaged apps work offline.
- Colors resolve through CSS variables with a text/surface role split, so a
  palette change happens in one generator rather than across 147 components.
