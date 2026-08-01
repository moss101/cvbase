
import React, { useState } from 'react';
import { useFitScale } from '../lib/useFitScale';
import type { ResumeData, SectionId, TemplateId, ResumeSettings } from '../types';
import { NAV_SECTIONS } from '../constants';
import { ContactIcon, SummaryIcon, ExperienceIcon, ProjectsIcon, EducationIcon, SkillsIcon, CertificationsIcon, FinalizeIcon, LanguagesIcon, CustomizeIcon, AwardIcon, TrainingIcon, PublicationIcon, VolunteerIcon, CustomIcon } from './common/icons';
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
import PreviewModal from './PreviewModal';
import { useTranslation } from '../services/translationService';

interface NavSidebarProps {
    activeSection: SectionId;
    onSectionClick: (id: SectionId) => void;
    progress: number;
    formData: ResumeData;
    onDownloadPDF: () => void;
    selectedTemplate: TemplateId;
    visibleSections: SectionId[];
    onToggleSection: (id: SectionId) => void;
    onGoHome: () => void;
    settings: ResumeSettings;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
}

const NavIcon: React.FC<{ id: SectionId; active: boolean }> = ({ id, active }) => {
    const icons: Record<SectionId, React.ReactElement> = {
        contact: <ContactIcon />,
        summary: <SummaryIcon />,
        experience: <ExperienceIcon />,
        projects: <ProjectsIcon />,
        education: <EducationIcon />,
        skills: <SkillsIcon />,
        certifications: <CertificationsIcon />,
        languages: <LanguagesIcon />,
        awards: <AwardIcon />,
        trainings: <TrainingIcon />,
        publications: <PublicationIcon />,
        volunteer: <VolunteerIcon />,
        custom: <CustomIcon />,
        customize: <CustomizeIcon />,
        finalize: <FinalizeIcon />,
    };
    return <div className={`mr-3 transition-colors duration-300 ${active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`}>{icons[id]}</div>;
};


const NavSidebar: React.FC<NavSidebarProps> = ({ activeSection, onSectionClick, progress, formData, onDownloadPDF, selectedTemplate, visibleSections, onToggleSection, onGoHome, settings, isMobileOpen, onCloseMobile }) => {
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    // The template renders at a fixed A4 width, so the preview is scaled to
    // whatever width the card actually gets rather than a fixed guess.
    const previewFit = useFitScale<HTMLDivElement>(794);
    const [isToggleListOpen, setIsToggleListOpen] = useState(false);
    const { t } = useTranslation();
    
    const renderTemplate = () => {
        const props = { formData, isCardPreview: false, visibleSections, settings };
        switch (selectedTemplate) {
            case 'gsb-executive': return <GsbExecutiveTemplate {...props} />;
            case 'ivy-elite': return <IvyEliteTemplate {...props} />;
            case 'vanguard-classic': return <VanguardClassicTemplate {...props} />;
            case 'eecs-mit': return <EecsMitTemplate {...props} />;
            case 'cal-berkeley': return <CalBerkeleyTemplate {...props} />;
            case 'lambda-tech': return <LambdaTechTemplate {...props} />;
            case 'stanford-dschool': return <StanfordDschoolTemplate {...props} />;
            case 'synergy-startup': return <SynergyStartupTemplate {...props} />;
            case 'minimalist-edge': return <MinimalistEdgeTemplate {...props} />;
            case 'default': return <ResumePreview {...props} />;
            case 'classic': return <ClassicTemplate {...props} />;
            case 'clean': return <CleanTemplate {...props} />;
            case 'compact': return <CompactTemplate {...props} />;
            case 'simple': return <SimpleTemplate {...props} />;
            case 'functional': return <FunctionalTemplate {...props} />;
            case 'direct': return <DirectTemplate {...props} />;
            case 'global': return <GlobalTemplate {...props} />;
            case 'urban': return <UrbanTemplate {...props} />;
            case 'berlin': return <BerlinTemplate {...props} />;
            case 'berlin-ii': return <BerlinIITemplate {...props} />;
            case 'cobalt': return <CobaltTemplate {...props} />;
            case 'designer': return <DesignerTemplate {...props} />;
            case 'golden': return <GoldenTemplate {...props} />;
            case 'teal': return <TealTemplate {...props} />;
            case 'professional': return <ProfessionalTemplate {...props} />;
            case 'creative': return <CreativeTemplate {...props} />;
            case 'executive': return <ExecutiveTemplate {...props} />;
            case 'corporate': return <CorporateTemplate {...props} />;
            case 'modern': return <ModernTemplate {...props} />;
            case 'professional-v2': return <ProfessionalV2Template {...props} />;
            case 'creative-v2': return <CreativeV2Template {...props} />;
            case 'executive-v2': return <ExecutiveV2Template {...props} />;
            case 'corporate-v2': return <CorporateV2Template {...props} />;
            case 'tech': return <TechTemplate {...props} />;
            case 'tech-v2': return <TechV2Template {...props} />;
            case 'tech-blue': return <TechBlueTemplate {...props} />;
            case 'tec-ats': return <TecAtsTemplate {...props} />;
            case 'escobar': return <EscobarTemplate {...props} />;
            case 'modern-ii': return <ModernIITemplate {...props} />;
            case 'harvard': return <HarvardTemplate {...props} />;
            case 'midnight': return <MidnightTemplate {...props} />;
            case 'swiss': return <SwissTemplate {...props} />;
            case 'erasmus': return <ErasmusTemplate {...props} />;
            case 'minimalist': return <MinimalistTemplate {...props} />;
            case 'impact': return <ImpactTemplate {...props} />;
            case 'glitch': return <GlitchTemplate {...props} />;
            case 'vogue': return <VogueTemplate {...props} />;
            case 'onyx': return <OnyxTemplate {...props} />;
            case 'bloom': return <BloomTemplate {...props} />;
            case 'timeline': return <TimelineTemplate {...props} />;
            case 'amsterdam': return <AmsterdamTemplate {...props} />;
            case 'melbourne': return <MelbourneTemplate {...props} />;
            case 'oak': return <OakTemplate {...props} />;
            case 'leafy': return <LeafyTemplate {...props} />;
            case 'redwood': return <RedwoodTemplate {...props} />;
            case 'kyoto': return <KyotoTemplate {...props} />;
            case 'neomemphis': return <NeoMemphisTemplate {...props} />;
            case 'nordic': return <NordicTemplate {...props} />;
            case 'metropolitan': return <MetropolitanTemplate {...props} />;
            case 'cybergrid': return <CyberGridTemplate {...props} />;
            case 'tokyo': return <TokyoTemplate {...props} />;
            case 'barcelona': return <BarcelonaTemplate {...props} />;
            case 'subway': return <SubwayTemplate {...props} />;
            case 'monaco': return <MonacoTemplate {...props} />;
            case 'austin': return <AustinTemplate {...props} />;
            case 'oxford': return <OxfordTemplate {...props} />;
            case 'vancouver': return <VancouverTemplate {...props} />;
            case 'chicago': return <ChicagoTemplate {...props} />;
            case 'reykjavik': return <ReykjavikTemplate {...props} />;
            case 'berlin-v3': return <BerlinV3Template {...props} />;
            case 'milan': return <MilanTemplate {...props} />;
            case 'silicon': return <SiliconTemplate {...props} />;
            case 'geneva': return <GenevaTemplate {...props} />;
            case 'sao-paulo': return <SaoPauloTemplate {...props} />;
            case 'casablanca': return <CasablancaTemplate {...props} />;
            default: return <ResumePreview {...props} />;
        }
    }
    
    const displayedSections = NAV_SECTIONS.filter(section => {
        if (section.optional) {
            return visibleSections.includes(section.id);
        }
        return true;
    });

    return (
        <>
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
                    onClick={onCloseMobile}
                />
            )}
            <aside className={`w-[290px] md:w-[400px] fixed lg:sticky left-0 top-0 h-full z-40 bg-white/95 backdrop-blur-2xl border-r border-white/20 shadow-2xl flex flex-col font-sans transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                
                {/* Scrollable Container for ALL content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100/50 pr-4 shrink-0">
                        <div 
                            className="p-6 font-bold text-2xl cursor-pointer flex items-center gap-3 hover:bg-white/55 transition-colors flex-1"
                            onClick={onGoHome}
                            title={t('label.backToDashboard', 'Back to Dashboard')}
                        >
                            <div className="bg-gradient-to-br from-primary to-secondary text-white p-2.5 rounded-xl shadow-lg shadow-primary/20">
                                 <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                            </div>
                            <div>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">CVBase</span>
                            </div>
                        </div>
                        {onCloseMobile && (
                            <button 
                                onClick={onCloseMobile}
                                className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-900 active:scale-95 transition cursor-pointer flex items-center justify-center"
                                title="Close Sidebar"
                            >
                                <span className="material-symbols-outlined text-lg leading-none">close</span>
                            </button>
                        )}
                    </div>

                    {/* Navigation Items */}
                    <nav className="py-4 px-3 space-y-1">
                        {displayedSections.map(section => (
                            <div
                                key={section.id}
                                className={`group flex items-center px-4 py-3 cursor-pointer transition-all rounded-xl mx-1 font-medium text-sm border border-transparent ${
                                    activeSection === section.id 
                                    ? 'bg-primary/10 text-primary border-primary/10 shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                                onClick={() => {
                                    onSectionClick(section.id);
                                    onCloseMobile?.();
                                }}
                            >
                                <NavIcon id={section.id} active={activeSection === section.id} />
                                {t('nav.' + section.id, section.name)}
                            </div>
                        ))}
                    </nav>

                    {/* Collapsible Section Toggles inside Sidebar */}
                    <div className="mx-4 mb-4 p-4 bg-gray-50/60 border border-gray-100 rounded-2xl transition-all">
                        <button
                            type="button"
                            onClick={() => setIsToggleListOpen(!isToggleListOpen)}
                            className="w-full flex items-center justify-between text-left focus:outline-none hover:bg-gray-100/40 p-1.5 rounded-lg transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-500 text-[18px]">visibility</span>
                                <span className="text-[12px] font-bold text-gray-700 tracking-wide uppercase">Toggle Sections</span>
                                <span className="bg-primary/12 text-primary text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                    {visibleSections.length}
                                </span>
                            </div>
                            <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform duration-300 ${isToggleListOpen ? 'rotate-180' : ''}`}>
                                keyboard_arrow_down
                            </span>
                        </button>
                        
                        {isToggleListOpen && (
                            <div className="mt-3.5 grid grid-cols-1 gap-1.5 border-t border-gray-100/60 pt-3.5 animate-slide-down">
                                {NAV_SECTIONS.filter(sec => sec.optional).map(item => {
                                    const isEnabled = visibleSections.includes(item.id);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => onToggleSection(item.id)}
                                            className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all rounded-xl border ${
                                                isEnabled 
                                                    ? 'border-primary/15 bg-primary/5 text-slate-800' 
                                                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 bg-transparent">
                                                <NavIcon id={item.id} active={isEnabled} />
                                                <span className={`text-[13px] font-medium transition-colors -ml-1 ${isEnabled ? 'font-semibold' : ''}`}>
                                                    {t('nav.' + item.id, item.name)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-4.5 rounded-full relative transition-colors duration-200 shrink-0 ${isEnabled ? 'bg-primary' : 'bg-gray-200'}`}>
                                                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all duration-200 ${isEnabled ? 'left-4' : 'left-0.5'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Preview Section - Pushed to bottom via mt-auto, but scrolls if needed */}
                    <div className="mt-auto p-6 bg-gradient-to-t from-white/80 to-transparent border-t border-gray-100">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('label.livePreview', 'Live Preview')}</span>
                            <span className="text-sm font-bold text-primary">{progress}% {t('label.ready', 'Ready')}</span>
                        </div>
                        
                        {/* Preview Card Container */}
                        <div
                            ref={previewFit.ref}
                            className="w-full aspect-[210/297] bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden cursor-pointer hover:shadow-2xl hover:border-primary/50 transition-all transform hover:-translate-y-1 relative group"
                            onClick={() => setIsPreviewModalOpen(true)}
                            title="Click for full-size preview"
                        >
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 z-20 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur text-primary px-4 py-2 rounded-full font-bold text-sm shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                    Expand View
                                </span>
                            </div>
                            
                            {/* Scaled Preview Wrapper - Absolutely positioned to not break layout flow */}
                            <div
                                className="absolute top-0 left-0 w-[794px] min-h-[1123px] origin-top-left pointer-events-none select-none bg-white"
                                style={{ transform: `scale(${previewFit.scale})` }}
                            >
                                <div id="resume-preview-wrapper" className="h-full w-full">
                                   {renderTemplate()}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-4">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out rounded-full"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>

                        {/* Action Buttons */}
                        <button
                            onClick={onDownloadPDF}
                            className="w-full mt-5 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <span className="material-symbols-outlined text-lg group-hover:animate-bounce">download</span>
                            {t('btn.downloadPDF', 'Download PDF')}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Modal for Full Preview */}
            <PreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                formData={formData}
                selectedTemplate={selectedTemplate}
                visibleSections={visibleSections}
                settings={settings}
            />
        </>
    );
};

export default NavSidebar;
