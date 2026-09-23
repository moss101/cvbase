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

    // The score is the content: a numeral in its status tone, no gauge ring.
    const scoreTone = score >= 80 ? 'text-status-success' : score >= 50 ? 'text-status-warning' : 'text-status-danger';

    const checkRows: { key: keyof AtsAnalysisResult['checks']; label: string }[] = [
        { key: 'contactInfo', label: t('atsPanel.contactInfoDetails', 'Contact Information Details') },
        { key: 'keywords', label: t('atsPanel.keywordDensity', 'Keyword Density & Synonyms') },
        { key: 'sectionHeaders', label: t('atsPanel.standardHeadingTags', 'Standard Heading Tags') },
        { key: 'bulletPoints', label: t('atsPanel.bulletStructure', 'Bullet Structure') },
        { key: 'fileFormat', label: t('atsPanel.templateLayoutParsing', 'Template Layout Parsing') },
    ];

    return (
        <div className="w-full relative select-none rounded-2xl border border-border-default bg-surface-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Score and summary */}
                <div className="flex min-w-0 cursor-pointer items-start gap-4" onClick={() => setIsExpanded(!isExpanded)}>
                    <span className={`text-[28px] font-semibold leading-none tabular-nums ${scoreTone}`}>{score}%</span>
                    <div className="min-w-0 text-left">
                        <h3 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-content-primary">
                            {t('atsPanel.parserMatchScore', 'ATS Parser Match Score')}
                            {aiAnalysis ? (
                                <span className="rounded-full bg-action-primary/10 px-2 py-0.5 text-[11px] font-medium text-action-primary">
                                    {t('atsPanel.aiVerified', 'AI Verified')}
                                </span>
                            ) : (
                                <span className="rounded-full border border-border-default px-2 py-0.5 text-[11px] font-medium text-content-secondary">
                                    {t('atsPanel.liveRules', 'Live Rules')}
                                </span>
                            )}
                        </h3>
                        <p className="mt-1 max-w-sm text-[13px] leading-normal text-content-secondary">
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
                        className="flex items-center gap-2 rounded-[10px] border border-border-strong bg-surface-panel px-3.5 py-2 text-[13px] font-semibold text-content-primary transition-colors duration-150 hover:border-action-primary/50 hover:text-action-primary disabled:opacity-50"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Brain className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span>{aiAnalysis ? t('atsPanel.reRunAudit', 'Re-Run AI Deep Audit') : t('atsPanel.deepScanAudit', 'AI Deep-Scan Audit')}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                        className="flex items-center gap-1 rounded-lg border border-border-default px-2.5 py-1 text-[12.5px] font-semibold text-content-secondary transition-colors hover:bg-surface-canvas hover:text-content-primary"
                    >
                        <span>{isExpanded ? t('atsPanel.collapse', 'Collapse') : t('atsPanel.checks', 'Checks')}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Error notifications */}
            {error && (
                <div role="alert" className="mt-3.5 flex items-center gap-1.5 rounded-xl border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-[13px] font-medium text-status-danger">
                    <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                </div>
            )}

            {/* Every check as one divided list, then the parsing tips — no cards inside the panel */}
            {isExpanded && (
                <div className="mt-4 border-t border-border-default">
                    <ul className="divide-y divide-border-default">
                        {checkRows.map(({ key, label }) => {
                            const check = activeAnalysis.checks[key];
                            return (
                                <li key={key} className="py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[13px] font-semibold text-content-primary">{label}</span>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${check.pass ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
                                            {check.pass ? t('atsPanel.pass', 'Pass') : t('atsPanel.improve', 'Improve')}
                                        </span>
                                    </div>
                                    {check.feedback && <p className="mt-1 text-[13px] leading-normal text-content-secondary">{check.feedback}</p>}
                                </li>
                            );
                        })}
                    </ul>

                    <div className="border-t border-border-default pt-3.5">
                        <h4 className="flex items-center gap-1.5 text-[13px] font-semibold text-content-primary">
                            <Lightbulb className="h-4 w-4 text-action-primary" aria-hidden="true" />
                            {t('atsPanel.proTipsHeading', 'Pro tips for breaking through ATS scanner barriers')}
                        </h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-content-secondary">
                            <li><strong className="font-semibold text-content-primary">{t('atsPanel.tip.quantifyLabel', 'Quantify')}</strong>{t('atsPanel.tip.quantifyText', ': Add metrics such as percentages (e.g. 15% improvement), client count, or dollar budgets.')}</li>
                            <li><strong className="font-semibold text-content-primary">{t('atsPanel.tip.singleColumnLabel', 'Single Column')}</strong>{t('atsPanel.tip.singleColumnText', ': Dual columns confuse parsers. Use standard stacked layouts for safety.')}</li>
                            <li><strong className="font-semibold text-content-primary">{t('atsPanel.tip.noSvgLabel', 'No complex SVGs')}</strong>{t('atsPanel.tip.noSvgText', ": Don't use sliders, timelines, or custom diagrams. Our compliant styles output clear structural tags.")}</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtsCompatibilityPanel;
