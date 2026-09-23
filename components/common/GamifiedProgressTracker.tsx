import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown, CircleCheck, Circle } from 'lucide-react';
import { useTranslation } from '../../services/translationService';
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
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMilestoneAlert, setShowMilestoneAlert] = useState<string | null>(null);
    const [prevProgress, setPrevProgress] = useState(progress);

    // Crossing a threshold is acknowledged in plain words, not a level name.
    useEffect(() => {
        const milestones = [35, 60, 85, 100].map((thresh) => ({
            thresh,
            name: t('builder.progress.milestone', 'Your CV is now {pct}% complete.').replace('{pct}', String(thresh)),
        }));

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
                label: t('gamified.field.firstName.label', 'First Name'),
                section: 'contact',
                isFilled: !!formData.contact.firstName.trim(),
                helpText: t('gamified.field.firstName.help', 'Add your first name')
            },
            {
                id: 'contact-lastName',
                label: t('gamified.field.lastName.label', 'Last Name'),
                section: 'contact',
                isFilled: !!formData.contact.lastName.trim(),
                helpText: t('gamified.field.lastName.help', 'Add your family name')
            },
            {
                id: 'contact-email',
                label: t('gamified.field.email.label', 'Email Address'),
                section: 'contact',
                isFilled: !!formData.contact.email.trim() && formData.contact.email.includes('@'),
                helpText: t('gamified.field.email.help', 'Provide a valid contact email')
            },
            {
                id: 'contact-phone',
                label: t('gamified.field.phone.label', 'Phone Number'),
                section: 'contact',
                isFilled: !!formData.contact.phone.trim(),
                helpText: t('gamified.field.phone.help', 'Provide a reachability number')
            },
        ];

        // Professional Summary Section is built-in by default
        if (!visibleSections.includes('summary' as any) || true) { // Always track if present
            list.push({
                id: 'summary-desc',
                label: t('gamified.field.summary.label', 'Professional Summary'),
                section: 'summary',
                isFilled: !!formData.summary.professionalSummary?.replace(/<[^>]*>/g, '').trim(),
                helpText: t('gamified.field.summary.help', 'Write a quick summary of your profile')
            });
        }

        // Skills list is essential
        list.push({
            id: 'skills-list',
            label: t('gamified.field.skills.label', 'Key Competencies/Skills'),
            section: 'skills',
            isFilled: formData.skills.length >= 2,
            helpText: t('gamified.field.skills.help', 'Add at least 2 professional skills')
        });

        // Track optional items IF they are turned on in user\'s visible list
        if (visibleSections.includes('experience')) {
            list.push({
                id: 'exp-list',
                label: t('gamified.field.experience.label', 'Job Title & Company'),
                section: 'experience',
                isFilled: formData.experience.length > 0 && !!formData.experience[0].jobTitle.trim() && !!formData.experience[0].company.trim(),
                helpText: t('gamified.field.experience.help', 'List at least one work position with description')
            });
        }

        if (visibleSections.includes('education')) {
            list.push({
                id: 'edu-list',
                label: t('gamified.field.education.label', 'School & Degree'),
                section: 'education',
                isFilled: formData.education.length > 0 && !!formData.education[0].school.trim() && !!formData.education[0].degree.trim(),
                helpText: t('gamified.field.education.help', 'List your educational background')
            });
        }

        if (visibleSections.includes('projects')) {
            list.push({
                id: 'proj-list',
                label: t('gamified.field.projects.label', 'Project Name & Details'),
                section: 'projects',
                isFilled: formData.projects.length > 0 && !!formData.projects[0].name.trim(),
                helpText: t('gamified.field.projects.help', 'Detail at least one engineering/business project')
            });
        }

        if (visibleSections.includes('certifications')) {
            list.push({
                id: 'cert-list',
                label: t('gamified.field.certifications.label', 'Certification Details'),
                section: 'certifications',
                isFilled: formData.certifications.length > 0 && !!formData.certifications[0].name.trim(),
                helpText: t('gamified.field.certifications.help', 'Mention a credential or professional license')
            });
        }

        if (visibleSections.includes('languages')) {
            list.push({
                id: 'lang-list',
                label: t('gamified.field.languages.label', 'Language Proficiency'),
                section: 'languages',
                isFilled: formData.languages.length > 0 && !!formData.languages[0].language.trim(),
                helpText: t('gamified.field.languages.help', 'Mention a language other than your primary')
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
            {/* Milestone notice */}
            {showMilestoneAlert && (
                <div role="status" className="fixed top-8 left-1/2 z-50 flex max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-action-primary/40 bg-slate-900 px-5 py-3.5 text-left text-sm font-semibold text-white shadow-2xl">
                    <CircleCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>{showMilestoneAlert}</span>
                </div>
            )}

            {/* Main Tracker Container */}
            <div>
                {/* Heading, count and percentage */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 text-left">
                        <h3 className="text-[15px] font-semibold text-content-primary">{t('builder.progress.title', 'CV completeness')}</h3>
                        <p className="mt-0.5 text-[13px] text-content-secondary">
                            {t('builder.progress.count', '{done} of {total} requirements').replace('{done}', String(filledCount)).replace('{total}', String(totalCount))}
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <span className="text-[28px] font-semibold leading-none tabular-nums text-content-primary">{progress}%</span>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            aria-expanded={isExpanded}
                            className="flex items-center gap-1 rounded-lg border border-border-default px-2.5 py-1 text-[12.5px] font-semibold text-content-secondary transition-colors hover:bg-surface-canvas hover:text-content-primary"
                        >
                            <span>{isExpanded ? t('gamified.collapse', 'Collapse') : t('gamified.details', 'Details')}</span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-canvas">
                    <div
                        className="h-full rounded-full bg-action-primary transition-[width] duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                    {/* Tick markers representing key milestones */}
                    {[35, 60, 85].map((val) => (
                        <div
                            key={val}
                            className={`absolute top-0 bottom-0 z-10 w-0.5 ${progress >= val ? 'bg-white/50' : 'bg-border-default'}`}
                            style={{ left: `${val}%` }}
                            title={`${val}% Milestone`}
                        />
                    ))}
                </div>

                {/* The next missing requirement, one click from its section */}
                {nextAction && (
                    <button
                        type="button"
                        className="group -mx-3 mt-2.5 flex w-[calc(100%+1.5rem)] cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-canvas"
                        onClick={() => onSectionClick(nextAction.section)}
                    >
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-action-primary" aria-hidden="true" />
                        <p className="text-[13px] leading-normal text-content-secondary">
                            <span className="font-semibold text-content-primary">{t('builder.progress.next', 'Next')}: </span>
                            {nextAction.helpText} {t('gamified.inThe', 'in the')} <strong className="font-semibold capitalize text-content-primary">{nextAction.section}</strong> {t('gamified.sectionSuffix', 'section.')}
                        </p>
                    </button>
                )}

                {/* Expanded Section View detailing precise checkbox required fields */}
                {isExpanded && (
                    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border-default pt-4 md:grid-cols-2">
                        {checklist.map(item => (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => onSectionClick(item.section)}
                                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-canvas"
                            >
                                {item.isFilled
                                    ? <CircleCheck className="h-4 w-4 shrink-0 text-action-primary" aria-hidden="true" />
                                    : <Circle className="h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />}
                                <div className="min-w-0 text-left">
                                    <p className={`text-[13px] font-semibold ${item.isFilled ? 'text-content-primary' : 'text-content-secondary'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-[11.5px] font-medium capitalize text-content-muted">
                                        {t('gamified.sectionLabel', 'Section:')} {item.section}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GamifiedProgressTracker;
