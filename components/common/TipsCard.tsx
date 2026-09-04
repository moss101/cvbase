
import React from 'react';
import type { SectionId } from '../../types';
import { useTranslation, type Translate } from '../../services/translationService';

interface TipsCardProps {
    activeSection: SectionId;
}

const getTips = (t: Translate): Record<SectionId, string[]> => ({
    contact: [
        t('tipsCard.contact.1', 'Use a professional email address (e.g., first.last@gmail.com).'),
        t('tipsCard.contact.2', 'Add your LinkedIn profile to showcase your network and endorsements.'),
        t('tipsCard.contact.3', 'Only add your full address if required for the job.'),
    ],
    summary: [
        t('tipsCard.summary.1', 'Keep it brief: 3-5 sentences.'),
        t('tipsCard.summary.2', 'Tailor it to the job description, using keywords from the listing.'),
        t('tipsCard.summary.3', 'Highlight your biggest achievements and top skills.'),
    ],
    experience: [
        t('tipsCard.experience.1', "Use action verbs (e.g., 'Managed', 'Developed', 'Led')."),
        t('tipsCard.experience.2', "Quantify your achievements with numbers (e.g., 'Increased sales by 20%')."),
        t('tipsCard.experience.3', 'List responsibilities in bullet points for easy reading.'),
    ],
    projects: [
        t('tipsCard.projects.1', "Showcase your best work, especially projects relevant to the job you're applying for."),
        t('tipsCard.projects.2', 'Briefly describe the project, its purpose, and the technologies you used.'),
        t('tipsCard.projects.3', 'Include a link to the live project or its source code repository (like GitHub).'),
        t('tipsCard.projects.4', "Quantify outcomes if possible (e.g., 'Handled 1000 requests per second')."),
    ],
    education: [
        t('tipsCard.education.1', "If you're a recent grad, put this section before Experience."),
        t('tipsCard.education.2', 'Include relevant coursework, projects, or honors.'),
        t('tipsCard.education.3', "It's generally okay to leave out your graduation year if you've been in the workforce for over 10 years."),
    ],
    skills: [
        t('tipsCard.skills.1', "Include both 'hard skills' (like 'Python', 'Photoshop') and 'soft skills' (like 'Team Leadership', 'Communication')."),
        t('tipsCard.skills.2', "Don't list skills you aren't proficient in."),
        t('tipsCard.skills.3', 'Check the job description for required skills and add them if you have them.'),
    ],
    certifications: [
        t('tipsCard.certifications.1', "List your most relevant certifications first to grab the recruiter's attention."),
        t('tipsCard.certifications.2', "Include the full, official name of the certification to ensure it's recognized by ATS."),
        t('tipsCard.certifications.3', "If a certification has an expiry date, make sure to include it, especially if it's still active."),
    ],
    languages: [
        t('tipsCard.languages.1', 'List languages you are professionally proficient in.'),
        t('tipsCard.languages.2', "Use standard proficiency levels like 'Native', 'Fluent', or 'Conversational'."),
        t('tipsCard.languages.3', 'Only include languages if they are relevant to the job or you have a high proficiency.'),
    ],
    awards: [
        t('tipsCard.awards.1', 'Highlight recognition that demonstrates excellence in your field.'),
        t('tipsCard.awards.2', 'Include awards from professional associations, previous employers, or academic institutions.'),
        t('tipsCard.awards.3', "Briefly explain the significance of the award if it's not immediately obvious."),
    ],
    trainings: [
        t('tipsCard.trainings.1', 'List workshops, bootcamps, or seminars that enhanced your professional skills.'),
        t('tipsCard.trainings.2', 'Focus on training that is relevant to the position you are applying for.'),
        t('tipsCard.trainings.3', 'Include the organizing body and date to add credibility.'),
    ],
    publications: [
        t('tipsCard.publications.1', 'List articles, books, or research papers you have authored or co-authored.'),
        t('tipsCard.publications.2', 'Include the title, publication date, and publisher or journal name.'),
        t('tipsCard.publications.3', 'Add a link to the publication if available online.'),
    ],
    volunteer: [
        t('tipsCard.volunteer.1', 'Highlight volunteer roles that demonstrate leadership or relevant skills.'),
        t('tipsCard.volunteer.2', 'Include the organization name, your role, and the dates of service.'),
        t('tipsCard.volunteer.3', 'Describe your impact or key contributions, similar to professional experience.'),
    ],
    custom: [
        t('tipsCard.custom.1', "Use this section for anything that doesn't fit elsewhere, like Hobbies, Interests, or Patents."),
        t('tipsCard.custom.2', 'Keep it relevant to the job or showcase your personality in a professional way.'),
        t('tipsCard.custom.3', 'Ensure the title clearly describes the content of this section.'),
    ],
    customize: [
        t('tipsCard.customize.1', 'Enable sections that showcase your unique strengths.'),
        t('tipsCard.customize.2', 'Hide sections that are empty or not relevant to the specific job application.'),
        t('tipsCard.customize.3', 'Tailoring your resume structure can help emphasize your most impactful qualifications.'),
    ],
    finalize: [
        t('tipsCard.finalize.1', 'Proofread everything! Check for spelling and grammar errors.'),
        t('tipsCard.finalize.2', 'Ask a friend or colleague to review your resume.'),
        t('tipsCard.finalize.3', "Save the PDF with a clear file name, like 'FirstName_LastName_Resume.pdf'."),
    ],
});

const TipsCard: React.FC<TipsCardProps> = ({ activeSection }) => {
    const { t } = useTranslation();
    const tips = getTips(t);
    const currentTips = tips[activeSection] || tips['contact'];

    return (
        <div className="bg-gradient-to-br from-secondary-light to-blue-100 p-6 rounded-2xl mt-8 border border-secondary/20">
            <h3 className="text-secondary font-bold text-lg mb-4">{t('tipsCard.heading', '💡 Pro Tips')}</h3>
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
