import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    ArrowLeft, BookOpenText, Wifi, Type, BookOpen, SpellCheck, ListChecks, Wrench,
    Target, Star, FileText, PenTool, CircleCheck, Search, Check, CircleQuestionMark,
    Copy, ShieldCheck,
} from 'lucide-react';

interface ResourcesPageProps {
    onBack: () => void;
    onStartBuilding: () => void;
}

interface ActionVerb {
    verb: string;
    category: 'leadership' | 'creativity' | 'operations' | 'research' | 'delivery';
    definition: string;
    example: string;
}

const ACTION_VERBS: ActionVerb[] = [
    { verb: 'Spearheaded', category: 'leadership', definition: 'Led a team, project, or movement to success from the beginning stages.', example: 'Spearheaded the integration of cloud-native systems, accelerating pipeline velocity by 40%.' },
    { verb: 'Orchestrated', category: 'leadership', definition: 'Organized, managed, and executed complex multi-team initiatives.', example: 'Orchestrated a cross-departmental transition to React-Vite, aligning 4 key product suites.' },
    { verb: 'Pioneered', category: 'creativity', definition: 'Designed or developed some of the earliest processes, tools, or concepts.', example: 'Pioneered an AI-backed ATS parser auditing system used by 5,000 global candidates.' },
    { verb: 'Revamped', category: 'creativity', definition: 'Redesigned or restructured an underperforming system to make it look or perform better.', example: 'Revamped the customer onboarding portal, reducing signup friction by 33%.' },
    { verb: 'Streamlined', category: 'operations', definition: 'Simplified and organized a complex, redundant workflow to save cost or time.', example: 'Streamlined container deployment parameters, cutting cloud compute costs by $12,000 annually.' },
    { verb: 'Formulated', category: 'operations', definition: 'Created a systematic strategy, policy, or framework using precise data analysis.', example: 'Formulated an automated disaster recovery blueprint, ensuring 99.99% uptime.' },
    { verb: 'Scrutinized', category: 'research', definition: 'Inspected raw systems or performance datasets closely for optimizations.', example: 'Scrutinized database query executions, identifying bottleneck indices resulting in 2x speedups.' },
    { verb: 'Deciphered', category: 'research', definition: 'Translated abstract data, user signals, or analytics metrics into actionable strategies.', example: 'Deciphered legacy database schema structures to enable a flawless cloud database migration.' },
    { verb: 'Surpassed', category: 'delivery', definition: 'Exceeded established benchmarks, metrics, or revenue milestones.', example: 'Surpassed previous delivery speed records by implementing automated unit test cycles.' },
    { verb: 'Consolidated', category: 'delivery', definition: 'Combined multiple resources or platforms to enhance efficiency.', example: 'Consolidated 5 disparate tracking sheets into a unified real-time dashboard pipeline.' }
];

const CHECKLIST_ITEMS = [
    { id: 'contact_clear', text: 'Contact details: Ensure your email, phone, location (city/state) and LinkedIn profiles are placed at the top and completely selectable (no graphics).' },
    { id: 'quantify_achieve', text: 'Quantification: At least 50% of your resume bullet points should contain an active metric (%, $, hours, size of team).' },
    { id: 'action_strong', text: 'Strong Verbs: Replace weak passive statements (like "responsible for" or "helped with") with punchy action verbs (e.g. "Spearheaded", "Streamlined").' },
    { id: 'standard_fonts', text: 'Standard Font Boundaries: Stick to universal fonts (Inter, Arial, Roboto, Helvetica, Georgia) styled with standard system margins.' },
    { id: 'no_nested_tables', text: 'ATS Readability: Avoid multi-nested tables, columns inside columns, or colored text overlays. Keep structures linear and parseable.' },
    { id: 'reverse_chrono', text: 'Chronological Integrity: Display your experiences with the most recent positions first, listing clear dates with month and year.' },
    { id: 'keyword_density', text: 'JD Keywords: Ensure primary technical nouns from the target job posting are included natively in your professional summaries or skills tags.' },
    { id: 'single_page_limit', text: 'Page Count Discipline: Keep early to mid-career resumes strictly to 1-2 pages, avoiding single-sentence trailing pages.' }
];

export default function ResourcesPage({ onBack, onStartBuilding }: ResourcesPageProps) {
    const [activeTab, setActiveTab] = useState<'guides' | 'verbs' | 'checklist' | 'ats_analyzer'>('guides');
    const [copiedVerb, setCopiedVerb] = useState<string | null>(null);
    const [verbSearch, setVerbSearch] = useState('');
    const [verbFilter, setVerbFilter] = useState<string>('all');
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    
    // ATS Instant Scanner States
    const [atsResumeInput, setAtsResumeInput] = useState('');
    const [atsJdInput, setAtsJdInput] = useState('');
    const [atsAnalysis, setAtsAnalysis] = useState<{
        score: number;
        feedback: string[];
        matchedKeywords: string[];
        missingKeywords: string[];
        formattingAlerts: string[];
        metricsDensity: number;
    } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Load initial checklist state
    useEffect(() => {
        try {
            const saved = localStorage.getItem('cvbase-resources-checklist');
            if (saved) {
                setCheckedItems(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load checklist', e);
        }
    }, []);

    const toggleCheckItem = (id: string) => {
        const next = { ...checkedItems, [id]: !checkedItems[id] };
        setCheckedItems(next);
        try {
            localStorage.setItem('cvbase-resources-checklist', JSON.stringify(next));
        } catch (e) {
            console.error(e);
        }
    };

    const handleCopyVerb = (verb: string) => {
        navigator.clipboard.writeText(verb);
        setCopiedVerb(verb);
        setTimeout(() => setCopiedVerb(null), 1800);
    };

    // Simulated high-fidelity matching scanner
    const handleAnalyzeAts = () => {
        if (!atsResumeInput.trim() || !atsJdInput.trim()) return;
        setIsAnalyzing(true);
        setTimeout(() => {
            const lowercaseResume = atsResumeInput.toLowerCase();
            const lowercaseJd = atsJdInput.toLowerCase();
            
            // Extract potential target keywords from Jd
            const candidateKeywords = [
                'react', 'vue', 'typescript', 'javascript', 'python', 'java', 'sql', 'postgresql', 'aws', 'docker', 
                'agile', 'scrum', 'leadership', 'kubernetes', 'cloud', 'pipeline', 'ci/cd', 'architecture', 'strategy',
                'optimization', 'performance', 'metrics', 'budget', 'development', 'management', 'kpi', 'rest api'
            ];
            
            const matchedKeywords: string[] = [];
            const missingKeywords: string[] = [];
            
            candidateKeywords.forEach(kw => {
                if (lowercaseJd.includes(kw)) {
                    if (lowercaseResume.includes(kw)) {
                        matchedKeywords.push(kw);
                    } else {
                        missingKeywords.push(kw);
                    }
                }
            });

            // Count metrics density (numbers or percentages)
            const numbers = atsResumeInput.match(/\b\u0025\b|\b\d+\u0025|\b\d+\s*(?:percent|million|billion|k|x|usd|dollars)\b|\b\d+\b/gi) || [];
            const metricsDensity = Math.min(Math.round((numbers.length / (atsResumeInput.split(/\s+/).length || 1)) * 100), 100);

            // Simple scoring formula
            let score = 50;
            score += matchedKeywords.length * 5;
            if (atsResumeInput.length > 500) score += 10;
            if (numbers.length >= 4) score += 10;
            
            const formattingAlerts: string[] = [];
            if (!atsResumeInput.includes('@') || !atsResumeInput.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/)) {
                formattingAlerts.push('Missing contact parameters (phone, email). Ensure formatting details are highlighted.');
            }
            if (atsResumeInput.toLowerCase().includes('nest') || atsResumeInput.toLowerCase().includes('curriculum')) {
                formattingAlerts.push('Atypical section naming noticed. Maintain standard names (Experience, Projects, Education).');
            }
            if (atsResumeInput.split(/\s+/).length < 150) {
                formattingAlerts.push('Highly sparse text block. Extend accomplishment metrics to withstand candidate rank algorithms.');
            }

            const feedback: string[] = [];
            if (score >= 80) {
                feedback.push('Excellent match density! This material is highly aligned with key recruitment indexes.');
            } else if (score >= 60) {
                feedback.push('Satisfactory alignment, but adding specific missed skills or power action verbs will lift execution status.');
            } else {
                feedback.push('Low parse alignment. Rephrase weak sentences using quantified metrics, and map keywords exactly.');
            }

            setAtsAnalysis({
                score: Math.min(score, 100),
                feedback,
                matchedKeywords: matchedKeywords.length > 0 ? matchedKeywords : ['general keywords'],
                missingKeywords: missingKeywords.length > 0 ? missingKeywords : ['No major missing key components found'],
                formattingAlerts: formattingAlerts.length > 0 ? formattingAlerts : ['All formatting looks completely parseable'],
                metricsDensity
            });
            setIsAnalyzing(false);
        }, 1200);
    };

    const filteredVerbs = ACTION_VERBS.filter(item => {
        const matchesSearch = item.verb.toLowerCase().includes(verbSearch.toLowerCase()) || 
                              item.definition.toLowerCase().includes(verbSearch.toLowerCase());
        const matchesCategory = verbFilter === 'all' || item.category === verbFilter;
        return matchesSearch && matchesCategory;
    });

    const completionRate = Math.round(
        (CHECKLIST_ITEMS.filter(it => checkedItems[it.id]).length / CHECKLIST_ITEMS.length) * 100
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            {/* Minimalist Top Nav */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] px-6 md:px-12 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                        title="Back to Suite"
                    >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
                            <BookOpenText className="w-[1em] h-[1em] text-white text-sm" aria-hidden="true" />
                        </div>
                        <span className="font-extrabold text-xl tracking-tight text-slate-950">CVBase Resources</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="text-xs font-bold text-slate-650 hover:text-slate-905 uppercase tracking-wider transition"
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={onStartBuilding}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                    >
                        Build My Resume
                    </button>
                </div>
            </header>

            {/* HERO BANNER SECTION */}
            <section className="bg-slate-900 text-white relative overflow-hidden py-16 px-6 md:px-12">
                {/* Visual patterns */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#4f46e5]/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-10 w-96 h-96 bg-[#06b6d4]/10 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
                    <div className="space-y-6 lg:w-3/5 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-indigo-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                            Career Advisory Board
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                            The Blueprint to Withstand <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Automated HR Screens</span>
                        </h1>
                        <p className="text-slate-350 text-sm md:text-base leading-relaxed font-normal max-w-xl">
                            Unlock expert formatting strategies, parse-compliance calculators, power verb banks, and interactive checklists designed purely under strict HTML/CSS print guidelines.
                        </p>
                        
                        <div className="flex gap-4 pt-2">
                            <button
                                onClick={() => setActiveTab('ats_analyzer')}
                                className="px-5 py-3 rounded-xl bg-white text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md hover:bg-slate-100 transition duration-150 flex items-center gap-2 cursor-pointer"
                            >
                                <Wifi className="w-[1em] h-[1em] text-sm text-indigo-600" aria-hidden="true" />
                                Test ATS Compliance
                            </button>
                            <button
                                onClick={() => setActiveTab('verbs')}
                                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs uppercase tracking-wider transition duration-150 flex items-center gap-2 cursor-pointer"
                            >
                                <Type className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                                Action Verbs Dict
                            </button>
                        </div>
                    </div>

                    {/* Architectural Graphics Wrapper */}
                    <div className="lg:w-2/5 w-full flex justify-center">
                        <div className="relative bg-slate-850 p-6 rounded-3xl border border-white/10 w-full max-w-sm shadow-2xl hover:scale-102 transition-all">
                            {/* SVG Layout Blueprint */}
                            <svg className="w-full h-44 rounded-xl text-slate-500 overflow-hidden" viewBox="0 0 300 160" fill="none">
                                <rect width="300" height="160" rx="12" fill="#1e293b" />
                                <rect x="20" y="20" width="70" height="8" rx="4" fill="#334155" />
                                <rect x="20" y="32" width="130" height="6" rx="3" fill="#475569" />
                                <line x1="20" y1="52" x2="280" y2="52" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                                <circle cx="210" cy="28" r="4" fill="#10b981" />
                                <rect x="220" y="25" width="60" height="6" rx="3" fill="#047857" />
                                
                                <rect x="20" y="65" width="260" height="40" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
                                <circle cx="40" cy="85" r="10" fill="#4f46e5" fillOpacity="0.2" />
                                <path d="M38 85 L42 88 L46 82" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <rect x="62" y="78" width="120" height="6" rx="3" fill="#475569" />
                                <rect x="62" y="88" width="180" height="5" rx="2" fill="#334155" />
                                
                                <rect x="20" y="115" width="100" height="14" rx="4" fill="#1e2c4a" />
                                <circle cx="32" cy="122" r="4" fill="#38bdf8" />
                                <text x="44" y="125" fill="#38bdf8" fontSize="8" fontWeight="bold">ATS OPTIMIZED</text>
                            </svg>
                            
                            <div className="mt-4 flex items-center justify-between text-xs">
                                <span className="font-mono text-[10px] text-slate-400">STRUCTURAL METADATA DIAGRAM</span>
                                <span className="text-[#34d399] font-bold text-[10px] uppercase tracking-widest">100% Vector</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECONDARY ARCHITECTURE TAB CONTAINER */}
            <main className="max-w-6xl mx-auto py-12 px-6 md:px-12">
                {/* Navigation Bar Pills */}
                <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-4 scrollbar-none">
                    <button
                        onClick={() => setActiveTab('guides')}
                        className={`py-3.5 px-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap border-b-2 transition-all cursor-pointer ${activeTab === 'guides' ? 'border-primary text-slate-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <BookOpen className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                        Career Strategy Guides
                    </button>
                    <button
                        onClick={() => setActiveTab('verbs')}
                        className={`py-3.5 px-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap border-b-2 transition-all cursor-pointer ${activeTab === 'verbs' ? 'border-primary text-slate-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <SpellCheck className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                        Power Action Verbs
                    </button>
                    <button
                        onClick={() => setActiveTab('checklist')}
                        className={`py-3.5 px-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap border-b-2 transition-all cursor-pointer ${activeTab === 'checklist' ? 'border-primary text-slate-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <ListChecks className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                        Interactive Checklist
                        {completionRate > 0 && (
                            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">{completionRate}%</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('ats_analyzer')}
                        className={`py-3.5 px-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap border-b-2 transition-all cursor-pointer ${activeTab === 'ats_analyzer' ? 'border-primary text-slate-950 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Wrench className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                        ATS Compliance Sandbox
                    </button>
                </div>

                {/* TAB 1: GUIDES & LAYOUT REFINEMENTS */}
                {activeTab === 'guides' && (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Guide Card 1 */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col justify-between">
                                <div className="space-y-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                        <Target className="w-[1em] h-[1em]" aria-hidden="true" />
                                    </div>
                                    <h4 className="font-extrabold text-slate-900 text-base leading-snug">The Ultimate ATS Algorithm Hack</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed text-justify">
                                        Corporate Applicant Tracking Systems (ATS) score candidates based on keyword frequency, title alignment, and structural text readability. Learn how to design a high-fidelity plain layout that parses perfectly on Workday, Taleo, and Greenhouse ecosystems.
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center text-[11px] font-bold text-slate-400">
                                    <span>5 min read</span>
                                    <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">ATS COMPLIANT</span>
                                </div>
                            </div>

                            {/* Guide Card 2 */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col justify-between">
                                <div className="space-y-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <Star className="w-[1em] h-[1em]" aria-hidden="true" />
                                    </div>
                                    <h4 className="font-extrabold text-slate-900 text-base leading-snug">Writing Impactful STAR Bullet Points</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed text-justify">
                                        Never write passive resume lines like "Assisted with tech projects." Use the **STAR formula**: Describe the **Situation**, state your **Task**, list your dynamic **Action**, and state the verifiable **Result**. Aim to quantify at least 50% of your listed achievements.
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center text-[11px] font-bold text-slate-400">
                                    <span>4 min read</span>
                                    <span className="text-emerald-600 hover:underline cursor-pointer flex items-center gap-1">STAR METHOD</span>
                                </div>
                            </div>

                            {/* Guide Card 3 */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-350 hover:shadow-md transition duration-200 flex flex-col justify-between">
                                <div className="space-y-4 text-left">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <FileText className="w-[1em] h-[1em]" aria-hidden="true" />
                                    </div>
                                    <h4 className="font-extrabold text-slate-900 text-base leading-snug">Single vs. Two-Page CV Structures</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed text-justify">
                                        Candidates with under 5 years of active career history must stick to a pristine single A4 sheet layout. Experienced professionals can scale up to 2 pages, provided the second page lists highly specialized tech credentials and leadership architectures.
                                    </p>
                                </div>
                                <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center text-[11px] font-bold text-slate-400">
                                    <span>6 min read</span>
                                    <span className="text-blue-600 hover:underline cursor-pointer flex items-center gap-1">A4 PAGE-BREAKS</span>
                                </div>
                            </div>

                        </div>

                        {/* Layout Advice and HR Specs banner */}
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-8 items-center justify-between text-left">
                            <div className="space-y-3 lg:w-2/3">
                                <h3 className="text-xl font-extrabold text-slate-900">Why CVBase Vector Resumes Rank Higher</h3>
                                <p className="text-xs text-slate-500 leading-relaxed text-justify">
                                    Standard document editors convert text lines into disorganized visual clusters or nested matrices which scanners read as garbled gibberish. CVBase maintains strict linear character codes. Every printed block features crisp, searchable vector properties, achieving flawless parse integrity across recursive indexing scrapers.
                                </p>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 font-mono text-[10px] text-slate-400 font-bold uppercase">
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <CircleCheck className="w-3 h-3 text-green-500" aria-hidden="true" /> No flat graphics
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <CircleCheck className="w-3 h-3 text-green-500" aria-hidden="true" /> Selectable character layers
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-600">
                                        <CircleCheck className="w-3 h-3 text-green-500" aria-hidden="true" /> True-to-life standard layout margins
                                    </span>
                                </div>
                            </div>

                            {/* Inline blueprint structure card */}
                            <div className="lg:w-1/3 w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex gap-4 items-center">
                                {/* Small graphic */}
                                <div className="w-14 h-14 bg-[#4f46e5]/10 rounded-xl flex items-center justify-center shrink-0">
                                    <PenTool className="w-6 h-6 text-indigo-650" aria-hidden="true" />
                                </div>
                                <div className="space-y-1">
                                    <h5 className="font-extrabold text-slate-900 text-xs uppercase font-mono tracking-wider">A4 Grid Mechanics</h5>
                                    <p className="text-[10px] text-slate-400 leading-normal">
                                        Strict CSS print standards. Never clip headers or leave Orphan values at page bottoms.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: POWER ACTION VERBS GLOSSARY */}
                {activeTab === 'verbs' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                <div className="text-left">
                                    <h3 className="text-lg font-extrabold text-slate-900">Power Action Verbs Dictionary</h3>
                                    <p className="text-xs text-slate-500">Inject high-impact verbs into your achievements to immediately command attention.</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase bg-slate-50 px-2.5 py-1 rounded">
                                        {filteredVerbs.length} VERBS FOUND
                                    </span>
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="w-[1em] h-[1em] absolute left-3 top-2.5 text-slate-400 text-sm" aria-hidden="true" />
                                    <input
                                        type="text"
                                        placeholder="Search power verbs or definitions..."
                                        value={verbSearch}
                                        onChange={(e) => setVerbSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-medium"
                                    />
                                </div>
                                <div className="flex gap-2 shrink-0 scrollbar-none overflow-x-auto">
                                    {['all', 'leadership', 'creativity', 'operations', 'research', 'delivery'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setVerbFilter(cat)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition ${verbFilter === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Verb Grid List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {filteredVerbs.map(item => (
                                    <div 
                                        key={item.verb} 
                                        className="group relative bg-slate-50 hover:bg-indigo-50/20 p-4 rounded-xl border border-slate-200/80 hover:border-slate-350 hover:shadow-xs transition-all text-left flex flex-col justify-between"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-extrabold text-indigo-750 text-sm">{item.verb}</h4>
                                                <span className="text-[8px] font-mono font-bold uppercase text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-450 leading-normal">{item.definition}</p>
                                        </div>
                                        
                                        <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-650 italic leading-snug">
                                            "{item.example}"
                                        </div>

                                        <button
                                            onClick={() => handleCopyVerb(item.verb)}
                                            className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition duration-150 text-slate-350 hover:text-indigo-600 p-1"
                                            title="Click to copy verb"
                                        >
                                            {copiedVerb === item.verb
                                                ? <Check className="w-3 h-3" aria-hidden="true" />
                                                : <Copy className="w-3 h-3" aria-hidden="true" />}
                                        </button>
                                    </div>
                                ))}

                                {filteredVerbs.length === 0 && (
                                    <div className="col-span-2 text-center py-10 text-slate-400">
                                        <CircleQuestionMark className="w-8 h-8 mb-1" aria-hidden="true" />
                                        <p className="text-xs">No verbs match your current search constraints.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: INTERACTIVE WRITING CHECKLIST */}
                {activeTab === 'checklist' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Process Checklist */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <div className="flex justify-between items-center text-left border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-lg font-extrabold text-slate-900">High-Fidelity Writing Checklist</h3>
                                    <p className="text-xs text-slate-500">Step-by-step standards to secure and bulletproof candidate ranking.</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setCheckedItems({});
                                        localStorage.removeItem('cvbase-resources-checklist');
                                    }}
                                    className="text-[10px] uppercase font-bold text-slate-400 hover:text-rose-600 tracking-wider cursor-pointer"
                                    title="Reset verification state"
                                >
                                    Reset Checks
                                </button>
                            </div>

                            <div className="space-y-4">
                                {CHECKLIST_ITEMS.map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => toggleCheckItem(item.id)}
                                        className={`p-4 rounded-xl border flex items-start gap-4 cursor-pointer transition-all ${checkedItems[item.id] ? 'bg-green-50/40 border-green-200 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${checkedItems[item.id] ? 'bg-green-600 border-green-600 text-white' : 'border-slate-350 bg-white'}`}>
                                            {checkedItems[item.id] && (
                                                <Check className="w-3 h-3 leading-none" aria-hidden="true" />
                                            )}
                                        </div>
                                        <div className="space-y-0.5 text-left">
                                            <p className={`text-xs leading-relaxed font-medium ${checkedItems[item.id] ? 'text-slate-550 line-through' : 'text-slate-800'}`}>
                                                {item.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Completion score indicator */}
                        <div className="lg:col-span-4 bg-slate-900 text-white p-6 rounded-3xl space-y-6 border border-white/5 shadow-lg">
                            <div className="space-y-1 text-left">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold block">// VERIFICATION KPI</span>
                                <h4 className="text-lg font-black">Document Readiness Score</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Tick off requirements as you polish your draft inside CVBase's main builder templates.
                                </p>
                            </div>

                            {/* Circle score chart */}
                            <div className="flex flex-col items-center justify-center py-4 relative">
                                <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="44" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                                    <circle 
                                        cx="50" 
                                        cy="50" 
                                        r="44" 
                                        stroke="#10b981" 
                                        strokeWidth="8" 
                                        fill="transparent" 
                                        strokeDasharray={276}
                                        strokeDashoffset={276 - (completionRate / 100) * 276}
                                        strokeLinecap="round"
                                        className="transition-all duration-500 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black font-mono">{completionRate}%</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">VERIFIED</span>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed italic text-center">
                                {completionRate === 100 
                                    ? '🎉 Your career document aligns with gold-standard recruiter parsing algorithms!' 
                                    : 'Resolve outstanding checks to lift parse scores and withstand candidate screening.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* TAB 4: ATS COMPLIANCE ANALYZER SIMULATOR */}
                {activeTab === 'ats_analyzer' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Inputs Block */}
                            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                                <div className="text-left border-b border-slate-100 pb-4">
                                    <h3 className="text-lg font-extrabold text-slate-900">Prerequsite Sandbox Parsing</h3>
                                    <p className="text-xs text-slate-500">Test character structures, metric occurrences, and draft similarities.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Resume Plain-Text Snippet</label>
                                        <textarea
                                            value={atsResumeInput}
                                            onChange={(e) => setAtsResumeInput(e.target.value)}
                                            className="w-full h-40 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 border-slate-350"
                                            placeholder="Paste a draft of your bullet achievements, summaries, or skills here..."
                                        />
                                    </div>

                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Job Requirements (JD)</label>
                                        <textarea
                                            value={atsJdInput}
                                            onChange={(e) => setAtsJdInput(e.target.value)}
                                            className="w-full h-40 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 border-slate-350"
                                            placeholder="Paste details of the target job posting to scan critical core nouns..."
                                        />
                                    </div>

                                    <button
                                        onClick={handleAnalyzeAts}
                                        disabled={isAnalyzing || !atsResumeInput.trim() || !atsJdInput.trim()}
                                        className="w-full py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Running algorithmic scan comparisons...
                                            </>
                                        ) : (
                                            <>
                                                <Wrench className="w-[1em] h-[1em] text-sm" aria-hidden="true" />
                                                COMPUTE ATS PARSABILITY INDEX
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Scoring Results Screen */}
                            <div className="lg:col-span-5">
                                {atsAnalysis ? (
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:shadow-md transition duration-200">
                                        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-150 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-xl font-black text-indigo-700">{atsAnalysis.score}</span>
                                                <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">SCORE</span>
                                            </div>
                                            <div className="text-left space-y-0.5">
                                                <h4 className="font-extrabold text-slate-900 text-sm">ATS Alignment Score</h4>
                                                <p className="text-[11px] text-slate-500">Based on diagnostic keywords & metrics occurrence.</p>
                                            </div>
                                        </div>

                                        {/* Feedback list */}
                                        <div className="space-y-4 text-left">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">EXECUTIVE DIAGNOSTIC FEEDBACK</span>
                                                {atsAnalysis.feedback.map((f, i) => (
                                                    <p key={i} className="text-xs text-slate-650 bg-slate-55 pb-1 select-none pr-2 leading-relaxed text-left">
                                                        {f}
                                                    </p>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                                {/* Keywords Found */}
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold block">Keywords Matched</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {atsAnalysis.matchedKeywords.map(kw => (
                                                            <span key={kw} className="text-[9.5px] font-medium bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded uppercase">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Missing Keywords */}
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-mono uppercase tracking-widest text-[#b45309] font-bold block">Suggested Additions</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {atsAnalysis.missingKeywords.map(kw => (
                                                            <span key={kw} className="text-[9.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded uppercase">
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metrics occurrences */}
                                            <div className="border-t border-slate-100 pt-3 space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                                                    <span>METRIC OCCURRENCES VALUE</span>
                                                    <span className="text-indigo-650">{atsAnalysis.metricsDensity}% Density</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${atsAnalysis.metricsDensity}%` }}></div>
                                                </div>
                                            </div>

                                            {/* Formatting alerts */}
                                            <div className="border-t border-slate-100 pt-3 space-y-1">
                                                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold block">Formating parameters check</span>
                                                <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4 leading-normal">
                                                    {atsAnalysis.formattingAlerts.map((alert, i) => (
                                                        <li key={i}>{alert}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center text-slate-400/85 h-full flex flex-col justify-center items-center min-h-[300px]">
                                        <ShieldCheck className="w-10 h-10 mb-2 text-slate-300" aria-hidden="true" />
                                        <h5 className="font-bold text-slate-600 text-sm mb-0.5">Scoring Engine Awaiting Data</h5>
                                        <p className="max-w-xs text-[11px] text-slate-400 leading-normal mx-auto">
                                            Insert your accomplishments draft and job details in the left form fields to render dynamic performance diagnostics.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
