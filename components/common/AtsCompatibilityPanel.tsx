import React, { useState, useEffect } from 'react';
import type { ResumeData, SectionId, AtsAnalysisResult, AtsCheck } from '../../types';
import { checkAtsCompliance } from '../../services/geminiService';
import { RefreshCw, Brain, ChevronDown, TriangleAlert, Lightbulb } from 'lucide-react';
import { useTranslation } from '../../services/translationService';

interface AtsCompatibilityPanelProps {
    formData: ResumeData;
    visibleSections: SectionId[];
    selectedTemplate: string;
}

export const AtsCompatibilityPanel: React.FC<AtsCompatibilityPanelProps> = ({
    formData,
    visibleSections,
    selectedTemplate,
}) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<AtsAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Heuristics Engine for immediate real-time feedback
    const getHeuristicAnalysis = (): AtsAnalysisResult => {
        const checks: Record<string, AtsCheck> = {
            contactInfo: { pass: false, feedback: '' },
            keywords: { pass: false, feedback: '' },
            sectionHeaders: { pass: false, feedback: '' },
            bulletPoints: { pass: false, feedback: '' },
            fileFormat: { pass: false, feedback: '' },
        };

        // 1. Contact Info check
        const hasName = !!formData.contact.firstName && !!formData.contact.lastName;
        const hasEmail = !!formData.contact.email && formData.contact.email.includes('@');
        const hasPhone = !!formData.contact.phone;
        const hasLinkedIn = !!formData.contact.linkedin;
        
        if (hasName && hasEmail && hasPhone) {
            checks.contactInfo = {
                pass: true,
                feedback: `${t('atsPanel.contactFoundComplete', 'Found complete contact details.')}${hasLinkedIn ? t('atsPanel.contactLinkedinGood', ' Good job adding your LinkedIn profile.') : t('atsPanel.contactAddLinkedin', ' Add a LinkedIn url to increase candidate discovery.')}`
            };
        } else {
            checks.contactInfo = {
                pass: false,
                feedback: t('atsPanel.contactMissing', 'Missing critical contact details. Ensure First Name, Email, and Phone number are structured correctly.')
            };
        }

        // 2. Keyword density
        const totalSkills = formData.skills.length;
        const descriptionText = [
            formData.summary.professionalSummary,
            ...formData.experience.map(e => e.description),
            ...formData.projects.map(p => p.description)
        ].join(' ').toLowerCase();

        const hasActionVerbs = ['managed', 'designed', 'built', 'created', 'led', 'delivered', 'increased', 'optimized', 'developed', 'established'].some(verb => descriptionText.includes(verb));

        if (totalSkills >= 6 && hasActionVerbs) {
            checks.keywords = {
                pass: true,
                feedback: t('atsPanel.keywordsGood', 'Good variety of skill tags ({n}). Action-oriented verbs detected in job descriptions.').replace('{n}', String(totalSkills))
            };
        } else {
            checks.keywords = {
                pass: false,
                feedback: t('atsPanel.keywordsWeak', 'Weak keywords. Add at least 6 tech/hard skills and use powerful action verbs (e.g. "Optimized", "Delivered") to describe accomplishments.')
            };
        }

        // 3. Section Headers
        const essentialSections = ['summary', 'experience', 'education', 'skills'];
        const missingEssentials = essentialSections.filter(sec => !visibleSections.includes(sec as any));
        if (missingEssentials.length === 0) {
            checks.sectionHeaders = {
                pass: true,
                feedback: t('atsPanel.sectionsGood', 'Your resume uses standard ATS-friendly division layout titles.')
            };
        } else {
            checks.sectionHeaders = {
                pass: false,
                feedback: t('atsPanel.sectionsMissing', 'Missing standard headers: {list}. Use standard section labels for parsing reliability.').replace('{list}', missingEssentials.join(', '))
            };
        }

        // 4. Bullet point formulation
        const cleanExperienceText = formData.experience.map(e => e.description).join('');
        const listsRepresented = cleanExperienceText.includes('<li>') || cleanExperienceText.includes('•') || cleanExperienceText.includes('-') || cleanExperienceText.includes('\n');
        
        if (formData.experience.length === 0) {
            checks.bulletPoints = {
                pass: false,
                feedback: t('atsPanel.bulletsNoExperience', 'Add job experiences to review formatting structure.')
            };
        } else if (listsRepresented) {
            checks.bulletPoints = {
                pass: true,
                feedback: t('atsPanel.bulletsGood', 'Structured bullet-point layouts verified in experience sections.')
            };
        } else {
            checks.bulletPoints = {
                pass: false,
                feedback: t('atsPanel.bulletsParagraph', 'Paragraph block layout detected. Convert work history descriptions into bullet items for optimal reader parsing.')
            };
        }

        // 5. File & Template structure
        const atsTemplates = ['tec-ats', 'direct', 'functional', 'simple', 'clean', 'compact'];
        const isAtsFriendly = atsTemplates.includes(selectedTemplate);
        if (isAtsFriendly) {
            checks.fileFormat = {
                pass: true,
                feedback: t('atsPanel.fileFormatGood', 'Selected template layout is highly optimized for single-column parsing compliance.')
            };
        } else {
            checks.fileFormat = {
                pass: false,
                feedback: t('atsPanel.fileFormatBad', 'Heavily styled design. Switch to layout models like Direct, Minimalist, Simple, or Compact for 100% mechanical parsee alignment.')
            };
        }

        // Determine general score based on weighted pass items
        const scoreWeights = {
            contactInfo: 20,
            keywords: 25,
            sectionHeaders: 15,
            bulletPoints: 20,
            fileFormat: 20,
        };

        let score = 0;
        if (checks.contactInfo.pass) score += scoreWeights.contactInfo;
        if (checks.keywords.pass) score += scoreWeights.keywords;
        if (checks.sectionHeaders.pass) score += scoreWeights.sectionHeaders;
        if (checks.bulletPoints.pass) score += scoreWeights.bulletPoints;
        if (checks.fileFormat.pass) score += scoreWeights.fileFormat;

        // If elements are present, boost based on text quantifiers
        const numberMatches = descriptionText.match(/\d+%/g) || descriptionText.match(/\$\d+/g) || descriptionText.match(/\d+\s+year/g);
        if (numberMatches && score > 30) {
            score = Math.min(100, score + 10);
        }

        return {
            overallScore: score,
            checks: checks as AtsAnalysisResult['checks']
        };
    };

    const heuristicAnalysis = getHeuristicAnalysis();
    
    // Use AI analysis when validated, otherwise fall back to immediate heuristic
    const activeAnalysis = aiAnalysis || heuristicAnalysis;
    const score = activeAnalysis.overallScore;

    const handleRunAiAudit = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoading(true);
        setError(null);
        try {
            const results = await checkAtsCompliance(formData);
            setAiAnalysis(results);
            setIsExpanded(true); // Auto-expand when results arrive!
        } catch (err) {
            console.error(err);
            setError(t('atsPanel.aiAuditFailed', 'Could not run AI deep audit. Showing live structural rules instead.'));
        } finally {
            setIsLoading(false);
        }
    };

    // Color definitions
    let borderClass = 'border-slate-200/80 bg-white/80';
    let ringColor = 'stroke-primary';
    let textScoreColor = 'text-primary';
    let statusBadge = 'from-violet-500 to-indigo-600';

    if (score >= 80) {
        borderClass = 'border-emerald-200/80 bg-white/95';
        ringColor = 'stroke-emerald-500';
        textScoreColor = 'text-emerald-500';
        statusBadge = 'from-emerald-500 to-green-600';
    } else if (score >= 50) {
        borderClass = 'border-amber-200/85 bg-white/95';
        ringColor = 'stroke-amber-500';
        textScoreColor = 'text-amber-500';
        statusBadge = 'from-amber-400 to-orange-500';
    } else {
        borderClass = 'border-rose-200/80 bg-white/95';
        ringColor = 'stroke-red-500';
        textScoreColor = 'text-red-500';
        statusBadge = 'from-red-500 to-rose-600';
    }

    // Gauge circle calculation
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className={`w-full relative select-none rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all ${borderClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
                {/* Visual Left Gauge and Summary */}
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="relative w-16 h-16 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle
                                className="text-gray-100"
                                strokeWidth="5.5"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="40"
                                cy="40"
                            />
                            <circle
                                className={`${ringColor} transition-all duration-700 ease-out`}
                                strokeWidth="5.5"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx="40"
                                cy="40"
                            />
                        </svg>
                        <div className={`absolute inset-0 flex flex-col items-center justify-center font-black text-sm tracking-tighter ${textScoreColor}`}>
                            <span>{score}%</span>
                        </div>
                    </div>

                    <div className="text-left">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">{t('atsPanel.complianceMeter', 'Compliance Meter')}</span>
                            {aiAnalysis ? (
                                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-emerald-100">
                                    {t('atsPanel.aiVerified', 'AI Verified')}
                                </span>
                            ) : (
                                <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-slate-200">
                                    {t('atsPanel.liveRules', 'Live Rules')}
                                </span>
                            )}
                        </div>
                        <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-1">
                            {t('atsPanel.parserMatchScore', 'ATS Parser Match Score')}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-normal max-w-sm">
                            {score >= 80 
                                ? t('atsPanel.scoreOutstanding', 'Outstanding! This layout is optimized and ready for enterprise scanners.') 
                                : score >= 50 
                                ? t('atsPanel.scoreGoodStart', 'Good start. Apply standard conventions to break through standard hurdles.') 
                                : t('atsPanel.scoreNeedsAttention', 'Needs attention. Correct the warnings below to ensure reader parsers extract your details.')
                            }
                        </p>
                    </div>
                </div>

                {/* Audit trigger & toggle expand */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRunAiAudit}
                        disabled={isLoading}
                        className="px-3.5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-primary hover:to-secondary text-white font-extrabold text-xs tracking-wide uppercase rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <RefreshCw className="w-[1em] h-[1em] text-sm select-none animate-spin block" aria-hidden="true" />
                        ) : (
                            <Brain className="w-[1em] h-[1em] text-sm select-none block" aria-hidden="true" />
                        )}
                        <span>{aiAnalysis ? t('atsPanel.reRunAudit', 'Re-Run AI Deep Audit') : t('atsPanel.deepScanAudit', 'AI Deep-Scan Audit')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 px-2.5 border border-slate-200 bg-white/80 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                    >
                        <span>{isExpanded ? t('atsPanel.collapse', 'Collapse') : t('atsPanel.checks', 'Checks')}</span>
                        <ChevronDown className={`w-[1em] h-[1em] text-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Error notifications */}
            {error && (
                <div className="mt-3.5 px-3 py-2 bg-red-50 text-danger border border-red-100 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                    <TriangleAlert className="w-4 h-4" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* Section Breakdown and improvement suggestions */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-150 grid grid-cols-1 gap-3.5 animate-slide-down">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Section Header Checks */}
                        <div className="space-y-3.5">
                            <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase">{t('atsPanel.auditCategories', 'Audit Categories')}</h4>
                            
                            {/* Contact Info */}
                            <div className={`p-3 rounded-2xl border transition-all ${activeAnalysis.checks.contactInfo.pass ? 'bg-emerald-50/10 border-emerald-100' : 'bg-rose-50/10 border-rose-100'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-extrabold text-slate-800">{t('atsPanel.contactInfoDetails', 'Contact Information Details')}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${activeAnalysis.checks.contactInfo.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {activeAnalysis.checks.contactInfo.pass ? t('atsPanel.pass', 'Pass') : t('atsPanel.improve', 'Improve')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-normal font-medium">
                                    {activeAnalysis.checks.contactInfo.feedback}
                                </p>
                            </div>

                            {/* Keywords */}
                            <div className={`p-3 rounded-2xl border transition-all ${activeAnalysis.checks.keywords.pass ? 'bg-emerald-50/10 border-emerald-100' : 'bg-rose-50/10 border-rose-100'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-extrabold text-slate-800">{t('atsPanel.keywordDensity', 'Keyword Density & Synonyms')}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${activeAnalysis.checks.keywords.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {activeAnalysis.checks.keywords.pass ? t('atsPanel.pass', 'Pass') : t('atsPanel.improve', 'Improve')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-normal font-medium">
                                    {activeAnalysis.checks.keywords.feedback}
                                </p>
                            </div>

                            {/* Section Headers */}
                            <div className={`p-3 rounded-2xl border transition-all ${activeAnalysis.checks.sectionHeaders.pass ? 'bg-emerald-50/10 border-emerald-100' : 'bg-rose-50/10 border-rose-100'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-extrabold text-slate-800">{t('atsPanel.standardHeadingTags', 'Standard Heading Tags')}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${activeAnalysis.checks.sectionHeaders.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {activeAnalysis.checks.sectionHeaders.pass ? t('atsPanel.pass', 'Pass') : t('atsPanel.improve', 'Improve')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-normal font-medium">
                                    {activeAnalysis.checks.sectionHeaders.feedback}
                                </p>
                            </div>
                        </div>

                        {/* Suggestions and Best Practices */}
                        <div className="space-y-3.5">
                            <h4 className="text-xs font-black text-slate-400 tracking-wider uppercase">{t('atsPanel.formatSuggestions', 'Format & Parsing Suggestions')}</h4>

                            {/* Bullet points check details */}
                            <div className={`p-3 rounded-2xl border transition-all ${activeAnalysis.checks.bulletPoints.pass ? 'bg-emerald-50/10 border-emerald-100' : 'bg-rose-50/10 border-rose-100'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-extrabold text-slate-800">{t('atsPanel.bulletStructure', 'Bullet Structure')}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${activeAnalysis.checks.bulletPoints.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {activeAnalysis.checks.bulletPoints.pass ? t('atsPanel.pass', 'Pass') : t('atsPanel.improve', 'Improve')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-normal font-medium">
                                    {activeAnalysis.checks.bulletPoints.feedback}
                                </p>
                            </div>

                            {/* File / Template Structure details */}
                            <div className={`p-3 rounded-2xl border transition-all ${activeAnalysis.checks.fileFormat.pass ? 'bg-emerald-50/10 border-emerald-100' : 'bg-rose-50/10 border-rose-100'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-extrabold text-slate-800">{t('atsPanel.templateLayoutParsing', 'Template Layout Parsing')}</span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${activeAnalysis.checks.fileFormat.pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                        {activeAnalysis.checks.fileFormat.pass ? t('atsPanel.pass', 'Pass') : t('atsPanel.improve', 'Improve')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-normal font-medium">
                                    {activeAnalysis.checks.fileFormat.feedback}
                                </p>
                            </div>

                            {/* General Tips Block */}
                            <div className="p-3.5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                                <div className="flex items-center gap-1.5 mb-1.5 text-slate-800">
                                    <Lightbulb className="w-[1em] h-[1em] text-amber-500 text-sm select-none inline-block" aria-hidden="true" />
                                    <span className="text-xs font-extrabold tracking-tight">{t('atsPanel.proTipsHeading', 'Pro tips for breaking through ATS scanner barriers')}</span>
                                </div>
                                <ul className="list-disc pl-4 text-[11px] leading-relaxed text-slate-600 font-medium space-y-1">
                                    <li><strong>{t('atsPanel.tip.quantifyLabel', 'Quantify')}</strong>{t('atsPanel.tip.quantifyText', ': Add metrics such as percentages (e.g. 15% improvement), client count, or dollar budgets.')}</li>
                                    <li><strong>{t('atsPanel.tip.singleColumnLabel', 'Single Column')}</strong>{t('atsPanel.tip.singleColumnText', ': Dual columns confuse parsers. Use standard stacked layouts for safety.')}</li>
                                    <li><strong>{t('atsPanel.tip.noSvgLabel', 'No complex SVGs')}</strong>{t('atsPanel.tip.noSvgText', ": Don't use sliders, timelines, or custom diagrams. Our compliant styles output clear structural tags.")}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtsCompatibilityPanel;
