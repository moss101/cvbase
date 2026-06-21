
import React from 'react';
import type { ResumePreviewProps } from '../../types';
import { countries } from '../../data/locationData';

const VogueTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');
    const fullPhone = `${contact.phoneCountryCode || ''} ${contact.phone || ''}`.trim();

    return (
        <div id={isCardPreview ? undefined : "resume-preview-vogue"} className={`w-[794px] min-h-[1123px] h-auto bg-white text-[#1a1a1a] p-14 ${fontSize}`} style={{ fontFamily: settings?.fontFamily || "'Merriweather', serif" }}>
            
            <header className="text-center mb-12">
                <h1 className="text-5xl font-black uppercase tracking-widest mb-3 leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {contact.firstName} <span className="font-light">{contact.lastName}</span>
                </h1>
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-6">{contact.jobTitle}</p>
                
                <div className="flex justify-center gap-6 text-[9px] uppercase tracking-wider text-gray-600 font-sans border-t border-b border-black py-3">
                    {fullPhone && <span>{fullPhone}</span>}
                    {contact.email && <span>{contact.email}</span>}
                    {fullAddress && <span>{city}, {countryName}</span>}
                    {contact.linkedin && <span>LinkedIn</span>}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-10 max-w-3xl mx-auto">
                
                {summary.professionalSummary && (
                    <section className="text-center max-w-2xl mx-auto">
                        <div className="text-xs leading-7 font-serif italic text-gray-700 text-justify" dangerouslySetInnerHTML={{ __html: summary.professionalSummary }} />
                    </section>
                )}

                {experience.length > 0 && (
                    <section>
                        <h2 className="text-center text-base font-bold uppercase tracking-[0.2em] mb-8 border-b border-gray-200 pb-2 font-sans">Experience</h2>
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div key={exp.id} className="grid grid-cols-12 gap-4">
                                    <div className="col-span-3 text-right pt-1">
                                        <p className="font-sans font-bold text-[9px] uppercase tracking-wide">{exp.company}</p>
                                        <p className="font-sans text-[9px] text-gray-400 mt-1">{exp.startDate} — {exp.endDate}</p>
                                    </div>
                                    <div className="col-span-9 border-l border-gray-200 pl-6">
                                        <h3 className="font-serif font-bold text-sm mb-2 italic">{exp.jobTitle}</h3>
                                        <div className="font-sans text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: exp.description }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {visibleSections.includes('projects') && projects.length > 0 && (
                    <section>
                        <h2 className="text-center text-base font-bold uppercase tracking-[0.2em] mb-8 border-b border-gray-200 pb-2 font-sans">Selected Works</h2>
                        <div className="grid grid-cols-2 gap-8">
                            {projects.map(item => (
                                <div key={item.id} className="text-center">
                                    <h3 className="font-bold text-sm uppercase tracking-wide mb-1 font-sans">{item.name}</h3>
                                    <p className="text-[9px] font-sans text-gray-400 mb-2">{item.technologies}</p>
                                    <div className="font-serif text-xs text-gray-600 italic" dangerouslySetInnerHTML={{ __html: item.description }} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <div className="grid grid-cols-2 gap-12">
                     {education.length > 0 && (
                        <section>
                            <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Education</h2>
                            <div className="space-y-4 text-center">
                                {education.map(edu => (
                                    <div key={edu.id}>
                                        <h3 className="font-bold text-xs">{edu.school}</h3>
                                        <p className="font-serif italic text-gray-600">{edu.degree}</p>
                                        <p className="font-sans text-[9px] text-gray-400 mt-1">{edu.startDate} — {edu.endDate}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {skills.length > 0 && (
                         <section>
                            <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Skills</h2>
                            <div className="text-center font-sans text-gray-600 leading-6 uppercase text-[9px] tracking-wide">
                                {skills.join('  •  ')}
                            </div>
                        </section>
                    )}
                </div>

                {visibleSections.includes('certifications') && certifications.length > 0 && (
                    <section>
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Certifications</h2>
                         <div className="space-y-4 text-center">
                            {certifications.map(cert => (
                                <div key={cert.id}>
                                    <h3 className="font-bold text-xs">{cert.name}</h3>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {visibleSections.includes('awards') && awards && awards.length > 0 && (
                    <section>
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Honors</h2>
                         <div className="space-y-4 text-center">
                            {awards.map(award => (
                                <div key={award.id}>
                                    <h3 className="font-bold text-xs">{award.title}</h3>
                                    <p className="font-serif italic text-gray-600">{award.issuer}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{award.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('trainings') && trainings && trainings.length > 0 && (
                     <section>
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Training</h2>
                         <div className="space-y-4 text-center">
                            {trainings.map(item => (
                                <div key={item.id}>
                                    <h3 className="font-bold text-xs">{item.course}</h3>
                                    <p className="font-serif italic text-gray-600">{item.institution}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {visibleSections.includes('publications') && publications && publications.length > 0 && (
                     <section>
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Publications</h2>
                         <div className="space-y-4 text-center">
                            {publications.map(item => (
                                <div key={item.id}>
                                    <h3 className="font-bold text-xs">{item.title}</h3>
                                    <p className="font-serif italic text-gray-600">{item.publisher}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {visibleSections.includes('volunteer') && volunteer && volunteer.length > 0 && (
                     <section>
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Volunteering</h2>
                         <div className="space-y-4 text-center">
                            {volunteer.map(item => (
                                <div key={item.id}>
                                    <h3 className="font-bold text-xs">{item.role}</h3>
                                    <p className="font-serif italic text-gray-600">{item.organization}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.startDate} - {item.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                 {visibleSections.includes('custom') && custom && custom.length > 0 && (
                     <section>
                        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 font-sans">Additional</h2>
                         <div className="space-y-4 text-center">
                            {custom.map(item => (
                                <div key={item.id}>
                                    <h3 className="font-bold text-xs">{item.title}</h3>
                                    <p className="font-serif italic text-gray-600">{item.subtitle}</p>
                                    <p className="font-sans text-[9px] text-gray-400 mt-1">{item.date}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </div>
    );
};

export default VogueTemplate;
