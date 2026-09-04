
import React, { useState, useEffect, useMemo } from 'react';
import ContentHeader from '../common/ContentHeader';
import TipsCard from '../common/TipsCard';
import FormActions from '../common/FormActions';
import { generateSkillSuggestions } from '../../services/geminiService';
import { SparklesIcon } from '../common/icons';
import { CirclePlus, X, Search } from 'lucide-react';
import { useTranslation } from '../../services/translationService';

interface SkillsFormProps {
    skills: string[];
    jobTitle?: string;
    onAdd: (skill: string) => void;
    onRemove: (index: number) => void;
    onClear: () => void;
    onNext: () => void;
}

const SUGGESTED_CATEGORIES = {
    "Soft Skills": ["Communication", "Leadership", "Teamwork", "Problem Solving", "Adaptability", "Critical Thinking", "Time Management", "Emotional Intelligence", "Conflict Resolution"],
    "Business": ["Strategic Planning", "Project Management", "Budgeting", "Sales", "Marketing", "Business Development", "Customer Service", "Financial Analysis"],
    "Technical": ["Data Analysis", "Cloud Computing", "Software Development", "Cybersecurity", "Network Administration", "Tech Support", "System Design"],
    "Design": ["UI/UX Design", "Graphic Design", "Adobe Creative Suite", "Figma", "Prototyping", "Video Editing", "Web Design"],
    "Tools": ["Microsoft Office", "Google Workspace", "Jira", "Slack", "Trello", "Salesforce", "Zoom", "Notion"]
};

const SkillsForm: React.FC<SkillsFormProps> = ({ skills, jobTitle, onAdd, onRemove, onClear, onNext }) => {
    const { t } = useTranslation();
    const [currentSkill, setCurrentSkill] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("Soft Skills");
    const [suggestionContext, setSuggestionContext] = useState(jobTitle || '');

    // Fetch suggestions based on context (Job Title or User Input)
    const fetchAiSuggestions = async (context: string) => {
        if (!context.trim()) return;
        
        setIsLoadingAi(true);
        try {
            const suggestions = await generateSkillSuggestions(context);
            setAiSuggestions(suggestions);
            if (suggestions.length > 0) {
                setActiveTab("AI Recommended");
            }
        } catch (error) {
            console.error("Failed to fetch skills", error);
        } finally {
            setIsLoadingAi(false);
        }
    };

    // Initial load based on Job Title (Default)
    useEffect(() => {
        if (jobTitle) {
            setSuggestionContext(jobTitle);
            fetchAiSuggestions(jobTitle);
        }
    }, [jobTitle]);

    const handleAddClick = () => {
        if (currentSkill.trim()) {
            onAdd(currentSkill.trim());
            setCurrentSkill('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddClick();
        }
    };

    const handleSuggestionClick = (skill: string) => {
        onAdd(skill);
    };

    const handleContextSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
        e.preventDefault();
        fetchAiSuggestions(suggestionContext);
    };

    // Combine AI suggestions into categories for the tabs
    const categories = useMemo(() => {
        const cats = { ...SUGGESTED_CATEGORIES };
        if (aiSuggestions.length > 0) {
            return { "AI Recommended": aiSuggestions, ...cats };
        }
        return cats;
    }, [aiSuggestions]);

    const currentSuggestions = categories[activeTab as keyof typeof categories] || [];

    return (
        <>
            <ContentHeader
                title={t('skills.title', 'Skills & Expertise')}
                description={t('skillsForm.desc', "Highlight your technical and professional skills. We'll help you find the best ones for your role.")}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Left Column: Input and Active Skills */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                        <label htmlFor="skill-input" className="font-bold mb-3 block text-gray-700 text-sm uppercase tracking-wide">{t('skillsForm.addASkill', 'Add a Skill')}</label>
                        <div className="flex gap-3 mb-6">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <CirclePlus className="w-[1em] h-[1em] text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    id="skill-input"
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={currentSkill}
                                    onChange={(e) => setCurrentSkill(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('skillsForm.addSkillPlaceholder', 'e.g. Public Speaking')}
                                />
                            </div>
                            <button
                                type="button"
                                className="px-8 py-3 bg-dark text-white rounded-xl font-bold cursor-pointer transition-all hover:bg-black hover:-translate-y-0.5 shadow-md"
                                onClick={handleAddClick}
                            >
                                {t('skillsForm.add', 'Add')}
                            </button>
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2">
                                <span>{t('skillsForm.yourSkills', 'Your Skills')}</span>
                                <span className="bg-primary-light text-primary text-xs px-2 py-0.5 rounded-full">{skills.length}</span>
                            </h3>

                            {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, index) => (
                                        <div key={`${skill}-${index}`} className="group flex items-center gap-2 pl-3 pr-2 py-2 bg-white border border-border rounded-lg text-dark font-medium shadow-sm hover:border-primary hover:shadow-md transition-all animate-fade-in">
                                            <span>{skill}</span>
                                            <button
                                                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-danger transition-colors"
                                                onClick={() => onRemove(index)}
                                                title={t('skillsForm.removeSkill', 'Remove skill')}
                                                aria-label={t('skillsForm.removeSkillAria', 'Remove {skill}').replace('{skill}', skill)}
                                            >
                                                <X className="w-4 h-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50">
                                    <p className="text-gray-400 text-sm">{t('skillsForm.noSkillsYet', 'No skills added yet. Start typing or select from suggestions below.')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Suggestions */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden sticky top-6">
                        <div className="p-4 bg-gray-50 border-b border-border">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                                <SparklesIcon />
                                <span>{t('experienceForm.aiSuggestions', 'AI Suggestions')}</span>
                            </h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={suggestionContext}
                                    onChange={(e) => setSuggestionContext(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleContextSubmit(e)}
                                    className="w-full pl-3 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                    placeholder={t('skillsForm.roleIndustryPlaceholder', 'Role, Industry or Keyword...')}
                                />
                                <button
                                    onClick={() => fetchAiSuggestions(suggestionContext)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md hover:bg-gray-100"
                                    disabled={isLoadingAi}
                                    title={t('skillsForm.generateSuggestions', 'Generate Suggestions')}
                                >
                                    {isLoadingAi ? (
                                        <span className="animate-spin block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"/>
                                    ) : (
                                        <Search className="w-[18px] h-[18px]" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex overflow-x-auto border-b border-border no-scrollbar">
                            {Object.keys(categories).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-colors relative ${
                                        activeTab === cat 
                                        ? 'text-primary bg-primary-light/20' 
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    {cat === "AI Recommended" && isLoadingAi ? (
                                         <span className="flex items-center gap-1 opacity-50">AI Recommended</span>
                                    ) : cat}
                                    {activeTab === cat && (
                                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="flex flex-wrap gap-2">
                                {currentSuggestions.map((suggestion, i) => {
                                    const isAdded = skills.includes(suggestion);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => !isAdded && handleSuggestionClick(suggestion)}
                                            disabled={isAdded}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 text-left ${
                                                isAdded
                                                ? 'bg-gray-100 text-gray-400 border-transparent cursor-default'
                                                : 'bg-white border-border text-gray-700 hover:border-primary hover:text-primary hover:bg-primary-light/10 active:scale-95'
                                            }`}
                                        >
                                            {isAdded ? '✓ ' : '+ '}{suggestion}
                                        </button>
                                    );
                                })}
                                {currentSuggestions.length === 0 && !isLoadingAi && (
                                    <p className="text-sm text-gray-400 p-4 text-center w-full">{t('skillsForm.noSuggestionsForCategory', 'No suggestions found for this category.')}</p>
                                )}
                                {isLoadingAi && currentSuggestions.length === 0 && (
                                     <div className="p-8 flex justify-center w-full">
                                         <span className="animate-spin block w-6 h-6 border-2 border-primary border-t-transparent rounded-full"/>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TipsCard activeSection="skills" />
            <FormActions onClear={onClear} onNext={onNext} />
        </>
    );
};

export default SkillsForm;
