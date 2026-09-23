---
name: CVBase Career OS
description: A calm desktop-grade career workspace; slate canvas, hairline panels, an ink sidebar and one emerald accent for action.
colors:
  emerald-action: "#047857"
  emerald-action-deep: "#065f46"
  emerald-glow: "#34d399"
  ink-sidebar: "#0f172a"
  slate-canvas: "#f8fafc"
  panel-white: "#ffffff"
  hairline: "#e2e8f0"
  hairline-strong: "#64748b"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#64748b"
  sidebar-text: "#cbd5e1"
  sidebar-icon: "#94a3b8"
  status-warning: "#b45309"
  status-danger: "#dc2626"
  status-info: "#4f46e5"
  dark-canvas: "#0f172a"
  dark-panel: "#1e293b"
  dark-elevated: "#273549"
  dark-hairline: "#334155"
  dark-text-primary: "#e2e8f0"
  dark-text-secondary: "#cbd5e1"
  dark-text-muted: "#94a3b8"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  wordmark:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "19px"
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.015em"
  section:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  ui:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.3
  label:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  numeral:
    fontFamily: "\"Instrument Sans\", system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "\"tnum\""
rounded:
  control: "8px"
  nav: "9px"
  field: "10px"
  menu: "12px"
  panel: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  panel-pad: "28px"
  page-x: "40px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-action}"
    textColor: "{colors.panel-white}"
    typography: "{typography.ui}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.emerald-action-deep}"
  button-secondary:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.slate-canvas}"
  button-quiet:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.panel-white}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  context-chip:
    backgroundColor: "{colors.slate-canvas}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "28px"
  pill-neutral:
    backgroundColor: "{colors.slate-canvas}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  sidebar:
    backgroundColor: "{colors.ink-sidebar}"
    textColor: "{colors.sidebar-text}"
    width: "248px"
  sidebar-rail:
    backgroundColor: "{colors.ink-sidebar}"
    width: "64px"
  sidebar-ask:
    textColor: "{colors.sidebar-icon}"
    rounded: "{rounded.field}"
    height: "38px"
  topbar:
    backgroundColor: "{colors.panel-white}"
    height: "56px"
    padding: "0 24px"
  search-field:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.menu}"
    padding: "10px 12px 10px 36px"
---

# Design System: CVBase Career OS

## Overview

**Creative North Star: "The Quiet Command Center"**

Career OS is app chrome that serves a stressful, repetitive task, so it reads in one glance and then gets out of the way. A dark ink sidebar with a faint emerald glow anchors the left edge; everything else is a pale slate canvas carrying white panels drawn with 1px hairlines. Structure comes from borders, surface steps and whitespace, not from shadows or stacked cards. One emerald colour is reserved for the thing to do next, for selection and for progress, so a filled emerald control always means "this is the action."

Type is set with care because the product's claim is typographic craft: Instrument Sans for every piece of interface, with Fraunces appearing exactly twice, in the wordmark and in the Today greeting. Counts use tabular numerals. Labels are sentence case at small sizes in muted slate; there are no uppercase or monospace eyebrows above headings, because the shell's breadcrumb already says where you are.

Density is calm rather than sparse. Secondary information is folded behind progressive disclosure (Sources, "Then · n more", "What moved where", the builder's More menu) instead of competing on first read. Ask CVbase (⌘K) is a first-class surface, present in both the sidebar head and the top bar. The CV document itself is always ink on white; the chrome themes, the document never does.

**Key Characteristics:**
- Ink sidebar (248px, collapsing to a 64px rail) against a slate canvas with white hairline panels.
- One saturated colour, emerald, used for one filled primary per context.
- Instrument Sans for UI; Fraunces only for the wordmark and the Today greeting.
- 1px hairlines at 16px panel radius; no card-on-card, no ambient shadows.
- Progressive disclosure over dense first views.
- Ask/search (⌘K) always one keystroke away.
- A full dark theme driven by the same tokens.

## Colors

A cool slate neutral spectrum with a single emerald voice; status hues appear only as tinted chips and small icons.

### Primary
- **Ledger Emerald** (`emerald-action`): the fill of the one primary button per context, the focus ring, the active sidebar icon glow's source, selected rows in the command palette (10% tint with a 40% ring), unread badges on the top bar, and the accent tone of pills. Hover and active deepen to **Deep Ledger Emerald** (`emerald-action-deep`).
- **Glow Emerald** (`emerald-glow`): emerald as it appears on dark ground: the active nav icon in the sidebar, the sidebar focus outline, and the text/focus value of `action-primary` in the dark theme.

### Neutral
- **Ink Sidebar** (`ink-sidebar`): the sidebar slab in both themes, overlaid with a radial emerald glow at 20% alpha from the top-left corner. Also primary text in light mode (`text-primary`).
- **Slate Canvas** (`slate-canvas`): the page behind every panel; also the hover fill for quiet and secondary controls and neutral pills.
- **Panel White** (`panel-white`): panels, the top bar, the phone tab bar, menus.
- **Hairline** (`hairline`): every 1px panel border, divider and top-bar rule. **Strong Hairline** (`hairline-strong`) outlines secondary buttons and inputs and is the chip hover border.
- **Slate Secondary / Muted** (`text-secondary`, `text-muted`): supporting copy and small labels, respectively.
- **Sidebar Text / Icon** (`sidebar-text`, `sidebar-icon`): nav labels and resting icons on the ink slab; white and `#f8fafc` at hover and active.

### Status
- **Amber** (`status-warning`), **Red** (`status-danger`), **Indigo** (`status-info`): text and 10%-tint chip fills with 30% borders only. Emerald doubles as success.

### Dark theme
Canvas becomes `dark-canvas`, panels `dark-panel`, menus and sheets `dark-elevated`, hairlines `dark-hairline`, and text flips to `dark-text-primary` / `dark-text-secondary` / `dark-text-muted`. The primary button fill stays Ledger Emerald; emerald text and focus rings switch to Glow Emerald. The sidebar keeps its ink slab, so in dark mode it is separated from the canvas by its 1px `rgba(226,232,240,0.08)` right edge rather than by value.

### Named Rules
**The Two-Variable Rule.** Every colour exists as a text variable (`--ct-*`) and a surface variable (`--cb-*`), because a ramp step moves in opposite directions for text and slabs when the theme flips. Raw CSS `color:` uses `rgb(var(--ct-sem-*))`; backgrounds, borders and rings use `rgb(var(--cb-sem-*))`. In Tailwind, `text-content-*` resolves to `--ct-sem-text-*` and `bg-surface-*` / `border-border-*` to `--cb-sem-*`. Values change only in `scripts/generate-theme-css.mjs`, which also enforces WCAG AA.

**The One Emerald Rule.** Emerald `action-primary` is the only saturated action colour, and a context carries one filled emerald button. Everything else is secondary (outlined), quiet (text only) or a link in emerald text.

**The Ink-on-White Document Rule.** Resume previews and exports re-declare the light tokens and never invert.

## Typography

**Display Font:** Fraunces (with Georgia, serif)
**Body Font:** Instrument Sans (with system-ui, sans-serif)

**Character:** A soft, high-contrast serif used as a signature, not a system, set against a clear, slightly humanist grotesque that carries all the work.

### Hierarchy
- **Display** (Fraunces 500, 36px desktop / 32px phone, line-height 1.05, -0.03em): the Today greeting only.
- **Wordmark** (Fraunces, 19px, -0.03em): the "CVbase." name in the sidebar head and phone header, with a 30px monogram tile.
- **Headline** (600, 28px / 26px phone, -0.02em): the single `h1` of each space (SpaceHeader); 20px when compact.
- **Title** (600, 23px / 21px phone, -0.015em): the next-action headline and space-level panel titles (20px).
- **Section** (600, 15px): headings inside panels ("In progress").
- **Body** (400, 15px, line-height 1.625, capped at 62-70ch): descriptions and state lines.
- **UI** (500, 13.5px): nav items, crumbs, menu items; 13px for buttons in the small size and panel rows.
- **Label** (500-600, 12.5px, sentence case, muted): field labels inside panels ("Why it matters", "Goal", "CV in use") and meta lines. Pills are 11px semibold.
- **Numeral** (600, 22px, tabular): progress-strip counts; every count and badge uses tabular figures.

### Named Rules
**The Two-Appearances Rule.** Fraunces appears in the wordmark and the Today greeting and nowhere else in the Career OS chrome.

**The No-Eyebrow Rule.** Nothing sits above a heading to label it: no uppercase, letter-spaced or monospace kickers. Location lives in the top bar breadcrumb; a label that names a field inside a panel is sentence case at 12.5px.

## Layout

A two-column desktop app: the sidebar, then a main column with a 56px top bar and a scrolling body padded 32px top and 40-48px sides (24px below `md`), content centred at a 1240px max on Today and 1024px (`max-w-5xl`) on most spaces.

Today stacks greeting and state line, a full-width next-action panel, the progress strip and "In progress", with a 300px context rail on the right from 1280px (32px gutter); below 1280px the rail stacks under the main column. The rail is not panelled: it is a stack of labelled groups separated by hairlines (goal, CV in use, campaign, next date, Ask the Coach, recent activity), sticky at the top on wide screens.

The sidebar is 248px and collapses to a 64px icon rail by user choice (persisted), automatically below 1100px, and always while the CV editor is open, so the editor keeps its width inside the shell.

Below 1024px (and always in the native apps) the shell becomes a phone layout: a panel-white header with the wordmark, search and inbox; a body padded 16px; and a bottom tab bar (Today, Opportunities, Campaigns, CV Builder, More) respecting the bottom safe area. Tab labels are 10.5px semibold and become screen-reader-only below 360px, leaving 23px icons. On phones the CV editor is pushed full screen with its own back bar and no tab bar.

Rhythm runs on 4px: 6px and 8px inside controls, 16px and 24px between blocks, 28px panel padding (24px on phones).

## Elevation & Depth

Flat by default. Depth comes from three surface steps (canvas, panel, elevated) and 1px hairlines; panels at rest carry no shadow. The only shadows belong to layers that float over the page: menus and popovers, and the dialog sheet of the command palette.

### Shadow Vocabulary
- **Floating menu** (`box-shadow: 0 16px 36px -12px rgba(15, 23, 42, 0.4)`): account menu and row "More" menus opened from the shell.

### Named Rules
**The Hairline Rule.** If it sits on the page, it is outlined, not lifted. A shadow means the layer floats and will close.

## Shapes

Soft rectangles with graded radii: 8px for buttons and small controls, 9-10px for sidebar items, the Ask field and builder controls, 12px for menus and the search input, 16px for panels, and fully round for chips, pills and badges. Borders are always 1px. Panels are never nested: inside a panel, sub-regions are divided by hairline rules (the next action's footer bar, the progress strip's vertical dividers, the rail's horizontal rules), not by inner cards.

## Components

### Buttons
Confident but few.
- **Shape:** gently rounded (8px), minimum 44px touch target, 600 weight, icon gap 8px.
- **Primary:** Ledger Emerald fill with white label; hover and active deepen to Deep Ledger Emerald. One per context.
- **Secondary:** panel fill, Strong Hairline border, primary text; hover fills with canvas.
- **Quiet:** text-only in secondary slate; hover fills with canvas and darkens the label. Used for the next action's Snooze / I did this elsewhere / Dismiss / Sources row.
- **Danger:** panel fill, 40% red border, red label, 10% red hover.
- **Focus:** 2px ring in `focus-ring` offset 2px from the panel. **Loading:** the label stays, a spinner replaces the leading icon, the control disables.

### Chips
- **Context chip (top bar):** 28px, round, Hairline border on canvas, 12.5px secondary text with a 13px muted icon; hover strengthens the border and text. Shows goal, campaign and application/opportunity; skips whatever the breadcrumb already names.
- **Pills / status chips:** 11px semibold, round, 2px 8px. Neutral is canvas with hairline; toned variants use a 10% tint and 30% border of the status or accent colour. The text always carries the meaning; colour never does alone.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Panel White (Dark Panel in dark mode).
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Hairline.
- **Internal Padding:** 24px phone, 28px desktop; list panels run edge to edge with 24px row padding.

### Inputs / Fields
- **Style:** 12px radius, Strong Hairline border, panel fill, 15px text, leading 16px muted search icon.
- **Focus:** 2px `focus-ring` ring, no outline.

### Navigation
- **Sidebar:** ink slab with emerald glow. Head: wordmark and collapse toggle (60px tall). Beneath it the Ask field (38px, 10px radius, 5.5% white fill, ⌘K key hint). Items are 36px tall, 9px radius, 13.5px medium in sidebar text with muted icons; hover adds 6% white, active 10% white with a white 600-weight label and a Glow Emerald icon. Groups ("Workspaces") are 11.5px semibold muted slate, sentence case. The foot holds the inbox with a round count badge, an account button with a 30px emerald avatar tile, and an outlined emerald Upgrade button. In the rail, items become 40px squares with tooltips and badges move to the corner.
- **Top bar:** 56px, panel fill, hairline bottom. Left: breadcrumb (space › record, 13.5px, current in 600). Middle: context chips from 1024px. Right: the Ask button (34px, bordered, label and ⌘K shown from 1280px) and the inbox button with an emerald count badge.
- **Phone:** bottom tabs on panel white with a hairline top; active tab in emerald with a 2px stroke icon, rest muted at 1.75. More opens a bottom sheet of grouped rows.

### Ask CVbase (Command palette)
Opened from the sidebar Ask field, the top bar or ⌘K / Ctrl K anywhere. A 15px search field over grouped results (12px semibold muted group titles); the first "Ask" row and the keyboard-selected row get a 10% emerald fill with a 40% emerald ring. A one-line key hint sits under the field.

### Next Action (signature)
The Today lead: a panel with a 21-23px title and a 15px reason, the single emerald button with its time estimate beneath at the right (full width on phones), a hairline, then a two-column "Why it matters / What you get" pair. A hairline footer holds quiet actions and a "Then · n more" disclosure; Sources expands the evidence inline.

### Progress Strip
One panel split by vertical hairlines into Goal → Opportunities → Applications → Interviews → Offers, each with a 13px icon label, a 22px tabular count and a 12.5px sub-line; small round chevron joints sit on the dividers. Scrolls horizontally below 1024px.

### Builder top band
Inside the CV editor the classic builder keeps its toolbar but speaks the same language: 10px-radius controls at 13px semibold, one emerald Save, less frequent actions behind a quiet More menu, the Master Profile sync as a single 16px-radius row (emerald 5% tint when linked), and the ATS compliance meter in a hairline panel.

## Do's and Don'ts

### Do:
- **Do** use `rgb(var(--ct-sem-*))` for raw CSS text colour and `rgb(var(--cb-sem-*))` for backgrounds, borders and rings; in Tailwind use `text-content-*`, `bg-surface-*`, `border-border-*`.
- **Do** give each context exactly one filled Ledger Emerald button and make everything else secondary or quiet.
- **Do** outline surfaces with 1px Hairline at 16px radius and divide their insides with hairline rules.
- **Do** fold secondary material behind a named disclosure (Sources, "Then · n more", "What moved where", More) rather than showing it all.
- **Do** use tabular numerals for every count and badge.
- **Do** keep Ask CVbase (⌘K) reachable from the sidebar head, the top bar and the keyboard on every screen.
- **Do** meet 44px touch targets and respect safe-area insets on fixed chrome.
- **Do** check both themes; the document preview stays ink on white in both.

### Don't:
- **Don't** set Fraunces anywhere but the wordmark and the Today greeting.
- **Don't** put uppercase, letter-spaced or monospace eyebrows or kickers above headings.
- **Don't** nest a bordered card inside a panel.
- **Don't** add resting shadows to panels; shadows are for floating layers only.
- **Don't** introduce a second saturated action colour, or use the landing page's vermilion ember in the app chrome.
- **Don't** colour raw CSS text with a `--cb-*` variable or surfaces with a `--ct-*` variable; the dark theme breaks.
