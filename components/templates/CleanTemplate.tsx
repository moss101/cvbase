
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';

const CleanTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const themeColor = settings?.themeColor || '#000000';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <section key="summary" data-section="summary" className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 break-after-avoid" style={{ color: themeColor }}>Profile</h2>
                        <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </section>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <section key="experience" data-section="experience" className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 break-after-avoid" style={{ color: themeColor }}>Professional Experience</h2>
                        <div className="space-y-6">
                            {experience.map(exp => (
                                <div className="break-inside-avoid" key={exp.id}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-lg text-black">{exp.jobTitle}</h3>
                                        <span className="text-sm text-gray-500">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-700 mb-2">{exp.company}, {exp.location}</div>
                                    <div className="leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <section key="education" data-section="education" className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-4 break-after-avoid" style={{ color: themeColor }}>Education</h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div className="break-inside-avoid" key={edu.id}>
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-bold text-black">{edu.school}</h3>
                                        <span className="text-sm text-gray-500">{edu.startDate} – {edu.endDate}</span>
                                    </div>
                                    <div className="text-gray-700">{edu.degree}</div>
                                    <div className="text-gray-500 text-sm">{edu.location}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <section key="skills" data-section="skills" className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 break-after-avoid" style={{ color: themeColor }}>Skills</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="bg-gray-100 px-2 py-1 rounded text-black">{skill}</span>
                            ))}
                        </div>
                    </section>
                ) : null;
            default: {
                const generic: Partial<Record<SectionId, { title: string; data: any[] | undefined }>> = {
                    projects: { title: 'Projects', data: projects },
                    certifications: { title: 'Certifications', data: certifications },
                    awards: { title: 'Awards', data: awards },
                    publications: { title: 'Publications', data: publications },
                    trainings: { title: 'Training', data: trainings },
                    volunteer: { title: 'Volunteering', data: volunteer },
                };
                const section = generic[id];
                return section && section.data && section.data.length > 0 ? (
                    <section key={id} data-section={id} className="mb-8">
                        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 break-after-avoid" style={{ color: themeColor }}>{section.title}</h2>
                        <div className="space-y-3">
                            {section.data.map((item: any) => (
                                <div key={item.id} className="break-inside-avoid">
                                    <p className="font-bold text-black">{item.name || item.title || item.course || item.role || item.organization}</p>
                                    {(item.subtitle || item.technologies || item.publisher || item.institution) && <p className="text-gray-600 text-sm">{item.subtitle || item.technologies || item.publisher || item.institution}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null;
            }
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div id={isCardPreview ? undefined : "resume-preview-clean"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#333] p-12 ${fontSize} font-sans`} style={{ fontFamily: settings?.fontFamily || 'Arial, sans-serif' }}>
            <header className="mb-10">
                <h1 className="text-4xl font-bold mb-2 tracking-tight" style={{ color: themeColor }}>{contact.firstName} {contact.lastName}</h1>
                <p className="text-xl text-gray-600 mb-4">{contact.jobTitle}</p>
                <div className="text-sm text-gray-500 space-y-1">
                    {fullAddress && <div>{fullAddress}</div>}
                    <div className="flex gap-4">
                        {fullPhone && <span>{fullPhone}</span>}
                        {contact.email && <span>{contact.email}</span>}
                    </div>
                    <div className="flex gap-4">
                         {contact.linkedin && <span>{contact.linkedin}</span>}
                         {contact.website && <span>{contact.website}</span>}
                    </div>
                </div>
            </header>

            {renderRun(['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards', 'publications', 'trainings', 'volunteer'])}


        </div>
    );
};

export default React.memo(CleanTemplate);
