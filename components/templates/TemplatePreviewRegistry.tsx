import React, { useEffect, useRef, useState } from 'react';
import type { ResumeSettings, SectionId, TemplateId } from '../../types';
import { exampleData } from '../../exampleData';
import GsbExecutiveTemplate from './GsbExecutiveTemplate';
import IvyEliteTemplate from './IvyEliteTemplate';
import VanguardClassicTemplate from './VanguardClassicTemplate';
import EecsMitTemplate from './EecsMitTemplate';
import CalBerkeleyTemplate from './CalBerkeleyTemplate';
import LambdaTechTemplate from './LambdaTechTemplate';
import StanfordDschoolTemplate from './StanfordDschoolTemplate';
import SynergyStartupTemplate from './SynergyStartupTemplate';
import MinimalistEdgeTemplate from './MinimalistEdgeTemplate';
import ResumePreview from '../ResumePreview';
import TealTemplate from './TealTemplate';
import ProfessionalTemplate from './ProfessionalTemplate';
import CreativeTemplate from './CreativeTemplate';
import ExecutiveTemplate from './ExecutiveTemplate';
import CorporateTemplate from './CorporateTemplate';
import ModernTemplate from './ModernTemplate';
import ProfessionalV2Template from './ProfessionalV2Template';
import CreativeV2Template from './CreativeV2Template';
import ExecutiveV2Template from './ExecutiveV2Template';
import CorporateV2Template from './CorporateV2Template';
import TechTemplate from './TechTemplate';
import TechV2Template from './TechV2Template';
import TechBlueTemplate from './TechBlueTemplate';
import TecAtsTemplate from './TecAtsTemplate';
import EscobarTemplate from './EscobarTemplate';
import HarvardTemplate from './HarvardTemplate';
import MidnightTemplate from './MidnightTemplate';
import SwissTemplate from './SwissTemplate';
import ErasmusTemplate from './ErasmusTemplate';
import MinimalistTemplate from './MinimalistTemplate';
import ImpactTemplate from './ImpactTemplate';
import GlitchTemplate from './GlitchTemplate';
import VogueTemplate from './VogueTemplate';
import OnyxTemplate from './OnyxTemplate';
import BloomTemplate from './BloomTemplate';
import TimelineTemplate from './TimelineTemplate';
import AmsterdamTemplate from './AmsterdamTemplate';
import KyotoTemplate from './KyotoTemplate';
import NeoMemphisTemplate from './NeoMemphisTemplate';
import NordicTemplate from './NordicTemplate';
import MetropolitanTemplate from './MetropolitanTemplate';
import CyberGridTemplate from './CyberGridTemplate';
import MelbourneTemplate from './MelbourneTemplate';
import OakTemplate from './OakTemplate';
import LeafyTemplate from './LeafyTemplate';
import RedwoodTemplate from './RedwoodTemplate';
import DesignerTemplate from './DesignerTemplate';
import GoldenTemplate from './GoldenTemplate';
import CobaltTemplate from './CobaltTemplate';
import BerlinTemplate from './BerlinTemplate';
import BerlinIITemplate from './BerlinIITemplate';
import UrbanTemplate from './UrbanTemplate';
import ClassicTemplate from './ClassicTemplate';
import CleanTemplate from './CleanTemplate';
import CompactTemplate from './CompactTemplate';
import SimpleTemplate from './SimpleTemplate';
import FunctionalTemplate from './FunctionalTemplate';
import DirectTemplate from './DirectTemplate';
import GlobalTemplate from './GlobalTemplate';
import ModernIITemplate from './ModernIITemplate';
import TokyoTemplate from './TokyoTemplate';
import BarcelonaTemplate from './BarcelonaTemplate';
import SubwayTemplate from './SubwayTemplate';
import MonacoTemplate from './MonacoTemplate';
import AustinTemplate from './AustinTemplate';
import OxfordTemplate from './OxfordTemplate';
import VancouverTemplate from './VancouverTemplate';
import ChicagoTemplate from './ChicagoTemplate';
import ReykjavikTemplate from './ReykjavikTemplate';
import BerlinV3Template from './BerlinV3Template';
import MilanTemplate from './MilanTemplate';
import SiliconTemplate from './SiliconTemplate';
import GenevaTemplate from './GenevaTemplate';
import SaoPauloTemplate from './SaoPauloTemplate';
import CasablancaTemplate from './CasablancaTemplate';

/** Template component registry shared by the Dashboard gallery and the PRISM
 *  template picker. 'default' falls back to the base ResumePreview. */

// Typed against TemplateId so a template added to types.ts without a renderer
// here is a compile error (same completeness guard as the other templateMaps).
export const templateMap: Record<TemplateId | 'default', React.FC<any>> = {
    'gsb-executive': GsbExecutiveTemplate,
    'ivy-elite': IvyEliteTemplate,
    'vanguard-classic': VanguardClassicTemplate,
    'eecs-mit': EecsMitTemplate,
    'cal-berkeley': CalBerkeleyTemplate,
    'lambda-tech': LambdaTechTemplate,
    'stanford-dschool': StanfordDschoolTemplate,
    'synergy-startup': SynergyStartupTemplate,
    'minimalist-edge': MinimalistEdgeTemplate,
    default: ResumePreview,
    classic: ClassicTemplate,
    clean: CleanTemplate,
    compact: CompactTemplate,
    simple: SimpleTemplate,
    functional: FunctionalTemplate,
    direct: DirectTemplate,
    global: GlobalTemplate,
    urban: UrbanTemplate,
    berlin: BerlinTemplate,
    'berlin-ii': BerlinIITemplate,
    cobalt: CobaltTemplate,
    designer: DesignerTemplate,
    golden: GoldenTemplate,
    teal: TealTemplate,
    professional: ProfessionalTemplate,
    creative: CreativeTemplate,
    executive: ExecutiveTemplate,
    corporate: CorporateTemplate,
    modern: ModernTemplate,
    'professional-v2': ProfessionalV2Template,
    'creative-v2': CreativeV2Template,
    'executive-v2': ExecutiveV2Template,
    'corporate-v2': CorporateV2Template,
    tech: TechTemplate,
    'tech-v2': TechV2Template,
    'tech-blue': TechBlueTemplate,
    'tec-ats': TecAtsTemplate,
    escobar: EscobarTemplate,
    harvard: HarvardTemplate,
    midnight: MidnightTemplate,
    swiss: SwissTemplate,
    erasmus: ErasmusTemplate,
    minimalist: MinimalistTemplate,
    impact: ImpactTemplate,
    glitch: GlitchTemplate,
    vogue: VogueTemplate,
    onyx: OnyxTemplate,
    bloom: BloomTemplate,
    timeline: TimelineTemplate,
    amsterdam: AmsterdamTemplate,
    kyoto: KyotoTemplate,
    neomemphis: NeoMemphisTemplate,
    nordic: NordicTemplate,
    metropolitan: MetropolitanTemplate,
    cybergrid: CyberGridTemplate,
    melbourne: MelbourneTemplate,
    oak: OakTemplate,
    leafy: LeafyTemplate,
    redwood: RedwoodTemplate,
    'modern-ii': ModernIITemplate,
    tokyo: TokyoTemplate,
    barcelona: BarcelonaTemplate,
    subway: SubwayTemplate,
    monaco: MonacoTemplate,
    austin: AustinTemplate,
    oxford: OxfordTemplate,
    vancouver: VancouverTemplate,
    chicago: ChicagoTemplate,
    reykjavik: ReykjavikTemplate,
    'berlin-v3': BerlinV3Template,
    milan: MilanTemplate,
    silicon: SiliconTemplate,
    geneva: GenevaTemplate,
    'sao-paulo': SaoPauloTemplate,
    casablanca: CasablancaTemplate,
};

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

    const Component = templateMap[templateId as TemplateId] || ResumePreview;

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
                    <span className="material-symbols-outlined text-gray-300 animate-pulse text-4xl">image</span>
                </div>
            )}
        </div>
    );
});
