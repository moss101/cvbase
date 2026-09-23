import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { NAV_SECTIONS, getVisibleNavSections, INITIAL_STATE, NEW_EXPERIENCE_ITEM, NEW_EDUCATION_ITEM, NEW_CERTIFICATION_ITEM, NEW_LANGUAGE_ITEM, NEW_PROJECT_ITEM, NEW_AWARD_ITEM, NEW_TRAINING_ITEM, NEW_PUBLICATION_ITEM, NEW_VOLUNTEER_ITEM, NEW_CUSTOM_ITEM } from '../constants';
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
import type { StoredVersion } from '../services/repos/mappers';
import * as versionRepo from '../services/repos/versionRepo';
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
import PreviewModal from './PreviewModal';
import MobileTopBar from './mobile/MobileTopBar';
import { useMobileShell } from '../lib/useMobileShell';
import { useTranslation, LANGUAGE_OPTIONS } from '../services/translationService';
import { useToast } from './common/Toast';
import { ConfirmDialog } from './common/ConfirmDialog';
import { captureException } from '../lib/monitoring';
import { useHistory } from '../lib/builder/useHistory';
import { usePersistence, type CloudHydrationPayload } from '../lib/builder/usePersistence';
import { draftDocKey, draftScope, isBlankResumeData, readDraft, readTemplateHint, writeDraft } from '../lib/builder/draftCache';
import { printVectorPdf, renderImagePdfBlob, type PdfQuality } from '../lib/export/exportPdf';
import { saveFile } from '../lib/export/saveFile';
import UndoRedoButtons from './builder/UndoRedoButtons';
import MasterProfileSyncCard from './builder/MasterProfileSyncCard';
import MobileSectionsSheet from './builder/MobileSectionsSheet';
import MobileMoreSheet from './builder/MobileMoreSheet';
import { ChevronDown, Eye, MoreHorizontal } from 'lucide-react';
import '../styles/print.css';

// Template Imports for Capture Area
import ResumePreview from './ResumePreview';
import { templateMap } from './templates/TemplatePreviewRegistry';

// Typed by TemplateId so the (CI-blocking) typecheck fails if any advertised
// template lacks a renderer — every TemplateId must appear as a key here.

// The initial state comes from the draft cached for this account + document
// (lib/builder/draftCache.ts), never from a key shared across accounts.
const loadState = (scope: string, docKey: string): ResumeData => {
    try {
        const serializedState = readDraft(scope, docKey, 'data');
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

const loadVisibleSections = (scope: string, docKey: string): SectionId[] => {
    try {
        const serialized = readDraft(scope, docKey, 'visibleSections');
        if (serialized) return JSON.parse(serialized);
    } catch (e) {}
    return DEFAULT_VISIBLE_SECTIONS;
};

const INITIAL_SETTINGS: ResumeSettings = {
    themeColor: '#008080',
    fontSize: 'medium',
    fontFamily: 'Arial, sans-serif'
};

const loadSettings = (scope: string, docKey: string): ResumeSettings => {
    try {
        const serialized = readDraft(scope, docKey, 'settings');
        if (serialized) return JSON.parse(serialized);
    } catch (e) {}
    return INITIAL_SETTINGS;
};

const loadSelectedTemplate = (scope: string, docKey: string): TemplateId => {
    try {
        const value = readTemplateHint(scope, docKey);
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

/** Focus is inside the tiptap rich-text editor (ExperienceForm's description
 *  field, etc.), which has its own undo/redo history — the global Cmd/Ctrl+Z
 *  shortcut below must not intercept it. */
const isInsideRichTextEditor = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && !!target.closest('.ProseMirror, [contenteditable="true"]');

interface ResumeBuilderProps {
    onBack: () => void;
    /** When set, edit this specific resume; otherwise fall back to the user's primary. */
    initialResumeId?: string | null;
    /** Rendered inside the Career OS shell: size to the container, hairline surfaces. */
    embedded?: boolean;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ onBack, initialResumeId, embedded = false }) => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [isHydrated, setIsHydrated] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionId>(loadActiveSection);
    // Which cached draft to start from: the same identity usePersistence
    // derives, so what is loaded here is what it later writes back.
    const draftScopeId = draftScope(user?.id);
    const draftDoc = draftDocKey(initialResumeId);
    const [initialState] = useState<ResumeData>(() => loadState(draftScopeId, draftDoc));
    const history = useHistory<ResumeData>(initialState, { limit: 50, coalesceMs: 400 });
    const formData = history.state;
    const setFormData = history.setState;
    const [visibleSections, setVisibleSections] = useState<SectionId[]>(() => loadVisibleSections(draftScopeId, draftDoc));
    const [settings, setSettings] = useState<ResumeSettings>(() => loadSettings(draftScopeId, draftDoc));
    const [progress, setProgress] = useState(0);
    const [isAiActionModalOpen, setIsAiActionModalOpen] = useState(false);
    const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(() => loadSelectedTemplate(draftScopeId, draftDoc));
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    // The hidden CaptureTemplate only mounts into the real DOM while this is
    // true (i.e. during an export), instead of permanently — previously every
    // keystroke rendered the template twice (the visible preview *and* the
    // always-mounted hidden capture copy).
    const [isCapturing, setIsCapturing] = useState(false);
    const [isPdfQualityModalOpen, setIsPdfQualityModalOpen] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [versions, setVersions] = useState<StoredVersion[]>([]);
    const [versionsLoading, setVersionsLoading] = useState(false);
    const isMobileShell = useMobileShell();
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
    const [isSectionsSheetOpen, setIsSectionsSheetOpen] = useState(false);
    const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
    const { language, setLanguage, t } = useTranslation();
    const [versionSaving, setVersionSaving] = useState(false);

    // Applies cloud data (normal hydration, or a resolved "use cloud version"
    // conflict) as a fresh document: history is reset, not pushed onto the
    // undo stack, since "undo" back into a different loaded document would
    // make no sense.
    const onHydrate = useCallback((payload: CloudHydrationPayload) => {
        history.reset({ ...INITIAL_STATE, ...payload.formData });
        setVisibleSections(payload.visibleSections.length ? payload.visibleSections : DEFAULT_VISIBLE_SECTIONS);
        setSettings(payload.settings && Object.keys(payload.settings).length
            ? { ...INITIAL_SETTINGS, ...payload.settings }
            : INITIAL_SETTINGS);
        if (payload.templateId) setSelectedTemplate(payload.templateId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history.reset]);

    const {
        resumeId, saveState, retry: retryCloudSave, conflict, resolveConflict,
        documentState, unavailableResumeId, anonymousDraft, claimAnonymousDraft, dismissAnonymousDraft,
    } = usePersistence({
        userId: user?.id ?? null,
        initialResumeId,
        authResolved: !authLoading,
        formData, visibleSections, settings, selectedTemplate,
        onHydrate,
    });

    // Explicit claim of the draft made on this device before signing in. It
    // is never applied automatically; replacing content already here asks.
    const handleClaimAnonymousDraft = useCallback(() => {
        if (anonymousDraft.hasDuplicate && !isBlankResumeData(formData)
            && !window.confirm(t('builder.confirmClaimDraft', 'Replace the content of this CV with the draft saved on this device?'))) {
            return;
        }
        claimAnonymousDraft();
    }, [anonymousDraft.hasDuplicate, formData, claimAnonymousDraft, t]);

    // Surface a cloud save failure once per error streak, with a Retry action,
    // instead of the old fixed-timer "Saved!" that claimed success regardless
    // of whether the write actually reached Postgres.
    const hasToastedSaveErrorRef = useRef(false);
    useEffect(() => {
        if (saveState === 'error') {
            if (!hasToastedSaveErrorRef.current) {
                hasToastedSaveErrorRef.current = true;
                toast({
                    title: t('builder.cloudSaveFailedTitle', 'Could not save to the cloud'),
                    description: t('builder.cloudSaveFailedDesc', 'Your edits are safe on this device — try saving again.'),
                    variant: 'error',
                    action: { label: t('builder.retry', 'Retry'), onClick: retryCloudSave },
                });
            }
        } else {
            hasToastedSaveErrorRef.current = false;
        }
    }, [saveState, retryCloudSave, toast, t]);

    // Global undo/redo shortcuts. Skipped while focus is inside the tiptap
    // rich-text editor, which has its own undo/redo history.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isMod = event.metaKey || event.ctrlKey;
            if (!isMod || event.key.toLowerCase() !== 'z') return;
            if (isInsideRichTextEditor(event.target)) return;
            event.preventDefault();
            if (event.shiftKey) history.redo(); else history.undo();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history.undo, history.redo]);

    // Persist active navigation section silently without triggering the "Saving..." spinner
    useEffect(() => {
        try {
            localStorage.setItem('cvbase-active-section', activeSection);
        } catch (err) {
            console.error("Could not save active section to localStorage", err);
        }
    }, [activeSection]);

    const handleLoadExample = useCallback(() => {
        if (window.confirm(t('builder.confirmLoadExample', 'Are you sure you want to load the example data? This will overwrite your current progress.'))) {
            history.reset(exampleData);
            const newVisible = new Set(visibleSections);
            if (exampleData.projects.length > 0) newVisible.add('projects');
            if (exampleData.languages.length > 0) newVisible.add('languages');
            if (exampleData.certifications.length > 0) newVisible.add('certifications');
            setVisibleSections(Array.from(newVisible));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleSections, history.reset, t]);

    const handleImportJsonData = useCallback((data: ResumeData) => {
        history.reset(data);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleSections, history.reset]);

    const handleSaveDraft = useCallback(() => {
        try {
            const serializedState = JSON.stringify(formData);
            writeDraft(draftScopeId, draftDoc, 'data', serializedState);
            toast({ title: t('builder.draftSaved', 'Draft saved on this device'), variant: 'success' });
        } catch (err) {
            console.error("Could not save draft to local storage", err);
            toast({ title: t('builder.draftSaveFailed', 'Could not save draft'), variant: 'error' });
        }
    }, [formData, draftScopeId, draftDoc, toast, t]);

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
    }, [setFormData]);

    const handleListChange = useCallback((section: any, id: string, e: any) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const list = (prev as any)[section].map((item: any) =>
                item.id === id ? { ...item, [name]: value } : item
            );
            return { ...prev, [section]: list };
        }, `${section}:${id}:${name}`);
    }, [setFormData]);

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
    }, [setFormData]);

    const handleRemoveItem = useCallback((section: any, id: string) => {
        setFormData(prev => ({ ...prev, [section]: ((prev as any)[section] || []).filter((item: any) => item.id !== id) }));
    }, [setFormData]);

    const handleSkillAdd = useCallback((skill: string) => {
        if (!formData.skills.includes(skill)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
        }
    }, [formData.skills, setFormData]);

    const handleSkillRemove = useCallback((index: number) => {
        setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
    }, [setFormData]);

    const handleClearSection = useCallback(() => {
        setFormData(prev => ({ ...prev, [activeSection]: (INITIAL_STATE as any)[activeSection] }));
    }, [activeSection, setFormData]);

    const handleNextSection = useCallback(() => {
        const currentNav = getVisibleNavSections(visibleSections);
        const currentIndex = currentNav.findIndex(s => s.id === activeSection);
        if (currentIndex < currentNav.length - 1) setActiveSection(currentNav[currentIndex + 1].id);
    }, [activeSection, visibleSections]);

    const handleToggleSection = (section: SectionId) => {
        setVisibleSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    // --- PDF export -----------------------------------------------------------------
    // Two independent paths (lib/export/exportPdf.ts):
    //  - primary, no quality choice: a real text-layer PDF via the browser's
    //    print pipeline on web; the rasterised html2pdf path on native, since
    //    a Capacitor WebView cannot produce a file from print-to-PDF at all.
    //  - secondary "Image PDF (exact look)": the previous rasterised path,
    //    reachable from FinalizeForm's quiet secondary link, with the
    //    existing standard/high quality picker.

    const buildFilename = useCallback((): string => {
        const year = new Date().getFullYear();
        const firstName = formData.contact.firstName || 'My';
        const lastName = formData.contact.lastName || 'Resume';
        const jobTitle = (formData.contact.jobTitle || 'CV').replace(/[\s/|]+/g, '_');
        return `${firstName}_${lastName}_${jobTitle}_${year}`;
    }, [formData.contact.firstName, formData.contact.lastName, formData.contact.jobTitle]);

    // Mounts the hidden capture template and waits for the browser to
    // actually commit and paint it — replaces the old arbitrary
    // `setTimeout(600)` / `setTimeout(200)` sleeps. `printVectorPdf` /
    // `renderImagePdfBlob` additionally await `document.fonts.ready` and
    // image loads before reading the element.
    const beginCapture = useCallback(async () => {
        setIsCapturing(true);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }, []);

    const endCapture = useCallback(() => {
        setIsCapturing(false);
    }, []);

    /** Last-resort fallback shared by both export paths: the browser's own
     *  print of the main document, which still hides everything but the
     *  (currently mounted, since we're mid-export) capture container via the
     *  existing @media print rules in styles/index.css. */
    const printFallback = useCallback((cause: unknown) => {
        captureException(cause, { context: 'resume-pdf-export-fallback' });
        try {
            window.print();
        } catch (printErr) {
            captureException(printErr, { context: 'resume-print-fallback' });
            toast({ title: t('builder.pdfExportFailed', 'Could not export the PDF'), description: t('resumeMgr.tryAgain', 'Please try again.'), variant: 'error' });
        }
    }, [toast, t]);

    const handleDownloadPDF = useCallback(async () => {
        setIsGeneratingPDF(true);
        try {
            await beginCapture();
            const filename = buildFilename();
            if (Capacitor.isNativePlatform()) {
                const blob = await renderImagePdfBlob({ quality: 'high' });
                await saveFile({ blob, filename: `${filename}.pdf`, mimeType: 'application/pdf' });
            } else {
                await printVectorPdf({ filename });
            }
        } catch (error) {
            printFallback(error);
        } finally {
            endCapture();
            setIsGeneratingPDF(false);
        }
    }, [beginCapture, buildFilename, endCapture, printFallback]);

    const handleDownloadImagePdf = useCallback(() => {
        setIsPdfQualityModalOpen(true);
    }, []);

    const handleGenerateImagePdf = useCallback(async (quality: PdfQuality) => {
        setIsPdfQualityModalOpen(false);
        setIsGeneratingPDF(true);
        try {
            await beginCapture();
            const filename = buildFilename();
            const blob = await renderImagePdfBlob({ quality });
            await saveFile({ blob, filename: `${filename}.pdf`, mimeType: 'application/pdf' });
        } catch (error) {
            printFallback(error);
        } finally {
            endCapture();
            setIsGeneratingPDF(false);
        }
    }, [beginCapture, buildFilename, endCapture, printFallback]);

    const handleDownloadDOCX = useCallback(async () => {
        try {
            // Lazy-load the docx generator so the ~0.4 MB library stays out of the
            // initial bundle and only loads when a user actually exports to Word.
            const { downloadResumeDocx } = await import('../lib/export/resumeDocx');
            await downloadResumeDocx(formData, { settings, visibleSections });
        } catch (err) {
            captureException(err, { context: 'resume-docx-export' });
            toast({ title: t('builder.docxExportFailed', 'Could not export the Word document'), description: t('resumeMgr.tryAgain', 'Please try again.'), variant: 'error' });
        }
    }, [formData, settings, visibleSections, toast, t]);

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
        history.reset({ ...INITIAL_STATE, ...version.data });
        setIsVersionModalOpen(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [history.reset]);

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

    // Position within the section flow, for the mobile top bar/progress bar and
    // the sections sheet. Shares the exact filter NavSidebar's own nav uses.
    const visibleNavSections = useMemo(() => getVisibleNavSections(visibleSections), [visibleSections]);
    const activeSectionIndex = Math.max(0, visibleNavSections.findIndex(s => s.id === activeSection));
    const activeSectionMeta = visibleNavSections[activeSectionIndex] ?? visibleNavSections[0];
    const resumeTitle = formData.contact.jobTitle?.trim() || t('mobile.untitledResume', 'Untitled resume');

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
            case 'finalize': return <FinalizeForm onDownloadPDF={handleDownloadPDF} onDownloadImagePdf={handleDownloadImagePdf} onDownloadDOCX={handleDownloadDOCX} onOpenVersions={handleOpenVersions} versionsEnabled={!!user && !!resumeId} selectedTemplate={selectedTemplate} onTemplateChange={setSelectedTemplate} formData={formData} onOpenAtsModal={() => setIsAtsModalOpen(true)} visibleSections={visibleSections} settings={settings} onSettingsChange={setSettings} />;
            default: return null;
        }
    };

    // The draft made on this device before signing in is offered, never
    // applied on its own (usePersistence's explicit claim flow).
    const anonymousDraftNotice = user && documentState === 'ready' && anonymousDraft.available ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <span>{t('builder.anonymousDraftFound', 'A draft from before you signed in is saved on this device.')}</span>
            <button type="button" onClick={handleClaimAnonymousDraft} className="underline underline-offset-2 hover:text-amber-900">
                {t('builder.restoreDraft', 'Restore it here')}
            </button>
            <button type="button" onClick={dismissAnonymousDraft} className="underline underline-offset-2 hover:text-amber-900">
                {t('builder.dismissDraft', 'Dismiss')}
            </button>
        </div>
    ) : null;

    // The requested CV is missing or belongs to another account. Say so and
    // offer the way back — never open the primary CV in its place.
    if (documentState === 'unavailable') {
        return (
            <div className={`flex ${embedded ? 'h-full' : 'h-screen'} items-center justify-center bg-light px-4`}>
                <div role="alert" className="glass-panel w-full max-w-md rounded-2xl border border-white/40 bg-white/70 p-6 text-center shadow-xl backdrop-blur-md">
                    <h2 className="text-lg font-bold text-dark">{t('builder.unavailableTitle', 'This CV is unavailable')}</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {t('builder.unavailableDesc', 'It may have been deleted, or it belongs to a different account. Nothing else was opened in its place.')}
                    </p>
                    {unavailableResumeId && (
                        <p className="mt-2 break-all text-[11px] text-gray-400">{unavailableResumeId}</p>
                    )}
                    <button
                        type="button"
                        onClick={onBack}
                        className="tap-target mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-95"
                    >
                        {t('builder.backToDashboard', 'Back to dashboard')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        // The transform makes this the containing block for every `fixed`
        // descendant (the modals below, and #print-resume-container). Without
        // it, the off-screen PDF capture container — full resume height,
        // position:fixed, only hidden via a large negative left offset — is
        // fixed to the true viewport instead, and since its height still
        // extends below the fold, the whole document becomes scrollable at
        // the window level. That breaks every `position: sticky` element in
        // the mobile shell, because sticky only tracks its nearest *actual*
        // scrolling ancestor. Harmless for the modals: this div already
        // matches the viewport exactly (h-screen), so `fixed inset-0` inside
        // it looks identical to being fixed to the real viewport.
        <div
            className={`flex ${embedded ? 'h-full' : 'h-screen'} bg-transparent overflow-hidden`}
            style={{ transform: 'translateZ(0)' }}
        >
            {isMobileShell && (
                <div className="flex h-full w-full flex-col overflow-hidden bg-light">
                    <MobileTopBar
                        onBack={onBack}
                        onCenterClick={() => setIsSectionsSheetOpen(true)}
                        center={
                            <>
                                <span className="max-w-[200px] truncate text-[11px] font-semibold text-gray-500">{resumeTitle}</span>
                                <span className="flex items-center gap-1 text-[14.5px] font-bold text-dark">
                                    {activeSectionMeta?.name}
                                    <ChevronDown size={13} strokeWidth={2.5} className="text-gray-400" />
                                </span>
                            </>
                        }
                        trailing={
                            <>
                                <UndoRedoButtons
                                    compact
                                    canUndo={history.canUndo}
                                    canRedo={history.canRedo}
                                    onUndo={history.undo}
                                    onRedo={history.redo}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsMobilePreviewOpen(true)}
                                    aria-label={t('builder.preview', 'Preview')}
                                    className="tap-target flex items-center justify-center rounded-full text-dark transition active:scale-95"
                                >
                                    <Eye size={20} strokeWidth={1.75} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMoreSheetOpen(true)}
                                    aria-label={t('builder.moreActions', 'More actions')}
                                    className="tap-target flex items-center justify-center rounded-full text-dark transition active:scale-95"
                                >
                                    <MoreHorizontal size={20} strokeWidth={1.75} />
                                </button>
                            </>
                        }
                    />
                    <div className="h-[3px] shrink-0 bg-border">
                        <div
                            className="h-full rounded-r-full bg-primary transition-all duration-300 ease-out"
                            style={{ width: `${visibleNavSections.length ? ((activeSectionIndex + 1) / visibleNavSections.length) * 100 : 0}%` }}
                        />
                    </div>
                    <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-5">
                        {anonymousDraftNotice}
                        {renderActiveForm()}
                    </main>
                </div>
            )}

            {!isMobileShell && (
            <>
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
                embedded={embedded}
            />
            <main className={`flex-1 h-full overflow-y-auto relative ${embedded ? 'bg-surface-canvas' : 'bg-light/50'}`}>
                {/* Top/bottom padding folds in the safe-area insets so the toolbar
                    clears the status bar and the last field clears the home
                    indicator. env() resolves to 0 on the web. */}
                <div className={`max-w-5xl mx-auto p-3 sm:p-6 md:p-10 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:pt-[calc(1.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(2.5rem+env(safe-area-inset-top,0px))] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] ${embedded ? 'min-h-full' : 'min-h-screen'} animate-fade-in`}>
                    <div className={embedded ? 'p-4 sm:p-6 md:p-8 rounded-2xl border border-border-default bg-surface-panel' : 'glass-panel p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl min-h-[calc(100vh-5rem)] border border-white/40 shadow-xl bg-white/60 backdrop-blur-md'}>
                        <HeaderActions
                            leading={(
                                <UndoRedoButtons
                                    canUndo={history.canUndo}
                                    canRedo={history.canRedo}
                                    onUndo={history.undo}
                                    onRedo={history.redo}
                                    className="shrink-0"
                                />
                            )}
                            onAiEnhanceClick={() => setIsAiActionModalOpen(true)}
                            onLoadExample={handleLoadExample}
                            saveState={saveState === 'error' ? 'idle' : saveState}
                            onSaveDraft={handleSaveDraft}
                            onOpenJsonBackup={() => setIsJsonModalOpen(true)}
                            onMenuClick={() => setIsMobileMenuOpen(true)}
                        />

                        {/* HeaderActions (owned elsewhere) only knows 'idle' | 'saving'
                            | 'saved' — its Save button is mapped to 'idle' above during
                            an error rather than silently claiming success. This is the
                            real error indicator: a persistent inline notice plus the
                            toast fired above, both with a Retry action. */}
                        {saveState === 'error' && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                                <span>{t('builder.changesNotSaved', 'Your latest changes could not be saved to the cloud.')}</span>
                                <button
                                    type="button"
                                    onClick={retryCloudSave}
                                    className="underline underline-offset-2 hover:text-red-800"
                                >
                                    {t('builder.retryNow', 'Retry now')}
                                </button>
                            </div>
                        )}

                        {anonymousDraftNotice}

                        {/* Dynamic Master Profile Integration */}
                        {user && userProfile && (
                            <MasterProfileSyncCard
                                userProfile={userProfile}
                                isHydrated={isHydrated}
                                onHydrate={() => setIsHydrated(true)}
                                onResync={() => setIsHydrated(false)}
                                onApply={setFormData}
                                current={formData}
                            />
                        )}

                        {/* Completeness and ATS check: one band inside the editor panel, split by
                            hairlines — sections of the panel, not cards inside it. */}
                        <div className="mt-6 grid grid-cols-1 divide-y divide-border-default border-y border-border-default lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                            <div className="py-5 lg:pr-6">
                                <GamifiedProgressTracker
                                    formData={formData}
                                    visibleSections={visibleSections}
                                    progress={progress}
                                    activeSection={activeSection}
                                    onSectionClick={setActiveSection}
                                />
                            </div>
                            <div className="py-5 lg:pl-6">
                                <AtsCompatibilityPanel
                                    formData={formData}
                                    visibleSections={visibleSections}
                                    selectedTemplate={selectedTemplate}
                                />
                            </div>
                        </div>

                        <div className="animate-fade-in mt-6">
                            {renderActiveForm()}
                        </div>
                    </div>
                </div>
            </main>
            </>
            )}

            {/* Hidden High-Quality Capture Area - mounted only while exporting
                (isCapturing), moved far off-screen. Previously mounted
                permanently, so every keystroke rendered the resume template
                twice: once for the visible preview, once here. */}
            <div
                id="print-resume-container"
                className="fixed top-0 pointer-events-none"
                style={{ left: '-9999px', width: '794px', visibility: 'visible', opacity: 1, zIndex: -1000 }}
            >
                {isCapturing && (
                    <div id="capture-root" className="bg-white">
                        {CaptureTemplate}
                    </div>
                )}
            </div>

            {isGeneratingPDF && (
                <div className="fixed inset-0 z-[10000] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-2xl font-bold text-primary">{t('builder.preparingPdf', 'Preparing your PDF...')}</h2>
                    <p className="text-gray-500 mt-2">{t('builder.optimizingLayout', 'Optimizing layout and fonts for high quality')}</p>
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
                onSelectQuality={handleGenerateImagePdf}
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

            {/* Conflict review: staged by usePersistence when the cloud row is
                newer than this device's last sync point and the local draft
                differs, or when a save was rejected because another device
                saved first (stale revision). Nothing is overwritten until the
                user chooses. */}
            <ConfirmDialog
                open={!!conflict}
                title={t('builder.newerVersionTitle', 'Newer version in the cloud')}
                description={conflict?.reason === 'stale-revision'
                    ? t('builder.staleRevisionDesc', 'This resume was saved from another device while you were editing here. Load the cloud version, or keep your edits and overwrite it?')
                    : t('builder.newerVersionDesc', 'This resume was updated from another device since you last opened it here. Load the cloud version, or keep editing your local copy?')}
                confirmLabel={t('builder.useCloudVersion', 'Use cloud version')}
                cancelLabel={t('builder.keepMine', 'Keep mine')}
                onConfirm={() => resolveConflict('useCloud')}
                onCancel={() => resolveConflict('keepMine')}
            />

            {isMobileShell && (
                <>
                    <PreviewModal
                        isOpen={isMobilePreviewOpen}
                        onClose={() => setIsMobilePreviewOpen(false)}
                        formData={formData}
                        selectedTemplate={selectedTemplate}
                        visibleSections={visibleSections}
                        settings={settings}
                    />

                    <MobileSectionsSheet
                        isOpen={isSectionsSheetOpen}
                        onClose={() => setIsSectionsSheetOpen(false)}
                        sections={visibleNavSections}
                        activeSection={activeSection}
                        onSelect={setActiveSection}
                        progress={progress}
                        t={t}
                    />

                    <MobileMoreSheet
                        isOpen={isMoreSheetOpen}
                        onClose={() => setIsMoreSheetOpen(false)}
                        onAiEnhance={() => setIsAiActionModalOpen(true)}
                        onLoadExample={handleLoadExample}
                        onSaveDraft={handleSaveDraft}
                        onOpenJsonBackup={() => setIsJsonModalOpen(true)}
                        language={language}
                        onLanguageChange={(code) => setLanguage(code as any)}
                        languageOptions={LANGUAGE_OPTIONS}
                        t={t}
                    />
                </>
            )}
        </div>
    );
}

export default ResumeBuilder;
