import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ResumeData } from '../../types';
import {
    extractTextFromFile,
    parseResumeText,
    parseFromResumeData,
    SUPPORTED_EXTENSIONS,
    type ParsedResume,
} from '../../services/resumeParser';
import {
    runFullAnalysis,
    SENIORITY_LABELS,
    type AtsReport,
    type JobAnalysis,
    type CheckStatus,
    type RecPriority,
} from '../../services/atsEngine';
import { useSubscription } from '../SubscriptionProvider';
import { useAuth } from '../AuthProvider';
import { useMobileShell } from '../../lib/useMobileShell';
import * as atsReportRepo from '../../services/repos/atsReportRepo';
import { jdHeadline, type AtsReportSummary } from '../../services/repos/atsReportRepo';
import { Icon } from '../common/icons';
import {
    Link2Off, FileText, CircleCheck, TriangleAlert,
    Lock, Zap, History, ExternalLink, Trash2, ChartColumn, Star,
    CircleArrowRight, Briefcase, Radar, ClipboardCheck, FileUp, BadgeCheck,
    Check,
} from 'lucide-react';
import { useTranslation, type Translate } from '../../services/translationService';

interface AtsAnalyzerProps {
    savedResume: ResumeData | null;
    onUpgrade: () => void;
}

type ResumeSource = 'saved' | 'upload' | 'paste';
type ResultTab = 'overview' | 'keywords' | 'gap' | 'sections' | 'format' | 'fixes';

// =========================================================================
// Small presentational pieces
// =========================================================================

/** Text + icon for a headline score so the verdict never rests on colour alone. */
export interface ScoreBand { label: string; icon: string; text: string; chip: string }
export const scoreBand = (score: number | null): ScoreBand =>
    score === null ? { label: 'Not scored', icon: 'link_off', text: 'text-gray-500', chip: 'border-gray-200 bg-gray-50' }
    : score >= 75 ? { label: 'Strong', icon: 'check_circle', text: 'text-emerald-700', chip: 'border-emerald-200 bg-emerald-50' }
    : score >= 50 ? { label: 'Fair', icon: 'error', text: 'text-amber-700', chip: 'border-amber-200 bg-amber-50' }
    : { label: 'Needs work', icon: 'warning', text: 'text-rose-700', chip: 'border-rose-200 bg-rose-50' };

const ScoreBadge: React.FC<{ score: number | null }> = ({ score }) => {
    const band = scoreBand(score);
    return (
        <span
            className={`inline-flex flex-none items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${band.text} ${band.chip}`}
            aria-label={score === null ? band.label : `${score} out of 100, ${band.label}`}
            title={band.label}
        >
            <Icon name={band.icon} className="w-[14px] h-[14px]" aria-hidden="true" />
            {score ?? '—'}
        </span>
    );
};

const formatReportDate = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const ScoreRing: React.FC<{ score: number | null; label: string; sublabel: string; size?: number }> = ({ score, label, sublabel, size = 150 }) => {
    const [display, setDisplay] = useState(0);
    const target = score ?? 0;
    useEffect(() => {
        const raf = requestAnimationFrame(() => setDisplay(target));
        return () => cancelAnimationFrame(raf);
    }, [target]);

    const r = 56;
    const circ = 2 * Math.PI * r;
    const offset = circ - (display / 100) * circ;
    const color = score === null ? 'text-gray-300' : score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500';
    const band = scoreBand(score);

    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className="relative"
                style={{ width: size, height: size }}
                role="img"
                aria-label={score === null ? `${label}: ${band.label}` : `${label}: ${score} out of 100, ${band.label}`}
            >
                <svg className="w-full h-full" viewBox="0 0 128 128">
                    <circle className="text-gray-200/80" strokeWidth="9" stroke="currentColor" fill="transparent" r={r} cx="64" cy="64" />
                    <circle
                        className={`${color} transition-all duration-1000 ease-out`}
                        strokeWidth="9" strokeDasharray={circ} strokeDashoffset={score === null ? circ : offset}
                        strokeLinecap="round" stroke="currentColor" fill="transparent" r={r} cx="64" cy="64"
                        transform="rotate(-90 64 64)"
                    />
                </svg>
                <div className={`absolute inset-0 flex flex-col items-center justify-center ${color}`}>
                    {score === null
                        ? <Link2Off className="w-8 h-8 text-gray-300" aria-hidden="true" />
                        : <><span className="text-4xl font-black">{score}</span><span className="text-[10px] font-bold text-gray-400">/ 100</span></>}
                </div>
            </div>
            <div className="text-center">
                <p className="font-bold text-gray-800 text-sm">{label}</p>
                {score !== null && (
                    <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-bold ${band.text}`}>
                        <Icon name={band.icon} className="w-[14px] h-[14px]" aria-hidden="true" />
                        {band.label}
                    </p>
                )}
                <p className="text-[11px] text-gray-500">{sublabel}</p>
            </div>
        </div>
    );
};

const DimensionBar: React.FC<{ label: string; score: number; weight: number; summary: string }> = ({ label, score, weight, summary }) => {
    const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="py-2.5">
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-semibold text-gray-700">{label} <span className="text-[10px] text-gray-400 font-normal">({Math.round(weight * 100)}% weight)</span></span>
                <span className="text-sm font-bold text-gray-800">{score}</span>
            </div>
            <div className="w-full bg-gray-200/70 rounded-full h-2 overflow-hidden">
                <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-snug">{summary}</p>
        </div>
    );
};

const STATUS_STYLE: Record<CheckStatus, { icon: string; chip: string }> = {
    pass: { icon: 'check_circle', chip: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    warn: { icon: 'warning', chip: 'text-amber-600 bg-amber-50 border-amber-200' },
    fail: { icon: 'cancel', chip: 'text-rose-600 bg-rose-50 border-rose-200' },
};

const PRIORITY_STYLE: Record<RecPriority, string> = {
    critical: 'bg-rose-100 text-rose-700 border-rose-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const Chip: React.FC<{ children: React.ReactNode; tone?: 'good' | 'bad' | 'neutral'; title?: string }> = ({ children, tone = 'neutral', title }) => (
    <span
        title={title}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            tone === 'good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : tone === 'bad' ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-white/70 text-gray-600 border-gray-200'
        }`}
    >
        {children}
    </span>
);

// =========================================================================
// Main component
// =========================================================================

const SAVED_RESUME_KEY = 'cvbase-resume-data';
const LAST_JD_KEY = 'cvbase-ats-last-jd';
const LAST_SCORE_KEY = 'cvbase-last-ats-score';

interface LocalLastScore { atsScore: number | null; matchScore: number | null; date: string }

/** The on-device cache of the last scan — the fallback when no reports are
 *  saved to the account (signed out, offline, or nothing persisted yet). */
const readLocalLastScore = (): LocalLastScore | null => {
    try {
        const raw = localStorage.getItem(LAST_SCORE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<LocalLastScore>;
        if (typeof parsed.date !== 'string') return null;
        return {
            atsScore: typeof parsed.atsScore === 'number' ? parsed.atsScore : null,
            matchScore: typeof parsed.matchScore === 'number' ? parsed.matchScore : null,
            date: parsed.date,
        };
    } catch {
        return null;
    }
};

export const AtsAnalyzer: React.FC<AtsAnalyzerProps> = ({ savedResume, onUpgrade }) => {
    const { t } = useTranslation();
    const { plan, remaining, consume } = useSubscription();
    const { user } = useAuth();
    const liveAllowed = plan.limits.liveAtsRescore;
    const isMobileShell = useMobileShell();
    const scoreRingSize = isMobileShell ? 112 : 150;

    const [source, setSource] = useState<ResumeSource>(savedResume ? 'saved' : 'paste');
    const [pastedText, setPastedText] = useState('');
    const [uploadedResume, setUploadedResume] = useState<ParsedResume | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [jd, setJd] = useState(() => localStorage.getItem(LAST_JD_KEY) || '');
    const [result, setResult] = useState<{ job: JobAnalysis | null; report: AtsReport } | null>(null);
    const [tab, setTab] = useState<ResultTab>('overview');
    const [scanError, setScanError] = useState<string | null>(null);
    const [recent, setRecent] = useState<AtsReportSummary[]>([]);
    const [recentError, setRecentError] = useState<string | null>(null);
    const [busyReportId, setBusyReportId] = useState<string | null>(null);
    const [reopened, setReopened] = useState<AtsReportSummary | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scansLeft = remaining('atsScans');

    const buildParsedResume = useCallback((): ParsedResume | null => {
        if (source === 'saved' && savedResume) return parseFromResumeData(savedResume);
        if (source === 'upload' && uploadedResume) return uploadedResume;
        if (source === 'paste' && pastedText.trim().length >= 120) return parseResumeText(pastedText, 'pasted');
        return null;
    }, [source, savedResume, uploadedResume, pastedText]);

    const runScan = useCallback((countUsage: boolean) => {
        setScanError(null);
        const parsed = buildParsedResume();
        if (!parsed) {
            setScanError(source === 'paste'
                ? t('atsAnalyzer.pasteFirst', 'Paste your full resume text first (at least a few paragraphs).')
                : source === 'upload'
                ? t('atsAnalyzer.uploadFirst', 'Upload a resume file first.')
                : t('atsAnalyzer.noSavedResume', 'No saved resume found — build one first, or paste/upload your resume.'));
            return;
        }
        if (countUsage && !consume('atsScans')) {
            setScanError('limit');
            return;
        }
        localStorage.setItem(LAST_JD_KEY, jd);
        setReopened(null);
        setResult(runFullAnalysis(parsed, jd));
        // Persist the last score so the dashboard "Profile Score" card is real.
        try {
            const quick = runFullAnalysis(parsed, jd);
            localStorage.setItem(LAST_SCORE_KEY, JSON.stringify({
                atsScore: quick.report.atsScore,
                matchScore: quick.report.matchScore,
                date: new Date().toISOString(),
            }));
        } catch { /* non-essential */ }
    }, [buildParsedResume, consume, jd, source]);

    // Real-time re-scoring for paid plans: recompute as inputs change (no quota cost).
    useEffect(() => {
        if (!liveAllowed || !result) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const parsed = buildParsedResume();
            if (parsed) {
                localStorage.setItem(LAST_JD_KEY, jd);
                setResult(runFullAnalysis(parsed, jd));
            }
        }, 500);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jd, pastedText, source, uploadedResume, liveAllowed]);

    // Recent reports: rows the metered ats-analyze function saved to the
    // account. The on-device last-score cache stands in when there are none.
    const refreshRecent = useCallback(async () => {
        if (!user) { setRecent([]); return; }
        try {
            setRecent(await atsReportRepo.listRecent(user.id, 10));
            setRecentError(null);
        } catch {
            setRecentError(t('atsAnalyzer.couldNotLoadReports', 'Could not load your saved reports.'));
        }
    }, [user]);
    useEffect(() => { void refreshRecent(); }, [refreshRecent]);
    const localLastScore = useMemo(readLocalLastScore, [result]);

    const reopenReport = async (summary: AtsReportSummary) => {
        if (!user || busyReportId) return;
        setBusyReportId(summary.id);
        try {
            const stored = await atsReportRepo.getById(user.id, summary.id);
            if (!stored) {
                setRecentError(t('atsAnalyzer.reportNoLongerAvailable', 'That report is no longer available.'));
                await refreshRecent();
                return;
            }
            // The stored JD is not copied into the editor: for live-rescoring
            // plans that would immediately replace the saved report with a
            // fresh scan of whatever is in the inputs now.
            setReopened(summary);
            setResult({ job: stored.job, report: stored.report });
            setTab('overview');
            setScanError(null);
        } catch {
            setRecentError(t('atsAnalyzer.couldNotOpenReport', 'Could not open that report.'));
        } finally {
            setBusyReportId(null);
        }
    };

    const deleteReport = async (summary: AtsReportSummary) => {
        if (!user || busyReportId) return;
        setBusyReportId(summary.id);
        try {
            await atsReportRepo.remove(user.id, summary.id);
            setRecent((rows) => rows.filter((r) => r.id !== summary.id));
            if (reopened?.id === summary.id) setReopened(null);
        } catch {
            setRecentError(t('atsAnalyzer.couldNotDeleteReport', 'Could not delete that report.'));
        } finally {
            setBusyReportId(null);
        }
    };

    const handleFile = async (file: File) => {
        setUploadError(null);
        setIsExtracting(true);
        try {
            const { text, imageOnly } = await extractTextFromFile(file);
            setUploadedResume(parseResumeText(text, 'file', file.name, imageOnly));
            setSource('upload');
        } catch (err: any) {
            setUploadError(err?.message || t('atsAnalyzer.couldNotReadFile', 'Could not read that file.'));
            setUploadedResume(null);
        } finally {
            setIsExtracting(false);
        }
    };

    const report = result?.report || null;
    const job = result?.job || null;

    const tabs: { id: ResultTab; label: string; icon: string; badge?: number }[] = useMemo(() => report ? [
        { id: 'overview', label: t('atsAnalyzer.tab.overview', 'Overview'), icon: 'dashboard' },
        { id: 'keywords', label: t('atsAnalyzer.tab.keywords', 'Keywords'), icon: 'key', badge: report.missingKeywords.filter(k => k.required).length || undefined },
        { id: 'gap', label: t('atsAnalyzer.tab.skillsGap', 'Skills Gap'), icon: 'conversion_path' },
        { id: 'sections', label: t('atsAnalyzer.tab.sections', 'Sections'), icon: 'segment' },
        { id: 'format', label: t('atsAnalyzer.tab.formatting', 'Formatting'), icon: 'rule', badge: report.formatChecks.filter(f => f.status === 'fail').length || undefined },
        { id: 'fixes', label: t('atsAnalyzer.tab.fixes', 'Fixes ({count})').replace('{count}', String(report.recommendations.length)), icon: 'auto_fix_high' },
    ] : [], [report, t]);

    const sourceBtn = (id: ResumeSource, icon: string, label: string, sub: string, disabled = false) => (
        <button
            key={id}
            disabled={disabled}
            onClick={() => setSource(id)}
            className={`tap-target p-3.5 rounded-2xl border text-left transition-all ${
                source === id ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30' : 'border-gray-200 bg-white/60 hover:border-gray-300'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <Icon name={icon} className={`w-5 h-5 ${source === id ? 'text-primary' : 'text-gray-400'}`} aria-hidden="true" />
            <p className="font-bold text-sm text-gray-800 mt-1">{label}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{sub}</p>
        </button>
    );

    return (
        <div>
            <header className="mb-8">
                <p className="dashboard-eyebrow mb-3">{t('atsAnalyzer.eyebrow', 'Compatibility & job match')}</p>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-800">{t('atsAnalyzer.title', 'ATS Resume Checker')}</h1>
                    {liveAllowed && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {t('atsAnalyzer.liveRescoring', 'Live re-scoring')}
                        </span>
                    )}
                </div>
                <p className="text-gray-500 max-w-2xl">
                    {t('atsAnalyzer.headerDesc', 'Scan your resume the way real applicant tracking systems do: parse it, match it against a job description, and get a prioritized fix list.')} {plan.limits.atsScansPerMonth !== -1 && (
                        <span className="font-semibold text-gray-600">{scansLeft === Infinity ? '' : (scansLeft === 1 ? t('atsAnalyzer.scansLeftSingular', '{n} free scan left this month.') : t('atsAnalyzer.scansLeftPlural', '{n} free scans left this month.')).replace('{n}', String(scansLeft))}</span>
                    )}
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* ============ INPUTS ============ */}
                <div className="xl:col-span-2 space-y-5">
                    <div className="glass-card rounded-3xl p-6 !translate-y-0">
                        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" aria-hidden="true" /> {t('atsAnalyzer.step1', '1 · Your resume')}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">{t('atsAnalyzer.step1Desc', 'Choose where your resume comes from.')}</p>
                        <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
                            {sourceBtn('saved', 'cloud_done', t('atsAnalyzer.savedResume', 'Saved resume'), savedResume ? t('atsAnalyzer.resumeInBuilder', "{name}'s resume in the builder").replace('{name}', savedResume.contact.firstName || t('atsAnalyzer.your', 'Your')) : t('atsAnalyzer.noDraftYet', 'No draft yet'), !savedResume)}
                            {sourceBtn('upload', 'upload_file', t('atsAnalyzer.uploadFile', 'Upload file'), t('atsAnalyzer.uploadFileTypes', 'PDF, DOCX or TXT'))}
                            {sourceBtn('paste', 'content_paste', t('atsAnalyzer.pasteText', 'Paste text'), t('atsAnalyzer.pasteTextDesc', 'Copy & paste the content'))}
                        </div>

                        {source === 'upload' && (
                            <div>
                                <input
                                    ref={fileInputRef} type="file" className="hidden"
                                    accept={SUPPORTED_EXTENSIONS.join(',')}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                                />
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                                    className="border-2 border-dashed border-gray-300 hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white/40"
                                >
                                    {isExtracting ? (
                                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" /> {t('atsAnalyzer.extractingText', 'Extracting text…')}
                                        </div>
                                    ) : uploadedResume ? (
                                        <div className="text-sm">
                                            <ClipboardCheck className="w-8 h-8 text-emerald-500" aria-hidden="true" />
                                            <p className="font-bold text-gray-700">{uploadedResume.fileName}</p>
                                            <p className="text-xs text-gray-500">{t('atsAnalyzer.wordsExtracted', '{n} words extracted · click to replace').replace('{n}', String(uploadedResume.wordCount))}</p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">
                                            <FileUp className="w-8 h-8 text-gray-400" aria-hidden="true" />
                                            <p className="font-semibold text-gray-600">{t('atsAnalyzer.dropOrBrowse', 'Drop your resume here or click to browse')}</p>
                                            <p className="text-xs">{SUPPORTED_EXTENSIONS.join(' · ')}</p>
                                        </div>
                                    )}
                                </div>
                                {uploadError && <p className="text-xs text-rose-600 mt-2 font-medium">{uploadError}</p>}
                            </div>
                        )}

                        {source === 'paste' && (
                            <textarea
                                value={pastedText}
                                onChange={e => setPastedText(e.target.value)}
                                placeholder={t('atsAnalyzer.pasteResumePlaceholder', 'Paste your full resume text here…')}
                                className="w-full h-44 p-4 rounded-2xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y custom-scrollbar"
                            />
                        )}

                        {source === 'saved' && savedResume && (
                            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-sm">
                                <BadgeCheck className="w-[1em] h-[1em] text-primary" aria-hidden="true" />
                                <div>
                                    <p className="font-bold text-gray-800">{savedResume.contact.firstName || t('mobile.untitledResume', 'Untitled resume')} {savedResume.contact.lastName} — {savedResume.contact.jobTitle || t('atsAnalyzer.resumeDraft', 'resume draft')}</p>
                                    <p className="text-xs text-gray-500">{t('atsAnalyzer.analyzedFromBuilder', 'Analyzed directly from your builder data — always in sync.')}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-card rounded-3xl p-6 !translate-y-0">
                        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-secondary-dark" aria-hidden="true" /> {t('atsAnalyzer.step2', '2 · Target job description')}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">{t('atsAnalyzer.step2Desc', 'Paste the full posting for a match score, keyword gaps and role-fit analysis. Leave empty for a general ATS health check.')}</p>
                        <textarea
                            value={jd}
                            onChange={e => setJd(e.target.value)}
                            placeholder={t('atsAnalyzer.pasteJdPlaceholder', 'Paste the job description here (responsibilities, requirements, nice-to-haves)…')}
                            className="w-full h-48 p-4 rounded-2xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-y custom-scrollbar"
                        />
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[11px] text-gray-400">{jd.trim() ? t('atsAnalyzer.wordCount', '{n} words').replace('{n}', String(jd.trim().split(/\s+/).length)) : t('atsAnalyzer.optionalRecommended', 'Optional but strongly recommended')}</p>
                            {jd.trim().length > 0 && jd.trim().length < 80 && <p className="text-[11px] text-amber-600 font-medium">{t('atsAnalyzer.tooShort', 'Too short to analyze — paste the full posting')}</p>}
                        </div>

                        <button
                            onClick={() => runScan(true)}
                            className="w-full mt-4 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            <Radar className="w-[1em] h-[1em]" aria-hidden="true" />
                            {result ? t('atsAnalyzer.rerunScan', 'Re-run full scan') : t('atsAnalyzer.runScan', 'Run ATS scan')}
                        </button>

                        {scanError === 'limit' ? (
                            <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20">
                                <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                    <Lock className="w-[1em] h-[1em] text-secondary-dark text-lg" aria-hidden="true" />
                                    {t('atsAnalyzer.usedFreeScans', "You've used your {n} free scans this month").replace('{n}', String(plan.limits.atsScansPerMonth))}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 mb-3">{t('atsAnalyzer.upgradeForUnlimited', 'Upgrade to Pro for unlimited scans and real-time re-scoring as you edit.')}</p>
                                <button onClick={onUpgrade} className="px-4 py-2 bg-secondary-dark text-white rounded-xl text-xs font-bold hover:opacity-90 transition">
                                    {t('atsAnalyzer.viewPlans', 'View plans →')}
                                </button>
                            </div>
                        ) : scanError ? (
                            <p className="mt-3 text-sm text-rose-600 font-medium">{scanError}</p>
                        ) : null}

                        {!liveAllowed && result && (
                            <p className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                                <Zap className="w-[1em] h-[1em] text-sm text-secondary-dark" aria-hidden="true" />
                                {t('atsAnalyzer.proRescoreDesc', 'Pro re-scores automatically while you edit — no scan quota.')}
                                <button onClick={onUpgrade} className="text-secondary-dark font-bold hover:underline">{t('dash.upgrade', 'Upgrade')}</button>
                            </p>
                        )}
                    </div>

                    {/* Recent reports */}
                    <section className="glass-card rounded-3xl p-6 !translate-y-0" aria-labelledby="ats-recent-heading">
                        <h3 id="ats-recent-heading" className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" aria-hidden="true" /> {t('atsAnalyzer.recentReports', 'Recent reports')}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">{t('atsAnalyzer.recentReportsDesc', 'Scans saved to your account. Reopen one, or remove it.')}</p>
                        {recentError && <p role="alert" className="text-xs text-rose-600 font-medium mb-2">{recentError}</p>}
                        {recent.length > 0 ? (
                            <ul className="divide-y divide-gray-200/80">
                                {recent.map((r) => {
                                    const when = formatReportDate(r.createdAt);
                                    const headline = jdHeadline(r.jobDescription) || t('atsAnalyzer.generalHealthCheck', 'General health check');
                                    const busy = busyReportId === r.id;
                                    return (
                                        <li key={r.id} className={`py-2.5 flex items-center gap-3 ${reopened?.id === r.id ? 'bg-primary/5 -mx-2 px-2 rounded-xl' : ''}`}>
                                            <ScoreBadge score={r.score} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-800 truncate" title={headline}>{headline}</p>
                                                <p className="text-[11px] text-gray-500">{when}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => reopenReport(r)}
                                                disabled={busy}
                                                aria-label={t('atsAnalyzer.reopenReportFrom', 'Reopen report from {when}').replace('{when}', when)}
                                                title={t('atsAnalyzer.reopen', 'Reopen')}
                                                className="tap-target rounded-lg p-1.5 text-primary hover:bg-primary/10 disabled:opacity-50"
                                            >
                                                <ExternalLink className="w-5 h-5" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteReport(r)}
                                                disabled={busy}
                                                aria-label={t('atsAnalyzer.deleteReportFrom', 'Delete report from {when}').replace('{when}', when)}
                                                title={t('btn.delete', 'Delete')}
                                                className="tap-target rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                            >
                                                <Trash2 className="w-5 h-5" aria-hidden="true" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : localLastScore ? (
                            <div className="rounded-2xl border border-gray-200 bg-white/60 p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">{t('atsAnalyzer.lastScanDevice', 'Last scan on this device')}</p>
                                    <p className="text-[11px] text-gray-500">{formatReportDate(localLastScore.date)} · {t('atsAnalyzer.notSavedToAccount', 'not saved to your account')}</p>
                                </div>
                                <ScoreBadge score={localLastScore.atsScore} />
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">{t('atsAnalyzer.noSavedReportsYet', 'No saved reports yet. Scans run from the Smart Studio are kept here.')}</p>
                        )}
                    </section>
                </div>

                {/* ============ RESULTS ============ */}
                <div className="xl:col-span-3">
                    {!report ? (
                        <div className="glass-card rounded-3xl p-6 sm:p-10 h-full min-h-[340px] sm:min-h-[420px] flex flex-col items-center justify-center text-center !translate-y-0">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mb-5">
                                <ChartColumn className="w-10 h-10 text-primary" aria-hidden="true" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('atsAnalyzer.reportWillAppear', 'Your report will appear here')}</h3>
                            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                                {t('atsAnalyzer.emptyStateDesc', 'We parse your resume like Workday or Greenhouse would, weigh every keyword in the job posting, and score compatibility, match, formatting and role fit — instantly, on your device.')}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 mt-6">
                                {[t('atsAnalyzer.chip.atsCompat', 'ATS compatibility'), t('atsAnalyzer.chip.jobMatch', 'Job match %'), t('atsAnalyzer.chip.missingKeywords', 'Missing keywords'), t('atsAnalyzer.chip.skillsGap', 'Skills gap'), t('atsAnalyzer.chip.sectionFeedback', 'Section feedback'), t('atsAnalyzer.chip.fixList', 'Fix list')].map(f => (
                                    <Chip key={f}>{f}</Chip>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Score header */}
                            <div className="glass-card rounded-3xl p-6 !translate-y-0">
                                {reopened && (
                                    <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                                        <History className="w-4 h-4 text-primary" aria-hidden="true" />
                                        {t('atsAnalyzer.savedReportFrom', 'Saved report from {date}. Run a new scan to score your current inputs.').replace('{date}', formatReportDate(reopened.createdAt))}
                                    </p>
                                )}
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="flex gap-4 sm:gap-6">
                                        <ScoreRing score={report.atsScore} label={t('atsAnalyzer.atsCompatibility', 'ATS Compatibility')} sublabel={t('atsAnalyzer.parseQualityScore', 'Parse & quality score')} size={scoreRingSize} />
                                        <ScoreRing score={report.matchScore} label={t('atsAnalyzer.jobMatch', 'Job Match')} sublabel={job ? (job.title || t('atsAnalyzer.vsPastedJob', 'vs. pasted job')) : t('atsAnalyzer.addJobDescription', 'Add a job description')} size={scoreRingSize} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        {report.roleFit ? (
                                            <div className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                                                report.roleFit.competitiveness === 'strong' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                                : report.roleFit.competitiveness === 'moderate' ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                                : 'bg-rose-50/80 border-rose-200 text-rose-900'
                                            }`}>
                                                <p className="font-extrabold uppercase tracking-wider text-[10px] mb-1 opacity-70">
                                                    {report.roleFit.competitiveness === 'strong' ? t('atsAnalyzer.strongCandidate', 'Strong candidate') : report.roleFit.competitiveness === 'moderate' ? t('atsAnalyzer.competitiveWithTailoring', 'Competitive with tailoring') : t('atsAnalyzer.stretchRole', 'Stretch role')}
                                                </p>
                                                {report.roleFit.verdict}
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-white/60 text-sm text-gray-600 leading-relaxed">
                                                <p className="font-extrabold uppercase tracking-wider text-[10px] mb-1 text-gray-400">{t('atsAnalyzer.generalHealthCheck', 'General health check')}</p>
                                                {t('atsAnalyzer.jdIndependentAudit', 'This is a JD-independent audit. Paste a job description on the left to unlock match %, keyword gaps and role-fit insights.')}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <Chip>{t('atsAnalyzer.wordsChip', '{n} words').replace('{n}', String(report.stats.wordCount))}</Chip>
                                            <Chip>{t('atsAnalyzer.bulletsChip', '{n} bullets').replace('{n}', String(report.stats.bulletCount))}</Chip>
                                            <Chip>{t('atsAnalyzer.skillsRecognizedChip', '{n} skills recognized').replace('{n}', String(report.stats.skillCount))}</Chip>
                                            {report.stats.experienceYears > 0 && <Chip>{t('atsAnalyzer.experienceChip', '~{n}y experience').replace('{n}', String(report.stats.experienceYears))}</Chip>}
                                        </div>
                                    </div>
                                </div>
                                {report.keywordStuffing && (
                                    <div className={`mt-4 p-3 rounded-2xl border text-xs leading-relaxed flex gap-2 ${
                                        report.keywordStuffing.severity === 'high'
                                            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                                            : 'bg-amber-50/80 border-amber-200 text-amber-900'
                                    }`}>
                                        <TriangleAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                                        <span><strong>{t('atsAnalyzer.keywordStuffingDetected', 'Keyword stuffing detected.')}</strong> {report.keywordStuffing.detail}</span>
                                    </div>
                                )}
                                <p className="mt-4 text-[11px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                                    {report.disclaimer}
                                </p>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {tabs.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTab(t.id)}
                                        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                                            tab === t.id ? 'bg-dark text-white shadow-lg' : 'bg-white/60 text-gray-600 border border-white/50 hover:bg-white'
                                        }`}
                                    >
                                        <Icon name={t.icon} className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                                        {t.label}
                                        {t.badge ? <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[9px] leading-none">{t.badge}</span> : null}
                                    </button>
                                ))}
                            </div>

                            {/* Tab bodies */}
                            <div className="glass-card rounded-3xl p-6 !translate-y-0 animate-fade-in" key={tab}>
                                {tab === 'overview' && (
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-2">{t('atsAnalyzer.atsBreakdown', 'ATS compatibility breakdown')}</h3>
                                        <div className="divide-y divide-gray-100">
                                            {report.atsDimensions.map(d => <DimensionBar key={d.id} {...d} />)}
                                        </div>
                                        {report.matchDimensions.length > 0 && (
                                            <>
                                                <h3 className="font-bold text-gray-800 mb-2 mt-6">{t('atsAnalyzer.jobMatchBreakdown', 'Job match breakdown')}</h3>
                                                <div className="divide-y divide-gray-100">
                                                    {report.matchDimensions.map(d => <DimensionBar key={d.id} {...d} />)}
                                                </div>
                                            </>
                                        )}
                                        {report.roleFit && (
                                            <div className="mt-6 grid sm:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/70 border border-gray-100">
                                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">{t('atsAnalyzer.roleFit', 'Role fit')}</p>
                                                    <ul className="text-xs text-gray-600 space-y-2">
                                                        <li><strong className="text-gray-800">{t('atsAnalyzer.target', 'Target:')}</strong> {report.roleFit.targetTitle} · {SENIORITY_LABELS[report.roleFit.seniority]}</li>
                                                        <li><strong className="text-gray-800">{t('atsAnalyzer.youReadAs', 'You read as:')}</strong> {report.roleFit.resumeTitle} · {SENIORITY_LABELS[report.roleFit.resumeSeniority]}</li>
                                                        <li>{report.roleFit.seniorityVerdict}</li>
                                                        <li>{report.roleFit.yearsVerdict}</li>
                                                        <li>{report.roleFit.educationVerdict}</li>
                                                    </ul>
                                                </div>
                                                <div className="space-y-4">
                                                    {report.roleFit.strengths.length > 0 && (
                                                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 mb-2">{t('atsAnalyzer.yourStrengths', 'Your strengths for this role')}</p>
                                                            <ul className="text-xs text-emerald-900 space-y-1.5 list-disc ml-4">
                                                                {report.roleFit.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {report.roleFit.gaps.length > 0 && (
                                                        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 mb-2">{t('atsAnalyzer.biggestGaps', 'Biggest gaps')}</p>
                                                            <ul className="text-xs text-rose-900 space-y-1.5 list-disc ml-4">
                                                                {report.roleFit.gaps.map((g, i) => <li key={i}>{g}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {tab === 'keywords' && (
                                    job ? (
                                        <div>
                                            <div className="flex flex-wrap gap-4 mb-5 text-xs text-gray-500">
                                                <span><strong className="text-gray-800">{report.matchedKeywords.length}</strong> {t('atsAnalyzer.matched', 'matched')}</span>
                                                <span><strong className="text-rose-600">{report.missingKeywords.length}</strong> {t('atsAnalyzer.missing', 'missing')}</span>
                                                <span><strong className="text-gray-800">{job.requiredCount}</strong> {t('atsAnalyzer.markedRequired', 'marked required in the posting')}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-rose-700 mb-2 flex items-center gap-1.5">
                                                <TriangleAlert className="w-4 h-4" aria-hidden="true" /> {t('atsAnalyzer.missingFromResume', 'Missing from your resume')}
                                            </h4>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {report.missingKeywords.length === 0 && <p className="text-sm text-gray-500">{t('atsAnalyzer.nothingMissing', 'Nothing missing — full keyword coverage. 🎯')}</p>}
                                                {report.missingKeywords.map(k => (
                                                    <Chip key={k.term} tone="bad" title={t('atsAnalyzer.appearsInPosting', 'Appears {count}× in the posting · weight {weight}').replace('{count}', String(k.count)).replace('{weight}', k.weight.toFixed(1))}>
                                                        {k.required && <Star className="w-3 h-3" aria-hidden="true" />}
                                                        {k.term}
                                                        <span className="opacity-60">×{k.count}</span>
                                                    </Chip>
                                                ))}
                                            </div>
                                            <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                                                <Check className="w-4 h-4" aria-hidden="true" /> {t('atsAnalyzer.foundOnResume', 'Found on your resume')}
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {report.matchedKeywords.map(k => (
                                                    <Chip key={k.term} tone="good" title={t('atsAnalyzer.onResumeTimes', 'On your resume {count}× ({where})').replace('{count}', String(k.resumeCount)).replace('{where}', k.foundIn.slice(0, 3).join(', '))}>
                                                        {k.required && <Star className="w-3 h-3" aria-hidden="true" />}
                                                        {k.term}
                                                    </Chip>
                                                ))}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-5 flex items-center gap-1">
                                                <Star className="w-[1em] h-[1em] text-sm" aria-hidden="true" /> {t('atsAnalyzer.starLegend', '= listed under requirements/qualifications in the posting. Hover any chip for frequency details.')}
                                            </p>
                                        </div>
                                    ) : <EmptyJdNotice />
                                )}

                                {tab === 'gap' && (
                                    job ? (
                                        <div className="space-y-5">
                                            {report.skillGaps.length === 0 && <p className="text-sm text-gray-500">{t('atsAnalyzer.noTaxonomySkills', 'No taxonomy skills detected in this job description.')}</p>}
                                            {report.skillGaps.map(g => {
                                                const total = g.matched.length + g.missing.length;
                                                const pct = total ? Math.round((g.matched.length / total) * 100) : 0;
                                                return (
                                                    <div key={g.category} className="p-4 rounded-2xl bg-white/70 border border-gray-100">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="font-bold text-sm text-gray-800">{g.label}</h4>
                                                            <span className={`text-xs font-bold ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{g.matched.length}/{total} · {pct}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200/70 rounded-full h-1.5 mb-3 overflow-hidden">
                                                            <div className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {g.matched.map(k => <Chip key={k.term} tone="good">{k.term}</Chip>)}
                                                            {g.missing.map(k => <Chip key={k.term} tone="bad">{k.term}</Chip>)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : <EmptyJdNotice />
                                )}

                                {tab === 'sections' && (
                                    <div className="space-y-4">
                                        {report.sectionFeedback.map(s => (
                                            <div key={s.kind} className="p-4 rounded-2xl bg-white/70 border border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                        {s.title}
                                                        {!s.present && <span className="text-[10px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">{t('atsAnalyzer.missingBadge', 'Missing')}</span>}
                                                    </h4>
                                                    <span className={`text-sm font-black ${s.score >= 75 ? 'text-emerald-600' : s.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{s.score}/100</span>
                                                </div>
                                                {s.strengths.length > 0 && (
                                                    <ul className="text-xs text-emerald-800 space-y-1 mb-2">
                                                        {s.strengths.map((x, i) => <li key={i} className="flex gap-1.5"><CircleCheck className="w-[1em] h-[1em] text-sm text-emerald-500 shrink-0" aria-hidden="true" />{x}</li>)}
                                                    </ul>
                                                )}
                                                {s.issues.length > 0 && (
                                                    <ul className="text-xs text-gray-600 space-y-1">
                                                        {s.issues.map((x, i) => <li key={i} className="flex gap-1.5"><CircleArrowRight className="w-[1em] h-[1em] text-sm text-amber-500 shrink-0" aria-hidden="true" />{x}</li>)}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {tab === 'format' && (
                                    <div className="space-y-3">
                                        {report.formatChecks.map(f => (
                                            <div key={f.id} className={`p-4 rounded-2xl border flex items-start gap-3 ${STATUS_STYLE[f.status].chip}`}>
                                                <Icon name={STATUS_STYLE[f.status].icon} className="w-5 h-5 mt-0.5" aria-hidden="true" />
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-800">{f.label}</h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed">{f.detail}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {tab === 'fixes' && (
                                    <div className="space-y-3">
                                        {report.recommendations.length === 0 && (
                                            <p className="text-sm text-gray-500">{t('atsAnalyzer.noFixesNeeded', 'No fixes needed — this resume is in excellent shape. 🏆')}</p>
                                        )}
                                        {report.recommendations.map((r, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/70 border border-gray-100 flex items-start gap-3">
                                                <span className={`shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full border ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</span>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm text-gray-800">{r.title}</h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{r.detail}</p>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-bold text-secondary-dark bg-secondary/10 px-2 py-1 rounded-full" title={t('atsAnalyzer.estimatedPoints', 'Estimated score points recoverable')}>{t('atsAnalyzer.ptsSuffix', '+{n} pts').replace('{n}', String(r.impact))}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EmptyJdNotice: React.FC = () => {
    const { t } = useTranslation();
    return (
    <div className="text-center py-10">
        <Briefcase className="w-10 h-10 text-gray-300 mb-2" aria-hidden="true" />
        <p className="text-sm text-gray-500 max-w-sm mx-auto">{t('atsAnalyzer.pasteJdToUnlock', 'Paste a job description in step 2 and re-run the scan to unlock keyword matching and skills-gap analysis.')}</p>
    </div>
    );
};

export default AtsAnalyzer;
