import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NAV_SECTIONS, INITIAL_STATE, NEW_EXPERIENCE_ITEM, NEW_EDUCATION_ITEM, NEW_CERTIFICATION_ITEM, NEW_LANGUAGE_ITEM, NEW_PROJECT_ITEM, NEW_AWARD_ITEM, NEW_TRAINING_ITEM, NEW_PUBLICATION_ITEM, NEW_VOLUNTEER_ITEM, NEW_CUSTOM_ITEM } from '../constants';
import type { ResumeData, SectionId, TemplateId, AIAnalysisResult, ResumeSettings } from '../types';
import NavSidebar from './NavSidebar';
import HeaderActions from './HeaderActions';
import ContactForm from './forms/ContactForm';
import SummaryForm from './forms/SummaryForm';
import ExperienceForm from './forms/ExperienceForm';
import ProjectsForm from './forms/ProjectsForm';
import EducationForm from './forms/EducationForm';
import SkillsForm from './forms/SkillsForm';
import CertificationsForm from './forms/CertificationsForm';
import LanguagesForm from './forms/LanguagesForm';
import FinalizeForm from './forms/FinalizeForm';
import AIActionModal from './AIActionModal';
import { exampleData } from '../exampleData';
import { useAuth } from './AuthProvider';
import * as resumeRepo from '../services/repos/resumeRepo';
import * as versionRepo from '../services/repos/versionRepo';
import type { StoredVersion } from '../services/repos/mappers';
import VersionHistoryModal from './common/VersionHistoryModal';
import AtsChecker from './AtsChecker';
import AwardsForm from './forms/AwardsForm';
import TrainingsForm from './forms/TrainingsForm';
import PublicationsForm from './forms/PublicationsForm';
import VolunteerForm from './forms/VolunteerForm';
import CustomSectionForm from './forms/CustomSectionForm';
import CustomizeForm from './forms/CustomizeForm';
import PDFQualityModal from './common/PDFQualityModal';
import GamifiedProgressTracker from './common/GamifiedProgressTracker';
import AtsCompatibilityPanel from './common/AtsCompatibilityPanel';
import JSONBackupModal from './common/JSONBackupModal';

// Template Imports for Capture Area
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

declare global {
    interface Window {
        html2pdf: any;
    }
}

// Typed by TemplateId so the (CI-blocking) typecheck fails if any advertised
// template lacks a renderer — every TemplateId must appear as a key here.
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

const loadState = (): ResumeData => {
    try {
        const serializedState = localStorage.getItem('cvbase-resume-data');
        if (serializedState === null) {
            return INITIAL_STATE;
        }
        const parsed = JSON.parse(serializedState);
        return { ...INITIAL_STATE, ...parsed };
    } catch (err) {
        console.error("Could not load state from local storage", err);
        return INITIAL_STATE;
    }
};

const DEFAULT_VISIBLE_SECTIONS: SectionId[] = ['certifications', 'languages'];

const loadVisibleSections = (): SectionId[] => {
    try {
        const serialized = localStorage.getItem('cvbase-visible-sections');
        if (serialized) return JSON.parse(serialized);
    } catch (e) {}
    return DEFAULT_VISIBLE_SECTIONS;
};

const INITIAL_SETTINGS: ResumeSettings = {
    themeColor: '#008080',
    fontSize: 'medium',
    fontFamily: 'Arial, sans-serif'
};

const loadSettings = (): ResumeSettings => {
    try {
        const serialized = localStorage.getItem('cvbase-settings');
        if (serialized) return JSON.parse(serialized);
    } catch (e) {}
    return INITIAL_SETTINGS;
};

const loadSelectedTemplate = (): TemplateId => {
    try {
        const value = localStorage.getItem('cvbase-selected-template');
        if (value) return value as TemplateId;
    } catch (e) {}
    return 'default';
};

const loadActiveSection = (): SectionId => {
    try {
        const value = localStorage.getItem('cvbase-active-section');
        if (value) return value as SectionId;
    } catch (e) {}
    return NAV_SECTIONS[0].id;
};

interface ResumeBuilderProps {
    onBack: () => void;
    /** When set, edit this specific resume; otherwise fall back to the user's primary. */
    initialResumeId?: string | null;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ onBack, initialResumeId }) => {
    const { user, userProfile } = useAuth();
    const [isHydrated, setIsHydrated] = useState(false);
    const [cloudLoaded, setCloudLoaded] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionId>(loadActiveSection);
    const [formData, setFormData] = useState<ResumeData>(loadState);
    const [visibleSections, setVisibleSections] = useState<SectionId[]>(loadVisibleSections);
    const [settings, setSettings] = useState<ResumeSettings>(loadSettings);
    const [progress, setProgress] = useState(0);
    const [isAiActionModalOpen, setIsAiActionModalOpen] = useState(false);
    const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(loadSelectedTemplate);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isPdfQualityModalOpen, setIsPdfQualityModalOpen] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [resumeId, setResumeId] = useState<string | null>(null);
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [versions, setVersions] = useState<StoredVersion[]>([]);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const [versionSaving, setVersionSaving] = useState(false);

    // Real-time DOM section reordering helper
    const getSectionIdFromElement = useCallback((el: HTMLElement): string | null => {
        const dataSec = el.getAttribute('data-section');
        if (dataSec) return dataSec;

        // Try matching header text content or container patterns
        const headers = el.querySelectorAll('h2, h3, h4');
        for (const h of headers) {
            const text = h.textContent?.trim().toLowerCase() || '';
            if (text.includes('summary') || text.includes('objective') || text.includes('profile')) return 'summary';
            if (text.includes('experience') || text.includes('history') || text === 'work' || text.includes('employment')) return 'experience';
            if (text.includes('education') || text.includes('academic') || text.includes('school')) return 'education';
            if (text.includes('skill') || text.includes('competenc') || text.includes('expertise')) return 'skills';
            if (text.includes('project')) return 'projects';
            if (text.includes('certificat') || text.includes('credential')) return 'certifications';
            if (text.includes('language')) return 'languages';
            if (text.includes('award') || text.includes('honor') || text.includes('achievement')) return 'awards';
            if (text.includes('training') || text.includes('course')) return 'trainings';
            if (text.includes('publicat')) return 'publications';
            if (text.includes('volunteer')) return 'volunteer';
            if (text.includes('additional') || text.includes('custom') || text.includes('activities')) return 'custom';
        }
        
        const textContent = el.textContent?.trim().toLowerCase() || '';
        if (textContent.startsWith('professional summary')) return 'summary';
        if (textContent.startsWith('experience')) return 'experience';
        if (textContent.startsWith('education')) return 'education';
        if (textContent.startsWith('skills')) return 'skills';
        if (textContent.startsWith('projects')) return 'projects';
        if (textContent.startsWith('certifications')) return 'certifications';
        if (textContent.startsWith('languages')) return 'languages';
        if (textContent.startsWith('awards')) return 'awards';
        if (textContent.startsWith('trainings') || textContent.startsWith('training')) return 'trainings';
        if (textContent.startsWith('publications')) return 'publications';
        if (textContent.startsWith('volunteer')) return 'volunteer';
        if (textContent.startsWith('additional') || textContent.startsWith('custom')) return 'custom';

        return null;
    }, []);

    const applyReorder = useCallback(() => {
        const order = formData.sectionOrder || [
            'summary', 'experience', 'education', 'skills', 'projects', 
            'certifications', 'languages', 'awards', 'trainings', 
            'publications', 'volunteer', 'custom'
        ];

        const previewContainers = document.querySelectorAll(
            '#resume-preview, #resume-preview-wrapper, [id^="resume-preview"]'
        );
        if (previewContainers.length === 0) return;

        const parentElements = new Set<HTMLElement>();
        previewContainers.forEach(container => {
            const sections = container.querySelectorAll('section');
            sections.forEach(sec => {
                if (sec.parentElement) parentElements.add(sec.parentElement);
            });
            
            if (sections.length === 0) {
                 const children = Array.from(container.children) as HTMLElement[];
                 children.forEach(child => {
                     if (child.tagName === 'DIV' || child.tagName === 'ASIDE' || child.tagName === 'MAIN') {
                         const subChildren = Array.from(child.children) as HTMLElement[];
                         subChildren.forEach(sc => {
                             const id = getSectionIdFromElement(sc);
                             if (id && sc.parentElement) parentElements.add(sc.parentElement);
                         });
                     }
                 });
            }
        });

        parentElements.forEach(parent => {
            const children = Array.from(parent.children) as HTMLElement[];
            const mappedChildren = children.map(child => ({
                element: child,
                sectionId: getSectionIdFromElement(child)
            }));

            const getOrderIndex = (sectionId: string | null) => {
                if (!sectionId) return -1;
                return order.indexOf(sectionId);
            };

            const sortableItems = mappedChildren.filter(item => 
                item.sectionId !== null && order.includes(item.sectionId)
            );
            
            if (sortableItems.length <= 1) return;

            sortableItems.sort((a, b) => getOrderIndex(a.sectionId) - getOrderIndex(b.sectionId));

            const sortableSlots = mappedChildren
                .map((item, index) => item.sectionId !== null && order.includes(item.sectionId) ? index : -1)
                .filter(index => index !== -1);

            // Create target array of elements
            const targetElements = [...children];
            sortableSlots.forEach((slotIndex, i) => {
                targetElements[slotIndex] = sortableItems[i].element;
            });

            // Apply target elements sequentially
            targetElements.forEach((element, index) => {
                const currentChild = parent.children[index];
                if (currentChild !== element) {
                    parent.insertBefore(element, currentChild);
                }
            });
        });
    }, [formData.sectionOrder, getSectionIdFromElement]);

    // Real-time DOM section reordering to support ALL templates dynamically
    useEffect(() => {
        applyReorder();
        
        let rAFId: number | null = null;
        const observer = new MutationObserver(() => {
            if (rAFId !== null) return;
            rAFId = requestAnimationFrame(() => {
                observer.disconnect();
                applyReorder();
                
                const targets = document.querySelectorAll(
                    '#resume-preview, #resume-preview-wrapper, [id^="resume-preview"]'
                );
                const topLevelTargets: Element[] = [];
                targets.forEach(t => {
                    const isDescendant = Array.from(targets).some(other => other !== t && other.contains(t));
                    if (!isDescendant) {
                        topLevelTargets.push(t);
                    }
                });

                topLevelTargets.forEach(target => {
                    observer.observe(target, { childList: true, subtree: true });
                });

                rAFId = null;
            });
        });

        const targets = document.querySelectorAll(
            '#resume-preview, #resume-preview-wrapper, [id^="resume-preview"]'
        );
        const topLevelTargets: Element[] = [];
        targets.forEach(t => {
            const isDescendant = Array.from(targets).some(other => other !== t && other.contains(t));
            if (!isDescendant) {
                topLevelTargets.push(t);
            }
        });

        topLevelTargets.forEach(target => {
            observer.observe(target, { childList: true, subtree: true });
        });

        return () => {
            observer.disconnect();
            if (rAFId !== null) cancelAnimationFrame(rAFId);
        };
    }, [applyReorder, selectedTemplate, visibleSections]);

    // Persist active navigation section silently without triggering the "Saving..." spinner
    useEffect(() => {
        try {
            localStorage.setItem('cvbase-active-section', activeSection);
        } catch (err) {
            console.error("Could not save active section to localStorage", err);
        }
    }, [activeSection]);

    // One-time cloud hydration: when authenticated, load the primary resume from
    // Postgres (source of truth). On first sign-in (no cloud row yet) import the
    // current localStorage-derived resume. `cloudLoaded` gates the cloud auto-save
    // below so we never push INITIAL_STATE over real cloud data on a fresh device.
    useEffect(() => {
        if (!user) { setCloudLoaded(false); return; }
        let cancelled = false;
        (async () => {
            try {
                // Edit a specific resume when one was selected (multi-resume manager);
                // otherwise fall back to the user's primary (legacy single-resume path).
                const cloud = initialResumeId
                    ? (await resumeRepo.get(user.id, initialResumeId)) ?? (await resumeRepo.getPrimary(user.id))
                    : await resumeRepo.getPrimary(user.id);
                if (cancelled) return;
                if (cloud) {
                    setResumeId(cloud.id ?? null);
                    setFormData({ ...INITIAL_STATE, ...cloud.data });
                    setVisibleSections(cloud.visibleSections.length ? cloud.visibleSections : DEFAULT_VISIBLE_SECTIONS);
                    setSettings(cloud.settings && Object.keys(cloud.settings).length
                        ? { ...INITIAL_SETTINGS, ...cloud.settings }
                        : INITIAL_SETTINGS);
                    if (cloud.templateId) setSelectedTemplate(cloud.templateId as TemplateId);
                } else {
                    const created = await resumeRepo.upsertPrimary(user.id, {
                        title: 'My Resume', data: formData, settings,
                        visibleSections, templateId: selectedTemplate, isPrimary: true,
                    });
                    if (!cancelled) setResumeId(created.id ?? null);
                }
            } catch (err) {
                console.error('Cloud resume load failed; using local copy', err);
            } finally {
                if (!cancelled) setCloudLoaded(true);
            }
        })();
        return () => { cancelled = true; };
        // Re-run when the user signs in or a different resume is selected to edit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, initialResumeId]);

    // Unified auto-save: localStorage cache always (instant + anonymous source of
    // truth); when authenticated and hydrated, debounce a write to Postgres.
    useEffect(() => {
        setSaveState('saving');
        try {
            localStorage.setItem('cvbase-resume-data', JSON.stringify(formData));
            localStorage.setItem('cvbase-visible-sections', JSON.stringify(visibleSections));
            localStorage.setItem('cvbase-settings', JSON.stringify(settings));
            localStorage.setItem('cvbase-selected-template', selectedTemplate);
        } catch (err) {
            console.error("Could not save state to local storage", err);
        }

        let cloudTimer: ReturnType<typeof setTimeout> | null = null;
        if (user && cloudLoaded) {
            cloudTimer = setTimeout(() => {
                // Save by id when editing a known resume (preserves its own title);
                // fall back to upsertPrimary only before an id is established.
                if (resumeId) {
                    resumeRepo.saveById(user.id, resumeId, {
                        data: formData, settings, visibleSections, templateId: selectedTemplate,
                    }).catch((err) => console.error('Cloud save failed', err));
                } else {
                    resumeRepo.upsertPrimary(user.id, {
                        title: 'My Resume', data: formData, settings,
                        visibleSections, templateId: selectedTemplate, isPrimary: true,
                    }).catch((err) => console.error('Cloud save failed', err));
                }
            }, 600);
        }

        const timer = setTimeout(() => {
            setSaveState('saved');
            const resetTimer = setTimeout(() => setSaveState('idle'), 1500);
            return () => clearTimeout(resetTimer);
        }, 300);
        return () => {
            clearTimeout(timer);
            if (cloudTimer) clearTimeout(cloudTimer);
        };
    }, [formData, visibleSections, settings, selectedTemplate, user, cloudLoaded, resumeId]);

    const handleLoadExample = useCallback(() => {
        if (window.confirm("Are you sure you want to load the example data? This will overwrite your current progress.")) {
            setFormData(exampleData);
            const newVisible = new Set(visibleSections);
            if (exampleData.projects.length > 0) newVisible.add('projects');
            if (exampleData.languages.length > 0) newVisible.add('languages');
            if (exampleData.certifications.length > 0) newVisible.add('certifications');
            setVisibleSections(Array.from(newVisible));
        }
    }, [visibleSections]);

    const handleImportJsonData = useCallback((data: ResumeData) => {
        setFormData(data);
        const newVisible = new Set(visibleSections);
        if (data.projects && data.projects.length > 0) newVisible.add('projects');
        if (data.languages && data.languages.length > 0) newVisible.add('languages');
        if (data.certifications && data.certifications.length > 0) newVisible.add('certifications');
        if (data.awards && data.awards.length > 0) newVisible.add('awards');
        if (data.trainings && data.trainings.length > 0) newVisible.add('trainings');
        if (data.publications && data.publications.length > 0) newVisible.add('publications');
        if (data.volunteer && data.volunteer.length > 0) newVisible.add('volunteer');
        if (data.custom && data.custom.length > 0) newVisible.add('custom');
        setVisibleSections(Array.from(newVisible));
    }, [visibleSections]);

    const handleSaveDraft = useCallback(() => {
        try {
            const serializedState = JSON.stringify(formData);
            localStorage.setItem('cvbase-resume-data', serializedState);
        } catch (err) {
            console.error("Could not save draft to local storage", err);
        }
    }, [formData]);

    const handleApplyAiSuggestions = (suggestions: AIAnalysisResult) => {
        setFormData(prev => {
            const newData = { ...prev };
            if (suggestions.summarySuggestion) newData.summary.professionalSummary = suggestions.summarySuggestion;
            if (suggestions.experienceSuggestions) {
                newData.experience = newData.experience.map(exp => {
                    const suggestionForExp = suggestions.experienceSuggestions?.find(s => s.id === exp.id);
                    if (suggestionForExp) return { ...exp, description: suggestionForExp.improvedDescription };
                    return exp;
                });
            }
            if (suggestions.missingKeywords) {
                const currentSkillsLower = new Set(newData.skills.map(s => s.toLowerCase()));
                const skillsToAdd = suggestions.missingKeywords.filter(k => !currentSkillsLower.has(k.toLowerCase()));
                newData.skills = [...newData.skills, ...skillsToAdd];
            }
            return newData;
        });
    };

    const handlePhotoChange = useCallback((photoData: string) => {
        setFormData(prev => ({ ...prev, contact: { ...prev.contact, photo: photoData } }));
    }, []);

    const handleListChange = useCallback((section: any, id: string, e: any) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const list = (prev as any)[section].map((item: any) =>
                item.id === id ? { ...item, [name]: value } : item
            );
            return { ...prev, [section]: list };
        });
    }, []);

    const handleAddItem = useCallback((section: any) => {
        let newItem;
        const id = crypto.randomUUID();
        if (section === 'experience') newItem = { ...NEW_EXPERIENCE_ITEM, id };
        else if (section === 'projects') newItem = { ...NEW_PROJECT_ITEM, id };
        else if (section === 'education') newItem = { ...NEW_EDUCATION_ITEM, id };
        else if (section === 'certifications') newItem = { ...NEW_CERTIFICATION_ITEM, id };
        else if (section === 'languages') newItem = { ...NEW_LANGUAGE_ITEM, id };
        else if (section === 'awards') newItem = { ...NEW_AWARD_ITEM, id };
        else if (section === 'trainings') newItem = { ...NEW_TRAINING_ITEM, id };
        else if (section === 'publications') newItem = { ...NEW_PUBLICATION_ITEM, id };
        else if (section === 'volunteer') newItem = { ...NEW_VOLUNTEER_ITEM, id };
        else if (section === 'custom') newItem = { ...NEW_CUSTOM_ITEM, id };

        if (newItem) {
            setFormData(prev => ({ ...prev, [section]: [...((prev as any)[section] || []), newItem] }));
        }
    }, []);
    
    const handleRemoveItem = useCallback((section: any, id: string) => {
        setFormData(prev => ({ ...prev, [section]: ((prev as any)[section] || []).filter((item: any) => item.id !== id) }));
    }, []);

    const handleSkillAdd = useCallback((skill: string) => {
        if (!formData.skills.includes(skill)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
        }
    }, [formData.skills]);

    const handleSkillRemove = useCallback((index: number) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
    }, []);

    const handleClearSection = useCallback(() => {
        setFormData(prev => ({ ...prev, [activeSection]: (INITIAL_STATE as any)[activeSection] }));
    }, [activeSection]);

    const handleNextSection = useCallback(() => {
        const currentNav = NAV_SECTIONS.filter(s => !s.optional || visibleSections.includes(s.id));
        const currentIndex = currentNav.findIndex(s => s.id === activeSection);
        if (currentIndex < currentNav.length - 1) setActiveSection(currentNav[currentIndex + 1].id);
    }, [activeSection, visibleSections]);
    
    const handleToggleSection = (section: SectionId) => {
        setVisibleSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const handleDownloadPDF = useCallback(() => {
        setIsPdfQualityModalOpen(true);
    }, []);

    const handleDownloadDOCX = useCallback(async () => {
        try {
            // Lazy-load the docx generator so the ~0.4 MB library stays out of the
            // initial bundle and only loads when a user actually exports to Word.
            const { downloadResumeDocx } = await import('../lib/export/resumeDocx');
            await downloadResumeDocx(formData, { settings, visibleSections });
        } catch (err) {
            console.error('❌ DOCX export failed:', err);
        }
    }, [formData, settings, visibleSections]);

    const handleOpenVersions = useCallback(async () => {
        setIsVersionModalOpen(true);
        if (!user || !resumeId) return;
        setVersionsLoading(true);
        try {
            setVersions(await versionRepo.listForResume(user.id, resumeId));
        } catch (err) {
            console.error('Loading versions failed', err);
        } finally {
            setVersionsLoading(false);
        }
    }, [user, resumeId]);

    const handleSaveVersion = useCallback(async (label: string) => {
        if (!user || !resumeId) return;
        setVersionSaving(true);
        try {
            const saved = await versionRepo.snapshot(user.id, resumeId, label, formData);
            setVersions(prev => [saved, ...prev]);
        } catch (err) {
            console.error('Saving version failed', err);
        } finally {
            setVersionSaving(false);
        }
    }, [user, resumeId, formData]);

    const handleRestoreVersion = useCallback((version: StoredVersion) => {
        setFormData({ ...INITIAL_STATE, ...version.data });
        setIsVersionModalOpen(false);
    }, []);

    const handleDeleteVersion = useCallback(async (versionId: string) => {
        if (!user) return;
        const prev = versions;
        setVersions(prev.filter(v => v.id !== versionId));
        try {
            await versionRepo.remove(user.id, versionId);
        } catch (err) {
            console.error('Deleting version failed', err);
            setVersions(prev); // roll back optimistic removal
        }
    }, [user, versions]);

    const handleGeneratePDF = useCallback(async (quality: 'standard' | 'high') => {
        setIsPdfQualityModalOpen(false);
        console.log(`📄 Initializing professional layout rendering... Chosen profile quality: ${quality}`);
        setIsGeneratingPDF(true);

        // Allow microtask queue to flush and the loading glass-overlay to render completely
        await new Promise(resolve => setTimeout(resolve, 600));

        const originalTitle = document.title;
        const container = document.getElementById('print-resume-container');
        
        try {
            const year = new Date().getFullYear();
            const firstName = formData.contact.firstName || 'My';
            const lastName = formData.contact.lastName || 'Resume';
            const jobTitle = (formData.contact.jobTitle || 'CV').replace(/[\s/|]+/g, '_');
            const filename = `${firstName}_${lastName}_${jobTitle}_${year}`;
            
            document.title = filename;

            // Align and reorder the elements inside the export container right before capture
            applyReorder();

            if (window.html2pdf) {
                // Temporarily bring the pdf container to relative viewport coordinates (underneath full-screen loading spinner)
                if (container) {
                    container.style.left = '0px';
                    container.style.top = '0px';
                    container.style.zIndex = '9999';
                }

                // Small layout settled delay
                await new Promise(resolve => setTimeout(resolve, 200));

                const element = document.getElementById('capture-root');
                if (element) {
                    const opt = {
                        margin: 0,
                        filename: `${filename}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { 
                            scale: quality === 'high' ? 2.5 : 1.5, 
                            useCORS: true,
                            letterRendering: true,
                            logging: false,
                            scrollX: 0,
                            scrollY: 0
                        },
                        jsPDF: { 
                            unit: 'mm', 
                            format: 'a4', 
                            orientation: 'portrait' 
                        }
                    };
                    
                    // Generate and save via html2pdf
                    await window.html2pdf().set(opt).from(element).save();
                } else {
                    console.error("❌ Capture root element not found to render.");
                    window.print();
                }
            } else {
                console.warn("⚠️ html2pdf library was not loaded on the window. Performing browser print fallback.");
                window.print();
            }
        } catch (error) {
            console.error("❌ PDF generation engine threw an exception:", error);
            try {
                // Best effort local print fallback
                window.print();
            } catch (printErr) {
                console.error("❌ Direct window printing failed:", printErr);
            }
        } finally {
            // Restore hidden container position off-screen
            if (container) {
                container.style.left = '-9999px';
                container.style.top = '0px';
                container.style.zIndex = '-1000';
            }
            document.title = originalTitle;
            setIsGeneratingPDF(false);
        }
    }, [formData, applyReorder]);

    useEffect(() => {
        const list = [
            !!formData.contact.firstName.trim(),
            !!formData.contact.lastName.trim(),
            !!formData.contact.email.trim() && formData.contact.email.includes('@'),
            !!formData.contact.phone.trim(),
            !!formData.summary.professionalSummary?.replace(/<[^>]*>/g, '').trim(),
            formData.skills.length >= 2,
        ];
        if (visibleSections.includes('experience')) {
            list.push(formData.experience.length > 0 && !!formData.experience[0].jobTitle.trim() && !!formData.experience[0].company.trim());
        }
        if (visibleSections.includes('education')) {
            list.push(formData.education.length > 0 && !!formData.education[0].school.trim() && !!formData.education[0].degree.trim());
        }
        if (visibleSections.includes('projects')) {
            list.push(formData.projects.length > 0 && !!formData.projects[0].name.trim());
        }
        if (visibleSections.includes('certifications')) {
            list.push(formData.certifications.length > 0 && !!formData.certifications[0].name.trim());
        }
        if (visibleSections.includes('languages')) {
            list.push(formData.languages.length > 0 && !!formData.languages[0].language.trim());
        }
        const filled = list.filter(Boolean).length;
        setProgress(Math.round((filled / list.length) * 100));
    }, [formData, visibleSections]);

    const CaptureTemplate = useMemo(() => {
        const Component = templateMap[selectedTemplate] || ResumePreview;
        return <Component formData={formData} isCardPreview={false} visibleSections={visibleSections} settings={settings} />;
    }, [selectedTemplate, formData, visibleSections, settings]);

    const renderActiveForm = () => {
        switch (activeSection) {
            case 'contact': return <ContactForm data={formData.contact} onFormDataChange={setFormData} onPhotoChange={handlePhotoChange} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'summary': return <SummaryForm data={formData} onFormDataChange={setFormData} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'experience': return <ExperienceForm data={formData.experience} onFormDataChange={setFormData} onAdd={() => handleAddItem('experience')} onRemove={(id) => handleRemoveItem('experience', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'projects': return <ProjectsForm data={formData.projects} onChange={(id, e) => handleListChange('projects', id, e)} onAdd={() => handleAddItem('projects')} onRemove={(id) => handleRemoveItem('projects', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'education': return <EducationForm data={formData.education} onChange={(id, e) => handleListChange('education', id, e)} onAdd={() => handleAddItem('education')} onRemove={(id) => handleRemoveItem('education', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'skills': return <SkillsForm skills={formData.skills} jobTitle={formData.contact.jobTitle} onAdd={handleSkillAdd} onRemove={handleSkillRemove} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'certifications': return <CertificationsForm data={formData.certifications} onChange={(id, e) => handleListChange('certifications', id, e)} onAdd={() => handleAddItem('certifications')} onRemove={(id) => handleRemoveItem('certifications', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'languages': return <LanguagesForm data={formData.languages} onChange={(id, e) => handleListChange('languages', id, e)} onAdd={() => handleAddItem('languages')} onRemove={(id) => handleRemoveItem('languages', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'awards': return <AwardsForm data={formData.awards} onChange={(id, e) => handleListChange('awards', id, e)} onAdd={() => handleAddItem('awards')} onRemove={(id) => handleRemoveItem('awards', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'trainings': return <TrainingsForm data={formData.trainings} onChange={(id, e) => handleListChange('trainings', id, e)} onAdd={() => handleAddItem('trainings')} onRemove={(id) => handleRemoveItem('trainings', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'publications': return <PublicationsForm data={formData.publications} onChange={(id, e) => handleListChange('publications', id, e)} onAdd={() => handleAddItem('publications')} onRemove={(id) => handleRemoveItem('publications', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'volunteer': return <VolunteerForm data={formData.volunteer} onChange={(id, e) => handleListChange('volunteer', id, e)} onAdd={() => handleAddItem('volunteer')} onRemove={(id) => handleRemoveItem('volunteer', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'custom': return <CustomSectionForm data={formData.custom} onChange={(id, e) => handleListChange('custom', id, e)} onAdd={() => handleAddItem('custom')} onRemove={(id) => handleRemoveItem('custom', id)} onClear={handleClearSection} onNext={handleNextSection} />;
            case 'customize': return (
                <CustomizeForm 
                    visibleSections={visibleSections} 
                    onToggleSection={handleToggleSection} 
                    sectionOrder={formData.sectionOrder || ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'trainings', 'publications', 'volunteer', 'custom']}
                    onOrderChange={(newOrder) => setFormData(prev => ({ ...prev, sectionOrder: newOrder }))}
                />
            );
            case 'finalize': return <FinalizeForm onDownloadPDF={handleDownloadPDF} onDownloadDOCX={handleDownloadDOCX} onOpenVersions={handleOpenVersions} versionsEnabled={!!user && !!resumeId} selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} formData={formData} onOpenAtsModal={() => setIsAtsModalOpen(true)} visibleSections={visibleSections} settings={settings} onSettingsChange={setSettings} />;
            default: return null;
        }
    };
    
    return (
        <div className="flex h-screen bg-transparent overflow-hidden">
            <NavSidebar
                activeSection={activeSection}
                onSectionClick={setActiveSection}
                progress={progress}
                formData={formData}
                onDownloadPDF={handleDownloadPDF}
                selectedTemplate={selectedTemplate}
                visibleSections={visibleSections}
                onToggleSection={handleToggleSection}
                settings={settings}
                onGoHome={onBack}
                isMobileOpen={isMobileMenuOpen}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
            <main className="flex-1 h-full overflow-y-auto bg-light/50 relative">
                <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-10 min-h-screen animate-fade-in">
                    <div className="glass-panel p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl min-h-[calc(100vh-5rem)] border border-white/40 shadow-xl bg-white/60 backdrop-blur-md">
                        <HeaderActions
                            onAiEnhanceClick={() => setIsAiActionModalOpen(true)}
                            onLoadExample={handleLoadExample}
                            saveState={saveState}
                            onSaveDraft={handleSaveDraft}
                            onOpenJsonBackup={() => setIsJsonModalOpen(true)}
                            onMenuClick={() => setIsMobileMenuOpen(true)}
                        />

                        {/* Dynamic Master Profile Integration */}
                        {user && userProfile && (
                            <div className={`mt-6 p-5 rounded-2xl border transition-all ${
                                isHydrated 
                                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4' 
                                    : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-slate-800 text-white shadow-xl hover:shadow-indigo-950/10'
                            }`} id="profile-integration-block">
                                <div className="flex items-start gap-4">
                                    <div className={`p-2.5 rounded-xl shrink-0 ${
                                        isHydrated 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/35'
                                    }`}>
                                        <span className="material-symbols-outlined text-2xl leading-none">
                                            {isHydrated ? 'done_all' : 'magic_button'}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                                            {isHydrated ? 'Master sync complete!' : 'Master Profile Link Ready'}
                                            {!isHydrated && (
                                                <span className="text-[9px] font-semibold bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-500/25">
                                                    Cloud Auto-Fill
                                                </span>
                                            )}
                                        </h3>
                                        <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
                                            isHydrated ? 'text-slate-500 font-medium' : 'text-slate-300'
                                        }`}>
                                            {isHydrated 
                                                ? 'Your contact fields, executive bio, core skills, links, and certified badges are safely synchronized.' 
                                                : `We detected a master profile checklist for "${userProfile.firstName || 'User'}" containing ${userProfile.careSpecialties?.length || 0} skills and ${userProfile.certifications?.length || 0} credentials. Would you like to instantly auto-fill your active resume draft?`
                                            }
                                        </p>
                                    </div>
                                </div>
                                {!isHydrated ? (
                                    <button
                                        onClick={() => {
                                            setFormData(prev => {
                                                const currentCerts = [...prev.certifications];
                                                if (userProfile.certifications) {
                                                    userProfile.certifications.forEach(certName => {
                                                        const exists = currentCerts.some(c => c.name.toLowerCase() === certName.toLowerCase());
                                                        if (!exists) {
                                                            currentCerts.push({
                                                                id: crypto.randomUUID(),
                                                                name: certName,
                                                                number: '',
                                                                expiryDate: '',
                                                                description: 'Synchronized credential from your master profile.'
                                                            });
                                                        }
                                                    });
                                                }

                                                return {
                                                    ...prev,
                                                    contact: {
                                                        ...prev.contact,
                                                        firstName: userProfile.firstName || prev.contact.firstName,
                                                        lastName: userProfile.lastName || prev.contact.lastName,
                                                        phone: userProfile.phone || prev.contact.phone,
                                                        email: userProfile.email || prev.contact.email,
                                                        jobTitle: userProfile.jobTitle || prev.contact.jobTitle,
                                                        linkedin: userProfile.linkedin || prev.contact.linkedin,
                                                        website: userProfile.portfolio || userProfile.github || prev.contact.website,
                                                    },
                                                    summary: {
                                                        ...prev.summary,
                                                        professionalSummary: userProfile.bio || prev.summary.professionalSummary,
                                                    },
                                                    skills: userProfile.careSpecialties && userProfile.careSpecialties.length > 0
                                                        ? Array.from(new Set([...prev.skills, ...userProfile.careSpecialties]))
                                                        : prev.skills,
                                                    certifications: currentCerts,
                                                };
                                            });
                                            setIsHydrated(true);
                                        }}
                                        className="mt-3 sm:mt-0 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 hover:scale-105 active:scale-95 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-indigo-500/25 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer self-stretch sm:self-center"
                                        id="hydrate-resume-action"
                                    >
                                        <span className="material-symbols-outlined text-sm">cloud_sync</span>
                                        Hydrate Draft
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsHydrated(false)}
                                        className="mt-2 sm:mt-0 text-xs font-bold text-slate-500 hover:text-indigo-600 cursor-pointer border border-slate-200 hover:border-indigo-200 px-3 py-1.5 rounded-lg bg-white self-start sm:self-center transition-all shadow-sm"
                                    >
                                        Re-sync Fields
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Interactive Gamified Progress Tracker */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                            <GamifiedProgressTracker
                                formData={formData}
                                visibleSections={visibleSections}
                                progress={progress}
                                activeSection={activeSection}
                                onSectionClick={setActiveSection}
                            />
                            <AtsCompatibilityPanel
                                formData={formData}
                                visibleSections={visibleSections}
                                selectedTemplate={selectedTemplate}
                            />
                        </div>

                        <div className="animate-fade-in mt-6">
                            {renderActiveForm()}
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Hidden High-Quality Capture Area - Visible to DOM but moved far off-screen */}
            <div 
                id="print-resume-container"
                className="fixed top-0 pointer-events-none" 
                style={{ left: '-9999px', width: '794px', visibility: 'visible', opacity: 1, zIndex: -1000 }}
            >
                <div id="capture-root" className="bg-white">
                    {CaptureTemplate}
                </div>
            </div>

            {isGeneratingPDF && (
                <div className="fixed inset-0 z-[10000] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-bold text-primary">Preparing your PDF...</h2>
                    <p className="text-gray-500 mt-2">Optimizing layout and fonts for high quality</p>
                </div>
            )}

            <AIActionModal
                isOpen={isAiActionModalOpen}
                onClose={() => setIsAiActionModalOpen(false)}
                resumeData={formData}
                activeSection={activeSection}
                onApplySuggestions={handleApplyAiSuggestions}
            />
             <AtsChecker
                isOpen={isAtsModalOpen}
                onClose={() => setIsAtsModalOpen(false)}
                resumeData={formData}
            />
            <PDFQualityModal
                isOpen={isPdfQualityModalOpen}
                onClose={() => setIsPdfQualityModalOpen(false)}
                onSelectQuality={handleGeneratePDF}
            />
            <VersionHistoryModal
                isOpen={isVersionModalOpen}
                onClose={() => setIsVersionModalOpen(false)}
                versions={versions}
                loading={versionsLoading}
                saving={versionSaving}
                onSave={handleSaveVersion}
                onRestore={handleRestoreVersion}
                onDelete={handleDeleteVersion}
            />
            <JSONBackupModal
                isOpen={isJsonModalOpen}
                onClose={() => setIsJsonModalOpen(false)}
                currentData={formData}
                onImportData={handleImportJsonData}
            />
        </div>
    );
}

export default ResumeBuilder;
