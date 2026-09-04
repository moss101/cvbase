import React, { Suspense, useEffect, useRef, useState } from 'react';
import type { ResumePreviewProps, ResumeSettings, SectionId, TemplateId } from '../../types';
import { exampleData } from '../../exampleData';

/** Template component registry shared by the Dashboard gallery, the PRISM
 *  template picker, the builder and the headless preview. 'default' falls back
 *  to the base ResumePreview.
 *
 *  Every template is code-split: `templateLoaders` holds the dynamic imports and
 *  `templateMap` wraps each in React.lazy + Suspense so consumers keep using it
 *  as a plain synchronous component (`const C = templateMap[id]; <C {...props} />`). */

export type TemplateComponent = React.ComponentType<ResumePreviewProps>;
export type TemplateLoader = () => Promise<{ default: TemplateComponent }>;

// Typed against TemplateId so a template added to types.ts without a renderer
// here is a compile error (same completeness guard as the other templateMaps).
export const templateLoaders: Record<TemplateId | 'default', TemplateLoader> = {
    'gsb-executive': () => import('./GsbExecutiveTemplate'),
    'ivy-elite': () => import('./IvyEliteTemplate'),
    'vanguard-classic': () => import('./VanguardClassicTemplate'),
    'eecs-mit': () => import('./EecsMitTemplate'),
    'cal-berkeley': () => import('./CalBerkeleyTemplate'),
    'lambda-tech': () => import('./LambdaTechTemplate'),
    'stanford-dschool': () => import('./StanfordDschoolTemplate'),
    'synergy-startup': () => import('./SynergyStartupTemplate'),
    'minimalist-edge': () => import('./MinimalistEdgeTemplate'),
    default: () => import('../ResumePreview'),
    classic: () => import('./ClassicTemplate'),
    clean: () => import('./CleanTemplate'),
    compact: () => import('./CompactTemplate'),
    simple: () => import('./SimpleTemplate'),
    functional: () => import('./FunctionalTemplate'),
    direct: () => import('./DirectTemplate'),
    global: () => import('./GlobalTemplate'),
    urban: () => import('./UrbanTemplate'),
    berlin: () => import('./BerlinTemplate'),
    'berlin-ii': () => import('./BerlinIITemplate'),
    cobalt: () => import('./CobaltTemplate'),
    designer: () => import('./DesignerTemplate'),
    golden: () => import('./GoldenTemplate'),
    teal: () => import('./TealTemplate'),
    professional: () => import('./ProfessionalTemplate'),
    creative: () => import('./CreativeTemplate'),
    executive: () => import('./ExecutiveTemplate'),
    corporate: () => import('./CorporateTemplate'),
    modern: () => import('./ModernTemplate'),
    'professional-v2': () => import('./ProfessionalV2Template'),
    'creative-v2': () => import('./CreativeV2Template'),
    'executive-v2': () => import('./ExecutiveV2Template'),
    'corporate-v2': () => import('./CorporateV2Template'),
    tech: () => import('./TechTemplate'),
    'tech-v2': () => import('./TechV2Template'),
    'tech-blue': () => import('./TechBlueTemplate'),
    'tec-ats': () => import('./TecAtsTemplate'),
    escobar: () => import('./EscobarTemplate'),
    harvard: () => import('./HarvardTemplate'),
    midnight: () => import('./MidnightTemplate'),
    swiss: () => import('./SwissTemplate'),
    erasmus: () => import('./ErasmusTemplate'),
    minimalist: () => import('./MinimalistTemplate'),
    impact: () => import('./ImpactTemplate'),
    glitch: () => import('./GlitchTemplate'),
    vogue: () => import('./VogueTemplate'),
    onyx: () => import('./OnyxTemplate'),
    bloom: () => import('./BloomTemplate'),
    timeline: () => import('./TimelineTemplate'),
    amsterdam: () => import('./AmsterdamTemplate'),
    kyoto: () => import('./KyotoTemplate'),
    neomemphis: () => import('./NeoMemphisTemplate'),
    nordic: () => import('./NordicTemplate'),
    metropolitan: () => import('./MetropolitanTemplate'),
    cybergrid: () => import('./CyberGridTemplate'),
    melbourne: () => import('./MelbourneTemplate'),
    oak: () => import('./OakTemplate'),
    leafy: () => import('./LeafyTemplate'),
    redwood: () => import('./RedwoodTemplate'),
    'modern-ii': () => import('./ModernIITemplate'),
    tokyo: () => import('./TokyoTemplate'),
    barcelona: () => import('./BarcelonaTemplate'),
    subway: () => import('./SubwayTemplate'),
    monaco: () => import('./MonacoTemplate'),
    austin: () => import('./AustinTemplate'),
    oxford: () => import('./OxfordTemplate'),
    vancouver: () => import('./VancouverTemplate'),
    chicago: () => import('./ChicagoTemplate'),
    reykjavik: () => import('./ReykjavikTemplate'),
    'berlin-v3': () => import('./BerlinV3Template'),
    milan: () => import('./MilanTemplate'),
    silicon: () => import('./SiliconTemplate'),
    geneva: () => import('./GenevaTemplate'),
    'sao-paulo': () => import('./SaoPauloTemplate'),
    casablanca: () => import('./CasablancaTemplate'),
};

/** Paper-shaped placeholder: an A4 sheet with greyed-out text bars. Used both
 *  as the Suspense fallback while a template chunk loads and as the gallery
 *  thumbnail placeholder before a card scrolls into view. */
export const TemplateSkeleton: React.FC<{ className?: string }> = ({ className = 'w-[794px] min-h-[1123px]' }) => (
    <div className={`${className} bg-white p-[6%] animate-pulse`} aria-hidden="true" data-template-skeleton="">
        <div className="h-[3.5%] w-1/2 rounded bg-gray-200 mb-[1.5%]" />
        <div className="h-[1.5%] w-1/3 rounded bg-gray-100 mb-[6%]" />
        {[0, 1, 2, 3].map((block) => (
            <div key={block} className="mb-[6%]">
                <div className="h-[2%] w-1/4 rounded bg-gray-200 mb-[2%]" />
                <div className="h-[1.2%] w-full rounded bg-gray-100 mb-[1.2%]" />
                <div className="h-[1.2%] w-11/12 rounded bg-gray-100 mb-[1.2%]" />
                <div className="h-[1.2%] w-4/5 rounded bg-gray-100" />
            </div>
        ))}
    </div>
);

/** Wraps a lazy loader so the result is a synchronous FC: it renders the
 *  paper skeleton until the chunk arrives, then the real template. React.lazy
 *  caches the resolved module, so later mounts render without the fallback. */
export function withSuspense(load: TemplateLoader, displayName: string): React.FC<ResumePreviewProps> {
    const Lazy = React.lazy(load);
    const Wrapped: React.FC<ResumePreviewProps> = (props) => (
        <Suspense fallback={<TemplateSkeleton />}>
            <Lazy {...props} />
        </Suspense>
    );
    Wrapped.displayName = `Lazy(${displayName})`;
    return Wrapped;
}

export const templateMap: Record<TemplateId | 'default', React.FC<any>> = Object.fromEntries(
    (Object.entries(templateLoaders) as [TemplateId | 'default', TemplateLoader][]).map(([id, load]) => [id, withSuspense(load, id)]),
) as Record<TemplateId | 'default', React.FC<any>>;

const PREVIEW_SETTINGS: ResumeSettings = {
    themeColor: '#008080',
    fontSize: 'small',
    fontFamily: 'Arial, sans-serif'
};
const PREVIEW_SECTIONS: SectionId[] = ['contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

/** Live, lazily-rendered template thumbnail: renders the real template with
 *  example data, scaled down from A4 (794×1123). Mounts the heavy template
 *  component only once scrolled near the viewport. Memoized so parent
 *  re-renders (e.g. typing in the PRISM wizard) don't re-render every
 *  mounted preview tree. */
export const LazyTemplatePreview = React.memo<{ templateId: string; scale?: number }>(function LazyTemplatePreview({ templateId, scale = 0.28 }) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '200px' });

        if (ref.current) observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    const Component = templateMap[templateId as TemplateId] || templateMap.default;

    return (
        <div ref={ref} className="w-full h-full bg-gray-100 relative overflow-hidden flex items-center justify-center group-hover:bg-gray-200 transition-colors">
            {isVisible ? (
                // Scale container fits the A4 sheet (794×1123) into the card;
                // zooms slightly on card hover (same feel as the old gallery).
                <div
                    className="origin-center transform scale-[var(--tpl-scale)] group-hover:scale-[var(--tpl-scale-hover)] shadow-2xl pointer-events-none select-none bg-white transition-transform duration-500 ease-out"
                    style={{
                        width: '794px',
                        height: '1123px',
                        '--tpl-scale': String(scale),
                        '--tpl-scale-hover': String(scale * 1.035),
                    } as React.CSSProperties}
                >
                    <Component
                        formData={exampleData}
                        isCardPreview={true}
                        visibleSections={PREVIEW_SECTIONS}
                        settings={PREVIEW_SETTINGS}
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center w-full h-full">
                    <TemplateSkeleton className="w-[62%] aspect-[794/1123] shadow-lg" />
                </div>
            )}
        </div>
    );
});
