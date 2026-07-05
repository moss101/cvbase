import { z } from 'npm:zod@3.24.1';

// =========================================================================
// PRISM agent I/O contracts. Every LLM-facing agent has a strict zod schema;
// the same schema object is converted to a forced-tool-call JSON Schema
// (see _shared/llm/schemaAdapter.ts) so the model is constrained at
// generation time AND validated after (see model.ts).
// =========================================================================

// Agent 1 — Gap Analyst -----------------------------------------------------
export const GapAnalysisSchema = z.object({
  hardKeywords: z.array(z.string()),
  coreResponsibilities: z.array(z.string()),
  senioritySignals: z.array(z.string()),
  impliedRequirements: z.array(z.string()),
  gaps: z.array(z.object({
    area: z.string(),
    severity: z.enum(['missing', 'thin']),
    evidenceInCv: z.string(),
  })),
});
export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;

// Agent 2 — Wizard Creator --------------------------------------------------
export const WizardQuestionsSchema = z.object({
  questions: z.array(z.object({
    id: z.string(),
    gapArea: z.string(),
    question: z.string(),
  })).min(3).max(5),
});
export type WizardQuestions = z.infer<typeof WizardQuestionsSchema>;

export const AnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
});
export type Answer = z.infer<typeof AnswerSchema>;

// Agent 3 — Context Aggregator ----------------------------------------------
// The ONLY source of truth for the Writer. Everything downstream of the
// aggregator reads this object and never the raw CV/JD.
export const AggregatedContextSchema = z.object({
  candidate: z.object({
    firstName: z.string(),
    lastName: z.string(),
    jobTitle: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedin: z.string(),
    website: z.string(),
  }),
  targetRole: z.object({
    title: z.string(),
    hardKeywords: z.array(z.string()),
    coreResponsibilities: z.array(z.string()),
  }),
  workHistory: z.array(z.object({
    company: z.string(),
    title: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    facts: z.array(z.string()),
  })),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    notes: z.string(),
  })),
  projects: z.array(z.object({
    name: z.string(),
    technologies: z.string(),
    description: z.string(),
  })),
  skills: z.array(z.string()),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
  additionalFacts: z.array(z.string()),
  // Deterministically computed from workHistory dates (see experience.ts)
  // right after the aggregator's LLM call returns — never trusted from the
  // model itself. Present in the schema so the forced tool-call still
  // succeeds; graph.ts unconditionally overwrites whatever the model put
  // here with the real computed value before the context is used downstream.
  totalYearsExperience: z.number(),
});
export type AggregatedContext = z.infer<typeof AggregatedContextSchema>;

// Agent 4 — CV Writer ---------------------------------------------------------
// Plain-text fields only: bullets carry no markup; the deterministic parser
// step (mapping.ts) renders them into the template engine's HTML shape.
export const ResumeDraftSchema = z.object({
  professionalSummary: z.string().min(1),
  experience: z.array(z.object({
    company: z.string(),
    jobTitle: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    bullets: z.array(z.string()).min(1),
  })),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string(),
  })),
  projects: z.array(z.object({
    name: z.string(),
    technologies: z.string(),
    description: z.string(),
  })),
  skills: z.array(z.string()).min(1),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
});
export type ResumeDraft = z.infer<typeof ResumeDraftSchema>;

// Agent 5 — ATS Critic --------------------------------------------------------
export const CritiqueSchema = z.object({
  pass: z.boolean(),
  score: z.number(),
  issues: z.array(z.object({
    kind: z.enum(['keyword_missing', 'role_misalignment', 'formatting', 'section_naming', 'unsupported_claim']),
    detail: z.string(),
    fix: z.string(),
  })),
});
export type Critique = z.infer<typeof CritiqueSchema>;
