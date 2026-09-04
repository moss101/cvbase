import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AVAILABLE_TEMPLATES } from '../../constants';
import { LazyTemplatePreview } from '../templates/TemplatePreviewRegistry';
import type { ResumeData, SectionId, TemplateId } from '../../types';
import { useAuth } from '../AuthProvider';
import { useSubscription } from '../SubscriptionProvider';
import type { FnError } from '../../services/api';
import { canCreateResume } from '../../services/subscriptionService';
import { arrayBufferToBase64, parsePdfFileWithAi } from '../../services/smartStudioService';
import { parseFromResumeData } from '../../lib/ats';
import { extractTextFromFile, SUPPORTED_EXTENSIONS } from '../../services/resumeParser';
import * as resumeRepo from '../../services/repos/resumeRepo';
import * as prismRepo from '../../services/repos/prismRepo';
import {
  analyzeGaps, finalizeRun, generateResume,
  type PrismAnswer, type PrismGenerateResult, type PrismQuestion, type PrismStageUpdate,
} from '../../services/prismService';
import { Sparkles, Briefcase, FileText, LayoutDashboard, Check, Flag, CircleCheck } from 'lucide-react';
import { useTranslation, type Translate } from '../../services/translationService';

// PRISM — the agentic resume-tailoring wizard. Flow: JD + template + CV →
// phase 1 (gap analysis → dynamic questionnaire, skipped entirely on zero
// gaps) → answers → phase 2 (aggregate → write ⇄ ATS critique → parse) →
// UNSKIPPABLE review (per-line "not mine" flags) → approve → saved resume →
// builder. Every tailoring is a server-side checkpointed run: abandoned or
// crashed runs resume from the banner instead of restarting. The status feed
// renders ONLY the fixed stage labels streamed by the pipeline.

type Step = 'input' | 'analyzing' | 'questions' | 'generating' | 'review';

interface PrismWizardProps {
  onEditResume?: (resumeId: string) => void;
  onUpgrade?: () => void;
}

interface StageItem extends PrismStageUpdate {
  done: boolean;
}

/** Sections the builder should show for a freshly generated resume. */
function visibleSectionsFor(d: ResumeData): SectionId[] {
  const sections: SectionId[] = ['contact', 'summary', 'experience', 'education', 'skills'];
  if (d.projects.length) sections.push('projects');
  if (d.certifications.length) sections.push('certifications');
  if (d.languages.length) sections.push('languages');
  return sections;
}

/** Reviewable lines of the generated resume (summary, bullets, skills). */
function reviewLines(resume: ResumeData, t: Translate): { key: string; section: string; text: string }[] {
  const lines: { key: string; section: string; text: string }[] = [
    { key: 'summary', section: t('summary.title', 'Summary'), text: resume.summary.professionalSummary },
  ];
  resume.experience.forEach((exp, i) => {
    const bullets = exp.description.match(/<p>(.*?)<\/p>/g) ?? [];
    bullets.forEach((b, j) => {
      lines.push({
        key: `exp-${i}-${j}`,
        section: `${exp.jobTitle} — ${exp.company}`,
        text: b.replace(/<\/?p>/g, '').replace(/^•\s*/, ''),
      });
    });
  });
  if (resume.skills.length) {
    lines.push({ key: 'skills', section: t('skills.title', 'Skills'), text: resume.skills.join(', ') });
  }
  return lines;
}

const MIN_TEXT = 80;

const buildErrorMessages = (t: Translate): Record<string, string> => ({
  bad_ai_output: t('prism.err.badAiOutput', 'The AI returned an unusable result. Please try again.'),
  feature_disabled: t('prism.err.featureDisabled', "PRISM isn't available on your account yet."),
  rate_limited: t('prism.err.rateLimited', 'You have reached the hourly limit for PRISM runs. Please try again later.'),
  run_in_progress: t('prism.err.runInProgress', 'Another PRISM run is still working — give it a moment, then continue it from the banner.'),
  cost_cap_exceeded: t('prism.err.costCapExceeded', 'This run hit its processing budget. Try again with a shorter job description or CV.'),
  run_expired: t('prism.err.runExpired', 'That run expired, so its data was removed. Please start again.'),
  model_refused: t('prism.err.modelRefused', 'The AI could not process this content. Please review your inputs and try again.'),
});

const PrismWizard: React.FC<PrismWizardProps> = ({ onEditResume, onUpgrade }) => {
  const { t } = useTranslation();
  const ERROR_MESSAGES = useMemo(() => buildErrorMessages(t), [t]);
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [step, setStep] = useState<Step>('input');

  // Inputs
  const [jdText, setJdText] = useState('');
  const [cvText, setCvText] = useState('');
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>('classic');
  const [templateCategory, setTemplateCategory] = useState('All');
  const [parsing, setParsing] = useState<'jd' | 'cv' | null>(null);

  // Pipeline state
  const [runId, setRunId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageItem[]>([]);
  const [questions, setQuestions] = useState<PrismQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PrismGenerateResult | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [resumable, setResumable] = useState<prismRepo.PrismRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  const jdFileInput = useRef<HTMLInputElement>(null);
  const cvFileInput = useRef<HTMLInputElement>(null);

  // Abandoned-run recovery: offer to continue the latest resumable run.
  // Keyed on the user id, not the user object — the auth context may hand
  // out a fresh object per render and this must not refetch on every one.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    prismRepo.getResumable(userId)
      .then((run) => { if (!cancelled) setResumable(run); })
      .catch(() => { /* banner is best-effort */ });
    return () => { cancelled = true; };
  }, [userId]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(AVAILABLE_TEMPLATES.map((t) => t.category)))],
    [],
  );
  const shownTemplates = useMemo(
    () => (templateCategory === 'All'
      ? AVAILABLE_TEMPLATES
      : AVAILABLE_TEMPLATES.filter((t) => t.category === templateCategory)),
    [templateCategory],
  );

  const onStage = (u: PrismStageUpdate) =>
    setStages((prev) => [...prev.map((s) => ({ ...s, done: true })), { ...u, done: false }]);

  const failWith = (e: unknown) => {
    const code = (e as FnError)?.code ?? '';
    if (code === 'limit_reached' || code === 'feature_locked') {
      setLimitHit(true);
      setError(t('prism.err.usedAllActions', 'You have used all AI actions on your current plan.'));
    } else {
      setError(ERROR_MESSAGES[code] ?? t('prism.err.somethingWentWrong', 'Something went wrong while tailoring your resume. Please try again.'));
    }
  };

  /** A previous run's questions/result must never leak into the next one (the
   *  generate-failure path falls back to the questions step based on this state). */
  const resetPipelineState = () => {
    setStages([]);
    setRunId(null);
    setQuestions([]);
    setAnswers({});
    setResult(null);
  };

  async function readFile(file: File, target: 'jd' | 'cv') {
    setError(null);
    setParsing(target);
    try {
      const { text, imageOnly } = await extractTextFromFile(file);
      let finalText = text;
      if (imageOnly) {
        // Image-only PDF: server-side extraction (same fallback SmartStudio uses).
        finalText = await parsePdfFileWithAi(arrayBufferToBase64(await file.arrayBuffer()));
        if (finalText.replace(/\s/g, '').length < MIN_TEXT) {
          setError(t('prism.err.noTextInPdf', 'We couldn\'t read any text from "{name}" — the PDF appears to contain only images. Try exporting it as a text PDF or paste the text instead.').replace('{name}', file.name));
          return;
        }
      }
      if (finalText.replace(/\s/g, '').length < MIN_TEXT) {
        setError(t('prism.err.almostNoText', '"{name}" contains almost no text. Please upload a complete {kind} or paste the text instead.').replace('{name}', file.name).replace('{kind}', target === 'jd' ? t('prism.jobDescriptionLower', 'job description') : t('prism.cvLower', 'CV')));
        return;
      }
      if (target === 'jd') setJdText(finalText.trim());
      else {
        setCvText(finalText.trim());
        setCvFileName(file.name);
      }
    } catch (e) {
      // extractTextFromFile throws a specific unsupported-type message.
      const msg = e instanceof Error && e.message.startsWith('Unsupported file type')
        ? e.message
        : null;
      if (msg) setError(msg);
      else failWith(e);
    } finally {
      setParsing(null);
    }
  }

  async function usePrimaryResume() {
    if (!user) return;
    setError(null);
    setParsing('cv');
    try {
      const primary = await resumeRepo.getPrimary(user.id);
      if (!primary) {
        setError(t('prism.err.noSavedResume', 'No saved resume found — upload your CV instead.'));
        return;
      }
      // Same ResumeData→text flattening the ATS analyzer uses.
      setCvText(parseFromResumeData(primary.data as ResumeData).rawText);
      setCvFileName(t('prism.mySavedResume', 'My saved resume'));
    } catch {
      setError(t('prism.err.couldNotLoadResume', 'Could not load your saved resume. Upload your CV instead.'));
    } finally {
      setParsing(null);
    }
  }

  async function startAnalyze() {
    if (!user) return;
    setError(null);
    // Same resume-count plan gate as ResumeManager: the wizard ends in a
    // resumeRepo.create, so block before any quota is spent.
    try {
      const count = await resumeRepo.count(user.id);
      if (!canCreateResume(count, plan.limits.resumes)) {
        setLimitHit(true);
        setError(t('prism.err.resumeLimitReached', 'You have reached the resume limit on your current plan.'));
        return;
      }
    } catch { /* count unavailable — let the attempt proceed */ }
    resetPipelineState();
    setStep('analyzing');
    try {
      const out = await analyzeGaps({ jdText, cvText, templateId }, onStage);
      setRunId(out.runId);
      setResumable(null);
      if (out.questions.length === 0) {
        // Zero gaps: nothing worth asking — skip the wizard entirely.
        await runGenerate(out.runId, []);
        return;
      }
      setQuestions(out.questions);
      setAnswers({});
      setStep('questions');
    } catch (e) {
      failWith(e);
      setStep('input');
    }
  }

  async function runGenerate(run: string, finalAnswers: PrismAnswer[]) {
    setError(null);
    setStages([]);
    setStep('generating');
    try {
      const out = await generateResume({ runId: run, answers: finalAnswers }, onStage);
      setResult(out);
      setFlagged(new Set());
      setStages((prev) => prev.map((s) => ({ ...s, done: true })));
      setStep('review');
    } catch (e) {
      failWith(e);
      if ((e as FnError)?.code === 'run_expired') {
        // The server can never resume this run (pruned or analyze never
        // finished) — remove it, or the "continue" banner would re-offer a
        // dead run on every visit. RLS delete-own covers this client-side.
        // One retry: a transient failure here would leave the dead run in
        // place, silently reproducing the same re-offered-run loop.
        if (user) {
          await prismRepo.deleteRun(user.id, run)
            .catch(() => prismRepo.deleteRun(user.id, run))
            .catch(() => { /* best-effort */ });
        }
        resetPipelineState();
        setStep('input');
        return;
      }
      setStep(questions.length ? 'questions' : 'input');
    }
  }

  function startGenerate() {
    if (!runId) return;
    const finalAnswers: PrismAnswer[] = questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: (answers[q.id] ?? '').trim() || 'No experience with this.',
    }));
    void runGenerate(runId, finalAnswers);
  }

  /** Continue an abandoned/failed run from its last checkpointed stage. */
  function continueRun(run: prismRepo.PrismRunSummary) {
    setRunId(run.id);
    setResumable(null);
    setTemplateId((run.templateId || 'classic') as TemplateId);
    if (run.status === 'review' && run.result) {
      setResult({ runId: run.id, ...run.result });
      setFlagged(new Set());
      setStep('review');
    } else if (run.status === 'awaiting_answers') {
      setQuestions(run.questions);
      setAnswers(Object.fromEntries(run.answers.map((a) => [a.questionId, a.answer])));
      setStep('questions');
    } else {
      // failed mid-generate: re-run — the server resumes from the checkpoint.
      setQuestions(run.questions);
      void runGenerate(run.id, run.answers.length
        ? run.answers
        : run.questions.map((q) => ({ questionId: q.id, question: q.question, answer: 'No experience with this.' })));
    }
  }

  async function toggleFlag(line: { key: string; section: string; text: string }) {
    if (!user || flagged.has(line.key)) return;
    setFlagged((prev) => new Set(prev).add(line.key));
    try {
      await prismRepo.flagLine(user.id, runId, line.section, line.text);
    } catch { /* flag is a telemetry signal — never block the user on it */ }
  }

  /** The ONLY path that persists the resume: explicit user approval. */
  async function approveAndSave() {
    if (!user || !result || !runId) return;
    setApproving(true);
    setError(null);
    try {
      const created = await resumeRepo.create(user.id, {
        title: `${result.resume.contact.jobTitle || t('prism.tailoredResume', 'Tailored resume')} — PRISM`,
        data: result.resume,
        templateId,
        visibleSections: visibleSectionsFor(result.resume),
      });
      if (created.id) {
        const resumeId = created.id;
        // One retry: an unfinalized run re-offers an ALREADY-SAVED resume from
        // the continue banner (approving again would duplicate it), so a
        // transient finalize failure is worth a second attempt before giving
        // up. Still best-effort — the saved resume must open regardless.
        await finalizeRun(runId, resumeId)
          .catch(() => finalizeRun(runId, resumeId))
          .catch(() => {
            // Both attempts failed: the resume above is already safely saved,
            // so this run row no longer serves a purpose — but leaving it at
            // status 'review' would let the "continue" banner re-offer it and
            // approve a duplicate resume. Delete it instead of leaving it stuck.
            void prismRepo.deleteRun(user.id, runId).catch(() => { /* best-effort */ });
          });
        onEditResume?.(resumeId);
      }
    } catch (e) {
      failWith(e);
    } finally {
      setApproving(false);
    }
  }

  async function deleteMyData() {
    if (!user) return;
    try {
      await prismRepo.deleteAllRuns(user.id);
      setResumable(null);
      setError(null);
    } catch {
      setError(t('prism.err.couldNotDeleteData', 'Could not delete your PRISM data. Please try again.'));
    }
  }

  const inputsReady = jdText.trim().length >= MIN_TEXT && cvText.trim().length >= MIN_TEXT;
  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim()).length;

  if (!user) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center max-w-xl mx-auto">
        <Sparkles className="w-10 h-10 text-primary mb-3" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('prism.title', 'PRISM Resume Tailor')}</h2>
        <p className="text-gray-500">{t('prism.signInDesc', 'Sign in to tailor your resume to a job description with AI.')}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <header className="mb-8">
        <p className="dashboard-eyebrow mb-3">{t('prism.eyebrow', 'Role-specific tailoring')}</p>
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" aria-hidden="true" />
          {t('prism.title', 'PRISM Resume Tailor')}
        </h1>
        <p className="text-gray-500">
          {t('prism.headerDesc', 'Paste a job description, answer a few questions, and get an ATS-optimized resume in your chosen template.')}
        </p>
      </header>

      {resumable && step === 'input' && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-700">
            <span className="font-bold">{t('prism.unfinishedRun', 'You have an unfinished tailoring run.')}</span>{' '}
            {resumable.status === 'review'
              ? t('prism.readyToReview', 'Your resume is ready to review.')
              : resumable.status === 'failed'
              ? t('prism.stoppedPartway', 'It stopped partway — you can pick up where it left off.')
              : t('prism.questionsWaiting', 'Your questions are waiting for answers.')}
          </p>
          <button
            onClick={() => continueRun(resumable)}
            className="shrink-0 px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition"
          >
            {t('prism.continue', 'Continue')}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          {limitHit && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="shrink-0 px-4 py-2 rounded-xl bg-dark text-white text-xs font-bold hover:opacity-90 transition"
            >
              {t('dash.upgrade', 'Upgrade')}
            </button>
          )}
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job description */}
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Briefcase className="w-[1em] h-[1em] text-primary" aria-hidden="true" />
                  {t('prism.jobDescription', 'Job description')}
                </h2>
                <button
                  onClick={() => jdFileInput.current?.click()}
                  disabled={parsing !== null}
                  className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                >
                  {parsing === 'jd' ? t('prism.reading', 'Reading…') : t('prism.uploadPdfDocx', 'Upload PDF/DOCX')}
                </button>
                <input
                  ref={jdFileInput} type="file" className="hidden" accept={SUPPORTED_EXTENSIONS.join(',')}
                  onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], 'jd')}
                />
              </div>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder={t('prism.pasteJdPlaceholder', 'Paste the full job description here…')}
                className="w-full h-52 rounded-2xl border border-gray-200 bg-white/70 p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            {/* CV */}
            <div className="glass-card rounded-3xl p-6">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <FileText className="w-[1em] h-[1em] text-primary" aria-hidden="true" />
                {t('prism.yourCv', 'Your CV')}
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  onClick={() => cvFileInput.current?.click()}
                  disabled={parsing !== null}
                  className="tap-target flex-1 rounded-2xl border-2 border-dashed border-gray-300 py-6 text-sm font-semibold text-gray-600 hover:border-primary hover:text-primary transition disabled:opacity-50"
                >
                  {parsing === 'cv' ? t('prism.reading', 'Reading…') : cvFileName ?? t('prism.uploadTypes', 'Upload ({types})').replace('{types}', SUPPORTED_EXTENSIONS.join(', '))}
                </button>
                <input
                  ref={cvFileInput} type="file" className="hidden" accept={SUPPORTED_EXTENSIONS.join(',')}
                  onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], 'cv')}
                />
                <button
                  onClick={usePrimaryResume}
                  disabled={parsing !== null}
                  className="tap-target flex items-center justify-center rounded-2xl bg-white/60 border border-gray-200 px-4 text-xs font-bold text-gray-600 hover:bg-white transition disabled:opacity-50"
                >
                  {t('prism.useMySavedResume', 'Use my saved resume')}
                </button>
              </div>
              <textarea
                value={cvText}
                onChange={(e) => { setCvText(e.target.value); setCvFileName(null); }}
                placeholder={t('prism.pasteCvPlaceholder', '…or paste your CV text here.')}
                className="w-full h-28 rounded-2xl border border-gray-200 bg-white/70 p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
          </div>

          {/* Template picker */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <LayoutDashboard className="w-[1em] h-[1em] text-primary" aria-hidden="true" />
              {t('prism.chooseTemplate', 'Choose a template')}
            </h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    templateCategory === cat
                      ? 'bg-dark text-white shadow'
                      : 'bg-white/50 text-gray-600 border border-white/40 hover:bg-white'
                  }`}
                >
                  {cat === 'All' ? t('dash.allCategory', 'All') : cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[26rem] overflow-y-auto pr-1">
              {shownTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`group rounded-2xl border overflow-hidden text-left transition ${
                    templateId === t.id
                      ? 'border-primary ring-2 ring-primary/40 shadow-lg'
                      : 'border-gray-200 bg-white/60 hover:border-gray-300'
                  }`}
                >
                  <div className="h-44 relative">
                    <LazyTemplatePreview templateId={t.id} scale={0.16} />
                    {templateId === t.id && (
                      <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow">
                        <Check className="w-[1em] h-[1em] text-sm leading-none" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 bg-white/80 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-800 truncate">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={deleteMyData}
              className="text-xs text-gray-400 hover:text-red-500 underline transition text-center sm:text-left"
              title={t('prism.deleteDataTitle', 'Removes all PRISM pipeline runs: uploaded text, checkpoints, drafts and results.')}
            >
              {t('prism.deleteMyData', 'Delete my PRISM data')}
            </button>
            <button
              onClick={startAnalyze}
              disabled={!inputsReady || parsing !== null}
              className="tap-target w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              {t('prism.tailorMyResume', 'Tailor my resume')}
            </button>
          </div>
          {!inputsReady && (
            <p className="text-right text-xs text-gray-400 -mt-4">
              {t('prism.addJdAndCv', 'Add a job description and your CV (at least a few sentences each) to start.')}
            </p>
          )}
        </div>
      )}

      {(step === 'analyzing' || step === 'generating') && (
        <StageFeed stages={stages} />
      )}

      {step === 'questions' && (
        <div className="glass-card rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">{t('prism.quickQuestions', 'A few quick questions')}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {t('prism.questionsDesc', "Your answers fill the gaps between your CV and this job — one or two sentences each is plenty. Leave blank anything that doesn't apply.")}
          </p>
          <div className="space-y-5">
            {questions.map((q, i) => (
              <div key={q.id}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="text-primary font-bold mr-2">{i + 1}.</span>
                  {q.question}
                </label>
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={2}
                  className="w-full rounded-2xl border border-gray-200 bg-white/70 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">{t('prism.answeredCount', '{answered}/{total} answered').replace('{answered}', String(answeredCount)).replace('{total}', String(questions.length))}</p>
            <button
              onClick={startGenerate}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition"
            >
              {t('prism.generateMyResume', 'Generate my resume')}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && result && (
        <div className="glass-card rounded-3xl p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{t('prism.reviewTitle', 'Review your tailored resume')}</h2>
          <p className="text-sm text-gray-500 mb-2">
            {t('prism.atsAlignmentScore', 'ATS alignment score:')} <span className="font-bold text-gray-800">{result.atsScore}/100</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {t('prism.reviewDescPart1', 'This resume goes out under')} <span className="font-semibold">{t('prism.your', 'your')}</span> {t('prism.reviewDescPart2', 'name — read every line. Use')} <Flag className="w-[1em] h-[1em] text-sm align-middle inline" aria-hidden="true" /> {t('prism.reviewDescPart3', "to report anything that wasn't in your CV or answers; you can edit every line in the editor after approving.")}
          </p>

          {result.unresolvedIssues.length > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">{t('prism.atsLeftIssues', 'The ATS check left these for you to resolve by hand:')}</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
                {result.unresolvedIssues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            </div>
          )}

          <ul className="space-y-2 mb-8 max-h-96 overflow-y-auto pr-1">
            {reviewLines(result.resume, t).map((line) => (
              <li key={line.key} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/70 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{line.section}</p>
                  <p className="text-sm text-gray-700">{line.text}</p>
                </div>
                <button
                  onClick={() => toggleFlag(line)}
                  disabled={flagged.has(line.key)}
                  title={flagged.has(line.key) ? t('prism.reportedThankYou', 'Reported — thank you') : t('prism.reportNotMine', "Report: this wasn't in my CV and I didn't say this")}
                  className={`shrink-0 mt-1 flex items-center gap-1 text-xs font-bold rounded-lg px-2 py-1 transition ${
                    flagged.has(line.key)
                      ? 'text-amber-600 bg-amber-50 cursor-default'
                      : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <Flag className="w-[1em] h-[1em] text-sm leading-none" aria-hidden="true" />
                  {flagged.has(line.key) ? t('prism.reported', 'Reported') : t('prism.notMine', 'Not mine')}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400 max-w-xs">
              {t('prism.nothingSavedUntilApprove', 'Nothing is saved or exportable until you approve. Approving opens the editor where every line stays editable.')}
            </p>
            <button
              onClick={approveAndSave}
              disabled={approving}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition disabled:opacity-50"
            >
              {approving ? t('prism.savingEllipsis', 'Saving…') : t('prism.reviewedSaveEdit', 'I reviewed it — save & edit')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Live agent-status feed: one line per pipeline stage, spinner on the active
 *  one. Renders only the fixed labels streamed by the server. */
const StageFeed: React.FC<{ stages: StageItem[] }> = ({ stages }) => {
  const { t } = useTranslation();
  return (
  <div className="glass-card rounded-3xl p-8 max-w-2xl mx-auto">
    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
      <Sparkles className="w-[1em] h-[1em] text-primary animate-pulse" aria-hidden="true" />
      {t('prism.working', 'PRISM is working…')}
    </h2>
    <ol className="space-y-4">
      {stages.map((s, i) => (
        <li key={`${s.stage}-${i}`} className="flex items-center gap-3">
          {s.done ? (
            <CircleCheck className="w-[1em] h-[1em] text-emerald-500 text-xl" aria-hidden="true" />
          ) : (
            <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          )}
          <span className={`text-sm ${s.done ? 'text-gray-400' : 'text-gray-800 font-semibold'}`}>
            {s.label}
          </span>
        </li>
      ))}
      {stages.length === 0 && (
        <li className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
          <span className="text-sm text-gray-800 font-semibold">{t('prism.startingAgents', 'Starting the agents…')}</span>
        </li>
      )}
    </ol>
  </div>
  );
};

export default PrismWizard;
