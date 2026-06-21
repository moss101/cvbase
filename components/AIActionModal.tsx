
import React, { useState } from 'react';
import type { ResumeData, AIAnalysisResult, SectionId } from '../types';
import { getAiSuggestionsForSection } from '../services/geminiService';
import { SparklesIcon } from './common/icons';

interface AIActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    resumeData: ResumeData;
    activeSection: SectionId;
    onApplySuggestions: (suggestions: AIAnalysisResult) => void;
}

const AIActionModal: React.FC<AIActionModalProps> = ({ isOpen, onClose, resumeData, activeSection, onApplySuggestions }) => {
    const [step, setStep] = useState<'jd' | 'suggestions'>('jd');
    const [jobDescription, setJobDescription] = useState('');
    const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetSuggestions = async () => {
        if (!jobDescription.trim()) {
            setError('Please paste a job description to get tailored suggestions.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await getAiSuggestionsForSection(resumeData, jobDescription, activeSection);
            setAnalysis(result);
            setStep('suggestions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get suggestions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (analysis) {
            onApplySuggestions(analysis);
        }
        handleClose();
    };

    const handleClose = () => {
        onClose();
        // Reset state for next time it opens
        setTimeout(() => {
            setStep('jd');
            setJobDescription('');
            setAnalysis(null);
            setError(null);
            setIsLoading(false);
        }, 300);
    };

    if (!isOpen) return null;

    const sectionName = activeSection.charAt(0).toUpperCase() + activeSection.slice(1);
    const hasSuggestions = analysis && (analysis.summarySuggestion || (analysis.experienceSuggestions && analysis.experienceSuggestions.length > 0) || (analysis.missingKeywords && analysis.missingKeywords.length > 0));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <SparklesIcon />
                        <h2 className="text-2xl font-bold text-dark">AI Enhancement for {sectionName}</h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl font-bold">&times;</button>
                </header>

                <div className="p-6 overflow-y-auto flex-grow">
                    {step === 'jd' && (
                        <div className="animate-fade-in">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Paste the Job Description</h3>
                            <p className="text-gray-600 mb-4">Provide the job description for the role you're targeting. The AI will use this to tailor its suggestions specifically for you.</p>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                className="w-full p-4 border border-border rounded-lg text-base bg-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[250px] resize-y"
                                placeholder="Paste the full job description here..."
                            />
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                    )}

                    {step === 'suggestions' && (
                        <div className="animate-fade-in">
                            {isLoading && (
                                <div className="text-center p-10">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p className="text-lg font-semibold text-gray-700">AI is analyzing your resume...</p>
                                </div>
                            )}
                            {error && <div className="p-10 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>}
                            
                            {!isLoading && !error && !hasSuggestions && (
                                 <div className="text-center p-10">
                                    <p className="text-lg font-semibold text-gray-700">No specific suggestions found.</p>
                                    <p className="text-gray-500">Your {activeSection} section looks well-aligned with the job description!</p>
                                </div>
                            )}

                            {analysis?.summarySuggestion && (
                                <section>
                                    <h3 className="text-xl font-bold text-dark mb-3">Summary Suggestion</h3>
                                    <blockquote className="p-4 bg-gray-50 border-l-4 border-primary rounded-r-lg text-gray-700 italic">
                                        {analysis.summarySuggestion}
                                    </blockquote>
                                </section>
                            )}

                            {analysis?.experienceSuggestions && analysis.experienceSuggestions.length > 0 && (
                                <section>
                                    <h3 className="text-xl font-bold text-dark mb-4">Experience Improvements</h3>
                                    <div className="space-y-6">
                                        {analysis.experienceSuggestions.map(exp => (
                                            <div key={exp.id} className="p-4 border border-border rounded-lg bg-gray-50/50">
                                                <h4 className="font-bold text-md text-primary">{exp.jobTitle} at {exp.company}</h4>
                                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                                                    <p className="text-xs font-bold text-amber-700 mb-1">ATS Analysis:</p>
                                                    <p className="text-sm text-amber-800 italic">{exp.atsAnalysis}</p>
                                                </div>
                                                <div className="mt-3">
                                                    <p className="text-xs font-bold text-green-700 mb-1">Suggested Improvement:</p>
                                                    <div className="whitespace-pre-wrap font-mono text-xs p-3 bg-white rounded-md border border-gray-200">{exp.improvedDescription}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                             {analysis?.missingKeywords && analysis.missingKeywords.length > 0 && (
                                <section>
                                    <h3 className="text-xl font-bold text-dark mb-3">Suggested Skills to Add</h3>
                                    <p className="text-sm text-gray-600 mb-4">Consider adding these skills from the job description to your resume.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.missingKeywords.map(keyword => (
                                            <span key={keyword} className="px-3 py-1.5 text-sm font-medium bg-secondary-light text-secondary rounded-full">{keyword}</span>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>

                <footer className="p-4 bg-gray-50 border-t border-border flex justify-end gap-4">
                    <button onClick={handleClose} className="px-6 py-2.5 rounded-lg font-bold cursor-pointer text-base transition-all bg-white border border-border text-dark hover:border-dark">
                        Cancel
                    </button>
                    {step === 'jd' && (
                        <button onClick={handleGetSuggestions} disabled={isLoading} className="px-6 py-2.5 rounded-lg font-bold cursor-pointer text-base transition-all bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-dark disabled:opacity-50 flex items-center">
                            {isLoading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>}
                            {isLoading ? 'Analyzing...' : 'Get Suggestions'}
                        </button>
                    )}
                     {step === 'suggestions' && hasSuggestions && (
                        <button onClick={handleApply} className="px-6 py-2.5 rounded-lg font-bold cursor-pointer text-base transition-all bg-success text-white">
                           Apply Suggestions
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default AIActionModal;
