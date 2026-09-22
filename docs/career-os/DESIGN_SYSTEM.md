# Career OS design system contract

This extends the existing [PRODUCT.md](../../PRODUCT.md), token generator, Tailwind configuration and reusable UI. It does not claim new components or accessibility qualification already exist.

## Retain and evolve

| Layer | Existing implementation | Career OS requirement |
| --- | --- | --- |
| Palette | `scripts/generate-theme-css.mjs`, `styles/theme.css`, `tailwind.config.js` | Add semantic aliases for surface/text/action/status using the existing role split |
| Typography | `styles/fonts.css`, Tailwind font families, ThemeProvider root scales | Define title/body/label/meta roles; retain adjustable text size and bundled fonts |
| Layout | Dashboard CSS, mobile shell, existing spacing utilities | Shared page/container/split-pane hierarchy; no new page-local foundations |
| Forms | `components/forms/*`, `FieldError`, validation hooks | Labels, validation, save/conflict/disabled states and consistent action hierarchy |
| Feedback | Toast, ErrorBoundary, Dialog/ConfirmDialog, mobile BottomSheet | Reuse semantics and focus/back behavior; verify all state transitions |
| Motion | `motion`, native/view transitions, reduced-motion setting | Respect OS and in-app settings; no motion-only state meaning |
| Documents | Templates, print rules, preview registry | Always ink on white; never invert exports with app theme |
| Marketing | Landing editorial palette/components | Retain documented marketing treatment; application semantics still govern career screens |

Semantic names: `surface.canvas/panel/elevated`, `text.primary/secondary/muted`, `border.default/strong`, `action.primary/secondary`, `status.success/warning/danger/info`, `focus.ring`, `evidence.verified/confirmed/inferred/incomplete`. These are target roles, mapped to existing generated variables rather than hardcoded colors per page. Status always has readable text/icon alternatives.

## Component contracts

Consolidate before creating: ActionQueue/RecommendationCard, CareerGoalCard, CareerTimeline, AchievementCard, EvidenceBadge, OpportunityCard, FitBreakdown, CampaignCard, ApplicationCard, ReadinessChecklist, ActivityTimeline, DocumentCard, ContextSwitcher and AgentSuggestion. Existing CV cards, dialogs, buttons and mobile sheets are starting points. Each component records owner, data projection and state coverage.

Required states: normal, loading, first use, empty, partial, error/retry, permission/plan denied, AI unavailable, offline where relevant, compact and large content. Skeletons follow real layout. A card never shows fabricated example content in a real account. A priority action has a title, reason, source, destination, status and one dominant action.

Evidence states use human-readable labels. Qualification fit and career-direction fit occupy distinct labeled regions; ATS formatting score remains a separate signal. Career pulse and campaign progress must expose their denominator or checklist and “insufficient data” states. Do not use progress rings to imply precision the data does not support.

## Responsive and accessible behavior

Keep the current 1024px web shell breakpoint unless testing justifies changing it. Native stays on the native shell; tablet gets deliberate content layouts. At 320px/reflow and large text, users can complete the workflow without horizontal page scrolling; document previews may use their own labeled zoom/scroll viewport.

Desktop editor uses collapsible structure, editor and preview; mobile uses sections sheet and editor/preview modes with persistent save status. Today prioritizes a short action list; opportunity detail becomes stacked on mobile; board has a keyboard/list alternative; Coach keeps its composer visible above the keyboard/safe area.

The product touch-target baseline is 44px. Meet WCAG 2.2 AA, including full keyboard journeys, visible/unobscured focus, dialog focus return, alternative board controls, semantic headings, accessible status announcements and auth. Do not conflate the product's 44px rule with the AA minimum criterion. Reference: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Design qualification

Token script contrast checks must pass, but they are only one layer. Capture both themes and major data states at mobile/tablet/desktop widths, 200% text zoom and reduced motion. Run automated accessibility checks plus manual keyboard/screen-reader review for the canonical journeys. Verify PDF/DOCX output remains unchanged for supported representative templates and edge-length content. Record screenshots/check results in task evidence; a mockup is not completion.
