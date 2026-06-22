import { callFn } from './api';
import type { AIAnalysisResult, AtsAnalysisResult, ResumeData, SectionId } from '../types';

// Thin client: all AI runs server-side in Edge Functions, so the Gemini key
// never ships to the browser. Each helper calls api.callFn and returns the same
// shape the UI already consumes.

async function suggest<T>(kind: string, payload: unknown): Promise<T> {
  const { result } = await callFn<{ result: T }>('ai-suggest', { kind, payload });
  return result;
}

export async function generateSuggestion(prompt: string): Promise<string> {
  try {
    return await suggest<string>('suggestion', { prompt });
  } catch (e) {
    return `Error from AI: ${e instanceof Error ? e.message : 'unknown error'}`;
  }
}

export async function getAiSuggestionsForSection(
  resumeData: ResumeData,
  jobDescription: string,
  section: SectionId,
): Promise<AIAnalysisResult> {
  return suggest<AIAnalysisResult>('section', { section, resumeData, jobDescription });
}

export async function analyzeResume(resumeData: ResumeData, jobDescription: string): Promise<AIAnalysisResult> {
  return suggest<AIAnalysisResult>('analyze', { resumeData, jobDescription });
}

export async function checkAtsCompliance(resumeData: ResumeData): Promise<AtsAnalysisResult> {
  return suggest<AtsAnalysisResult>('ats-compliance', { resumeData });
}

/** Returns the generated headshot as base64 image data (also stored to the
 *  private headshots bucket server-side). */
export async function generateProfessionalHeadshot(base64ImageData: string, mimeType: string): Promise<string> {
  const { imageBase64 } = await callFn<{ imageBase64: string; path: string }>('ai-headshot', {
    imageBase64: base64ImageData,
    mimeType,
  });
  if (!imageBase64) throw new Error('Failed to generate headshot.');
  return imageBase64;
}

export async function generateBulletPointSuggestions(jobTitle: string): Promise<string[]> {
  if (!jobTitle.trim()) return [];
  try {
    return await suggest<string[]>('bullets', { jobTitle });
  } catch {
    return [];
  }
}

export async function generateSummarySuggestions(jobTitle: string): Promise<string[]> {
  if (!jobTitle.trim()) return [];
  try {
    return await suggest<string[]>('summary', { jobTitle });
  } catch {
    return [];
  }
}

export async function generateSkillSuggestions(context: string): Promise<string[]> {
  if (!context.trim()) return [];
  try {
    return await suggest<string[]>('skills', { context });
  } catch {
    return [];
  }
}

export async function generateFieldTip(section: string, fieldName: string, currentValue?: string): Promise<string> {
  try {
    return await suggest<string>('fieldTip', { section, fieldName, currentValue });
  } catch {
    return 'Focus on clarity, strong action verbs, and highlighting your key accomplishments here.';
  }
}
