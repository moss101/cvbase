import type { ResumeData, SectionId } from '../../types';

/**
 * Section-ordering helper shared by every resume template.
 *
 * Templates used to render their body sections as a fixed JSX sequence and
 * ResumeBuilder re-sorted the DOM afterwards by sniffing header text. Now each
 * template asks this helper for the list of SectionIds to render and maps over
 * it, so `formData.sectionOrder` is honoured at render time and tooling can
 * find sections via `data-section="<SectionId>"` instead of text matching.
 */

/** Every body section a template may render, in the app's canonical order. */
export const BODY_SECTIONS: readonly SectionId[] = [
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'languages',
    'awards',
    'trainings',
    'publications',
    'volunteer',
    'custom',
];

/** Sections every template renders regardless of the optional-section toggles
 *  (the wizard's `visibleSections` only lists the *optional* ones a user has
 *  switched on — see NAV_SECTIONS in constants.ts). */
export const CORE_SECTIONS: readonly SectionId[] = ['summary', 'experience', 'education', 'skills'];

/** Sections that only render when present in `visibleSections`. */
export const OPTIONAL_SECTIONS: readonly SectionId[] = [
    'projects',
    'certifications',
    'languages',
    'awards',
    'trainings',
    'publications',
    'volunteer',
    'custom',
];

/** Wizard steps that are not resume content and never render as a section. */
const NON_BODY: ReadonlySet<string> = new Set<string>(['contact', 'customize', 'finalize']);
const CORE: ReadonlySet<string> = new Set<string>(CORE_SECTIONS);

/** True when `id` should render for the given optional-section toggles. Core
 *  sections are always visible; optional ones need an explicit toggle. */
export function isSectionVisible(id: SectionId, visibleSections: readonly SectionId[] | null | undefined): boolean {
    if (NON_BODY.has(id)) return false;
    if (CORE.has(id)) return true;
    return Array.isArray(visibleSections) && visibleSections.includes(id);
}

/**
 * The ordered list of body sections a template should render.
 *
 * - `formData.sectionOrder` (if any) drives the order. Ids it doesn't know
 *   (typos, wizard steps like 'contact', sections this template never shows)
 *   are ignored, and duplicates collapse to their first occurrence.
 * - Ids missing from `sectionOrder` are appended in `defaultOrder` order, so an
 *   undefined / partial `sectionOrder` degrades to the template's own layout.
 * - The result is filtered by `visibleSections` (core sections always pass).
 *
 * @param defaultOrder The sections this template (or one column of it) renders,
 *   in its designed order. Defaults to every body section in canonical order.
 */
export function orderedSections(
    formData: Pick<ResumeData, 'sectionOrder'> | null | undefined,
    visibleSections: readonly SectionId[] | null | undefined,
    defaultOrder: readonly SectionId[] = BODY_SECTIONS,
): SectionId[] {
    const known: SectionId[] = [];
    const knownSet = new Set<string>();
    for (const id of defaultOrder) {
        if (NON_BODY.has(id) || knownSet.has(id)) continue;
        knownSet.add(id);
        known.push(id);
    }

    const result: SectionId[] = [];
    const seen = new Set<string>();
    const requested = Array.isArray(formData?.sectionOrder) ? formData!.sectionOrder! : [];
    for (const raw of requested) {
        if (typeof raw !== 'string' || !knownSet.has(raw) || seen.has(raw)) continue;
        seen.add(raw);
        result.push(raw as SectionId);
    }
    for (const id of known) {
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(id);
    }

    return result.filter((id) => isSectionVisible(id, visibleSections));
}

export type LayoutRun =
    | { kind: 'section'; id: SectionId }
    | { kind: 'run'; name: string; ids: SectionId[] }
    | { kind: 'block'; name: string; ids: SectionId[] };

export interface LayoutSpec {
    /** Contiguous groups: consecutive members merge into one `run`; the same
     *  group may yield several runs when a shuffled order interleaves them.
     *  Used for sections handed to a shared renderer (OptionalSectionsRenderer)
     *  so the default layout keeps its single block. */
    runs?: Record<string, readonly SectionId[]>;
    /** Anchored groups: every present member collapses into ONE `block` at the
     *  first member's position. Used for fixed multi-column grids whose cells
     *  the designer pinned (e.g. an education/skills side-by-side pair). */
    blocks?: Record<string, readonly SectionId[]>;
}

/**
 * Turns an ordered id list into layout runs so a template can map over it and
 * still emit its grouped structures (shared renderer blocks, fixed grids).
 * Ids that belong to no group come back as plain `section` runs.
 */
export function sectionLayout(order: readonly SectionId[], spec: LayoutSpec): LayoutRun[] {
    const runOf = new Map<string, string>();
    for (const [name, ids] of Object.entries(spec.runs ?? {})) for (const id of ids) runOf.set(id, name);
    const blockOf = new Map<string, string>();
    for (const [name, ids] of Object.entries(spec.blocks ?? {})) for (const id of ids) blockOf.set(id, name);

    const out: LayoutRun[] = [];
    const emittedBlocks = new Set<string>();
    for (const id of order) {
        const block = blockOf.get(id);
        if (block) {
            if (emittedBlocks.has(block)) continue;
            emittedBlocks.add(block);
            out.push({ kind: 'block', name: block, ids: order.filter((x) => blockOf.get(x) === block) });
            continue;
        }
        const run = runOf.get(id);
        if (run) {
            const last = out[out.length - 1];
            if (last && last.kind === 'run' && last.name === run) last.ids.push(id);
            else out.push({ kind: 'run', name: run, ids: [id] });
            continue;
        }
        out.push({ kind: 'section', id });
    }
    return out;
}
