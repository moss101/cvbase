
import React, { useState } from 'react';
import ContentHeader from '../common/ContentHeader';
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

interface CustomizeFormProps {
    visibleSections: SectionId[];
    onToggleSection: (section: SectionId) => void;
    sectionOrder: string[];
    onOrderChange: (newOrder: string[]) => void;
}

const ALL_SECTION_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    summary: { 
        label: 'Professional Summary', 
        icon: <SummaryIcon />, 
        description: 'A brief summary of your background, key strengths, and professional achievements.' 
    },
    experience: { 
        label: 'Work Experience', 
        icon: <ExperienceIcon />, 
        description: 'Chronological list of your previous job titles, companies, locations, dates, and responsibilities.' 
    },
    education: { 
        label: 'Education', 
        icon: <EducationIcon />, 
        description: 'Your academic history including institutions, degrees, certifications, dates, and courses.' 
    },
    skills: { 
        label: 'Skills', 
        icon: <SkillsIcon />, 
        description: 'List of your technical abilities, tools, programming languages, or core competencies.' 
    },
    projects: { 
        label: 'Projects', 
        icon: <ProjectsIcon />, 
        description: 'Showcase specific case studies, coding projects, or freelance work.' 
    },
    certifications: { 
        label: 'Certifications', 
        icon: <CertificationsIcon />, 
        description: 'Professional licenses, certificates, and accreditations.' 
    },
    languages: { 
        label: 'Languages', 
        icon: <LanguagesIcon />, 
        description: 'List languages you speak and your proficiency levels.' 
    },
    awards: { 
        label: 'Awards', 
        icon: <AwardIcon />, 
        description: 'Honors, scholarships, and workplace recognition.' 
    },
    trainings: { 
        label: 'Trainings', 
        icon: <TrainingIcon />, 
        description: 'Workshops, bootcamps, and continuing education.' 
    },
    publications: { 
        label: 'Publications', 
        icon: <PublicationIcon />, 
        description: 'Academic papers, books, or articles you have authored.' 
    },
    volunteer: { 
        label: 'Volunteering', 
        icon: <VolunteerIcon />, 
        description: 'Community service and volunteer leadership roles.' 
    },
    custom: { 
        label: 'Custom Section', 
        icon: <CustomIcon />, 
        description: 'Add any other relevant activities (e.g. Patents, Military Service).' 
    }
};

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
    const [activeTab, setActiveTab] = useState<'toggle' | 'reorder'>('toggle');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const options: { id: SectionId; label: string; icon: React.ReactNode; description: string }[] = [
        { 
            id: 'certifications', 
            label: 'Certifications', 
            icon: <CertificationsIcon />, 
            description: 'Professional licenses, certificates, and accreditations.' 
        },
        { 
            id: 'projects', 
            label: 'Projects', 
            icon: <ProjectsIcon />, 
            description: 'Showcase specific case studies, coding projects, or freelance work.' 
        },
        { 
            id: 'languages', 
            label: 'Languages', 
            icon: <LanguagesIcon />, 
            description: 'List languages you speak and your proficiency levels.' 
        },
        { 
            id: 'awards', 
            label: 'Awards', 
            icon: <AwardIcon />, 
            description: 'Honors, scholarships, and workplace recognition.' 
        },
        { 
            id: 'trainings', 
            label: 'Trainings', 
            icon: <TrainingIcon />, 
            description: 'Workshops, bootcamps, and continuing education.' 
        },
        { 
            id: 'publications', 
            label: 'Publications', 
            icon: <PublicationIcon />, 
            description: 'Academic papers, books, or articles you have authored.' 
        },
        { 
            id: 'volunteer', 
            label: 'Volunteering', 
            icon: <VolunteerIcon />, 
            description: 'Community service and volunteer leadership roles.' 
        },
        { 
            id: 'custom', 
            label: 'Custom Section', 
            icon: <CustomIcon />, 
            description: 'Add any other relevant activities (e.g. Patents, Military Service).' 
        },
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
                title="Customize Sections"
                description="Tailor your resume structure. Enable optional blocks or drag and drop sections to rearrange the layout order in real-time."
            />

            {/* Custom Tabs */}
            <div className="flex border-b border-gray-100 mb-6 font-sans shrink-0">
                <button 
                    type="button"
                    onClick={() => setActiveTab('toggle')}
                    className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'toggle' ? 'border-primary text-primary bg-primary/5 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    Toggle Optional
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveTab('reorder')}
                    className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'reorder' ? 'border-primary text-primary bg-primary/5 rounded-t-xl' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
                    Arrange Sections Order
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
                        <span className="material-symbols-outlined text-gray-400">info</span>
                        Drag and drop items using the handle, or use the up/down arrows to live-reorder your resume sections.
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
                                        <span className="material-symbols-outlined text-[20px] block">drag_indicator</span>
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
                                            title="Move Up"
                                        >
                                            <span className="material-symbols-outlined text-[18px] block">keyboard_arrow_up</span>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === visibleReorderList.length - 1}
                                            onClick={() => moveItem(index, 'down')}
                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                                            title="Move Down"
                                        >
                                            <span className="material-symbols-outlined text-[18px] block">keyboard_arrow_down</span>
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
                    <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                    Did you know?
                </h4>
                <p className="text-sm text-blue-700 leading-relaxed font-sans">
                    You can keep sections hidden while you work on them. Reordering respects active sections on your resume. Your custom section order updates in real-time in the live preview and on your final exported PDF.
                </p>
            </div>
        </>
    );
};

export default CustomizeForm;
