
import React, { useState } from 'react';
import ContentHeader from '../common/ContentHeader';
import { Wrench, GripVertical, Info, Lightbulb, ChevronUp, ChevronDown } from 'lucide-react';
import {
    ProjectsIcon, 
    LanguagesIcon, 
    CertificationsIcon, 
    AwardIcon, 
    TrainingIcon, 
    PublicationIcon, 
    VolunteerIcon, 
    CustomIcon,
    SummaryIcon,
    ExperienceIcon,
    EducationIcon,
    SkillsIcon
} from '../common/icons';
import type { SectionId } from '../../types';
import { useTranslation, type Translate } from '../../services/translationService';

interface CustomizeFormProps {
    visibleSections: SectionId[];
    onToggleSection: (section: SectionId) => void;
    sectionOrder: string[];
    onOrderChange: (newOrder: string[]) => void;
}

const buildSectionMeta = (t: Translate): Record<string, { label: string; icon: React.ReactNode; description: string }> => ({
    summary: {
        label: t('nav.summary', 'Summary'),
        icon: <SummaryIcon />,
        description: t('customize.summary_desc', 'A brief summary of your background, key strengths, and professional achievements.')
    },
    experience: {
        label: t('nav.experience', 'Experience'),
        icon: <ExperienceIcon />,
        description: t('customize.experience_desc', 'Chronological list of your previous job titles, companies, locations, dates, and responsibilities.')
    },
    education: {
        label: t('nav.education', 'Education'),
        icon: <EducationIcon />,
        description: t('customize.education_desc', 'Your academic history including institutions, degrees, certifications, dates, and courses.')
    },
    skills: {
        label: t('nav.skills', 'Skills'),
        icon: <SkillsIcon />,
        description: t('customize.skills_desc', 'List of your technical abilities, tools, programming languages, or core competencies.')
    },
    projects: {
        label: t('nav.projects', 'Projects'),
        icon: <ProjectsIcon />,
        description: t('customize.projects_desc', 'Showcase specific case studies, coding projects, or freelance work.')
    },
    certifications: {
        label: t('nav.certifications', 'Certifications'),
        icon: <CertificationsIcon />,
        description: t('customize.certifications_desc', 'Professional licenses, certificates, and accreditations.')
    },
    languages: {
        label: t('nav.languages', 'Languages'),
        icon: <LanguagesIcon />,
        description: t('customize.languages_desc', 'List languages you speak and your proficiency levels.')
    },
    awards: {
        label: t('nav.awards', 'Awards'),
        icon: <AwardIcon />,
        description: t('customize.awards_desc', 'Honors, scholarships, and workplace recognition.')
    },
    trainings: {
        label: t('nav.trainings', 'Trainings'),
        icon: <TrainingIcon />,
        description: t('customize.trainings_desc', 'Workshops, bootcamps, and continuing education.')
    },
    publications: {
        label: t('nav.publications', 'Publications'),
        icon: <PublicationIcon />,
        description: t('customize.publications_desc', 'Academic papers, books, or articles you have authored.')
    },
    volunteer: {
        label: t('nav.volunteer', 'Volunteering'),
        icon: <VolunteerIcon />,
        description: t('customize.volunteer_desc', 'Community service and volunteer leadership roles.')
    },
    custom: {
        label: t('nav.custom', 'Custom Section'),
        icon: <CustomIcon />,
        description: t('customize.custom_desc', 'Add any other relevant activities (e.g. Patents, Military Service).')
    }
});

const OptionCard: React.FC<{ 
    id: SectionId; 
    label: string; 
    icon: React.ReactNode; 
    description: string; 
    isEnabled: boolean; 
    onToggle: () => void; 
}> = ({ id, label, icon, description, isEnabled, onToggle }) => {
    return (
        <div 
            className={`relative p-5 border rounded-2xl transition-all cursor-pointer ${isEnabled ? 'bg-white border-primary shadow-md ring-1 ring-primary/20' : 'bg-gray-50 border-border hover:border-gray-300'}`}
            onClick={onToggle}
        >
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${isEnabled ? 'bg-primary text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className={`font-bold text-lg ${isEnabled ? 'text-dark' : 'text-gray-500'}`}>{label}</h3>
                        <div className={`w-12 h-6 rounded-full relative transition-colors ${isEnabled ? 'bg-success' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isEnabled ? 'left-7' : 'left-1'}`}></div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                </div>
            </div>
        </div>
    );
};

const CustomizeForm: React.FC<CustomizeFormProps> = ({ visibleSections, onToggleSection, sectionOrder, onOrderChange }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'toggle' | 'reorder'>('toggle');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const ALL_SECTION_META = buildSectionMeta(t);

    const options: { id: SectionId; label: string; icon: React.ReactNode; description: string }[] = [
        { id: 'certifications', ...ALL_SECTION_META.certifications },
        { id: 'projects', ...ALL_SECTION_META.projects },
        { id: 'languages', ...ALL_SECTION_META.languages },
        { id: 'awards', ...ALL_SECTION_META.awards },
        { id: 'trainings', ...ALL_SECTION_META.trainings },
        { id: 'publications', ...ALL_SECTION_META.publications },
        { id: 'volunteer', ...ALL_SECTION_META.volunteer },
        { id: 'custom', ...ALL_SECTION_META.custom },
    ];

    // Filter order to show only sections that are currently on the resume (either core or enabled optional sections)
    const visibleReorderList = sectionOrder.filter(item => {
        const isCore = ['summary', 'experience', 'education', 'skills'].includes(item);
        return isCore || visibleSections.includes(item as any);
    });

    const handleReorder = (newVisibleList: string[]) => {
        const invisibleItems = sectionOrder.filter(item => !visibleReorderList.includes(item));
        onOrderChange([...newVisibleList, ...invisibleItems]);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        
        const newItems = [...visibleReorderList];
        const draggedItem = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, draggedItem);
        
        setDraggedIndex(index);
        handleReorder(newItems);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= visibleReorderList.length) return;
        
        const newItems = [...visibleReorderList];
        const itemToMove = newItems[index];
        newItems.splice(index, 1);
        newItems.splice(targetIndex, 0, itemToMove);
        
        handleReorder(newItems);
    };

    return (
        <>
            <ContentHeader
                title={t('customize.title', 'Customize Sections')}
                description={t('customizeForm.desc', 'Tailor your resume structure. Enable optional blocks or drag and drop sections to rearrange the layout order in real-time.')}
            />

            {/* Custom Tabs */}
            <div className="flex border-b border-gray-100 mb-6 font-sans shrink-0">
                <button
                    type="button"
                    onClick={() => setActiveTab('toggle')}
                    className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'toggle' ? 'border-primary text-primary bg-primary/5 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                    <Wrench className="w-[18px] h-[18px]" aria-hidden="true" />
                    {t('customizeForm.toggleOptional', 'Toggle Optional')}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('reorder')}
                    className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'reorder' ? 'border-primary text-primary bg-primary/5 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                    <GripVertical className="w-[18px] h-[18px]" aria-hidden="true" />
                    {t('customizeForm.arrangeOrder', 'Arrange Sections Order')}
                </button>
            </div>
            
            {activeTab === 'toggle' ? (
                <div className="grid grid-cols-1 gap-4">
                    {options.map((option) => (
                        <OptionCard
                            key={option.id}
                            {...option}
                            isEnabled={visibleSections.includes(option.id)}
                            onToggle={() => onToggleSection(option.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center gap-2">
                        <Info className="w-[1em] h-[1em] text-gray-400" aria-hidden="true" />
                        {t('customizeForm.dragDropHint', 'Drag and drop items using the handle, or use the up/down arrows to live-reorder your resume sections.')}
                    </p>
                    <div className="bg-light p-4 rounded-2xl border border-border flex flex-col gap-2">
                        {visibleReorderList.map((sectionId, index) => {
                            const meta = ALL_SECTION_META[sectionId];
                            if (!meta) return null;
                            const isDragged = draggedIndex === index;

                            return (
                                <div
                                    key={sectionId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-4 p-4 bg-white border rounded-xl shadow-sm transition-all select-none ${
                                        isDragged ? 'opacity-40 border-primary scale-[0.98]' : 'border-gray-200/80 hover:border-primary-light hover:shadow-md'
                                    }`}
                                >
                                    {/* Drag Handle */}
                                    <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-primary transition-colors">
                                        <GripVertical className="w-5 h-5 block" aria-hidden="true" />
                                    </div>

                                    {/* Icon */}
                                    <div className="p-2.5 bg-gray-50 text-primary-dark rounded-lg">
                                        {meta.icon}
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{meta.label}</h4>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{meta.description}</p>
                                    </div>

                                    {/* Precise Reorder Controls */}
                                    <div className="flex items-center gap-1.5 pl-2 border-l border-gray-100">
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => moveItem(index, 'up')}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                                            title={t('customizeForm.moveUp', 'Move Up')}
                                            aria-label={t('customizeForm.moveUp', 'Move Up')}
                                        >
                                            <ChevronUp className="w-[18px] h-[18px] block" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === visibleReorderList.length - 1}
                                            onClick={() => moveItem(index, 'down')}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                                            title={t('customizeForm.moveDown', 'Move Down')}
                                            aria-label={t('customizeForm.moveDown', 'Move Down')}
                                        >
                                            <ChevronDown className="w-[18px] h-[18px] block" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="mt-10 p-6 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2 font-sans flex items-center gap-1.5">
                    <Lightbulb className="w-5 h-5" aria-hidden="true" />
                    {t('customizeForm.didYouKnow', 'Did you know?')}
                </h4>
                <p className="text-sm text-blue-700 leading-relaxed font-sans">
                    {t('customizeForm.tipText', 'You can keep sections hidden while you work on them. Reordering respects active sections on your resume. Your custom section order updates in real-time in the live preview and on your final exported PDF.')}
                </p>
            </div>
        </>
    );
};

export default CustomizeForm;
