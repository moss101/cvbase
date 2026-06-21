
import React, { useState } from 'react';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import type { ResumeData, TemplateId, SectionId, ResumeSettings } from '../../types';
import { AVAILABLE_TEMPLATES } from '../../constants';
import ResumePreview from '../ResumePreview';
import GsbExecutiveTemplate from '../templates/GsbExecutiveTemplate';
import IvyEliteTemplate from '../templates/IvyEliteTemplate';
import VanguardClassicTemplate from '../templates/VanguardClassicTemplate';
import EecsMitTemplate from '../templates/EecsMitTemplate';
import CalBerkeleyTemplate from '../templates/CalBerkeleyTemplate';
import LambdaTechTemplate from '../templates/LambdaTechTemplate';
import StanfordDschoolTemplate from '../templates/StanfordDschoolTemplate';
import SynergyStartupTemplate from '../templates/SynergyStartupTemplate';
import MinimalistEdgeTemplate from '../templates/MinimalistEdgeTemplate';
import TealTemplate from '../templates/TealTemplate';
import ProfessionalTemplate from '../templates/ProfessionalTemplate';
import CreativeTemplate from '../templates/CreativeTemplate';
import ExecutiveTemplate from '../templates/ExecutiveTemplate';
import CorporateTemplate from '../templates/CorporateTemplate';
import ModernTemplate from '../templates/ModernTemplate';
import ProfessionalV2Template from '../templates/ProfessionalV2Template';
import CreativeV2Template from '../templates/CreativeV2Template';
import ExecutiveV2Template from '../templates/ExecutiveV2Template';
import CorporateV2Template from '../templates/CorporateV2Template';
import TechTemplate from '../templates/TechTemplate';
import TechV2Template from '../templates/TechV2Template';
import TechBlueTemplate from '../templates/TechBlueTemplate';
import TecAtsTemplate from '../templates/TecAtsTemplate';
import EscobarTemplate from '../templates/EscobarTemplate';
import HarvardTemplate from '../templates/HarvardTemplate';
import MidnightTemplate from '../templates/MidnightTemplate';
import SwissTemplate from '../templates/SwissTemplate';
import ErasmusTemplate from '../templates/ErasmusTemplate';
import MinimalistTemplate from '../templates/MinimalistTemplate';
import ImpactTemplate from '../templates/ImpactTemplate';
import GlitchTemplate from '../templates/GlitchTemplate';
import VogueTemplate from '../templates/VogueTemplate';
import OnyxTemplate from '../templates/OnyxTemplate';
import BloomTemplate from '../templates/BloomTemplate';
import TimelineTemplate from '../templates/TimelineTemplate';
import AmsterdamTemplate from '../templates/AmsterdamTemplate';
import MelbourneTemplate from '../templates/MelbourneTemplate';
import OakTemplate from '../templates/OakTemplate';
import LeafyTemplate from '../templates/LeafyTemplate';
import RedwoodTemplate from '../templates/RedwoodTemplate';
import DesignerTemplate from '../templates/DesignerTemplate';
import KyotoTemplate from '../templates/KyotoTemplate';
import NeoMemphisTemplate from '../templates/NeoMemphisTemplate';
import NordicTemplate from '../templates/NordicTemplate';
import MetropolitanTemplate from '../templates/MetropolitanTemplate';
import CyberGridTemplate from '../templates/CyberGridTemplate';
import GoldenTemplate from '../templates/GoldenTemplate';
import CobaltTemplate from '../templates/CobaltTemplate';
import BerlinTemplate from '../templates/BerlinTemplate';
import BerlinIITemplate from '../templates/BerlinIITemplate';
import UrbanTemplate from '../templates/UrbanTemplate';
import ClassicTemplate from '../templates/ClassicTemplate';
import CleanTemplate from '../templates/CleanTemplate';
import CompactTemplate from '../templates/CompactTemplate';
import SimpleTemplate from '../templates/SimpleTemplate';
import FunctionalTemplate from '../templates/FunctionalTemplate';
import DirectTemplate from '../templates/DirectTemplate';
import GlobalTemplate from '../templates/GlobalTemplate';
import ModernIITemplate from '../templates/ModernIITemplate';
import TokyoTemplate from '../templates/TokyoTemplate';
import BarcelonaTemplate from '../templates/BarcelonaTemplate';
import SubwayTemplate from '../templates/SubwayTemplate';
import MonacoTemplate from '../templates/MonacoTemplate';
import AustinTemplate from '../templates/AustinTemplate';
import OxfordTemplate from '../templates/OxfordTemplate';
import VancouverTemplate from '../templates/VancouverTemplate';
import ChicagoTemplate from '../templates/ChicagoTemplate';
import ReykjavikTemplate from '../templates/ReykjavikTemplate';
import BerlinV3Template from '../templates/BerlinV3Template';
import MilanTemplate from '../templates/MilanTemplate';
import SiliconTemplate from '../templates/SiliconTemplate';
import GenevaTemplate from '../templates/GenevaTemplate';
import SaoPauloTemplate from '../templates/SaoPauloTemplate';
import CasablancaTemplate from '../templates/CasablancaTemplate';


interface FinalizeFormProps {
    onDownloadPDF: () => void;
    selectedTemplate: TemplateId;
    onTemplateChange: (id: TemplateId) => void;
    formData: ResumeData;
    onOpenAtsModal: () => void;
    visibleSections: SectionId[];
    settings: ResumeSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<ResumeSettings>>;
}

type Tab = 'download' | 'templates' | 'formatting' | 'ats';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${active ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
    >
        {children}
    </button>
);

const TemplateCard: React.FC<{id: TemplateId, name: string, category: string, isSelected: boolean, onClick: (id: TemplateId) => void, formData: ResumeData, visibleSections: SectionId[], settings: ResumeSettings}> = ({ id, name, category, isSelected, onClick, formData, visibleSections, settings }) => {
    const renderTemplate = () => {
        const props = { formData, isCardPreview: true, visibleSections, settings };
        switch (id) {
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
    
    return (
        <div className="cursor-pointer group relative" onClick={() => onClick(id)}>
            <div className={`absolute -top-2 -right-2 z-10 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                 <div className="bg-primary text-white rounded-full p-1 shadow-md">
                     <span className="material-symbols-outlined text-lg">check</span>
                 </div>
            </div>
            <div className={`p-3 rounded-xl border-2 transition-all h-full flex flex-col ${isSelected ? 'border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5' : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-md'}`}>
                <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center text-gray-400 overflow-hidden relative border border-gray-200 mb-3">
                    <div className="absolute inset-0 transform scale-[0.25] -translate-y-[15%] origin-top-left pointer-events-none bg-white">
                         { renderTemplate() }
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                </div>
                <div className="flex justify-between items-center mt-auto">
                    <p className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{name}</p>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-wider">{category}</span>
                </div>
            </div>
        </div>
    );
}

const atsFonts = [
    { name: 'Arial', value: 'Arial, sans-serif', type: 'Sans' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif', type: 'Sans' },
    { name: 'Times New Roman', value: '"Times New Roman", Times, serif', type: 'Serif' },
    { name: 'Georgia', value: 'Georgia, serif', type: 'Serif' },
    { name: 'Garamond', value: 'Garamond, serif', type: 'Serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif', type: 'Sans' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif', type: 'Sans' },
    { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif', type: 'Sans' },
    { name: 'Roboto', value: "'Roboto', sans-serif", type: 'Sans' },
    { name: 'Open Sans', value: "'Open Sans', sans-serif", type: 'Sans' },
    { name: 'Lato', value: "'Lato', sans-serif", type: 'Sans' },
    { name: 'Merriweather', value: "'Merriweather', serif", type: 'Serif' },
    { name: 'Inter', value: "'Inter', sans-serif", type: 'Sans' },
];


const FinalizeForm: React.FC<FinalizeFormProps> = ({ onDownloadPDF, selectedTemplate, onTemplateChange, formData, onOpenAtsModal, visibleSections, settings, onSettingsChange }) => {
    const [activeTab, setActiveTab] = useState<Tab>('templates');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const colors = [
        { hex: '#ff6b4a', name: 'Coral' },
        { hex: '#4a9eff', name: 'Blue' },
        { hex: '#4db8a8', name: 'Teal' },
        { hex: '#ffc34a', name: 'Gold' },
        { hex: '#2c3e50', name: 'Slate' },
        { hex: '#e066aa', name: 'Pink' },
        { hex: '#000000', name: 'Black' },
        { hex: '#1a365d', name: 'Navy' },
        { hex: '#7c3aed', name: 'Purple' },
        { hex: '#059669', name: 'Emerald' },
        { hex: '#8B0000', name: 'Crimson' },
        { hex: '#5D4037', name: 'Brown' },
    ];

    const categories = ['All', ...Array.from(new Set(AVAILABLE_TEMPLATES.map(t => t.category)))];
    const filteredTemplates = selectedCategory === 'All' 
        ? AVAILABLE_TEMPLATES 
        : AVAILABLE_TEMPLATES.filter(t => t.category === selectedCategory);

    return (
        <>
            <ContentHeader
                title="Finalize & Download"
                description="Polish your resume with the perfect look, ensure it passes ATS scans, and download your PDF."
            />
            
            {/* Tab Navigation */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar border-b border-gray-200 py-4">
                <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>Templates</TabButton>
                <TabButton active={activeTab === 'formatting'} onClick={() => setActiveTab('formatting')}>Formatting</TabButton>
                <TabButton active={activeTab === 'ats'} onClick={() => setActiveTab('ats')}>ATS Check</TabButton>
                <TabButton active={activeTab === 'download'} onClick={() => setActiveTab('download')}>Download</TabButton>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'download' && (
                    <div className="animate-fade-in text-center max-w-lg mx-auto py-10">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                             <span className="material-symbols-outlined text-4xl">check_circle</span>
                        </div>
                        <h3 className="text-2xl font-bold text-dark mb-3">Ready to Launch!</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Your resume is looking great. Click below to download your high-quality PDF.
                            Remember to save it as <strong>{formData.contact.firstName}_{formData.contact.lastName}_Resume.pdf</strong>.
                        </p>
                        <button
                            type="button"
                            className="w-full py-4 px-8 text-lg rounded-xl font-bold cursor-pointer transition-all bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 flex items-center justify-center gap-3"
                            onClick={onDownloadPDF}
                        >
                            <span className="material-symbols-outlined">download</span>
                            Download PDF
                        </button>
                        <div className="mt-8 text-left">
                             <TipsCard activeSection="finalize" />
                        </div>
                    </div>
                )}
                 {activeTab === 'templates' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Category Filter */}
                        <div className="flex gap-2 flex-wrap">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${selectedCategory === cat ? 'bg-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                             {filteredTemplates.map(t => (
                                 <TemplateCard 
                                     key={t.id} 
                                     id={t.id as TemplateId} 
                                     name={t.name} 
                                     category={t.category}
                                     isSelected={selectedTemplate === t.id} 
                                     onClick={onTemplateChange} 
                                     formData={formData} 
                                     visibleSections={visibleSections} 
                                     settings={settings} 
                                 />
                             ))}
                         </div>
                    </div>
                )}
                 {activeTab === 'ats' && (
                    <div className="animate-fade-in max-w-2xl mx-auto text-center py-8">
                        <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 mb-8">
                            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm text-secondary">
                                <span className="material-symbols-outlined text-3xl">document_scanner</span>
                            </div>
                            <h3 className="text-2xl font-bold text-dark mb-3">ATS Compliance Check</h3>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Many companies use Applicant Tracking Systems (ATS) to filter resumes before a human sees them.
                                Our AI-powered checker analyzes your resume for readability, keyword optimization, and formatting issues.
                            </p>
                            <button
                                type="button"
                                className="px-8 py-3 rounded-lg font-bold cursor-pointer transition-all bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-blue-600 hover:-translate-y-0.5"
                                onClick={onOpenAtsModal}
                            >
                                Run Free Scan
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'formatting' && (
                    <div className="animate-fade-in grid grid-cols-1 gap-8">
                        <p className="text-gray-500 text-sm italic">These settings apply to all templates automatically.</p>
                        
                        {/* Colors */}
                        <div className="p-6 border border-border rounded-2xl bg-white shadow-sm">
                            <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-lg">palette</span>
                                Accent Color
                            </h4>
                             <div className="flex flex-wrap gap-3">
                                {colors.map((color) => (
                                    <button 
                                        key={color.hex} 
                                        onClick={() => onSettingsChange(prev => ({ ...prev, themeColor: color.hex }))}
                                        className={`w-12 h-12 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center relative shadow-sm border-2 ${settings.themeColor === color.hex ? 'border-gray-400 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {settings.themeColor === color.hex && (
                                            <span className="material-symbols-outlined text-white text-xl drop-shadow-md">check</span>
                                        )}
                                    </button>
                                ))}
                             </div>
                        </div>

                        {/* Typography Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Font Family */}
                            <div className="p-6 border border-border rounded-2xl bg-white shadow-sm">
                                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">font_download</span>
                                    Typography
                                </h4>
                                 <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-2">
                                     {atsFonts.map((font) => (
                                         <button 
                                            key={font.name}
                                            onClick={() => onSettingsChange(prev => ({ ...prev, fontFamily: font.value }))}
                                            className={`p-3 rounded-lg border text-left transition-all group ${settings.fontFamily === font.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                         >
                                             <span className="block font-bold text-dark text-sm mb-0.5" style={{fontFamily: font.value}}>{font.name}</span>
                                             <span className="text-[10px] text-gray-400 uppercase tracking-wider group-hover:text-gray-500">{font.type}</span>
                                         </button>
                                     ))}
                                 </div>
                            </div>

                            {/* Font Size */}
                            <div className="p-6 border border-border rounded-2xl bg-white shadow-sm">
                                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">format_size</span>
                                    Text Size
                                </h4>
                                 <div className="flex flex-col gap-3">
                                     {['small', 'medium', 'large'].map((size) => (
                                         <button 
                                            key={size} 
                                            onClick={() => onSettingsChange(prev => ({ ...prev, fontSize: size as 'small' | 'medium' | 'large' }))}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${settings.fontSize === size ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <span className="capitalize font-semibold text-gray-700">{size}</span>
                                            <span className={`font-serif text-gray-400 ${size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'}`}>Aa</span>
                                        </button>
                                     ))}
                                 </div>
                                 <p className="text-xs text-gray-400 mt-4 text-center">Adjusts global text density to fit more or less content.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default FinalizeForm;