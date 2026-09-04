import React, { useState, useEffect, useMemo } from 'react';
import type { ResumeData } from '../../types';
import ContentHeader from '../common/ContentHeader';
import FormActions from '../common/FormActions';
import RichTextEditor from '../common/RichTextEditor';
import { generateSummarySuggestions, generateSuggestion } from '../../services/geminiService';
import { SparklesIcon } from '../common/icons';
import { Search } from 'lucide-react';
import TipsCard from '../common/TipsCard';
import AITipHelper from '../common/AITipHelper';
import { useTranslation } from '../../services/translationService';


interface SummaryFormProps {
    data: ResumeData;
    onFormDataChange: React.Dispatch<React.SetStateAction<ResumeData>>;
    onClear: () => void;
    onNext: () => void;
}

const SummaryForm: React.FC<SummaryFormProps> = ({ data, onFormDataChange, onClear, onNext }) => {
    const { t } = useTranslation();
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const jobTitle = data.contact.jobTitle;

    // Load AI suggestions when job title changes
    useEffect(() => {
        if (jobTitle) {
            setIsLoading(true);
            generateSummarySuggestions(jobTitle)
                .then(setSuggestions)
                .catch(() => setSuggestions([]))
                .finally(() => setIsLoading(false));
        } else {
            setSuggestions([]);
            setIsLoading(false);
        }
    }, [jobTitle]);

    const handleSummaryChange = (html: string) => {
        onFormDataChange(prev => ({
            ...prev,
            summary: {
                ...prev.summary,
                professionalSummary: html
            }
        }));
    };

    // Safely parse active suggestions using DOMParser (StrictMode safe)
    const activeSuggestionSet = useMemo(() => {
        const active = new Set<string>();

        if (!data.summary.professionalSummary) return active;

        try {
            const doc = new DOMParser().parseFromString(
                `<div>${data.summary.professionalSummary}</div>`,
                'text/html'
            );
            doc.querySelectorAll('p[data-suggestion]').forEach(el => {
                const val = el.getAttribute('data-suggestion');
                if (val) active.add(val);
            });
        } catch (err) {
            console.warn('Failed to parse professional summary HTML', err);
        }

        return active;
    }, [data.summary.professionalSummary]);

    // Add suggestion safely
    const handleAddSuggestion = (suggestion: string) => {
        const doc = new DOMParser().parseFromString(
            `<div>${data.summary.professionalSummary || ''}</div>`,
            'text/html'
        );
        const container = doc.querySelector('div')!;

        const p = doc.createElement('p');
        p.textContent = suggestion;
        p.setAttribute('data-suggestion', suggestion);
        container.appendChild(p);

        handleSummaryChange(container.innerHTML);
    };

    // Remove suggestion safely
    const handleRemoveSuggestion = (suggestion: string) => {
        const doc = new DOMParser().parseFromString(
            `<div>${data.summary.professionalSummary || ''}</div>`,
            'text/html'
        );
        const container = doc.querySelector('div')!;

        const nodes = container.querySelectorAll('p[data-suggestion]');
        for (const node of nodes) {
            if (node.getAttribute('data-suggestion') === suggestion) {
                node.remove();
                break;
            }
        }

        handleSummaryChange(container.innerHTML);
    };

    // Regenerate entire summary
    const handleRegenerate = async () => {
        if (!jobTitle) return;

        setIsRegenerating(true);
        try {
            const prompt = `Write a compelling, 3-4 sentence professional summary for a ${jobTitle}. Return ONLY a single <p>...</p> HTML paragraph. No explanations, no markdown, no code blocks.`;

            let newSummary = await generateSuggestion(prompt);

            // Clean common markdown artifacts
            newSummary = newSummary
                .replace(/```html?\n?/g, '')
                .replace(/```/g, '')
                .trim();

            // Ensure it's wrapped in exactly one <p>
            const pMatch = newSummary.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            if (pMatch) {
                newSummary = `<p>${pMatch[1].trim()}</p>`;
            } else if (newSummary) {
                newSummary = `<p>${newSummary}</p>`;
            }

            handleSummaryChange(newSummary);
        } catch (error) {
            console.error('Failed to regenerate summary', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // Filtered suggestions with search
    const filteredSuggestions = useMemo(() => {
        if (!searchTerm) return suggestions;
        const term = searchTerm.toLowerCase();
        return suggestions.filter(s => s.toLowerCase().includes(term));
    }, [suggestions, searchTerm]);

    return (
        <>
            <ContentHeader
                title={t('summary.title', 'Professional Summary')}
                description={t('summaryForm.desc', "This section will usually be one of the first things a hiring manager reads. It tells them, 'Here's who I am, and here's what I can do for your company'.")}
            />

            <form onSubmit={e => e.preventDefault()}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Editor Column */}
                    <div className="lg:col-span-3">
                        <label htmlFor="professionalSummary" className="font-semibold text-sm text-gray-700 mb-2.5 flex items-center">
                            <span>{t('summaryForm.yourSummary', 'Your Summary')}</span>
                            <AITipHelper 
                                section="summary" 
                                fieldName="Professional Summary" 
                                currentValue={data.summary.professionalSummary} 
                            />
                        </label>
                        <RichTextEditor
                            id="professionalSummary"
                            value={data.summary.professionalSummary}
                            onChange={handleSummaryChange}
                        />

                        <button
                            type="button"
                            onClick={handleRegenerate}
                            disabled={!jobTitle || isRegenerating}
                            className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold text-sm transition-all shadow-md hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isRegenerating ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            ) : (
                                <SparklesIcon />
                            )}
                            {isRegenerating ? t('summaryForm.regenerating', 'Regenerating...') : t('summaryForm.regenerateSummary', 'Regenerate Summary')}
                        </button>
                    </div>

                    {/* AI Suggestions Column */}
                    <div className="lg:col-span-2">
                        <label className="font-semibold text-sm text-gray-700 mb-2.5 block">{t('experienceForm.aiSuggestions', 'AI Suggestions')}</label>
                        <div className="bg-light p-4 rounded-lg border border-border h-full flex flex-col">
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder={t('summaryForm.searchSummaries', 'Search summaries...')}
                                    aria-label={t('summaryForm.searchAiSuggestions', 'Search AI suggestions')}
                                    className="w-full p-3 pl-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <Search className="w-[1em] h-[1em] text-xl absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                            </div>

                            <p className="text-sm text-gray-600 mb-4 px-2">
                                {isLoading
                                    ? t('summaryForm.loadingSuggestions', 'Loading suggestions...')
                                    : (filteredSuggestions.length !== 1
                                        ? t('summaryForm.showingResultsPlural', 'Showing {count} results for "{role}"')
                                        : t('summaryForm.showingResultsSingular', 'Showing {count} result for "{role}"'))
                                        .replace('{count}', String(filteredSuggestions.length))
                                        .replace('{role}', jobTitle || t('summaryForm.yourRole', 'your role'))}
                            </p>

                            <div className="flex-1 space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {isLoading ? (
                                    <div className="text-center p-12 text-gray-500">{t('summaryForm.loadingSuggestions', 'Loading suggestions...')}</div>
                                ) : filteredSuggestions.length > 0 ? (
                                    filteredSuggestions.map(suggestion => {
                                        const isActive = activeSuggestionSet.has(suggestion);
                                        return (
                                            <div
                                                key={suggestion} // Stable key
                                                className="flex items-start gap-3 p-3 bg-white rounded-lg border border-border shadow-sm hover:shadow transition-shadow"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => isActive ? handleRemoveSuggestion(suggestion) : handleAddSuggestion(suggestion)}
                                                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xl transition-all mt-0.5 ${
                                                        isActive
                                                            ? 'bg-danger hover:bg-red-600'
                                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                                    }`}
                                                    aria-label={isActive ? t('summaryForm.removeSuggestion', 'Remove suggestion') : t('summaryForm.addSuggestion', 'Add suggestion')}
                                                >
                                                    {isActive ? '−' : '+'}
                                                </button>
                                                <p className="text-sm text-gray-800 leading-relaxed">{suggestion}</p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center p-10 bg-white rounded-lg border border-border">
                                        <p className="font-semibold text-gray-700">{t('summaryForm.noSuggestionsFound', 'No suggestions found')}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {jobTitle
                                                ? t('summaryForm.tryAdjusting', 'Try adjusting the job title or search term.')
                                                : t('summaryForm.enterJobTitle', "Enter a job title in 'Contact Details' to get AI suggestions.")}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <TipsCard activeSection="summary" />
                <FormActions onClear={onClear} onNext={onNext} />
            </form>
        </>
    );
};

export default SummaryForm;