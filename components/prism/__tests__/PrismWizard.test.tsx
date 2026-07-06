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
}));
vi.mock('../../../services/repos/resumeRepo', () => ({
  create: vi.fn(),
  getPrimary: vi.fn(),
  count: vi.fn(),
}));
vi.mock('../../../services/repos/prismRepo', () => ({
  getResumable: vi.fn(),
  deleteAllRuns: vi.fn(),
  deleteRun: vi.fn(),
  flagLine: vi.fn(),
  isPrismEnabled: vi.fn(),
}));
vi.mock('../../../services/api', () => ({
  callFn: vi.fn(),
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

  it('maps the hardened error codes to specific user-facing messages', async () => {
    mockAnalyze.mockRejectedValue(Object.assign(new Error('rate_limited'), { code: 'rate_limited' }));

    await mountWithInputs();
    await act(async () => {
      buttonByText('Tailor my resume').click();
    });

    expect(document.body.textContent).toContain('hourly limit for PRISM runs');
  });
});
