
import React from 'react';
import type { ResumeData, TemplateId, ResumeSettings } from '../types';
import GsbExecutiveTemplate from './templates/GsbExecutiveTemplate';
import IvyEliteTemplate from './templates/IvyEliteTemplate';
import VanguardClassicTemplate from './templates/VanguardClassicTemplate';
import EecsMitTemplate from './templates/EecsMitTemplate';
import CalBerkeleyTemplate from './templates/CalBerkeleyTemplate';
import LambdaTechTemplate from './templates/LambdaTechTemplate';
import StanfordDschoolTemplate from './templates/StanfordDschoolTemplate';
import SynergyStartupTemplate from './templates/SynergyStartupTemplate';
import MinimalistEdgeTemplate from './templates/MinimalistEdgeTemplate';
import ResumePreview from './ResumePreview';
import TealTemplate from './templates/TealTemplate';
import ProfessionalTemplate from './templates/ProfessionalTemplate';
import CreativeTemplate from './templates/CreativeTemplate';
import ExecutiveTemplate from './templates/ExecutiveTemplate';
import CorporateTemplate from './templates/CorporateTemplate';
import ModernTemplate from './templates/ModernTemplate';
import ProfessionalV2Template from './templates/ProfessionalV2Template';
import CreativeV2Template from './templates/CreativeV2Template';
import ExecutiveV2Template from './templates/ExecutiveV2Template';
import CorporateV2Template from './templates/CorporateV2Template';
import TechTemplate from './templates/TechTemplate';
import TechV2Template from './templates/TechV2Template';
import TechBlueTemplate from './templates/TechBlueTemplate';
import TecAtsTemplate from './templates/TecAtsTemplate';
import EscobarTemplate from './templates/EscobarTemplate';
import HarvardTemplate from './templates/HarvardTemplate';
import MidnightTemplate from './templates/MidnightTemplate';
import SwissTemplate from './templates/SwissTemplate';
import ErasmusTemplate from './templates/ErasmusTemplate';
import MinimalistTemplate from './templates/MinimalistTemplate';
import ImpactTemplate from './templates/ImpactTemplate';
import GlitchTemplate from './templates/GlitchTemplate';
import VogueTemplate from './templates/VogueTemplate';
import OnyxTemplate from './templates/OnyxTemplate';
import BloomTemplate from './templates/BloomTemplate';
import TimelineTemplate from './templates/TimelineTemplate';
import AmsterdamTemplate from './templates/AmsterdamTemplate';
import KyotoTemplate from './templates/KyotoTemplate';
import NeoMemphisTemplate from './templates/NeoMemphisTemplate';
import NordicTemplate from './templates/NordicTemplate';
import MetropolitanTemplate from './templates/MetropolitanTemplate';
import CyberGridTemplate from './templates/CyberGridTemplate';
import MelbourneTemplate from './templates/MelbourneTemplate';
import OakTemplate from './templates/OakTemplate';
import LeafyTemplate from './templates/LeafyTemplate';
import RedwoodTemplate from './templates/RedwoodTemplate';
import DesignerTemplate from './templates/DesignerTemplate';
import GoldenTemplate from './templates/GoldenTemplate';
import CobaltTemplate from './templates/CobaltTemplate';
import BerlinTemplate from './templates/BerlinTemplate';
import BerlinIITemplate from './templates/BerlinIITemplate';
import UrbanTemplate from './templates/UrbanTemplate';
import ClassicTemplate from './templates/ClassicTemplate';
import CleanTemplate from './templates/CleanTemplate';
import CompactTemplate from './templates/CompactTemplate';
import SimpleTemplate from './templates/SimpleTemplate';
import FunctionalTemplate from './templates/FunctionalTemplate';
import DirectTemplate from './templates/DirectTemplate';
import GlobalTemplate from './templates/GlobalTemplate';
import ModernIITemplate from './templates/ModernIITemplate';
import TokyoTemplate from './templates/TokyoTemplate';
import BarcelonaTemplate from './templates/BarcelonaTemplate';
import SubwayTemplate from './templates/SubwayTemplate';
import MonacoTemplate from './templates/MonacoTemplate';
import AustinTemplate from './templates/AustinTemplate';
import OxfordTemplate from './templates/OxfordTemplate';
import VancouverTemplate from './templates/VancouverTemplate';
import ChicagoTemplate from './templates/ChicagoTemplate';
import ReykjavikTemplate from './templates/ReykjavikTemplate';
import BerlinV3Template from './templates/BerlinV3Template';
import MilanTemplate from './templates/MilanTemplate';
import SiliconTemplate from './templates/SiliconTemplate';
import GenevaTemplate from './templates/GenevaTemplate';
import SaoPauloTemplate from './templates/SaoPauloTemplate';
import CasablancaTemplate from './templates/CasablancaTemplate';

interface HeadlessPreviewProps {
    templateId: TemplateId;
    data: ResumeData;
}

// Typed by TemplateId so the typecheck enforces a renderer for every template.
const templateMap: Record<TemplateId, React.FC<any>> = {
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

const HeadlessPreview: React.FC<HeadlessPreviewProps> = ({ templateId, data }) => {
    const Component = templateMap[templateId] || ResumePreview;
    
    // Default settings for the screenshot
    const settings: ResumeSettings = {
        themeColor: '', // Use template default
        fontSize: 'medium',
        fontFamily: 'Arial, sans-serif'
    };

    const visibleSections = ['contact', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom'];

    // Render cleanly without extra wrapper styles to allow Puppeteer to manipulate size
    return (
        <div id="headless-capture-root" style={{ display: 'inline-block' }}>
            <Component 
                formData={data} 
                isCardPreview={false} 
                visibleSections={visibleSections as any} 
                settings={settings}
            />
        </div>
    );
};

export default HeadlessPreview;
