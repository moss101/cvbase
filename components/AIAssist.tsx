
import React, { useState, useEffect } from 'react';
import type { ResumeData, AIAnalysisResult } from '../types';
// FIX: Imported analyzeResume to resolve module export error.
import { analyzeResume } from '../services/geminiService';
import { SparklesIcon } from './common/icons';

interface AIAssistProps {
    isOpen: boolean;
    onClose: () => void;
    resumeData: ResumeData;
    targetJobTitle: string;
}

const AIAssist: React.FC<AIAssistProps> = ({ isOpen, onClose, resumeData, targetJobTitle }) => {
    const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const getAnalysis = async () => {
                setIsLoading(true);
                setError(null);
                setAnalysis(null);

                if (!targetJobTitle.trim() && !resumeData.contact.jobTitle.trim()) {
                    setError("Please enter a target job title in the header for a more accurate AI analysis.");
                    setIsLoading(false);
                    return;
                }

                try {
                    const result = await analyzeResume(resumeData, targetJobTitle);
                    setAnalysis(result);
                } catch (err) {
                    setError('Failed to analyze resume. Please try again later.');
                } finally {
                    setIsLoading(false);
                }
            };
            getAnalysis();
        }
    }, [isOpen, resumeData, targetJobTitle]);

    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">AI is analyzing your resume...</p>
                    <p className="text-gray-500">This may take a moment.</p>
                </div>
            );
        }

        if (error) {
            return <div className="p-10 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
        }

        if (!analysis) {
            return <div className="p-10 text-center text-gray-500">No analysis results available.</div>;
        }

        return (
            <div className="space-y-8">
                {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
                    <section>
                        <h3 className="text-xl font-bold text-dark mb-3">Suggested Keywords</h3>
                        <p className="text-sm text-gray-600 mb-4">Consider adding these keywords to your resume to better match the role of '{targetJobTitle || resumeData.contact.jobTitle}'.</p>
                        <div className="flex flex-wrap gap-2">
                            {analysis.missingKeywords.map(keyword => (
                                <span key={keyword} className="px-3 py-1.5 text-sm font-medium bg-secondary-light text-secondary rounded-full">{keyword}</span>
                            ))}
                        </div>
                    </section>
                )}

                {analysis.summarySuggestion && (
                    <section>
                        <h3 className="text-xl font-bold text-dark mb-3">Summary Suggestion</h3>
                        <blockquote className="p-4 bg-gray-50 border-l-4 border-primary rounded-r-lg text-gray-700 italic">
                            {analysis.summarySuggestion}
                        </blockquote>
                    </section>
                )}
                
                {analysis.experienceSuggestions && analysis.experienceSuggestions.length > 0 && (
                     <section>
                        <h3 className="text-xl font-bold text-dark mb-4">Experience Improvements</h3>
                        <div className="space-y-6">
                            {analysis.experienceSuggestions.map(exp => (
                                <div key={exp.id} className="p-4 border border-border rounded-lg bg-gray-50/50">
                                    <h4 className="font-bold text-md text-primary">{exp.jobTitle} at {exp.company}</h4>
                                    {/* FIX: Changed to use newDescription as 'suggestions' property does not exist on AIExperienceSuggestion type. */}
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-green-600 mb-1">Suggestion:</p>
                                        {/* FIX: Property 'newDescription' does not exist on type 'AIExperienceSuggestion'. Corrected to 'improvedDescription'. */}
                                        <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">{exp.improvedDescription}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <SparklesIcon />
                        <h2 className="text-2xl font-bold text-dark">AI Resume Analysis</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl">&times;</button>
                </header>
                <div className="p-6 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AIAssist;