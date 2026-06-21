import React, { useState, useEffect } from 'react';
// FIX: Imported AtsAnalysisResult to resolve type errors.
import type { ResumeData, AtsAnalysisResult } from '../types';
// FIX: Imported checkAtsCompliance to resolve module export error.
import { checkAtsCompliance } from '../services/geminiService';
import { AtsIcon, CheckIcon } from './common/icons';

interface AtsCheckerProps {
    isOpen: boolean;
    onClose: () => void;
    resumeData: ResumeData;
}

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const [displayScore, setDisplayScore] = useState(0);
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (displayScore / 100) * circumference;

    let colorClass = 'text-success';
    if (score < 50) colorClass = 'text-danger';
    else if (score < 80) colorClass = 'text-warning';

    useEffect(() => {
        const animation = requestAnimationFrame(() => {
            setDisplayScore(score);
        });
        return () => cancelAnimationFrame(animation);
    }, [score]);


    return (
        <div className="relative w-40 h-40">
            <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle
                    className="text-gray-200"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                />
                <circle
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                    transform="rotate(-90 60 60)"
                />
            </svg>
            <div className={`absolute inset-0 flex flex-col items-center justify-center ${colorClass}`}>
                <span className="text-5xl font-bold">{score}</span>
                <span className="text-sm font-semibold">/ 100</span>
            </div>
        </div>
    );
};

const ChecklistItem: React.FC<{ title: string; check: { pass: boolean; feedback: string } }> = ({ title, check }) => (
    <div className={`p-4 rounded-lg flex items-start gap-4 ${check.pass ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 ${check.pass ? 'bg-success' : 'bg-danger'}`}>
             <span className="text-white font-bold">{check.pass ? '✓' : '✗'}</span>
        </div>
        <div>
            <h4 className="font-bold text-dark">{title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{check.feedback}</p>
        </div>
    </div>
);

const AtsChecker: React.FC<AtsCheckerProps> = ({ isOpen, onClose, resumeData }) => {
    const [analysis, setAnalysis] = useState<AtsAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const getAnalysis = async () => {
                setIsLoading(true);
                setError(null);
                setAnalysis(null);
                try {
                    const result = await checkAtsCompliance(resumeData);
                    setAnalysis(result);
                } catch (err) {
                    setError('Failed to get ATS analysis. Please try again later.');
                } finally {
                    setIsLoading(false);
                }
            };
            getAnalysis();
        }
    }, [isOpen, resumeData]);

    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700">Checking ATS Compliance...</p>
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

        const checkTitles: Record<string, string> = {
            contactInfo: "Contact Information",
            keywords: "Keyword Optimization",
            sectionHeaders: "Standard Section Headers",
            bulletPoints: "Readability & Bullet Points",
            fileFormat: "Formatting & Parsability"
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl">
                    <ScoreGauge score={analysis.overallScore} />
                    <h3 className="text-xl font-bold text-dark mt-4">Overall Score</h3>
                    <p className="text-center text-gray-600 mt-2">This score estimates how well your resume will be parsed and ranked by automated systems.</p>
                </div>
                <div className="space-y-4">
                    {/* FIX: Correctly typed AtsAnalysisResult resolves the type error for the 'check' prop here. */}
                    {Object.entries(analysis.checks).map(([key, check]) => (
                        <ChecklistItem key={key} title={checkTitles[key] || key} check={check} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <AtsIcon />
                        <h2 className="text-2xl font-bold text-dark">ATS Compliance Check</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-2xl">&times;</button>
                </header>
                <div className="p-8 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AtsChecker;