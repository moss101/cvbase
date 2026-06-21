
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AIAnalysisResult, AtsAnalysisResult, ResumeData, SectionId } from "../types";

const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
const ai = new GoogleGenAI({ apiKey: apiKey as string });

export async function generateSuggestion(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return `Error from AI: ${error.message}`;
    }
    return "An unknown error occurred while contacting the AI.";
  }
}

export async function getAiSuggestionsForSection(
    resumeData: ResumeData,
    jobDescription: string,
    section: SectionId,
): Promise<AIAnalysisResult> {
    const model = 'gemini-2.5-flash';
    
    const basePrompt = `You are an expert career coach and professional resume writer. Your task is to help a user tailor their resume for a specific job description. Analyze the provided resume data and the job description. Return your analysis in a valid JSON object matching the provided schema.`;

    let specificInstructions = '';
    const schemaProperties: any = {};

    if (section === 'summary') {
        specificInstructions = `Rewrite the professional summary to be highly compelling, action-oriented, and specifically targeted to the job title and requirements in the provided description. 
        
        **Requirements:**
        1.  Highlight the candidate's most relevant qualifications, years of experience, and key achievements that match the job description.
        2.  Use strong, professional language.
        3.  Keep it concise (strictly 3-4 sentences).
        4.  Ensure it flows well as a cohesive narrative.
        
        Provide your output in the 'summarySuggestion' field.`;
        schemaProperties.summarySuggestion = {
            type: Type.STRING,
            description: 'A rewritten, compelling, and targeted version of the professional summary.',
        };
    } else if (section === 'experience') {
        specificInstructions = `
For each work experience item provided, perform a critical analysis from the perspective of an ATS (Applicant Tracking System) and a hiring manager. Your goal is to rewrite the description to be more impactful and keyword-rich, based on the provided job description.

For each experience item, you must provide:
1.  **atsAnalysis**: A brief, 1-2 sentence analysis explaining what's weak about the original description (e.g., "Lacks quantifiable results," "Uses passive language," "Missing keywords like 'CI/CD' from the job description.").
2.  **improvedDescription**: A complete, rewritten version of the job description. This new version should feature strong, achievement-oriented bullet points using the STAR (Situation, Task, Action, Result) method where appropriate. It must incorporate relevant keywords from the job description and quantify achievements with specific metrics.

Provide your output in the 'experienceSuggestions' field.`;
        schemaProperties.experienceSuggestions = {
            type: Type.ARRAY,
            description: 'Suggestions for each work experience entry.',
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: 'The ID of the experience item.' },
                    jobTitle: { type: Type.STRING, description: 'The job title for context.' },
                    company: { type: Type.STRING, description: 'The company name for context.' },
                    atsAnalysis: { type: Type.STRING, description: 'A brief ATS-focused analysis of the original description.' },
                    improvedDescription: { type: Type.STRING, description: 'The full, rewritten job description with improved bullet points.' },
                },
                required: ['id', 'jobTitle', 'company', 'atsAnalysis', 'improvedDescription']
            },
        };
    } else if (section === 'skills') {
        specificInstructions = `Analyze the provided job description and the skills section of the resume. Identify 5-10 specific, high-value keywords (like technical skills, software, or industry certifications) that are critical for the job but are MISSING from the resume's skills list. Do not suggest skills that are already present. Provide your output in the 'missingKeywords' field as an array of strings.`;
        schemaProperties.missingKeywords = {
            type: Type.ARRAY,
            description: 'A list of important keywords missing from the resume skills section.',
            items: { type: Type.STRING },
        };
    } else {
        throw new Error('Invalid section provided for AI suggestions.');
    }

    const prompt = `
        ${basePrompt}

        **Instructions:**
        ${specificInstructions}
        
        **Job Description:**
        ---
        ${jobDescription}
        ---

        **Resume Data:**
        ---
        ${JSON.stringify(resumeData, null, 2)}
        ---
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: schemaProperties
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AIAnalysisResult;
    } catch (error) {
        console.error("Error getting AI suggestions with Gemini API:", error);
        throw new Error("Failed to get suggestions from AI.");
    }
}

export async function analyzeResume(
    resumeData: ResumeData,
    jobDescription: string
): Promise<AIAnalysisResult> {
    // This could call getAiSuggestionsForSection for multiple sections and merge.
    const summaryPromise = getAiSuggestionsForSection(resumeData, jobDescription, 'summary').catch(() => ({}));
    const experiencePromise = getAiSuggestionsForSection(resumeData, jobDescription, 'experience').catch(() => ({}));
    const skillsPromise = getAiSuggestionsForSection(resumeData, jobDescription, 'skills').catch(() => ({}));

    const [summaryResult, experienceResult, skillsResult] = await Promise.all([
        summaryPromise,
        experiencePromise,
        skillsPromise
    ]);
    
    const combinedResult: AIAnalysisResult = {};
    // @ts-ignore
    if (summaryResult.summarySuggestion) combinedResult.summarySuggestion = summaryResult.summarySuggestion;
    // @ts-ignore
    if (experienceResult.experienceSuggestions) combinedResult.experienceSuggestions = experienceResult.experienceSuggestions;
    // @ts-ignore
    if (skillsResult.missingKeywords) combinedResult.missingKeywords = skillsResult.missingKeywords;
    
    return combinedResult;
}

export async function checkAtsCompliance(resumeData: ResumeData): Promise<AtsAnalysisResult> {
    const model = 'gemini-2.5-flash';

    const prompt = `
        You are an expert ATS (Applicant Tracking System) resume analyzer. Your task is to analyze the provided resume data and evaluate its compliance with ATS best practices.
        Provide a detailed analysis in a valid JSON object matching the provided schema. The overall score should be an integer between 0 and 100.
        For each check, provide a boolean 'pass' status and concise 'feedback'.

        **Resume Data:**
        ---
        ${JSON.stringify(resumeData, null, 2)}
        ---
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            overallScore: { type: Type.INTEGER, description: 'Overall ATS compliance score from 0 to 100.' },
            checks: {
                type: Type.OBJECT,
                properties: {
                    contactInfo: {
                        type: Type.OBJECT,
                        properties: {
                            pass: { type: Type.BOOLEAN },
                            feedback: { type: Type.STRING }
                        },
                        required: ['pass', 'feedback']
                    },
                    keywords: {
                        type: Type.OBJECT,
                        properties: {
                            pass: { type: Type.BOOLEAN },
                            feedback: { type: Type.STRING }
                        },
                        required: ['pass', 'feedback']
                    },
                    sectionHeaders: {
                        type: Type.OBJECT,
                        properties: {
                            pass: { type: Type.BOOLEAN },
                            feedback: { type: Type.STRING }
                        },
                        required: ['pass', 'feedback']
                    },
                    bulletPoints: {
                        type: Type.OBJECT,
                        properties: {
                            pass: { type: Type.BOOLEAN },
                            feedback: { type: Type.STRING }
                        },
                        required: ['pass', 'feedback']
                    },
                    fileFormat: {
                        type: Type.OBJECT,
                        properties: {
                            pass: { type: Type.BOOLEAN },
                            feedback: { type: Type.STRING }
                        },
                        required: ['pass', 'feedback']
                    }
                },
                required: ['contactInfo', 'keywords', 'sectionHeaders', 'bulletPoints', 'fileFormat']
            }
        },
        required: ['overallScore', 'checks']
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AtsAnalysisResult;
    } catch (error) {
        console.error("Error checking ATS compliance with Gemini API:", error);
        throw new Error("Failed to get ATS analysis from AI.");
    }
}


export async function generateProfessionalHeadshot(base64ImageData: string, mimeType: string): Promise<string> {
    const model = 'gemini-2.5-flash-image';
    const prompt = `
        Transform this image into a professional headshot suitable for a resume or LinkedIn profile.

        **Key requirements:**
        1.  **Do not alter the person's facial appearance or recognizable features.** The person must remain clearly identifiable.
        2.  Detect the subject's gender (male or female) and dress them in appropriate, high-end professional business attire.
            *   **For men:** A classic business suit and tie.
            *   **For women:** An elegant blazer or appropriate business dress.
        3.  Replace the background with a neutral, professional one (e.g., a soft gray, off-white, or subtly blurred office environment).
        4.  Ensure the added attire looks authentic and natural, matching the existing lighting, perspective, and the person's posture.
        5.  Perform subtle retouching: improve clarity, sharpness, and apply very light, natural skin smoothing. Avoid any heavy or artificial-looking retouching. The goal is a polished, natural look.
        6.  Add a small, subtle, semi-transparent "cvbase" watermark in the bottom-right corner of the image. It should be unobtrusive but visible upon inspection.

        The final headshot must be visually polished and ready for immediate use in a professional context.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        
        throw new Error("No image was generated by the AI.");
    } catch (error) {
        console.error("Error generating professional headshot with Gemini API:", error);
        throw new Error("Failed to generate headshot from AI.");
    }
}

export async function generateBulletPointSuggestions(jobTitle: string): Promise<string[]> {
    if (!jobTitle.trim()) {
        return [];
    }
    const model = 'gemini-2.5-flash';
    const prompt = `
        Generate a list of 15-20 professional, achievement-oriented resume bullet points for the job title "${jobTitle}".
        Focus on quantifiable results and action verbs.
        Return the response as a valid JSON array of strings. Do not include any other text, explanations, or markdown formatting.
        The output must be a single-line, minified JSON array.
        Example: ["Managed a team of 5 engineers to deliver project ahead of schedule.", "Increased user engagement by 25% through A/B testing."]
    `;
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING
        },
        description: 'A list of professional resume bullet points.'
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as string[];
    } catch (error) {
        console.error("Error generating bullet point suggestions with Gemini API:", error);
        return [];
    }
}

export async function generateSummarySuggestions(jobTitle: string): Promise<string[]> {
    if (!jobTitle.trim()) {
        return [];
    }
    const model = 'gemini-2.5-flash';
    const prompt = `
        Generate a list of 4-5 distinct, professional, and achievement-oriented resume summary paragraphs for the job title "${jobTitle}".
        Each summary should be 3-4 sentences long, compelling, and targeted.
        Return the response as a valid JSON array of strings. Do not include any other text, explanations, or markdown formatting.
        The output must be a single-line, minified JSON array.
    `;
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING
        },
        description: 'A list of professional resume summary paragraphs.'
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as string[];
    } catch (error) {
        console.error("Error generating summary suggestions with Gemini API:", error);
        return [];
    }
}

export async function generateSkillSuggestions(context: string): Promise<string[]> {
    if (!context.trim()) {
        return [];
    }
    const model = 'gemini-2.5-flash';
    const prompt = `
        Generate a list of 15 highly relevant professional skills (hard and soft) related to: "${context}".
        The context could be a job title, an industry, or a specific technology.
        Return the response as a valid JSON array of strings.
    `;
    const responseSchema = {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A list of professional skills.'
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as string[];
    } catch (error) {
        console.error("Error generating skill suggestions with Gemini API:", error);
        return [];
    }
}

export async function generateFieldTip(section: string, fieldName: string, currentValue?: string): Promise<string> {
    const model = 'gemini-3.5-flash';
    let prompt = `You are an expert career coach and professional resume writer.
    Provide a highly specific, actionable, 1-2 sentence pro-tip for writing the "${fieldName}" field in the "${section}" section of a resume to stand out to employers and pass ATS systems.
    Keep the tip professional, punchy, and short (under 30 words).
    Return ONLY the 1-2 sentence tip text. Do NOT include preambles, introductory text, conversational phrases, quotes, or markdown.`;

    if (currentValue && currentValue.length > 5) {
        prompt += `\n\nFor context, the user is currently writing: "${currentValue}". Tailor your advice to help them refine, quantify, or optimize this specifically.`;
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
        console.error("Error in generateFieldTip:", error);
        return "Focus on clarity, strong action verbs, and highlighting your key accomplishments here.";
    }
}

