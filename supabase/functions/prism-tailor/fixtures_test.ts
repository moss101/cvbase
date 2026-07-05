// Shared deterministic fixtures + scripted ModelFn for PRISM graph tests.
// The scripted model dispatches on prompt markers so the REAL graph, prompts,
// schemas, and mapping run end-to-end without a Gemini key.
import type { ModelFn } from './model.ts';
import type { AggregatedContext, Critique, GapAnalysis, ResumeDraft } from './schemas.ts';
import { computeTotalYearsExperience } from './experience.ts';

export const GAP: GapAnalysis = {
  hardKeywords: ['Kafka', 'Kubernetes', 'Terraform'],
  coreResponsibilities: ['Build and operate streaming data pipelines'],
  senioritySignals: ['Leads a small platform team'],
  impliedRequirements: ['Production on-call ownership'],
  gaps: [
    { area: 'Kafka', severity: 'missing', evidenceInCv: '' },
    { area: 'Team leadership', severity: 'thin', evidenceInCv: 'Mentored two juniors' },
  ],
};

export const QUESTIONS = {
  questions: [
    { id: 'q1', gapArea: 'Kafka', question: 'Have you worked with Kafka or Flink? What throughput or scale?' },
    { id: 'q2', gapArea: 'Team leadership', question: 'Have you formally led a team? How many engineers?' },
    { id: 'q3', gapArea: 'Terraform', question: 'Which IaC tools have you used in production?' },
  ],
};

export const ANSWERS = [
  { questionId: 'q1', question: QUESTIONS.questions[0].question, answer: 'Yes, Kafka at 50k events/sec for two years.' },
  { questionId: 'q2', question: QUESTIONS.questions[1].question, answer: 'Led a team of 4 engineers since 2024.' },
  { questionId: 'q3', question: QUESTIONS.questions[2].question, answer: 'Terraform for all AWS infrastructure.' },
];

const WORK_HISTORY = [{
  company: 'Streamline GmbH', title: 'Data Platform Engineer', location: 'Berlin',
  startDate: 'Mar 2022', endDate: 'Present',
  facts: [
    'Operated Kafka handling 50k events/sec for two years',
    'Led a team of 4 engineers since 2024',
    'Provisioned all AWS infrastructure with Terraform',
  ],
}];

export const CONTEXT: AggregatedContext = {
  candidate: {
    firstName: 'Avery', lastName: 'Chen', jobTitle: 'Data Platform Engineer',
    email: 'avery@example.com', phone: '5550100', location: 'Berlin',
    linkedin: 'linkedin.com/in/averychen', website: '',
  },
  targetRole: {
    title: 'Senior Data Platform Engineer',
    hardKeywords: ['Kafka', 'Kubernetes', 'Terraform'],
    coreResponsibilities: ['Build and operate streaming data pipelines'],
  },
  workHistory: WORK_HISTORY,
  education: [{
    school: 'TU Berlin', degree: 'BSc Computer Science', location: 'Berlin',
    startDate: '2016', endDate: '2020', notes: '',
  }],
  projects: [],
  skills: ['Kafka', 'Kubernetes', 'Terraform', 'Python'],
  certifications: ['CKA'],
  languages: ['German (Native)', 'English - C1'],
  additionalFacts: [],
  totalYearsExperience: computeTotalYearsExperience(WORK_HISTORY),
};

const draft = (marker: string): ResumeDraft => ({
  professionalSummary: `Data platform engineer with streaming expertise. [${marker}]`,
  experience: [{
    company: 'Streamline GmbH', jobTitle: 'Data Platform Engineer', location: 'Berlin',
    startDate: 'Mar 2022', endDate: 'Present',
    bullets: [
      `Operated Kafka pipelines handling 50k events/sec (${marker})`,
      'Led a team of 4 engineers delivering platform reliability work',
    ],
  }],
  education: [{
    school: 'TU Berlin', degree: 'BSc Computer Science', location: 'Berlin',
    startDate: '2016', endDate: '2020', description: '',
  }],
  projects: [],
  skills: ['Kafka', 'Kubernetes', 'Terraform', 'Python'],
  certifications: ['CKA'],
  languages: ['German (Native)', 'English - C1'],
});

export const DRAFT1 = draft('draft-one');
export const DRAFT2 = draft('draft-two');

export const CRIT_PASS: Critique = { pass: true, score: 88, issues: [] };
export const CRIT_FAIL_1: Critique = {
  pass: false, score: 62,
  issues: [{ kind: 'keyword_missing', detail: 'Terraform absent from bullets', fix: 'Add the Terraform provisioning fact as a bullet' }],
};
export const CRIT_FAIL_2: Critique = {
  pass: false, score: 71,
  issues: [{ kind: 'role_misalignment', detail: 'Summary not aligned to streaming focus', fix: 'Lead the summary with streaming-pipeline ownership' }],
};

/** Tokens each scripted model call reports — lets tests do exact budget math. */
export const TOKENS_PER_CALL = 500;

/** Scripted ModelFn: dispatches on prompt markers; writer/critic responses pop
 *  from the given sequences so tests control the loop behavior. Also records
 *  the models requested per call (cost-routing assertions). */
export function scriptedModel(
  script: { drafts: ResumeDraft[]; critiques: Critique[] },
): ModelFn & { calls: string[]; models: string[] } {
  const drafts = [...script.drafts];
  const critiques = [...script.critiques];
  const calls: string[] = [];
  const models: string[] = [];
  const impl = (prompt: string, _schema: unknown, opts?: { model?: string }) => {
    const agent = prompt.includes('recruiting analyst') ? 'gap_analyst'
      : prompt.includes('intake questionnaire') ? 'wizard_creator'
      : prompt.includes('context aggregator') ? 'aggregator'
      : prompt.includes('ATS compliance reviewer') ? 'critic'
      : prompt.includes('ATS-optimized resume') ? 'writer'
      : 'unknown';
    calls.push(agent);
    models.push(opts?.model ?? '');
    const value = agent === 'gap_analyst' ? GAP
      : agent === 'wizard_creator' ? QUESTIONS
      : agent === 'aggregator' ? CONTEXT
      : agent === 'writer' ? (drafts.shift() ?? DRAFT1)
      : agent === 'critic' ? (critiques.shift() ?? CRIT_PASS)
      : null;
    if (value === null) return Promise.reject(new Error(`unexpected prompt: ${prompt.slice(0, 80)}`));
    return Promise.resolve({ value, tokens: TOKENS_PER_CALL });
  };
  return Object.assign(impl as ModelFn, { calls, models });
}
