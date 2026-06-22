import { callFn } from './api';
import type { ResumeData } from '../types';

// Smart Studio AI — thin clients calling the server Edge Functions (which hold
// the Gemini key). The previous mock fallbacks are gone: results are real,
// per-user, schema-validated, and gated/metered server-side.

// Response Interface for Resume Match / Scan (mapped from the ATS report).
export interface ResumeMatchResult {
  matchScore: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  roleCompatibility: string;
  improvedBullets: string[];
  formattingAnalysis: {
    contactInfo: { pass: boolean; feedback: string };
    education: { pass: boolean; feedback: string };
    sectionNameComplexity: { pass: boolean; feedback: string };
    quantificationRate: { pass: boolean; feedback: string };
  };
}

export interface LinkedInOptimizeResult {
  linkedinScore: number;
  headlineSuggestions: string[];
  aboutSuggestion: string;
  experienceTips: string[];
  searchVisibilityFeedback: string;
}

export interface CoverLetterOptimizeResult {
  matchScore: number;
  critique: string[];
  missingCompetencies: string[];
  improvedCoverLetter: string;
}

export interface CareerTrajectoryResult {
  currentLevel: string;
  suggestedTitles: { title: string; industry: string; matchScore: number; rationale: string }[];
  suggestedIndustries: { industryName: string; whyQualifies: string; growthOutlook: string }[];
  skillGapsAndLeverages: {
    skillName: string;
    type: 'leverage' | 'acquire';
    importance: 'Critical' | 'Recommended' | 'Nice-to-have';
    description: string;
  }[];
  strategicTrajectoryPlan: string[];
}

export async function optimizeLinkedInProfile(
  linkedinData: { headline: string; about: string; targetRole: string },
): Promise<LinkedInOptimizeResult> {
  return callFn<LinkedInOptimizeResult>('ai-linkedin', linkedinData);
}

export async function optimizeCoverLetter(
  coverLetterText: string,
  jobDescription: string,
): Promise<CoverLetterOptimizeResult> {
  return callFn<CoverLetterOptimizeResult>('ai-cover-letter', { coverLetterText, jobDescription });
}

export async function analyzeCareerTrajectory(resumeData: ResumeData): Promise<CareerTrajectoryResult> {
  return callFn<CareerTrajectoryResult>('ai-trajectory', { resumeData });
}

export async function parsePdfFileWithAi(base64Data: string): Promise<string> {
  const { text } = await callFn<{ text: string }>('ai-parse-pdf', { base64Data });
  return text;
}
