
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const ClassicTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const fontSize = settings?.fontSize === 'small' ? 'text-[10px]' : settings?.fontSize === 'large' ? 'text-[12px]' : 'text-[11px]';
    const themeColor = settings?.themeColor || '#000000';
    
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-classic"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-black p-14 ${fontSize} leading-normal`} style={{ fontFamily: settings?.fontFamily || 'Times New Roman, serif' }}>
            <header className="text-center border-b-2 pb-6 mb-6" style={{ borderColor: themeColor }}>
                <h1 className="text-3xl font-bold uppercase tracking-wide mb-2" style={{ color: themeColor }}>{contact.firstName} {contact.lastName}</h1>
                <p className="text-lg mb-3 font-medium">{contact.jobTitle}</p>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                    {fullPhone && <span>{fullPhone}</span>}
                    {fullPhone && contact.email && <span>•</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {contact.email && fullAddress && <span>•</span>}
                    {fullAddress && <span>{fullAddress}</span>}
                    {fullAddress && contact.linkedin && <span>•</span>}
                    {contact.linkedin && <span>{contact.linkedin}</span>}
                </div>
            </header>

            {summary.professionalSummary && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Professional Summary</h2>
                    <div className="text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                </section>
            )}

            {skills.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Core Competencies</h2>
                    <p className="leading-relaxed">{skills.join(' • ')}</p>
                </section>
            )}

            {experience.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Experience</h2>
                    <div className="space-y-5">
                        {experience.map(exp => (
                            <div key={exp.id} className="break-inside-avoid">
                                <div className="flex justify-between font-bold text-[1.1em] mb-1">
                                    <h3>{exp.company}</h3>
                                    <span>{exp.startDate} – {exp.endDate}</span>
                                </div>
                                <div className="flex justify-between italic mb-2">
                                    <span>{exp.jobTitle}</span>
                                    <span>{exp.location}</span>
                                </div>
                                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {education.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>Education</h2>
                    <div className="space-y-3">
                        {education.map(edu => (
                            <div key={edu.id} className="break-inside-avoid">
                                <div className="flex justify-between font-bold text-[1.1em]">
                                    <h3>{edu.school}</h3>
                                    <span>{edu.startDate} – {edu.endDate}</span>
                                </div>
                                <div className="flex justify-between italic">
                                    <span>{edu.degree}</span>
                                    <span>{edu.location}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
            
            {/* Optional sections rendered with standard ATS formatting */}
            {[
                { id: 'projects', title: 'Projects', data: projects },
                { id: 'certifications', title: 'Certifications', data: certifications },
                { id: 'awards', title: 'Awards', data: awards },
                { id: 'publications', title: 'Publications', data: publications },
                { id: 'trainings', title: 'Training', data: trainings },
                { id: 'volunteer', title: 'Volunteering', data: volunteer },
                { id: 'custom', title: 'Additional', data: custom }
            ].map(section => (
                visibleSections.includes(section.id as any) && section.data && section.data.length > 0 && (
                    <section key={section.id} className="mb-6">
                         <h2 className="text-base font-bold uppercase border-b border-gray-300 mb-3 pb-1" style={{ color: themeColor }}>{section.title}</h2>
                         <div className="space-y-3">
                            {section.data.map((item: any) => (
                                <div key={item.id} className="break-inside-avoid">
                                    <div className="flex justify-between font-bold">
                                        <h3>{item.name || item.title || item.course || item.role || item.organization}</h3>
                                        <span>{item.date || item.expiryDate || (item.startDate ? `${item.startDate} - ${item.endDate}` : '')}</span>
                                    </div>
                                    {(item.subtitle || item.technologies || item.publisher || item.institution || item.organization) && (
                                        <p className="italic text-sm mb-1">{item.subtitle || item.technologies || item.publisher || item.institution || item.organization}</p>
                                    )}
                                    {item.description && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />}
                                </div>
                            ))}
                         </div>
                    </section>
                )
            ))}
        </div>
    );
};

export default ClassicTemplate;
