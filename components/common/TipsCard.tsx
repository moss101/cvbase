
import React from 'react';
import type { SectionId } from '../../types';

interface TipsCardProps {
    activeSection: SectionId;
}

const TIPS: Record<SectionId, string[]> = {
    contact: [
        "Use a professional email address (e.g., first.last@gmail.com).",
        "Add your LinkedIn profile to showcase your network and endorsements.",
        "Only add your full address if required for the job."
    ],
    summary: [
        "Keep it brief: 3-5 sentences.",
        "Tailor it to the job description, using keywords from the listing.",
        "Highlight your biggest achievements and top skills."
    ],
    experience: [
        "Use action verbs (e.g., 'Managed', 'Developed', 'Led').",
        "Quantify your achievements with numbers (e.g., 'Increased sales by 20%').",
        "List responsibilities in bullet points for easy reading."
    ],
    projects: [
        "Showcase your best work, especially projects relevant to the job you're applying for.",
        "Briefly describe the project, its purpose, and the technologies you used.",
        "Include a link to the live project or its source code repository (like GitHub).",
        "Quantify outcomes if possible (e.g., 'Handled 1000 requests per second')."
    ],
    education: [
        "If you're a recent grad, put this section before Experience.",
        "Include relevant coursework, projects, or honors.",
        "It's generally okay to leave out your graduation year if you've been in the workforce for over 10 years."
    ],
    skills: [
        "Include both 'hard skills' (like 'Python', 'Photoshop') and 'soft skills' (like 'Team Leadership', 'Communication').",
        "Don't list skills you aren't proficient in.",
        "Check the job description for required skills and add them if you have them."
    ],
    certifications: [
        "List your most relevant certifications first to grab the recruiter's attention.",
        "Include the full, official name of the certification to ensure it's recognized by ATS.",
        "If a certification has an expiry date, make sure to include it, especially if it's still active."
    ],
    languages: [
        "List languages you are professionally proficient in.",
        "Use standard proficiency levels like 'Native', 'Fluent', or 'Conversational'.",
        "Only include languages if they are relevant to the job or you have a high proficiency."
    ],
    awards: [
        "Highlight recognition that demonstrates excellence in your field.",
        "Include awards from professional associations, previous employers, or academic institutions.",
        "Briefly explain the significance of the award if it's not immediately obvious."
    ],
    trainings: [
        "List workshops, bootcamps, or seminars that enhanced your professional skills.",
        "Focus on training that is relevant to the position you are applying for.",
        "Include the organizing body and date to add credibility."
    ],
    publications: [
        "List articles, books, or research papers you have authored or co-authored.",
        "Include the title, publication date, and publisher or journal name.",
        "Add a link to the publication if available online."
    ],
    volunteer: [
        "Highlight volunteer roles that demonstrate leadership or relevant skills.",
        "Include the organization name, your role, and the dates of service.",
        "Describe your impact or key contributions, similar to professional experience."
    ],
    custom: [
        "Use this section for anything that doesn't fit elsewhere, like Hobbies, Interests, or Patents.",
        "Keep it relevant to the job or showcase your personality in a professional way.",
        "Ensure the title clearly describes the content of this section."
    ],
    customize: [
        "Enable sections that showcase your unique strengths.",
        "Hide sections that are empty or not relevant to the specific job application.",
        "Tailoring your resume structure can help emphasize your most impactful qualifications."
    ],
    finalize: [
        "Proofread everything! Check for spelling and grammar errors.",
        "Ask a friend or colleague to review your resume.",
        "Save the PDF with a clear file name, like 'FirstName_LastName_Resume.pdf'."
    ]
};

const TipsCard: React.FC<TipsCardProps> = ({ activeSection }) => {
    const currentTips = TIPS[activeSection] || TIPS['contact'];

    return (
        <div className="bg-gradient-to-br from-secondary-light to-blue-100 p-6 rounded-2xl mt-8 border border-secondary/20">
            <h3 className="text-secondary font-bold text-lg mb-4">💡 Pro Tips</h3>
            <ul className="list-none space-y-2">
                {currentTips.map((tip, index) => (
                    <li key={index} className="pl-6 relative leading-relaxed">
                        <span className="absolute left-0 text-secondary font-bold text-xl">•</span>
                        {tip}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TipsCard;
