// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PrismStageUpdate } from '../../../services/prismService';

vi.mock('../../AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('../../SubscriptionProvider', () => ({
  useSubscription: () => ({ plan: { limits: { resumes: -1 } } }),
}));
vi.mock('../../../services/prismService', () => ({
  analyzeGaps: vi.fn(),
  generateResume: vi.fn(),
  finalizeRun: vi.fn(),
  CHECKPOINT_DEGRADED_STAGE: 'checkpoint_degraded',
}));
vi.mock('../../../services/repos/resumeRepo', () => ({
  create: vi.fn(),
  get: vi.fn(),
  getPrimary: vi.fn(),
  count: vi.fn(),
}));
vi.mock('../../../services/repos/prismRepo', () => ({
  getResumable: vi.fn(),
  getResumableForApplication: vi.fn(),
  deleteAllRuns: vi.fn(),
  deleteRun: vi.fn(),
  flagLine: vi.fn(),
  isPrismEnabled: vi.fn(),
}));
vi.mock('../../../services/api', () => ({
  callFn: vi.fn(),
}));
vi.mock('../../../services/translationService', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    language: 'en',
    setLanguage: () => {},
  }),
}));

import { analyzeGaps, finalizeRun, generateResume } from '../../../services/prismService';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as prismRepo from '../../../services/repos/prismRepo';
import PrismWizard from '../PrismWizard';

// jsdom has no IntersectionObserver; the template thumbnails use it for lazy
// mounting. A no-op stub keeps every card on its lightweight placeholder.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = IntersectionObserverStub;

const mockAnalyze = vi.mocked(analyzeGaps);
const mockGenerate = vi.mocked(generateResume);
const mockFinalize = vi.mocked(finalizeRun);
const mockCreate = vi.mocked(resumeRepo.create);

const QUESTIONS = [
  { id: 'q1', gapArea: 'Kafka', question: 'Have you worked with Kafka? What scale?' },
  { id: 'q2', gapArea: 'Leadership', question: 'Have you led a team? How many engineers?' },
  { id: 'q3', gapArea: 'Terraform', question: 'Which IaC tools have you used?' },
];

const RESUME = {
  contact: {
    firstName: 'Jordan', lastName: 'Reyes', jobTitle: 'Backend Engineer',
    phone: '', phoneCountryCode: '', email: 'jordan@example.com', address: '',
    country: '', city: 'Berlin', customCity: 'Berlin', linkedin: '', website: '', photo: '',
  },
  summary: { professionalSummary: 'Backend engineer with 6 years of experience.' },
  experience: [{
    id: 'e1', jobTitle: 'Backend Engineer', company: 'Finch', location: 'Berlin',
    startDate: '2021', endDate: 'Present',
    description: '<p>• Ran Kafka at 50k events/sec</p><p>• Led a team of 4</p>',
  }],
  projects: [], education: [], skills: ['Go'],
  certifications: [], languages: [], awards: [], trainings: [],
  publications: [], volunteer: [], custom: [],
};

const GEN_RESULT = {
  runId: 'run-1', resume: RESUME, atsScore: 75,
  unresolvedIssues: ['Kafka throughput not evidenced for the payments domain'],
};

/** Set a controlled input's value the way a user would (React value tracker). */
function setValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
  setter.call(el, value);
  (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function buttonByText(text: string): HTMLButtonElement {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  if (!btn) throw new Error(`button not found: ${text}`);
  return btn as HTMLButtonElement;
}

const LONG_JD = 'Senior Backend Engineer role requiring Kafka, PostgreSQL and Terraform experience. '.repeat(3);
const LONG_CV = 'Jordan Reyes, backend engineer with six years of Go and Python experience at Finch. '.repeat(3);

describe('PrismWizard', () => {
  let root: Root;
  let container: HTMLDivElement;
  const onEditResume = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resumeRepo.count).mockResolvedValue(0);
    vi.mocked(prismRepo.getResumable).mockResolvedValue(null);
    vi.mocked(prismRepo.flagLine).mockResolvedValue();
    mockFinalize.mockResolvedValue();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  async function mountWithInputs() {
    await act(async () => {
      root = createRoot(container);
      root.render(<PrismWizard onEditResume={onEditResume} />);
    });
    const [jdBox, cvBox] = [...document.querySelectorAll('textarea')] as HTMLTextAreaElement[];
    await act(async () => {
      setValue(jdBox, LONG_JD);
      setValue(cvBox, LONG_CV);
    });
  }

  it('walks input → stage feed → questionnaire → generate → UNSKIPPABLE review with line flags → approve → editor', async () => {
    let finishAnalyze!: () => void;
    mockAnalyze.mockImplementation((_input, onStage: (u: PrismStageUpdate) => void) => {
      onStage({ stage: 'gap_analyst', label: 'Comparing your CV against the job requirements' });
      onStage({ stage: 'wizard_creator', label: 'Preparing a few questions to fill the gaps' });
      return new Promise((resolve) => {
        finishAnalyze = () => resolve({ runId: 'run-1', questions: QUESTIONS });
      });
    });

    await mountWithInputs();
    expect(buttonByText('Tailor my resume').disabled).toBe(false);
    await act(async () => {
      buttonByText('Tailor my resume').click();
    });

    // Live agent status feed: exactly the streamed labels, no JSON anywhere.
    expect(document.body.textContent).toContain('PRISM is working');
    expect(document.body.textContent).toContain('Comparing your CV against the job requirements');
    expect(document.body.textContent).not.toMatch(/[{}"]/);

    await act(async () => finishAnalyze());

    // Questionnaire pause.
    expect(document.body.textContent).toContain('A few quick questions');
    const answerBoxes = [...document.querySelectorAll('textarea')] as HTMLTextAreaElement[];
    await act(async () => {
      setValue(answerBoxes[0], 'Kafka at 50k events/sec for two years.');
    });

    mockGenerate.mockImplementation(async (input, onStage: (u: PrismStageUpdate) => void) => {
      expect(input.runId).toBe('run-1');
      const byId = Object.fromEntries(input.answers.map((a) => [a.questionId, a.answer]));
      expect(byId.q1).toContain('50k events/sec');
      expect(byId.q2).toBe('No experience with this.');
      onStage({ stage: 'writer', label: 'Writing your tailored resume' });
      return GEN_RESULT;
    });
    mockCreate.mockResolvedValue({ id: 'resume-42', title: 'x', isPrimary: false } as never);

    await act(async () => {
      buttonByText('Generate my resume').click();
    });

    // Review screen: score, unresolved issues, per-line flags — and NOTHING
    // persisted yet (the review step is the only path to saving).
    expect(document.body.textContent).toContain('Review your tailored resume');
    expect(document.body.textContent).toContain('75/100');
    expect(document.body.textContent).toContain('Kafka throughput not evidenced');
    expect(mockCreate).not.toHaveBeenCalled();

    // Flag a line as "not mine" — the guardrail signal.
    const flagButtons = [...document.querySelectorAll('button')].filter((b) => b.textContent?.includes('Not mine'));
    expect(flagButtons.length).toBeGreaterThanOrEqual(3); // summary + 2 bullets + skills
    await act(async () => {
      flagButtons[1].click();
    });
    expect(vi.mocked(prismRepo.flagLine)).toHaveBeenCalledWith(
      'user-1', 'run-1', expect.stringContaining('Backend Engineer'), expect.stringContaining('Kafka'),
    );

    // Approve: only now is the resume created, the run finalized, editor opened.
    await act(async () => {
      buttonByText('I reviewed it — save & edit').click();
    });
    expect(mockCreate).toHaveBeenCalledWith('user-1', expect.objectContaining({
      templateId: 'classic',
      data: RESUME,
      visibleSections: expect.arrayContaining(['contact', 'summary', 'experience']),
    }));
    expect(mockFinalize).toHaveBeenCalledWith('run-1', 'resume-42');
    expect(onEditResume).toHaveBeenCalledWith('resume-42');
  });

  it('ZERO GAPS: empty questionnaire skips the wizard step straight into generation', async () => {
    mockAnalyze.mockResolvedValue({ runId: 'run-2', questions: [] });
    mockGenerate.mockImplementation(async (input) => {
      expect(input).toEqual({ runId: 'run-2', answers: [] });
      return { ...GEN_RESULT, runId: 'run-2', unresolvedIssues: [] };
    });

    await mountWithInputs();
    await act(async () => {
      buttonByText('Tailor my resume').click();
    });

    expect(document.body.textContent).not.toContain('A few quick questions');
    expect(document.body.textContent).toContain('Review your tailored resume');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('FINALIZE PERMANENTLY FAILS: still opens the saved resume, and deletes the run so it cannot be re-approved into a duplicate', async () => {
    mockAnalyze.mockResolvedValue({ runId: 'run-2', questions: [] });
    mockGenerate.mockResolvedValue({ ...GEN_RESULT, runId: 'run-2', unresolvedIssues: [] });
    mockCreate.mockResolvedValue({ id: 'resume-42', title: 'x', isPrimary: false } as never);
    mockFinalize.mockRejectedValue(new Error('network error'));
    vi.mocked(prismRepo.deleteRun).mockResolvedValue();

    await mountWithInputs();
    await act(async () => {
      buttonByText('Tailor my resume').click();
    });
    expect(document.body.textContent).toContain('Review your tailored resume');

    await act(async () => {
      buttonByText('I reviewed it — save & edit').click();
    });

    // The resume is already safely saved and must open regardless of finalize's fate.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(onEditResume).toHaveBeenCalledWith('resume-42');
    // Both finalize attempts are made...
    expect(mockFinalize).toHaveBeenCalledTimes(2);
    // ...and since both failed, the run is deleted instead of being left stuck
    // at status='review', where it would re-offer this same output for a
    // second, duplicate approval.
    expect(vi.mocked(prismRepo.deleteRun)).toHaveBeenCalledWith('user-1', 'run-2');
  });

  it('offers to continue an abandoned run and restores the questionnaire from it', async () => {
    vi.mocked(prismRepo.getResumable).mockResolvedValue({
      id: 'run-9', status: 'awaiting_answers', templateId: 'swiss',
      questions: QUESTIONS, answers: [], result: null, errorCode: null, updatedAt: 'now',
    });

    await act(async () => {
      root = createRoot(container);
      root.render(<PrismWizard onEditResume={onEditResume} />);
    });

    expect(document.body.textContent).toContain('You have an unfinished tailoring run');
    await act(async () => {
      buttonByText('Continue').click();
    });
    expect(document.body.textContent).toContain('A few quick questions');
    expect(document.body.textContent).toContain(QUESTIONS[0].question);
  });

  it('RUN EXPIRED: deletes the dead run so the continue banner stops re-offering it', async () => {
    vi.mocked(prismRepo.deleteRun).mockResolvedValue();
    // Once: after the wizard deletes the dead run, re-fetches see no
    // resumable row (the beforeEach default of null models the deletion).
    vi.mocked(prismRepo.getResumable).mockResolvedValueOnce({
      id: 'run-dead', status: 'failed', templateId: 'classic',
      questions: [], answers: [], result: null, errorCode: 'bad_ai_output', updatedAt: 'now',
    });
    mockGenerate.mockRejectedValue(Object.assign(new Error('run_expired'), { code: 'run_expired' }));

    await act(async () => {
      root = createRoot(container);
      root.render(<PrismWizard onEditResume={onEditResume} />);
    });
    expect(document.body.textContent).toContain('You have an unfinished tailoring run');
    await act(async () => {
      buttonByText('Continue').click();
    });

    expect(document.body.textContent).toContain('That run expired');
    expect(vi.mocked(prismRepo.deleteRun)).toHaveBeenCalledWith('user-1', 'run-dead');
    // Back on the input step with the banner gone — not a dead-end loop.
    expect(document.body.textContent).toContain('Job description');
    expect(document.body.textContent).not.toContain('You have an unfinished tailoring run');
  });

  it('shows the friendly error and returns to inputs when the pipeline fails', async () => {
    mockAnalyze.mockRejectedValue(Object.assign(new Error('bad_ai_output'), { code: 'bad_ai_output' }));

    await mountWithInputs();
    await act(async () => {
      buttonByText('Tailor my resume').click();
    });

    expect(document.body.textContent).toContain('The AI returned an unusable result');
    expect(document.body.textContent).toContain('Job description');
    expect(document.body.textContent).not.toContain('Error:');
  });

  describe('application binding (Career OS)', () => {
    const BINDING = {
      applicationId: 'app-1',
      jdText: LONG_JD,
      sourceResumeId: 'resume-src',
      sourceResumeRevision: 3,
      idempotencyKey: 'tailor:app-1:resume-src:3',
      onFinalized: vi.fn(),
      onRunStarted: vi.fn(),
    };

    async function mountBound() {
      vi.mocked(resumeRepo.get).mockResolvedValue({ id: 'resume-src', title: 'My source CV', data: RESUME, revision: 3 } as never);
      vi.mocked(prismRepo.getResumableForApplication).mockResolvedValue(null);
      await act(async () => {
        root = createRoot(container);
        root.render(<PrismWizard binding={BINDING} />);
      });
    }

    it('prefills and locks the JD, reads the source CV, and passes the binding + idempotency key to analyzeGaps', async () => {
      mockAnalyze.mockResolvedValue({ runId: 'run-b1', questions: [] });
      mockGenerate.mockResolvedValue({ ...GEN_RESULT, runId: 'run-b1', unresolvedIssues: [] });
      await mountBound();

      // Standalone banner lookup is never used in bound mode; the application-scoped one is.
      expect(vi.mocked(prismRepo.getResumable)).not.toHaveBeenCalled();
      expect(vi.mocked(prismRepo.getResumableForApplication)).toHaveBeenCalledWith('user-1', 'app-1');
      const [jdBox, cvBox] = [...document.querySelectorAll('textarea')] as HTMLTextAreaElement[];
      expect(jdBox.value).toBe(LONG_JD);
      expect(jdBox.readOnly).toBe(true);
      expect(cvBox.readOnly).toBe(true);
      expect(cvBox.value).toContain('Jordan Reyes');
      expect(document.body.textContent).toContain('My source CV');
      expect(document.body.textContent).not.toContain('Delete my PRISM data');

      await act(async () => { buttonByText('Tailor my resume').click(); });
      expect(mockAnalyze).toHaveBeenCalledWith(expect.objectContaining({
        applicationId: 'app-1', sourceResumeId: 'resume-src', sourceResumeRevision: 3, idempotencyKey: 'tailor:app-1:resume-src:3', templateId: 'classic',
      }), expect.any(Function));
      expect(BINDING.onRunStarted).toHaveBeenCalledWith('run-b1');
      expect(document.body.textContent).toContain('Review your tailored resume');
    });

    it('approve creates the resume WITH applicationId/origin, finalizes with the application, then reports onFinalized', async () => {
      mockAnalyze.mockResolvedValue({ runId: 'run-b2', questions: QUESTIONS.slice(0, 1) });
      mockGenerate.mockResolvedValue({ ...GEN_RESULT, runId: 'run-b2', unresolvedIssues: [] });
      mockCreate.mockResolvedValue({ id: 'resume-77', title: 'x', isPrimary: false } as never);
      mockFinalize.mockResolvedValue({ runId: 'run-b2', status: 'completed', applicationId: 'app-1', resumeId: 'resume-77' } as never);
      await mountBound();
      await act(async () => { buttonByText('Tailor my resume').click(); });
      const answerBox = [...document.querySelectorAll('textarea')].at(-1) as HTMLTextAreaElement;
      await act(async () => { setValue(answerBox, 'Ran Kafka at scale for two years.'); });
      await act(async () => { buttonByText('Generate my resume').click(); });
      await act(async () => { buttonByText('save & link to this application').click(); });

      expect(mockCreate).toHaveBeenCalledWith('user-1', expect.objectContaining({
        applicationId: 'app-1',
        origin: { kind: 'prism', runId: 'run-b2', sourceResumeId: 'resume-src', sourceRevision: 3 },
      }));
      expect(mockFinalize).toHaveBeenCalledWith({ runId: 'run-b2', resumeId: 'resume-77', applicationId: 'app-1' });
      expect(BINDING.onFinalized).toHaveBeenCalledWith('resume-77', 'run-b2', [expect.objectContaining({ questionId: 'q1', answer: 'Ran Kafka at scale for two years.' })]);
      // The run is never deleted in bound mode (the server links first).
      expect(vi.mocked(prismRepo.deleteRun)).not.toHaveBeenCalled();
    });

    it('source_stale shows the review prompt; "continue" re-sends generate with acknowledgeStale', async () => {
      mockAnalyze.mockResolvedValue({ runId: 'run-b3', questions: [] });
      mockGenerate
        .mockRejectedValueOnce(Object.assign(new Error('source_stale'), { code: 'source_stale', extra: { currentRevision: 4 } }))
        .mockResolvedValueOnce({ ...GEN_RESULT, runId: 'run-b3', unresolvedIssues: [] });
      await mountBound();
      await act(async () => { buttonByText('Tailor my resume').click(); });

      expect(document.body.textContent).toContain('Your source CV changed since this run started');
      expect(document.body.textContent).toContain('revision 4');
      expect(document.body.textContent).not.toContain('Review your tailored resume');

      await act(async () => { buttonByText('Continue with the old snapshot').click(); });
      expect(mockGenerate).toHaveBeenLastCalledWith({ runId: 'run-b3', answers: [], acknowledgeStale: true }, expect.any(Function));
      expect(document.body.textContent).toContain('Review your tailored resume');
    });

    it('a failed finalize keeps the run (no delete) and offers a retry that then reports onFinalized', async () => {
      mockAnalyze.mockResolvedValue({ runId: 'run-b4', questions: [] });
      mockGenerate.mockResolvedValue({ ...GEN_RESULT, runId: 'run-b4', unresolvedIssues: [] });
      mockCreate.mockResolvedValue({ id: 'resume-88', title: 'x', isPrimary: false } as never);
      mockFinalize.mockRejectedValue(new Error('network'));
      await mountBound();
      await act(async () => { buttonByText('Tailor my resume').click(); });
      await act(async () => { buttonByText('save & link to this application').click(); });

      expect(document.body.textContent).toContain('could not be linked to this application yet');
      expect(vi.mocked(prismRepo.deleteRun)).not.toHaveBeenCalled();
      expect(BINDING.onFinalized).not.toHaveBeenCalledWith('resume-88', 'run-b4', expect.anything());

      mockFinalize.mockResolvedValue({ runId: 'run-b4', status: 'completed', applicationId: 'app-1', resumeId: 'resume-88' } as never);
      await act(async () => { buttonByText('Retry the link').click(); });
      expect(BINDING.onFinalized).toHaveBeenCalledWith('resume-88', 'run-b4', []);
    });

    it('the checkpoint_degraded stage is shown honestly in the feed', async () => {
      let finish!: () => void;
      mockAnalyze.mockImplementation((_input, onStage: (u: PrismStageUpdate) => void) => {
        onStage({ stage: 'gap_analyst', label: 'Comparing your CV against the job requirements' });
        onStage({ stage: 'checkpoint_degraded', label: 'Progress could not be saved; if this stops, you will restart this step' });
        return new Promise((resolve) => { finish = () => resolve({ runId: 'run-b5', questions: QUESTIONS }); });
      });
      await mountBound();
      await act(async () => { buttonByText('Tailor my resume').click(); });
      expect(document.body.textContent).toContain('Progress could not be saved');
      expect(document.body.textContent).toContain('Comparing your CV against the job requirements');
      await act(async () => finish());
    });
  });

  it('maps the hardened error codes to specific user-facing messages', async () => {
    mockAnalyze.mockRejectedValue(Object.assign(new Error('rate_limited'), { code: 'rate_limited' }));

    await mountWithInputs();
    await act(async () => {
      buttonByText('Tailor my resume').click();
    });

    expect(document.body.textContent).toContain('hourly limit for PRISM runs');
  });
});
