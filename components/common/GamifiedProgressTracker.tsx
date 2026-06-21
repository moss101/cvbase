import React, { useState, useEffect } from 'react';
import type { ResumeData, SectionId } from '../../types';

interface GamifiedProgressTrackerProps {
    formData: ResumeData;
    visibleSections: SectionId[];
    progress: number;
    activeSection: SectionId;
    onSectionClick: (id: SectionId) => void;
}

interface RequiredFieldItem {
    id: string;
    label: string;
    section: SectionId;
    isFilled: boolean;
    helpText: string;
}

export const GamifiedProgressTracker: React.FC<GamifiedProgressTrackerProps> = ({
    formData,
    visibleSections,
    progress,
    activeSection,
    onSectionClick,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMilestoneAlert, setShowMilestoneAlert] = useState<string | null>(null);
    const [prevProgress, setPrevProgress] = useState(progress);

    // Dynamic Level Name / Badge Based on Progress
    const getBadgeInfo = (pct: number) => {
        if (pct === 100) return { title: '👑 Ultimate Resume Master', color: 'from-amber-500 to-yellow-400 bg-amber-50 text-amber-800 border-amber-200' };
        if (pct >= 85) return { title: '🚀 ATS Champion', color: 'from-secondary to-primary bg-emerald-50 text-emerald-800 border-emerald-200' };
        if (pct >= 60) return { title: '🎨 Professional Artisan', color: 'from-primary to-indigo-500 bg-blue-50 text-blue-800 border-blue-200' };
        if (pct >= 35) return { title: '⚡ Career Climber', color: 'from-indigo-400 to-violet-500 bg-violet-50 text-violet-800 border-violet-200' };
        return { title: '🌱 CV Novice', color: 'from-gray-400 to-slate-500 bg-slate-50 text-slate-700 border-slate-200' };
    };

    const badge = getBadgeInfo(progress);

    // Check progress level changes to trigger celebratory milestones!
    useEffect(() => {
        const milestones = [
            { thresh: 35, name: '⚡ Career Climber unlocked!' },
            { thresh: 60, name: '🎨 Professional Artisan unlocked!' },
            { thresh: 85, name: '🚀 ATS Champion unlocked!' },
            { thresh: 100, name: '👑 Ultimate Resume Master unlocked! You are 100% Ready!' }
        ];

        const unlockedMilestone = milestones.find(m => prevProgress < m.thresh && progress >= m.thresh);
        if (unlockedMilestone) {
            setShowMilestoneAlert(unlockedMilestone.name);
            const timer = setTimeout(() => setShowMilestoneAlert(null), 4000);
            return () => clearTimeout(timer);
        }
        setPrevProgress(progress);
    }, [progress, prevProgress]);

    // Build the requirement checklist based on visible/enabled sections
    const getRequiredFieldsList = (): RequiredFieldItem[] => {
        const list: RequiredFieldItem[] = [
            // Always required Contact Fields
            {
                id: 'contact-firstName',
                label: 'First Name',
                section: 'contact',
                isFilled: !!formData.contact.firstName.trim(),
                helpText: 'Add your first name'
            },
            {
                id: 'contact-lastName',
                label: 'Last Name',
                section: 'contact',
                isFilled: !!formData.contact.lastName.trim(),
                helpText: 'Add your family name'
            },
            {
                id: 'contact-email',
                label: 'Email Address',
                section: 'contact',
                isFilled: !!formData.contact.email.trim() && formData.contact.email.includes('@'),
                helpText: 'Provide a valid contact email'
            },
            {
                id: 'contact-phone',
                label: 'Phone Number',
                section: 'contact',
                isFilled: !!formData.contact.phone.trim(),
                helpText: 'Provide a reachability number'
            },
        ];

        // Professional Summary Section is built-in by default
        if (!visibleSections.includes('summary' as any) || true) { // Always track if present
            list.push({
                id: 'summary-desc',
                label: 'Professional Summary',
                section: 'summary',
                isFilled: !!formData.summary.professionalSummary?.replace(/<[^>]*>/g, '').trim(),
                helpText: 'Write a quick summary of your profile'
            });
        }

        // Skills list is essential
        list.push({
            id: 'skills-list',
            label: 'Key Competencies/Skills',
            section: 'skills',
            isFilled: formData.skills.length >= 2,
            helpText: 'Add at least 2 professional skills'
        });

        // Track optional items IF they are turned on in user\'s visible list
        if (visibleSections.includes('experience')) {
            list.push({
                id: 'exp-list',
                label: 'Job Title & Company',
                section: 'experience',
                isFilled: formData.experience.length > 0 && !!formData.experience[0].jobTitle.trim() && !!formData.experience[0].company.trim(),
                helpText: 'List at least one work position with description'
            });
        }

        if (visibleSections.includes('education')) {
            list.push({
                id: 'edu-list',
                label: 'School & Degree',
                section: 'education',
                isFilled: formData.education.length > 0 && !!formData.education[0].school.trim() && !!formData.education[0].degree.trim(),
                helpText: 'List your educational background'
            });
        }

        if (visibleSections.includes('projects')) {
            list.push({
                id: 'proj-list',
                label: 'Project Name & Details',
                section: 'projects',
                isFilled: formData.projects.length > 0 && !!formData.projects[0].name.trim(),
                helpText: 'Detail at least one engineering/business project'
            });
        }

        if (visibleSections.includes('certifications')) {
            list.push({
                id: 'cert-list',
                label: 'Certification Details',
                section: 'certifications',
                isFilled: formData.certifications.length > 0 && !!formData.certifications[0].name.trim(),
                helpText: 'Mention a credential or professional license'
            });
        }

        if (visibleSections.includes('languages')) {
            list.push({
                id: 'lang-list',
                label: 'Language Proficiency',
                section: 'languages',
                isFilled: formData.languages.length > 0 && !!formData.languages[0].language.trim(),
                helpText: 'Mention a language other than your primary'
            });
        }

        return list;
    };

    const checklist = getRequiredFieldsList();
    const filledCount = checklist.filter(c => c.isFilled).length;
    const totalCount = checklist.length;

    // Next best action to take
    const nextAction = checklist.find(c => !c.isFilled);

    return (
        <div className="w-full relative select-none">
            {/* Gamified Milestone Level Unlock Celebration Toast */}
            {showMilestoneAlert && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 border border-yellow-400 animate-bounce cursor-pointer max-w-sm text-center">
                    <span className="material-symbols-outlined text-yellow-400 font-extrabold text-2xl">workspace_premium</span>
                    <div>
                        <p className="text-xs tracking-wider uppercase opacity-80 text-yellow-300 font-extrabold">Milestone Achieved!</p>
                        <p className="text-sm font-bold leading-tight">{showMilestoneAlert}</p>
                    </div>
                </div>
            )}

            {/* Main Tracker Container */}
            <div className="p-5 bg-gradient-to-br from-slate-100/70 to-white/90 border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-all">
                {/* Upper line: Rank and compact progress percent */}
                <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[24px]">workspace_premium</span>
                        <div className="text-left">
                            <p className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 leading-none">CV Level</p>
                            <span className="text-sm font-black text-slate-800">{badge.title}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-extrabold text-slate-500">
                            {filledCount}/{totalCount} Requirements
                        </span>
                        <span className={`text-sm font-black px-2.5 py-1 rounded-xl bg-gradient-to-r text-white ${badge.color}`}>
                            {progress}%
                        </span>
                        
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 px-2.5 border border-slate-200 bg-white/70 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                        >
                            <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                            <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                keyboard_arrow_down
                            </span>
                        </button>
                    </div>
                </div>

                {/* Progress bar container */}
                <div className="w-full h-2.5 bg-slate-100 border border-slate-200/40 rounded-full overflow-hidden mt-3.5 relative group">
                    <div
                        className={`h-full bg-gradient-to-r from-primary via-secondary to-[#4ade80] transition-all duration-700 ease-out`}
                        style={{ width: `${progress}%` }}
                    ></div>
                    {/* Tick markers representing key milestones */}
                    {[35, 60, 85].map((val) => (
                        <div
                            key={val}
                            className={`absolute top-0 bottom-0 w-0.5 z-10 transition-colors ${progress >= val ? 'bg-white/40' : 'bg-slate-300'}`}
                            style={{ left: `${val}%` }}
                            title={`${val}% Milestone`}
                        />
                    ))}
                </div>

                {/* Next helpful hint / coaching micro-message if not complete */}
                {nextAction && (
                    <div 
                        className="mt-3.5 flex items-center gap-2 bg-primary/4 border border-primary/10 rounded-xl p-3 text-slate-700 cursor-pointer hover:bg-primary/8 transition-colors"
                        onClick={() => onSectionClick(nextAction.section)}
                    >
                        <span className="material-symbols-outlined text-primary text-base inline-block shrink-0 animate-pulse">
                            tips_and_updates
                        </span>
                        <p className="text-xs font-medium text-slate-600 leading-normal">
                            <span className="font-extrabold text-primary uppercase text-[10px] tracking-wider block">Next Level Task</span>
                            {nextAction.helpText} in the <strong className="text-slate-800 capitalize">{nextAction.section}</strong> section.
                        </p>
                    </div>
                )}

                {/* Expanded Section View detailing precise checkbox required fields */}
                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-2 animate-slide-down">
                        {checklist.map(item => (
                            <div
                                key={item.id}
                                onClick={() => onSectionClick(item.section)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer hover:bg-slate-50 transition-colors ${
                                    item.isFilled 
                                        ? 'bg-emerald-50/20 border-emerald-100 text-slate-800' 
                                        : 'bg-white border-slate-150 text-slate-400'
                                }`}
                            >
                                <span className={`material-symbols-outlined font-extrabold text-base select-none ${
                                    item.isFilled ? 'text-emerald-500' : 'text-slate-300'
                                }`}>
                                    {item.isFilled ? 'check_circle' : 'radio_button_unchecked'}
                                </span>
                                <div className="text-left">
                                    <p className={`text-xs font-semibold ${item.isFilled ? 'text-slate-700' : 'text-slate-500'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium capitalize">
                                        Section: {item.section}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamifiedProgressTracker;
