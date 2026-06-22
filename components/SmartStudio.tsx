import React, { useState, useEffect } from 'react';
import type { ResumeData, JobApplication, JobStatus } from '../types';
import mammoth from 'mammoth';
import {
  optimizeLinkedInProfile,
  optimizeCoverLetter,
  analyzeCareerTrajectory,
  parsePdfFileWithAi,
  ResumeMatchResult,
  LinkedInOptimizeResult,
  CoverLetterOptimizeResult,
  CareerTrajectoryResult
} from '../services/smartStudioService';
import { useAuth } from './AuthProvider';
import * as trackerRepo from '../services/repos/trackerRepo';
import { callFn } from '../services/api';
import type { AtsReport } from '../lib/ats';

interface SmartStudioProps {
  resumeData?: ResumeData | null;
}

const SMART_STUDIO_JOBS_KEY = 'smart-studio-jobs-v1';

// Map the deterministic AtsReport (from the metered ats-analyze function) into
// the match tab's ResumeMatchResult shape. Replaces the deleted AI JobScan mock.
function reportToMatch(report: AtsReport): ResumeMatchResult {
  const check = (kw: RegExp) => {
    const c = report.formatChecks.find((fc) => kw.test(fc.id) || kw.test(fc.label));
    return c ? { pass: c.status === 'pass', feedback: c.detail } : { pass: true, feedback: 'Looks good.' };
  };
  return {
    matchScore: Math.round(report.matchScore ?? report.atsScore),
    matchingKeywords: report.matchedKeywords.map((k) => k.term),
    missingKeywords: report.missingKeywords.map((k) => k.term),
    roleCompatibility: report.roleFit?.verdict ?? 'Add a job description to see role alignment.',
    improvedBullets: report.recommendations.slice(0, 5).map((r) => `${r.title}: ${r.detail}`),
    formattingAnalysis: {
      contactInfo: check(/contact/i),
      education: check(/education|degree/i),
      sectionNameComplexity: check(/section|header|heading/i),
      quantificationRate: check(/quantif|metric|number/i),
    },
  };
}

export const SmartStudio: React.FC<SmartStudioProps> = ({ resumeData }) => {
  // Navigation tabs of Smart Studio
  const [activeSubTab, setActiveSubTab] = useState<'match' | 'linkedin' | 'cover' | 'tracker' | 'trajectory'>('match');

  // State: Career Trajectory Analysis
  const [trajectoryResult, setTrajectoryResult] = useState<CareerTrajectoryResult | null>(null);
  const [isAnalyzingTrajectory, setIsAnalyzingTrajectory] = useState(false);

  // Load Saved Resume Text representation for analysis convenience
  const getCompiledResumeText = (): string => {
    if (!resumeData) return "";
    let txt = `NAME: ${resumeData.contact.firstName} ${resumeData.contact.lastName}\n`;
    txt += `TITLE: ${resumeData.contact.jobTitle}\n`;
    txt += `EMAIL: ${resumeData.contact.email} | PHONE: ${resumeData.contact.phone || ''}\n\n`;
    
    if (resumeData.summary.professionalSummary) {
      txt += `SUMMARY:\n${resumeData.summary.professionalSummary.replace(/<[^>]+>/g, '')}\n\n`;
    }
    
    if (resumeData.experience.length > 0) {
      txt += `PROFESSIONAL PATHWAY:\n`;
      resumeData.experience.forEach(exp => {
        txt += `- ${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${exp.endDate}):\n  ${exp.description.replace(/<[^>]+>/g, '')}\n`;
      });
      txt += `\n`;
    }

    if (resumeData.education.length > 0) {
      txt += `ACADEMIC FOUNDATIONS:\n`;
      resumeData.education.forEach(edu => {
        txt += `- ${edu.degree} from ${edu.school} (${edu.startDate} - ${edu.endDate})\n`;
      });
      txt += `\n`;
    }

    if (resumeData.skills.length > 0) {
      txt += `CAPABILITIES STACK:\n${resumeData.skills.join(', ')}\n\n`;
    }

    return txt;
  };

  // State: Resume & ATS Match Rate
  const [targetJobDescription, setTargetJobDescription] = useState<string>(
    "We are seeking an impact-driven Executive Operations Director / Business Innovation Lead. The ideal candidate will spearhead technical alignment, organize strategic workflows, track pipeline deliverables, map Agile/Scrum ceremonies, and implement modern KPI Dashboard Development architectures to double delivery velocity."
  );
  const [resumeText, setResumeText] = useState<string>("");
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<ResumeMatchResult | null>(null);

  // State: File Upload & Parsing
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsParsingFile(true);
    setFileError(null);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setResumeText(text);
          setIsParsingFile(false);
        };
        reader.onerror = () => {
          setFileError("Failed to read text file.");
          setIsParsingFile(false);
        };
        reader.readAsText(file);
      } else if (extension === 'docx') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const result = await mammoth.extractRawText({ arrayBuffer });
            if (result.value) {
              setResumeText(result.value);
            } else {
              setFileError("No text content found in DOCX file.");
            }
          } catch (err) {
            console.error("Mammoth DOCX parsing failed:", err);
            setFileError("Failed to parse Word document.");
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setFileError("Failed to load Word document.");
          setIsParsingFile(false);
        };
        reader.readAsArrayBuffer(file);
      } else if (extension === 'pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64 = window.btoa(binary);
            const extractedText = await parsePdfFileWithAi(base64);
            if (extractedText) {
              setResumeText(extractedText);
            } else {
              setFileError("No text content could be extracted from this PDF.");
            }
          } catch (err) {
            console.error("AI PDF parsing failed:", err);
            setFileError("AI PDF extraction failed. Ensure your connection and API key are configured.");
          } finally {
            setIsParsingFile(false);
          }
        };
        reader.onerror = () => {
          setFileError("Failed to read PDF file.");
          setIsParsingFile(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        setFileError("Unsupported file format. Please upload a PDF, DOCX, or TXT file.");
        setIsParsingFile(false);
      }
    } catch (err) {
      console.error("File upload error:", err);
      setFileError("An unexpected error occurred while parsing the file.");
      setIsParsingFile(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Set default resume text on load
  useEffect(() => {
    const defaultText = getCompiledResumeText();
    setResumeText(defaultText || `Candidate Profile:\n- 8+ years experience in Corporate Strategy & Tech Alignment\n- Background driving Agile ceremonies and Project Governance\n- Expert with KPI Dashboards, Budgeting, and Enterprise Architectures\n- Technical toolkit: Node.js, TypeScript, PostgreSQL, AWS Cloud Deployments\n- Highly skilled in cross-functional coordination, Lean workflows, and team training.`);
  }, [resumeData]);

  // State: LinkedIn Profile Optimizer
  const [linkedinHeadline, setLinkedinHeadline] = useState<string>("Operations Specialist | Technical Consultant | Seeking New Challenges");
  const [linkedinAbout, setLinkedinAbout] = useState<string>(
    "Professional with extensive experience coordinating team benchmarks, handling project lifecycles, and managing continuous output. Highly interested in process optimization."
  );
  const [linkedinTargetRole, setLinkedinTargetRole] = useState<string>("Lead Business Growth Partner / Technical Operations Manager");
  const [isOptimizingLinkedIn, setIsOptimizingLinkedIn] = useState(false);
  const [linkedinResult, setLinkedinResult] = useState<LinkedInOptimizeResult | null>(null);

  // State: Cover Letter Scanner
  const [coverLetterInput, setCoverLetterInput] = useState<string>(
    `Dear Hiring Manager,\n\nI am writing to express my eager interest in the open position. My skill in workflow organization and leadership aligns well with your team goals. I look forward to working with you.\n\nBest regards,\n[Your Name]`
  );
  const [coverLetterJobDesc, setCoverLetterJobDesc] = useState<string>(
    "Looking for a confident communicator who has directly managed corporate budget models, scaled cloud-native architectures, and can implement client-facing CRM tool integrations."
  );
  const [isAnalyzingCover, setIsAnalyzingCover] = useState(false);
  const [coverResult, setCoverResult] = useState<CoverLetterOptimizeResult | null>(null);

  // State: Fortune 50 Application Tracker
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobCompany, setNewJobCompany] = useState("");
  const [newJobUrl, setNewJobUrl] = useState("");
  const [newJobNotes, setNewJobNotes] = useState("");
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const { user } = useAuth();

  // Load the tracker: authenticated users from Postgres (with a one-time import
  // of any existing localStorage jobs); anonymous users from localStorage as before.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user) {
        try {
          const cloud = await trackerRepo.list(user.id);
          if (cancelled) return;
          if (cloud.length > 0) { setJobs(cloud); return; }
          const raw = localStorage.getItem(SMART_STUDIO_JOBS_KEY);
          if (raw) {
            const local: JobApplication[] = JSON.parse(raw);
            const imported = local.map((j) => ({ ...j, id: crypto.randomUUID() }));
            await Promise.all(imported.map((j) => trackerRepo.upsert(user.id, j)));
            if (!cancelled) setJobs(imported);
          } else if (!cancelled) {
            setJobs([]);
          }
        } catch (e) {
          console.error('Tracker cloud load failed', e);
        }
      } else {
        const rawJobs = localStorage.getItem(SMART_STUDIO_JOBS_KEY);
        if (rawJobs) {
          try { setJobs(JSON.parse(rawJobs)); } catch (e) { initializeDefaultJobs(); }
        } else {
          initializeDefaultJobs();
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist a full jobs array. Authenticated: reconcile Postgres (upsert all,
  // delete removed). Anonymous: localStorage as before.
  const saveJobs = (updatedJobs: JobApplication[]) => {
    const prev = jobs;
    setJobs(updatedJobs);
    if (user) {
      const nextIds = new Set(updatedJobs.map((j) => j.id));
      Promise.all([
        ...updatedJobs.map((j) => trackerRepo.upsert(user.id, j)),
        ...prev.filter((j) => !nextIds.has(j.id)).map((j) => trackerRepo.remove(user.id, j.id)),
      ]).catch((e) => console.error('Tracker cloud sync failed', e));
    } else {
      localStorage.setItem(SMART_STUDIO_JOBS_KEY, JSON.stringify(updatedJobs));
    }
  };

  const initializeDefaultJobs = () => {
    const defaults: JobApplication[] = [
      {
        id: '1',
        jobTitle: 'Senior Systems Coordinator',
        company: 'Stripe',
        status: 'applied',
        dateApplied: new Date().toISOString().split('T')[0],
        matchScore: 88,
        notes: 'Round 1 technical screening finished. Preparing presentation deck.'
      },
      {
        id: '2',
        jobTitle: 'Business Systems Specialist',
        company: 'Google Cloud Corp',
        status: 'interview',
        dateApplied: new Date(Date.now() - 3 * 24 * 3600000).toISOString().split('T')[0],
        matchScore: 74,
        notes: 'Followed up with lead HR contact.'
      },
      {
        id: '3',
        jobTitle: 'Solutions Architect',
        company: 'Salesforce',
        status: 'offer',
        dateApplied: new Date(Date.now() - 12 * 24 * 3600000).toISOString().split('T')[0],
        matchScore: 92,
        notes: 'Verbal offer approved! Waiting for documentation.'
      }
    ];
    saveJobs(defaults);
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobCompany.trim()) return;
    const item: JobApplication = {
      id: crypto.randomUUID(),
      jobTitle: newJobTitle,
      company: newJobCompany,
      jobUrl: newJobUrl,
      status: 'wishlist',
      dateApplied: new Date().toISOString().split('T')[0],
      notes: newJobNotes,
      matchScore: Math.floor(Math.random() * 20) + 60 // Default random match score of 60-80 till scan is performed
    };
    saveJobs([...jobs, item]);
    setNewJobTitle("");
    setNewJobCompany("");
    setNewJobUrl("");
    setNewJobNotes("");
    setShowAddJobModal(false);
  };

  const handleDeleteJob = (id: string) => {
    const filtered = jobs.filter(j => j.id !== id);
    saveJobs(filtered);
  };

  const handleUpdateJobStatus = (id: string, newStatus: JobStatus) => {
    const updated = jobs.map(j => j.id === id ? { ...j, status: newStatus } : j);
    saveJobs(updated);
  };

  // Run ATS Match Rate Scan
  const handleRunMatchScan = async () => {
    if (!targetJobDescription.trim()) return;
    setIsMatching(true);
    setMatchResult(null);
    try {
      // Setup payload parsing
      const payload: ResumeData = resumeData || {
        contact: { firstName: 'Professional', lastName: 'Candidate', jobTitle: 'Aspirator', phone: '', phoneCountryCode: '', email: 'expert@match.ceo', address: '', country: '', city: '', customCity: '', linkedin: '', website: '', photo: '' },
        summary: { professionalSummary: resumeText },
        experience: [],
        projects: [],
        education: [],
        skills: resumeText.match(/skills|expert|toolkit:\s*([^\n]+)/gi)?.[0]?.split(',') || []
      };
      
      // Real, deterministic match via the server (metered ats-analyze) — replaces
      // the deleted AI JobScan mock that returned identical canned data to everyone.
      const { report } = await callFn<{ report: AtsReport }>('ats-analyze', {
        resumeData: payload,
        jobDescription: targetJobDescription,
      });
      setMatchResult(reportToMatch(report));
    } catch (e) {
      console.error(e);
    } finally {
      setIsMatching(false);
    }
  };

  // Run LinkedIn Profile Audit
  const handleRunLinkedInAudit = async () => {
    setIsOptimizingLinkedIn(true);
    setLinkedinResult(null);
    try {
      const result = await optimizeLinkedInProfile({
        headline: linkedinHeadline,
        about: linkedinAbout,
        targetRole: linkedinTargetRole
      });
      setLinkedinResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizingLinkedIn(false);
    }
  };

  // Run Cover Letter Scrape/Tailor
  const handleRunCoverLetterAudit = async () => {
    if (!coverLetterInput.trim()) return;
    setIsAnalyzingCover(true);
    setCoverResult(null);
    try {
      const result = await optimizeCoverLetter(coverLetterInput, coverLetterJobDesc);
      setCoverResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingCover(false);
    }
  };

  // Run Career Trajectory analysis
  const handleRunTrajectoryAnalysis = async () => {
    setIsAnalyzingTrajectory(true);
    setTrajectoryResult(null);
    try {
      const payload: ResumeData = resumeData || {
        contact: { firstName: 'Professional', lastName: 'Candidate', jobTitle: 'Aspirator', phone: '', phoneCountryCode: '', email: 'expert@match.ceo', address: '', country: '', city: '', customCity: '', linkedin: '', website: '', photo: '' },
        summary: { professionalSummary: resumeText },
        experience: [],
        projects: [],
        education: [],
        skills: resumeText.match(/skills|expert|toolkit:\s*([^\n]+)/gi)?.[0]?.split(',') || []
      };
      
      const result = await analyzeCareerTrajectory(payload);
      setTrajectoryResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingTrajectory(false);
    }
  };

  // Copy to clipboard helper
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 p-8 shadow-sm backdrop-blur-md relative overflow-hidden text-slate-800">
      {/* Decorative branding elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[90px] pointer-events-none"></div>
      
      <header className="mb-8 border-b border-slate-200/70 pb-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-blue-600 bg-blue-50 p-2 rounded-xl">workspace_premium</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                SMART STUDIO
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[9px] text-white font-mono font-bold uppercase tracking-wider shadow-xs">Enterprise Workspace</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Tab Selection */}
        <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0 border border-slate-200/50 max-w-full">
          <button 
            onClick={() => setActiveSubTab('match')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeSubTab === 'match' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <span className="material-symbols-outlined text-sm">track_changes</span>
            ATS Match Scan
          </button>
          <button 
            onClick={() => setActiveSubTab('linkedin')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeSubTab === 'linkedin' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <span className="material-symbols-outlined text-sm">person_pin</span>
            LinkedIn Optimizer
          </button>
          <button 
            onClick={() => setActiveSubTab('cover')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeSubTab === 'cover' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <span className="material-symbols-outlined text-sm">rate_review</span>
            Cover Letter
          </button>
          <button 
            onClick={() => setActiveSubTab('tracker')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeSubTab === 'tracker' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <span className="material-symbols-outlined text-sm">dashboard_customize</span>
            Job Pipeline
          </button>
          <button 
            onClick={() => setActiveSubTab('trajectory')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeSubTab === 'trajectory' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <span className="material-symbols-outlined text-sm">trending_up</span>
            Career Trajectory [AI]
          </button>
        </div>
      </header>

      {/* SUBTAB CONTENT 1: RESUME MATCH RATE SCAN */}
      {activeSubTab === 'match' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Column */}
            <div className="space-y-4">
              <div 
                className={`bg-white p-6 rounded-2xl border transition-all duration-200 ${dragActive ? 'border-blue-500 bg-blue-50/10 scale-[1.01]' : 'border-slate-200'} shadow-sm space-y-4 relative`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-slate-900 border-l-4 border-blue-600 pl-3 text-sm uppercase font-mono tracking-widest text-[#1e293b]">Resume Blueprint</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {resumeData && (
                      <button 
                        onClick={() => setResumeText(getCompiledResumeText())}
                        className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sync with existing App Resume Profile"
                      >
                        <span className="material-symbols-outlined text-xs">sync</span>
                        Sync Profile
                      </button>
                    )}
                    
                    <button 
                      onClick={() => document.getElementById('file-uploader')?.click()}
                      className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                      disabled={isParsingFile}
                    >
                      <span className="material-symbols-outlined text-xs">upload_file</span>
                      Upload PDF/DOCX/TXT
                    </button>
                    
                    <input 
                      type="file" 
                      id="file-uploader" 
                      accept=".pdf,.docx,.txt" 
                      onChange={(e) => { 
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]); 
                        }
                      }} 
                      className="hidden" 
                    />
                  </div>
                </div>

                {isParsingFile && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2.5 text-xs text-blue-700 animate-pulse">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-700"></div>
                    <span>Extracting resume structure & content from document with AI...</span>
                  </div>
                )}

                {fileError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-700 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <span>{fileError}</span>
                    </div>
                    <button onClick={() => setFileError(null)} className="text-rose-500 hover:text-rose-700 font-bold px-1.5 rounded">✕</button>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 leading-relaxed -mt-2">
                  Paste the literal word representation of your career blueprint or modify details below:
                </p>

                <div className="relative">
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="w-full h-44 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none focus:border-blue-600 border-slate-300 resize-none"
                    placeholder="Paste resume accomplishments, or drag & drop a PDF, DOCX, TXT file..."
                  />
                  
                  {dragActive && (
                    <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] border-2 border-dashed border-blue-500 rounded-xl flex flex-col items-center justify-center pointer-events-none animate-pulse">
                      <span className="material-symbols-outlined text-3xl text-blue-600">cloud_upload</span>
                      <span className="text-xs font-extrabold text-blue-700 mt-1">Drop to import document instantly</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 border-l-4 border-blue-600 pl-3 text-sm uppercase font-mono tracking-widest text-[#1e293b]">Target Job Description</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">
                  Paste the corporate JD details issued by recruiters to compute precise keyword density audits:
                </p>
                <textarea
                  value={targetJobDescription}
                  onChange={(e) => setTargetJobDescription(e.target.value)}
                  className="w-full h-44 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none focus:border-blue-600 border-slate-300"
                  placeholder="Paste target job requirements..."
                />
              </div>

              <button
                disabled={isMatching || !resumeText.trim() || !targetJobDescription.trim()}
                onClick={handleRunMatchScan}
                className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 shadow-slate-950/20"
              >
                {isMatching ? (
                  <>
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-white"></div>
                    Executing Deep Keyword Matching Scans...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">analytics</span>
                    CALCULATE JOB MATCH RATE & AUDIT ATS
                  </>
                )}
              </button>
            </div>

            {/* Results Column */}
            <div className="h-full">
              {matchResult ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 h-full flex flex-col justify-between">
                  <div>
                    {/* Header Score Block */}
                    <div className="flex flex-col md:flex-row items-center gap-6 border-b border-slate-100 pb-5">
                      {/* Circle Gauge */}
                      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="44" 
                            stroke={matchResult.matchScore >= 80 ? '#22c55e' : matchResult.matchScore >= 60 ? '#f59e0b' : '#ef4444'} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={276}
                            strokeDashoffset={276 - (matchResult.matchScore / 100) * 276}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                          <span className="text-2xl font-black">{matchResult.matchScore}%</span>
                          <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400">ALIGNMENT</span>
                        </div>
                      </div>

                      {/* Score Summary Metrics */}
                      <div className="space-y-1">
                        <h4 className="text-lg font-extrabold text-slate-900">ATS Audit Summary</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          We mapped your qualifications against {matchResult.matchingKeywords.length + matchResult.missingKeywords.length} target indicators. 
                          {matchResult.matchScore >= 80 
                            ? ' This represents an exceptional match rate ready for rapid executive submission!' 
                            : ' We suggest modifying elements or injecting key missing credentials listed below.'}
                        </p>
                      </div>
                    </div>

                    {/* Role Compatibility Summary */}
                    <div className="space-y-2 py-4 border-b border-slate-100">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Executive Summary</span>
                      <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50/50 rounded-xl p-3 border border-slate-200/50">
                        {matchResult.roleCompatibility}
                      </p>
                    </div>

                    {/* Keywords Map */}
                    <div className="py-4 border-b border-slate-100 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">Audit Keywords Density Map</span>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Matched */}
                        <div className="space-y-1.5">
                          <h5 className="text-[10px] uppercase font-bold text-green-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Matched keywords ({matchResult.matchingKeywords.length})
                          </h5>
                          {matchResult.matchingKeywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {matchResult.matchingKeywords.map(k => (
                                <span key={k} className="text-[9.5px] font-medium bg-green-50 text-green-700 border border-green-200/60 px-2 py-0.5 rounded">
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">None matched yet.</p>
                          )}
                        </div>

                        {/* Missing */}
                        <div className="space-y-1.5">
                          <h5 className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">warning</span>
                            Missing keywords ({matchResult.missingKeywords.length})
                          </h5>
                          {matchResult.missingKeywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {matchResult.missingKeywords.map(k => (
                                <span key={k} className="text-[9.5px] font-medium bg-slate-50 text-slate-700 border border-amber-300/60 px-2 py-0.5 rounded shadow-sm">
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No missing requirements found!</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Improved STAR Bullet proposals */}
                    <div className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Suggested Achievements (inject keywords)</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">STAR METHODOLOGY</span>
                      </div>
                      <div className="space-y-2">
                        {matchResult.improvedBullets.map((bullet, idx) => (
                          <div key={idx} className="group relative bg-slate-50 hover:bg-slate-100/70 p-3 rounded-xl border border-slate-200 transition-all">
                            <p className="text-xs text-slate-700 leading-relaxed text-justify pr-6">
                              {bullet}
                            </p>
                            <button 
                              onClick={() => handleCopyToClipboard(bullet, `b-${idx}`)}
                              className="absolute top-2.5 right-2 opacity-50 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity p-0.5"
                              title="Copy bullet"
                            >
                              <span className="material-symbols-outlined text-sm">
                                {copyStatus === `b-${idx}` ? 'done' : 'content_copy'}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Formatting parameters checklist */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 mt-4 border border-white/5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold block">// FORTUNE 100 ATS PARSABILITY CHECK</span>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 sub-check">
                        <span className="text-slate-300 font-medium text-[11px]">Contact Parsing</span>
                        <span className={`text-[10px] font-bold ${matchResult.formattingAnalysis.contactInfo.pass ? 'text-green-400' : 'text-red-400'}`}>
                          {matchResult.formattingAnalysis.contactInfo.pass ? '✓ PASS' : '✗ REVISE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 sub-check">
                        <span className="text-slate-300 font-medium text-[11px]">Edu Standards</span>
                        <span className={`text-[10px] font-bold ${matchResult.formattingAnalysis.education.pass ? 'text-green-400' : 'text-red-400'}`}>
                          {matchResult.formattingAnalysis.education.pass ? '✓ PASS' : '✗ REVISE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-1 sub-check">
                        <span className="text-slate-300 font-medium text-[11px]">Section Headers</span>
                        <span className={`text-[10px] font-bold ${matchResult.formattingAnalysis.sectionNameComplexity.pass ? 'text-green-400' : 'text-red-400'}`}>
                          {matchResult.formattingAnalysis.sectionNameComplexity.pass ? '✓ PASS' : '✗ REVISE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/5 pb-1 sub-check">
                        <span className="text-slate-300 font-medium text-[11px]">Metrics Rate</span>
                        <span className={`text-[10px] font-bold ${matchResult.formattingAnalysis.quantificationRate.pass ? 'text-green-400' : 'text-amber-400'}`}>
                          {matchResult.formattingAnalysis.quantificationRate.pass ? '✓ PASS' : '⚠️ METRICS'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-tight text-right pt-1">
                      Note: Your current document is visually optimized for recruitment filters.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-white/40 rounded-3xl border border-slate-200 border-dashed flex flex-col justify-center items-center text-center p-12 text-slate-400 min-h-[400px]">
                  <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">verified_user</span>
                  <h4 className="font-bold text-slate-600 mb-1">ATS Optimization Diagnostics</h4>
                  <p className="max-w-xs text-xs text-slate-400 leading-relaxed">
                    Paste your target role requirements and click "Calculate Job Match" to run high-speed parses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 2: LINKEDIN OPTIMIZER */}
      {activeSubTab === 'linkedin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <h3 className="font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3 text-sm uppercase font-mono tracking-widest text-[#1e293b]">Profile Parameters</h3>
                
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Target Job Title / Career Objective</label>
                  <input
                    type="text"
                    value={linkedinTargetRole}
                    onChange={(e) => setLinkedinTargetRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-medium"
                    placeholder="e.g. Senior Principal Manager"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Current Headline</label>
                  <input
                    type="text"
                    value={linkedinHeadline}
                    onChange={(e) => setLinkedinHeadline(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-stone-700"
                    placeholder="e.g. Seeking job opportunities"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Current "About" Summary</label>
                  <textarea
                    value={linkedinAbout}
                    onChange={(e) => setLinkedinAbout(e.target.value)}
                    className="w-full h-36 p-3 bg-slate-50 rounded-xl border border-slate-200 font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-stone-700"
                    placeholder="Tell recruiters about your background..."
                  />
                </div>
              </div>

              <button
                disabled={isOptimizingLinkedIn || !linkedinTargetRole.trim()}
                onClick={handleRunLinkedInAudit}
                className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isOptimizingLinkedIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-white"></div>
                    Auditing Professional Personal Brand...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">person_pin</span>
                    AUDIT LINKEDIN OPTIMIZATION SCORE
                  </>
                )}
              </button>
            </div>

            {/* Results Column */}
            <div>
              {linkedinResult ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 h-full flex flex-col justify-between">
                  <div>
                    {/* Header Score Block */}
                    <div className="flex items-center gap-6 border-b border-slate-100 pb-5">
                      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="44" 
                            stroke={linkedinResult.linkedinScore >= 80 ? '#22c55e' : linkedinResult.linkedinScore >= 60 ? '#f59e0b' : '#ef4444'} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={276}
                            strokeDashoffset={276 - (linkedinResult.linkedinScore / 100) * 276}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                          <span className="text-xl font-black">{linkedinResult.linkedinScore}</span>
                          <span className="text-[8px] font-mono font-bold tracking-widest text-slate-400">INDEX</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-slate-900">LinkedIn Search Performance Audit</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          We mapped search indexing triggers for LinkedIn Recruiter queries. 
                          {linkedinResult.linkedinScore >= 80 
                            ? ' Direct keyword placement and structural indexing are set for peak search velocity!' 
                            : ' Recruiter outbound requests would increase exponentially by integrating the elements below.'}
                        </p>
                      </div>
                    </div>

                    {/* Headline Suggestions */}
                    <div className="py-4 border-b border-slate-100 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">Tailored Headline Proposals (Recruiter Inbounds)</span>
                      <div className="space-y-2">
                        {linkedinResult.headlineSuggestions.map((headline, idx) => (
                          <div key={idx} className="group relative bg-slate-50 hover:bg-indigo-50/40 p-3 rounded-xl border border-slate-200 transition-all">
                            <p className="text-xs text-slate-700 font-semibold leading-relaxed pr-6 select-all">
                              {headline}
                            </p>
                            <button 
                              onClick={() => handleCopyToClipboard(headline, `h-${idx}`)}
                              className="absolute top-2.5 right-2 opacity-50 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity p-0.5"
                              title="Copy headline"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {copyStatus === `h-${idx}` ? 'done' : 'content_copy'}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* About summary proposal */}
                    <div className="py-4 border-b border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Optimized first-person "About" copy</span>
                        <button 
                          onClick={() => handleCopyToClipboard(linkedinResult.aboutSuggestion, 'l-about')}
                          className="text-[9.5px] font-extrabold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {copyStatus === 'l-about' ? 'done' : 'content_copy'}
                          </span>
                          {copyStatus === 'l-about' ? 'Copied' : 'Copy About summary'}
                        </button>
                      </div>
                      <pre className="text-xs font-sans text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-200 text-justify">
                        {linkedinResult.aboutSuggestion}
                      </pre>
                    </div>

                    {/* Search Algorithm Insights */}
                    <div className="py-4 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">LinkedIn Recruiter Algorithm Insights</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/40 text-justify border border-amber-200 p-3 rounded-xl">
                        💡 {linkedinResult.searchVisibilityFeedback}
                      </p>
                    </div>
                  </div>

                  {/* LinkedIn layout recommendations */}
                  <div className="bg-slate-900 text-[#cbd5e1] rounded-2xl p-4 space-y-3 mt-4">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold block">// PROFILE LAYOUT IMPROVEMENTS</span>
                    <ul className="text-xs space-y-2 leading-relaxed">
                      {linkedinResult.experienceTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-white/40 rounded-3xl border border-slate-200 border-dashed flex flex-col justify-center items-center text-center p-12 text-slate-400 min-h-[400px]">
                  <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">person_add_disabled</span>
                  <h4 className="font-bold text-slate-600 mb-1">LinkedIn Personal Brand Audit</h4>
                  <p className="max-w-xs text-xs text-slate-400 leading-relaxed">
                    Set your target role and profile credentials, then click "Audit LinkedIn" to discover optimization indices.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 3: COVER LETTER OPTIMIZER */}
      {activeSubTab === 'cover' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                <h3 className="font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3 text-sm uppercase font-mono tracking-widest text-[#1e293b]">Cover Letter Draft</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed -mt-2">
                  Paste your actual cover letter draft to test compliance against employer performance hooks:
                </p>
                <textarea
                  value={coverLetterInput}
                  onChange={(e) => setCoverLetterInput(e.target.value)}
                  className="w-full h-44 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-700 leading-relaxed"
                  placeholder="Paste current Cover Letter..."
                />

                <h3 className="font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3 text-sm uppercase font-mono tracking-widest text-[#1e293b] mt-6">Target Job Role</h3>
                <textarea
                  value={coverLetterJobDesc}
                  onChange={(e) => setCoverLetterJobDesc(e.target.value)}
                  className="w-full h-44 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-700"
                  placeholder="Paste job description details..."
                />
              </div>

              <button
                disabled={isAnalyzingCover || !coverLetterInput.trim() || !coverLetterJobDesc.trim()}
                onClick={handleRunCoverLetterAudit}
                className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-sm tracking-wide shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {isAnalyzingCover ? (
                  <>
                    <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-white"></div>
                    Tailoring Narrative Framework...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">rate_review</span>
                    OPTIMIZE COVER LETTER FOR RECRUITERS
                  </>
                )}
              </button>
            </div>

            {/* Results Column */}
            <div>
              {coverResult ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 h-full flex flex-col justify-between">
                  <div>
                    {/* Header Score Block */}
                    <div className="flex items-center gap-6 border-b border-slate-100 pb-5">
                      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="44" 
                            stroke={coverResult.matchScore >= 80 ? '#22c55e' : coverResult.matchScore >= 60 ? '#f59e0b' : '#ef4444'} 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={276}
                            strokeDashoffset={276 - (coverResult.matchScore / 100) * 276}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                          <span className="text-xl font-black">{coverResult.matchScore}</span>
                          <span className="text-[8px] font-mono font-bold tracking-widest text-slate-400">RATING</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-slate-900">Cover Letter Tailoring Score</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          We mapped keyword density and narrative pacing for hiring team retention. 
                          {coverResult.matchScore >= 80 
                            ? ' Narrative hooks are aligned perfectly for immediate hiring partner scheduling.' 
                            : ' The cover letter is too generic. Improve narrative focus to demonstrate firm culture alignment.'}
                        </p>
                      </div>
                    </div>

                    {/* Critique Bullets */}
                    <div className="py-4 border-b border-slate-100 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block mb-1">Key Critique Metrics</span>
                      <ul className="text-xs space-y-1.5 font-medium leading-relaxed">
                        {coverResult.critique.map((crit, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-1 bg-red-50/50 border border-slate-200/50 rounded-lg">
                            <span className="material-symbols-outlined text-xs text-amber-500 mt-0.5">warning</span>
                            <span className="text-slate-600">{crit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Missing competence highlights */}
                    <div className="py-4 border-b border-slate-100 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">Important details to mention in cover letter</span>
                      <div className="flex flex-wrap gap-1">
                        {coverResult.missingCompetencies.map(comp => (
                          <span key={comp} className="text-[9.5px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 shadow-sm">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Tailored improved Cover Letter copy */}
                    <div className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Optimized ready to send document copy</span>
                        <button 
                          onClick={() => handleCopyToClipboard(coverResult.improvedCoverLetter, 'c-docx')}
                          className="text-[9.5px] font-extrabold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {copyStatus === 'c-docx' ? 'done' : 'content_copy'}
                          </span>
                          {copyStatus === 'c-docx' ? 'Copied' : 'Copy Cover Letter text'}
                        </button>
                      </div>
                      <pre className="text-xs font-sans text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/50 p-4 border border-slate-200 rounded-2xl text-justify max-h-96 overflow-y-auto">
                        {coverResult.improvedCoverLetter}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full bg-white/40 rounded-3xl border border-slate-200 border-dashed flex flex-col justify-center items-center text-center p-12 text-slate-400 min-h-[400px]">
                  <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">edit_note</span>
                  <h4 className="font-bold text-slate-600 mb-1">Cover Letter Tailoring Studio</h4>
                  <p className="max-w-xs text-xs text-slate-400 leading-relaxed">
                    Paste your current cover letter and target role to begin restructuring your professional narrative.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 4: PIPELINE WORKSPACE (Trello Replica) */}
      {activeSubTab === 'tracker' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base">FORTUNE 50 JOB PIPELINE</h3>
              <p className="text-slate-500 text-xs">Consolidate target applications and real-time match rates in custom pipelines.</p>
            </div>
            <button
              onClick={() => setShowAddJobModal(true)}
              className="px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-md shadow-slate-950/20"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Application Card
            </button>
          </div>

          {/* Kanban Board Container */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {/* Columns definitions */}
            {(['wishlist', 'applied', 'interview', 'offer', 'rejected'] as JobStatus[]).map(statusColumn => {
              const statusTitles: Record<JobStatus, { name: string; bg: string; text: string; dot: string }> = {
                wishlist: { name: 'Target Roles', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' },
                applied: { name: 'Applied', bg: 'bg-indigo-50/40', text: 'text-blue-700', dot: 'bg-blue-500' },
                interview: { name: 'Interviewing', bg: 'bg-amber-50/40', text: 'text-amber-700', dot: 'bg-amber-500' },
                offer: { name: 'Offer Approved', bg: 'bg-green-50/45', text: 'text-green-700', dot: 'bg-green-500' },
                rejected: { name: 'Archived / Rejected', bg: 'bg-rose-50/30', text: 'text-slate-400', dot: 'bg-rose-400' }
              };

              const columnJobs = jobs.filter(j => j.status === statusColumn);

              return (
                <div 
                  key={statusColumn} 
                  className={`rounded-2xl p-4 border border-slate-200 flex flex-col min-h-[440px] max-h-[640px] ${statusTitles[statusColumn].bg}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${statusTitles[statusColumn].dot}`}></div>
                      <span className="font-bold text-slate-800 text-xs tracking-wide uppercase font-mono">{statusTitles[statusColumn].name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/50 text-[10px] text-slate-600 font-bold font-mono">{columnJobs.length}</span>
                  </div>

                  {/* Column Body: Cards list */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {columnJobs.length > 0 ? (
                      columnJobs.map(job => (
                        <div 
                          key={job.id}
                          className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm relative group hover:border-slate-300 transition-all text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-extrabold text-[#111827] truncate pr-4 text-xs leading-tight" title={job.jobTitle}>
                                {job.jobTitle}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium tracking-snug mt-0.5">{job.company}</p>
                            </div>
                            {/* Match Score Indicator tag */}
                            <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-slate-200 shrink-0">
                              {job.matchScore || '60'}% Match
                            </span>
                          </div>

                          {job.notes && (
                            <p className="text-[10px] text-slate-500 leading-relaxed text-justify mt-3 bg-[#f8fafc] p-2 rounded-lg border border-slate-200/50">
                              {job.notes}
                            </p>
                          )}

                          {/* Quick Actions (Move columns) */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                            <span className="text-[8px] font-bold font-mono text-slate-400">SHIFT:</span>
                            <div className="flex items-center gap-1">
                              {statusColumn !== 'wishlist' && (
                                <button 
                                  onClick={() => {
                                    const statuses: JobStatus[] = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];
                                    const prevIdx = statuses.indexOf(statusColumn) - 1;
                                    handleUpdateJobStatus(job.id, statuses[prevIdx]);
                                  }}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-colors flex items-center justify-center shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[10px] font-bold">arrow_back</span>
                                </button>
                              )}
                              
                              <button 
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center font-bold"
                                title="Delete job"
                              >
                                <span className="material-symbols-outlined text-[10px]">delete</span>
                              </button>

                              {statusColumn !== 'rejected' && (
                                <button 
                                  onClick={() => {
                                    const statuses: JobStatus[] = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];
                                    const nextIdx = statuses.indexOf(statusColumn) + 1;
                                    handleUpdateJobStatus(job.id, statuses[nextIdx]);
                                  }}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-colors flex items-center justify-center shrink-0 font-bold"
                                >
                                  <span className="material-symbols-outlined text-[10px] font-bold">arrow_forward</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-28 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400">
                        No positions here.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 5: CAREER TRAJECTORY & INDUSTRY ALIGNMENT */}
      {activeSubTab === 'trajectory' && (
        <div className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-950 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 bg-blue-50 p-2 rounded-xl">explore</span>
                  AI Career Pathway Navigator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Analyze your career trajectory, skill set progression, and potential high-leverage job titles or industry shifts.
                </p>
              </div>
              <button
                disabled={isAnalyzingTrajectory}
                onClick={handleRunTrajectoryAnalysis}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isAnalyzingTrajectory ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Synthesizing Trajectory...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm font-bold">explore_nearby</span>
                    Begin Trajectory Analysis
                  </>
                )}
              </button>
            </div>

            {!trajectoryResult && !isAnalyzingTrajectory && (
              <div className="mt-8 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 animate-bounce">rocket_launch</span>
                <h4 className="text-sm font-bold text-slate-700 mt-2">Unlock Your Career Map</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  Our system evaluates titles, companies, credentials, and skills in your CV to generate optimal targets. Press the button to start.
                </p>
              </div>
            )}
          </div>

          {trajectoryResult && (
            <div className="space-y-6">
              {/* Top Banner Row: Seniority Level */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-blue-600 bg-white p-2.5 rounded-xl shadow-sm">military_tech</span>
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 block animate-pulse">Identified Cadre</span>
                    <h4 className="text-base font-extrabold text-slate-900 capitalize">{trajectoryResult.currentLevel}</h4>
                  </div>
                </div>
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono">
                  ATS INDEXED
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Best-Match Target Roles */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#1e293b] border-l-4 border-blue-600 pl-3">
                    Suggested Job Title Alignments
                  </h4>
                  <div className="space-y-4">
                    {trajectoryResult.suggestedTitles.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 hover:bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-extrabold text-slate-900 text-xs">
                              {item.title}
                            </h5>
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50/80 border border-blue-100 px-2.5 py-0.5 rounded-full mt-1 inline-block">
                              {item.industry}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            item.matchScore >= 80 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {item.matchScore}% Score
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed text-left mt-1">
                          {item.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Target Industries & Sectors */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#1e293b] border-l-4 border-indigo-600 pl-3">
                    Target Industries & Growth Vectors
                  </h4>
                  <div className="space-y-4">
                    {trajectoryResult.suggestedIndustries.map((industry, index) => (
                      <div key={index} className="p-4 bg-slate-50 hover:bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-2.5 transition-all">
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-[#111827] text-xs">
                            {industry.industryName}
                          </h5>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider block font-mono ${
                            industry.growthOutlook.toLowerCase().includes('high')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {industry.growthOutlook}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed text-left">
                          {industry.whyQualifies}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Skill Mastery Compass: Leverage vs Acquire */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#1e293b] border-l-4 border-violet-600 pl-3">
                  Skill Strategy Matrix (Leverage & Acquire)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Leverage Block */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] uppercase font-bold text-green-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs font-bold">verified</span>
                      High-Leverage Existing Strengths
                    </h5>
                    <div className="space-y-2.5">
                      {trajectoryResult.skillGapsAndLeverages.filter(s => s.type === 'leverage').map((skill, si) => (
                        <div key={si} className="p-3 bg-green-50/40 border border-green-100 rounded-xl text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-green-800">{skill.skillName}</span>
                            <span className="text-[8px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded uppercase font-bold font-mono">
                              {skill.importance}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{skill.description}</p>
                        </div>
                      ))}
                      {trajectoryResult.skillGapsAndLeverages.filter(s => s.type === 'leverage').length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">No leverage areas specified.</p>
                      )}
                    </div>
                  </div>

                  {/* Acquire Block */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs font-bold">add_circle</span>
                      Target Gaps to Acquire / Develop
                    </h5>
                    <div className="space-y-2.5">
                      {trajectoryResult.skillGapsAndLeverages.filter(s => s.type === 'acquire').map((skill, si) => (
                        <div key={si} className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-amber-800">{skill.skillName}</span>
                            <span className="text-[8px] bg-amber-100/75 text-amber-800 px-1.5 py-0.5 rounded uppercase font-bold font-mono">
                              {skill.importance}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{skill.description}</p>
                        </div>
                      ))}
                      {trajectoryResult.skillGapsAndLeverages.filter(s => s.type === 'acquire').length === 0 && (
                        <p className="text-[10px] text-slate-400 italic">No training needs compiled.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Strategic Transition Steps */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#1e293b] border-l-4 border-indigo-600 pl-3">
                  Strategic Career Transition Plan
                </h4>
                <div className="relative border-l-2 border-indigo-100 pl-6 ml-3 space-y-6">
                  {trajectoryResult.strategicTrajectoryPlan.map((step, sIdx) => (
                    <div key={sIdx} className="relative text-xs">
                      {/* Circle indicator */}
                      <span className="absolute -left-[31px] top-0 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center font-bold text-[9px] text-indigo-600">
                        {sIdx + 1}
                      </span>
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#475569]">
                          STAGE {sIdx + 1} DIRECTIVE
                        </span>
                        <p className="text-slate-600 leading-relaxed text-left pr-2">
                          {step}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for Creating New Tracker Position */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAddJobModal(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="font-extrabold text-slate-900 uppercase font-mono tracking-widest text-xs flex items-center gap-1.5 p-0.5">
                <span className="material-symbols-outlined text-blue-600">playlist_add</span>
                New Application Card
              </h3>
              <button onClick={() => setShowAddJobModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Job Title *</label>
                <input
                  type="text"
                  required
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-semibold"
                  placeholder="e.g. Director, Corporate Systems Integration"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newJobCompany}
                  onChange={(e) => setNewJobCompany(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-semibold"
                  placeholder="e.g. JPMorgan Chase"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Link / URL</label>
                <input
                  type="url"
                  value={newJobUrl}
                  onChange={(e) => setNewJobUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-semibold"
                  placeholder="e.g. https://careers.company.com/..."
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Tracker Activity Logs / Notes</label>
                <textarea
                  value={newJobNotes}
                  onChange={(e) => setNewJobNotes(e.target.value)}
                  className="w-full h-24 p-3 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 leading-relaxed font-semibold"
                  placeholder="Include status check summaries, contact logs, or date schedules..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 rounded-xl text-white font-mono font-bold tracking-widest text-xs uppercase cursor-pointer hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                <span className="material-symbols-outlined text-sm">done</span>
                Deploy to Target list
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
