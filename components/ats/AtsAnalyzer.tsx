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

interface AtsAnalyzerProps {
    savedResume: ResumeData | null;
    onUpgrade: () => void;
}

type ResumeSource = 'saved' | 'upload' | 'paste';
type ResultTab = 'overview' | 'keywords' | 'gap' | 'sections' | 'format' | 'fixes';

// =========================================================================
// Small presentational pieces
// =========================================================================

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

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
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
                        ? <span className="material-symbols-outlined text-3xl text-gray-300">link_off</span>
                        : <><span className="text-4xl font-black">{score}</span><span className="text-[10px] font-bold text-gray-400">/ 100</span></>}
                </div>
            </div>
            <div className="text-center">
                <p className="font-bold text-gray-800 text-sm">{label}</p>
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

export const AtsAnalyzer: React.FC<AtsAnalyzerProps> = ({ savedResume, onUpgrade }) => {
    const { plan, remaining, consume } = useSubscription();
    const liveAllowed = plan.limits.liveAtsRescore;

    const [source, setSource] = useState<ResumeSource>(savedResume ? 'saved' : 'paste');
    const [pastedText, setPastedText] = useState('');
    const [uploadedResume, setUploadedResume] = useState<ParsedResume | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [jd, setJd] = useState(() => localStorage.getItem(LAST_JD_KEY) || '');
    const [result, setResult] = useState<{ job: JobAnalysis | null; report: AtsReport } | null>(null);
    const [tab, setTab] = useState<ResultTab>('overview');
    const [scanError, setScanError] = useState<string | null>(null);
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
                ? 'Paste your full resume text first (at least a few paragraphs).'
                : source === 'upload'
                ? 'Upload a resume file first.'
                : 'No saved resume found — build one first, or paste/upload your resume.');
            return;
        }
        if (countUsage && !consume('atsScans')) {
            setScanError('limit');
            return;
        }
        localStorage.setItem(LAST_JD_KEY, jd);
        setResult(runFullAnalysis(parsed, jd));
        // Persist the last score so the dashboard "Profile Score" card is real.
        try {
            const quick = runFullAnalysis(parsed, jd);
            localStorage.setItem('cvbase-last-ats-score', JSON.stringify({
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

    const handleFile = async (file: File) => {
        setUploadError(null);
        setIsExtracting(true);
        try {
            const { text, imageOnly } = await extractTextFromFile(file);
            setUploadedResume(parseResumeText(text, 'file', file.name, imageOnly));
            setSource('upload');
        } catch (err: any) {
            setUploadError(err?.message || 'Could not read that file.');
            setUploadedResume(null);
        } finally {
            setIsExtracting(false);
        }
    };

    const report = result?.report || null;
    const job = result?.job || null;

    const tabs: { id: ResultTab; label: string; icon: string; badge?: number }[] = useMemo(() => report ? [
        { id: 'overview', label: 'Overview', icon: 'dashboard' },
        { id: 'keywords', label: 'Keywords', icon: 'key', badge: report.missingKeywords.filter(k => k.required).length || undefined },
        { id: 'gap', label: 'Skills Gap', icon: 'conversion_path' },
        { id: 'sections', label: 'Sections', icon: 'segment' },
        { id: 'format', label: 'Formatting', icon: 'rule', badge: report.formatChecks.filter(f => f.status === 'fail').length || undefined },
        { id: 'fixes', label: `Fixes (${report.recommendations.length})`, icon: 'auto_fix_high' },
    ] : [], [report]);

    const sourceBtn = (id: ResumeSource, icon: string, label: string, sub: string, disabled = false) => (
        <button
            key={id}
            disabled={disabled}
            onClick={() => setSource(id)}
            className={`flex-1 min-w-[140px] p-3.5 rounded-2xl border text-left transition-all ${
                source === id ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30' : 'border-gray-200 bg-white/60 hover:border-gray-300'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className={`material-symbols-outlined text-xl ${source === id ? 'text-primary' : 'text-gray-400'}`}>{icon}</span>
            <p className="font-bold text-sm text-gray-800 mt-1">{label}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{sub}</p>
        </button>
    );

    return (
        <div>
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-800">ATS Resume Checker</h1>
                    {liveAllowed && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live re-scoring
                        </span>
                    )}
                </div>
                <p className="text-gray-500 max-w-2xl">
                    Scan your resume the way real applicant tracking systems do: parse it, match it against a job description,
                    and get a prioritized fix list. {plan.limits.atsScansPerMonth !== -1 && (
                        <span className="font-semibold text-gray-600">{scansLeft === Infinity ? '' : `${scansLeft} free scan${scansLeft === 1 ? '' : 's'} left this month.`}</span>
                    )}
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* ============ INPUTS ============ */}
                <div className="xl:col-span-2 space-y-5">
                    <div className="glass-card rounded-3xl p-6 !translate-y-0">
                        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-xl">description</span> 1 · Your resume
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">Choose where your resume comes from.</p>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {sourceBtn('saved', 'cloud_done', 'Saved resume', savedResume ? `${savedResume.contact.firstName || 'Your'} resume in the builder` : 'No draft yet', !savedResume)}
                            {sourceBtn('upload', 'upload_file', 'Upload file', 'PDF, DOCX or TXT')}
                            {sourceBtn('paste', 'content_paste', 'Paste text', 'Copy & paste the content')}
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
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" /> Extracting text…
                                        </div>
                                    ) : uploadedResume ? (
                                        <div className="text-sm">
                                            <span className="material-symbols-outlined text-emerald-500 text-3xl">task</span>
                                            <p className="font-bold text-gray-700">{uploadedResume.fileName}</p>
                                            <p className="text-xs text-gray-500">{uploadedResume.wordCount} words extracted · click to replace</p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500">
                                            <span className="material-symbols-outlined text-3xl text-gray-400">upload_file</span>
                                            <p className="font-semibold text-gray-600">Drop your resume here or click to browse</p>
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
                                placeholder="Paste your full resume text here…"
                                className="w-full h-44 p-4 rounded-2xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y custom-scrollbar"
                            />
                        )}

                        {source === 'saved' && savedResume && (
                            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-sm">
                                <span className="material-symbols-outlined text-primary">verified</span>
                                <div>
                                    <p className="font-bold text-gray-800">{savedResume.contact.firstName || 'Untitled'} {savedResume.contact.lastName} — {savedResume.contact.jobTitle || 'resume draft'}</p>
                                    <p className="text-xs text-gray-500">Analyzed directly from your builder data — always in sync.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-card rounded-3xl p-6 !translate-y-0">
                        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary-dark text-xl">work</span> 2 · Target job description
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">Paste the full posting for a match score, keyword gaps and role-fit analysis. Leave empty for a general ATS health check.</p>
                        <textarea
                            value={jd}
                            onChange={e => setJd(e.target.value)}
                            placeholder="Paste the job description here (responsibilities, requirements, nice-to-haves)…"
                            className="w-full h-48 p-4 rounded-2xl border border-gray-200 bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-y custom-scrollbar"
                        />
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[11px] text-gray-400">{jd.trim() ? `${jd.trim().split(/\s+/).length} words` : 'Optional but strongly recommended'}</p>
                            {jd.trim().length > 0 && jd.trim().length < 80 && <p className="text-[11px] text-amber-600 font-medium">Too short to analyze — paste the full posting</p>}
                        </div>

                        <button
                            onClick={() => runScan(true)}
                            className="w-full mt-4 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            <span className="material-symbols-outlined">radar</span>
                            {result ? 'Re-run full scan' : 'Run ATS scan'}
                        </button>

                        {scanError === 'limit' ? (
                            <div className="mt-3 p-4 rounded-2xl bg-gradient-to-r from-secondary/10 to-primary/10 border border-secondary/20">
                                <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-secondary-dark text-lg">lock</span>
                                    You've used your {plan.limits.atsScansPerMonth} free scans this month
                                </p>
                                <p className="text-xs text-gray-600 mt-1 mb-3">Upgrade to Pro for unlimited scans and real-time re-scoring as you edit.</p>
                                <button onClick={onUpgrade} className="px-4 py-2 bg-secondary-dark text-white rounded-xl text-xs font-bold hover:opacity-90 transition">
                                    View plans →
                                </button>
                            </div>
                        ) : scanError ? (
                            <p className="mt-3 text-sm text-rose-600 font-medium">{scanError}</p>
                        ) : null}

                        {!liveAllowed && result && (
                            <p className="mt-3 text-[11px] text-gray-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-secondary-dark">bolt</span>
                                Pro re-scores automatically while you edit — no scan quota.
                                <button onClick={onUpgrade} className="text-secondary-dark font-bold hover:underline">Upgrade</button>
                            </p>
                        )}
                    </div>
                </div>

                {/* ============ RESULTS ============ */}
                <div className="xl:col-span-3">
                    {!report ? (
                        <div className="glass-card rounded-3xl p-10 h-full min-h-[420px] flex flex-col items-center justify-center text-center !translate-y-0">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mb-5">
                                <span className="material-symbols-outlined text-4xl text-primary">query_stats</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Your report will appear here</h3>
                            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                                We parse your resume like Workday or Greenhouse would, weigh every keyword in the job posting,
                                and score compatibility, match, formatting and role fit — instantly, on your device.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2 mt-6">
                                {['ATS compatibility', 'Job match %', 'Missing keywords', 'Skills gap', 'Section feedback', 'Fix list'].map(f => (
                                    <Chip key={f}>{f}</Chip>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Score header */}
                            <div className="glass-card rounded-3xl p-6 !translate-y-0">
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="flex gap-6">
                                        <ScoreRing score={report.atsScore} label="ATS Compatibility" sublabel="Parse & quality score" />
                                        <ScoreRing score={report.matchScore} label="Job Match" sublabel={job ? (job.title || 'vs. pasted job') : 'Add a job description'} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        {report.roleFit ? (
                                            <div className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                                                report.roleFit.competitiveness === 'strong' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                                : report.roleFit.competitiveness === 'moderate' ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                                : 'bg-rose-50/80 border-rose-200 text-rose-900'
                                            }`}>
                                                <p className="font-extrabold uppercase tracking-wider text-[10px] mb-1 opacity-70">
                                                    {report.roleFit.competitiveness === 'strong' ? 'Strong candidate' : report.roleFit.competitiveness === 'moderate' ? 'Competitive with tailoring' : 'Stretch role'}
                                                </p>
                                                {report.roleFit.verdict}
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-2xl border border-gray-200 bg-white/60 text-sm text-gray-600 leading-relaxed">
                                                <p className="font-extrabold uppercase tracking-wider text-[10px] mb-1 text-gray-400">General health check</p>
                                                This is a JD-independent audit. Paste a job description on the left to unlock match %, keyword gaps and role-fit insights.
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <Chip>{report.stats.wordCount} words</Chip>
                                            <Chip>{report.stats.bulletCount} bullets</Chip>
                                            <Chip>{report.stats.skillCount} skills recognized</Chip>
                                            {report.stats.experienceYears > 0 && <Chip>~{report.stats.experienceYears}y experience</Chip>}
                                        </div>
                                    </div>
                                </div>
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
                                        <span className="material-symbols-outlined text-sm">{t.icon}</span>
                                        {t.label}
                                        {t.badge ? <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.5 text-[9px] leading-none">{t.badge}</span> : null}
                                    </button>
                                ))}
                            </div>

                            {/* Tab bodies */}
                            <div className="glass-card rounded-3xl p-6 !translate-y-0 animate-fade-in" key={tab}>
                                {tab === 'overview' && (
                                    <div>
                                        <h3 className="font-bold text-gray-800 mb-2">ATS compatibility breakdown</h3>
                                        <div className="divide-y divide-gray-100">
                                            {report.atsDimensions.map(d => <DimensionBar key={d.id} {...d} />)}
                                        </div>
                                        {report.matchDimensions.length > 0 && (
                                            <>
                                                <h3 className="font-bold text-gray-800 mb-2 mt-6">Job match breakdown</h3>
                                                <div className="divide-y divide-gray-100">
                                                    {report.matchDimensions.map(d => <DimensionBar key={d.id} {...d} />)}
                                                </div>
                                            </>
                                        )}
                                        {report.roleFit && (
                                            <div className="mt-6 grid sm:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/70 border border-gray-100">
                                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">Role fit</p>
                                                    <ul className="text-xs text-gray-600 space-y-2">
                                                        <li><strong className="text-gray-800">Target:</strong> {report.roleFit.targetTitle} · {SENIORITY_LABELS[report.roleFit.seniority]}</li>
                                                        <li><strong className="text-gray-800">You read as:</strong> {report.roleFit.resumeTitle} · {SENIORITY_LABELS[report.roleFit.resumeSeniority]}</li>
                                                        <li>{report.roleFit.seniorityVerdict}</li>
                                                        <li>{report.roleFit.yearsVerdict}</li>
                                                        <li>{report.roleFit.educationVerdict}</li>
                                                    </ul>
                                                </div>
                                                <div className="space-y-4">
                                                    {report.roleFit.strengths.length > 0 && (
                                                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 mb-2">Your strengths for this role</p>
                                                            <ul className="text-xs text-emerald-900 space-y-1.5 list-disc ml-4">
                                                                {report.roleFit.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {report.roleFit.gaps.length > 0 && (
                                                        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 mb-2">Biggest gaps</p>
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
                                                <span><strong className="text-gray-800">{report.matchedKeywords.length}</strong> matched</span>
                                                <span><strong className="text-rose-600">{report.missingKeywords.length}</strong> missing</span>
                                                <span><strong className="text-gray-800">{job.requiredCount}</strong> marked required in the posting</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-rose-700 mb-2 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-base">priority_high</span> Missing from your resume
                                            </h4>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {report.missingKeywords.length === 0 && <p className="text-sm text-gray-500">Nothing missing — full keyword coverage. 🎯</p>}
                                                {report.missingKeywords.map(k => (
                                                    <Chip key={k.term} tone="bad" title={`Appears ${k.count}× in the posting · weight ${k.weight.toFixed(1)}`}>
                                                        {k.required && <span className="material-symbols-outlined text-xs">star</span>}
                                                        {k.term}
                                                        <span className="opacity-60">×{k.count}</span>
                                                    </Chip>
                                                ))}
                                            </div>
                                            <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-base">check</span> Found on your resume
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {report.matchedKeywords.map(k => (
                                                    <Chip key={k.term} tone="good" title={`On your resume ${k.resumeCount}× (${k.foundIn.slice(0, 3).join(', ')})`}>
                                                        {k.required && <span className="material-symbols-outlined text-xs">star</span>}
                                                        {k.term}
                                                    </Chip>
                                                ))}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-5 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">star</span> = listed under requirements/qualifications in the posting. Hover any chip for frequency details.
                                            </p>
                                        </div>
                                    ) : <EmptyJdNotice />
                                )}

                                {tab === 'gap' && (
                                    job ? (
                                        <div className="space-y-5">
                                            {report.skillGaps.length === 0 && <p className="text-sm text-gray-500">No taxonomy skills detected in this job description.</p>}
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
                                                        {!s.present && <span className="text-[10px] font-extrabold uppercase tracking-wide bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Missing</span>}
                                                    </h4>
                                                    <span className={`text-sm font-black ${s.score >= 75 ? 'text-emerald-600' : s.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{s.score}/100</span>
                                                </div>
                                                {s.strengths.length > 0 && (
                                                    <ul className="text-xs text-emerald-800 space-y-1 mb-2">
                                                        {s.strengths.map((x, i) => <li key={i} className="flex gap-1.5"><span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>{x}</li>)}
                                                    </ul>
                                                )}
                                                {s.issues.length > 0 && (
                                                    <ul className="text-xs text-gray-600 space-y-1">
                                                        {s.issues.map((x, i) => <li key={i} className="flex gap-1.5"><span className="material-symbols-outlined text-sm text-amber-500">arrow_circle_right</span>{x}</li>)}
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
                                                <span className="material-symbols-outlined text-xl mt-0.5">{STATUS_STYLE[f.status].icon}</span>
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
                                            <p className="text-sm text-gray-500">No fixes needed — this resume is in excellent shape. 🏆</p>
                                        )}
                                        {report.recommendations.map((r, i) => (
                                            <div key={i} className="p-4 rounded-2xl bg-white/70 border border-gray-100 flex items-start gap-3">
                                                <span className={`shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full border ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</span>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm text-gray-800">{r.title}</h4>
                                                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{r.detail}</p>
                                                </div>
                                                <span className="shrink-0 text-[10px] font-bold text-secondary-dark bg-secondary/10 px-2 py-1 rounded-full" title="Estimated score points recoverable">+{r.impact} pts</span>
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

const EmptyJdNotice: React.FC = () => (
    <div className="text-center py-10">
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">work_outline</span>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">Paste a job description in step 2 and re-run the scan to unlock keyword matching and skills-gap analysis.</p>
    </div>
);

export default AtsAnalyzer;
