
import React from 'react';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import type { ResumePreviewProps, SectionId } from '../../types';
import { orderedSections } from '../../lib/templates/sectionOrder';
import { countries } from '../../data/locationData';
import { Award, BookOpen, Brain, Briefcase, Ellipsis, GraduationCap, HeartHandshake, Languages, Lightbulb, Rocket, Trophy } from 'lucide-react';

const BloomTemplate: React.FC<ResumePreviewProps> = ({ formData, isCardPreview, visibleSections, settings }) => {
    const { contact, summary, experience, projects, education, skills, certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const primaryColor = settings?.themeColor || '#ec4899'; // Pink 500 default
    const bgSoft = `${primaryColor}15`; // 10% opacity
    
    const fontSize = settings?.fontSize === 'small' ? 'text-[9px]' : settings?.fontSize === 'large' ? 'text-[11px]' : 'text-[10px]';
    const countryName = countries.find(c => c.code === contact.country)?.name || contact.country;
    const city = contact.city === 'Other' ? contact.customCity : contact.city;
    const fullAddress = [contact.address, city, countryName].filter(Boolean).join(', ');

    const renderSection = (id: SectionId): React.ReactNode => {
        switch (id) {
            case 'summary':
                return summary.professionalSummary ? (
                    <div key="summary" data-section="summary" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-3 break-after-avoid" style={{ color: primaryColor }}>About Me</h2>
                        <div className="text-xs leading-relaxed text-gray-600 text-justify" dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary.professionalSummary) }} />
                    </div>
                ) : null;
            case 'experience':
                return experience.length > 0 ? (
                    <div key="experience" data-section="experience" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-5 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Briefcase aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Experience
                        </h2>
                        <div className="space-y-8">
                            {experience.map(exp => (
                                <div key={exp.id} className="group break-inside-avoid">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-800">{exp.jobTitle}</h3>
                                            <p className="text-xs font-bold" style={{ color: primaryColor }}>{exp.company}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-[9px] font-bold border border-gray-100">
                                            {exp.startDate} — {exp.endDate}
                                        </span>
                                    </div>
                                    <div className="text-xs leading-relaxed text-gray-600 pl-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(exp.description) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'education':
                return education.length > 0 ? (
                    <div key="education" data-section="education" className="bg-white p-5 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <GraduationCap aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Education
                        </h2>
                        <div className="space-y-4">
                            {education.map(edu => (
                                <div key={edu.id} className="relative pl-3 border-l-2 border-gray-100 break-inside-avoid">
                                    <h3 className="font-bold text-xs">{edu.degree}</h3>
                                    <p className="text-xs text-gray-500 font-medium">{edu.school}</p>
                                    <p className="text-[9px] text-gray-400 mt-1">{edu.startDate} - {edu.endDate}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'skills':
                return skills.length > 0 ? (
                    <div key="skills" data-section="skills" className="bg-white p-5 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Brain aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Skills
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-lg text-[9px] font-bold" style={{ backgroundColor: bgSoft, color: primaryColor }}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'projects':
                return projects.length > 0 ? (
                    <div key="projects" data-section="projects" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-5 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Rocket aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Projects
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {projects.map(item => (
                                <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow break-inside-avoid">
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <h3>{item.name}</h3>
                                        <span className="text-gray-400 font-normal">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[9px] font-bold mb-2" style={{ color: primaryColor }}>{item.technologies}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'certifications':
                return certifications.length > 0 ? (
                    <div key="certifications" data-section="certifications" className="bg-white p-5 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Award aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Certs
                        </h2>
                         <div className="space-y-2">
                            {certifications.map((cert, i) => (
                                <div key={i} className="mb-2 break-inside-avoid">
                                    <p className="font-bold text-xs">{cert.name}</p>
                                    <p className="text-[9px] text-gray-400">{cert.expiryDate}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'languages':
                return languages.length > 0 ? (
                    <div key="languages" data-section="languages" className="bg-white p-5 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Languages aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Languages
                        </h2>
                         <div className="space-y-2">
                            {languages.map((lang, i) => (
                                <div key={i} className="flex justify-between items-center break-inside-avoid">
                                    <span className="font-bold text-xs">{lang.language}</span>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{lang.proficiency}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'awards':
                return awards && awards.length > 0 ? (
                    <div key="awards" data-section="awards" className="bg-white p-5 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Trophy aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Awards
                        </h2>
                         <div className="space-y-2">
                            {awards.map((award, i) => (
                                <div key={i} className="mb-2 break-inside-avoid">
                                    <p className="font-bold text-xs">{award.title}</p>
                                    <p className="text-[9px] text-gray-400">{award.issuer} ({award.date})</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'trainings':
                return trainings && trainings.length > 0 ? (
                    <div key="trainings" data-section="trainings" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-5 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Lightbulb aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Training
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {trainings.map(item => (
                                <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow break-inside-avoid">
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <h3>{item.course}</h3>
                                        <span className="text-gray-400 font-normal">{item.date}</span>
                                    </div>
                                    <p className="text-[9px] font-bold mb-2" style={{ color: primaryColor }}>{item.institution}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'publications':
                return publications && publications.length > 0 ? (
                    <div key="publications" data-section="publications" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-5 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <BookOpen aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Publications
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {publications.map(item => (
                                <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow break-inside-avoid">
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <h3>{item.title}</h3>
                                        <span className="text-gray-400 font-normal">{item.date}</span>
                                    </div>
                                    <p className="text-[9px] font-bold mb-2" style={{ color: primaryColor }}>{item.publisher}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'volunteer':
                return volunteer && volunteer.length > 0 ? (
                    <div key="volunteer" data-section="volunteer" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-5 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <HeartHandshake aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Volunteering
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {volunteer.map(item => (
                                <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow break-inside-avoid">
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <h3>{item.role}</h3>
                                        <span className="text-gray-400 font-normal">{item.startDate} - {item.endDate}</span>
                                    </div>
                                    <p className="text-[9px] font-bold mb-2" style={{ color: primaryColor }}>{item.organization}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            case 'custom':
                return custom && custom.length > 0 ? (
                    <div key="custom" data-section="custom" className="bg-white p-6 rounded-2xl shadow-sm">
                        <h2 className="font-bold text-sm uppercase tracking-wide mb-5 flex items-center gap-2 break-after-avoid" style={{ color: primaryColor }}>
                            <Ellipsis aria-hidden="true" className="w-[1em] h-[1em] shrink-0 inline-block align-[-0.125em] text-lg" /> Additional
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {custom.map(item => (
                                <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow break-inside-avoid">
                                    <div className="flex justify-between font-bold text-xs mb-1">
                                        <h3>{item.title}</h3>
                                        <span className="text-gray-400 font-normal">{item.date}</span>
                                    </div>
                                    <p className="text-[9px] font-bold mb-2" style={{ color: primaryColor }}>{item.subtitle}</p>
                                    <div className="text-xs leading-relaxed text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.description) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null;
            default:
                return null;
        }
    };
    const renderRun = (ids: readonly SectionId[]): React.ReactNode[] =>
        orderedSections(formData, visibleSections, ids).map(renderSection);

    return (
        <div id={isCardPreview ? undefined : "resume-preview-bloom"} className={`w-[794px] min-h-[1123px] h-auto bg-[#fafafa] text-[#4a4a4a] ${fontSize} p-10 font-sans`} style={{ fontFamily: settings?.fontFamily || "'Lato', sans-serif" }}>
            
            <div className="bg-white rounded-[2rem] p-8 shadow-sm mb-8 flex items-center gap-8">
                {contact.photo && (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-md shrink-0" style={{ borderColor: primaryColor }}>
                        <img src={contact.photo} alt="User headshot" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1">
                    <h1 className="text-4xl font-bold text-gray-800 mb-1">{contact.firstName} {contact.lastName}</h1>
                    <p className="text-lg font-medium mb-4" style={{ color: primaryColor }}>{contact.jobTitle}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {contact.email && <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 flex items-center gap-1">✉️ {contact.email}</span>}
                        {contact.phone && <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 flex items-center gap-1">📞 {contact.phone}</span>}
                        {fullAddress && <span className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 flex items-center gap-1">📍 {city}</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Sidebar */}
                <aside className="col-span-1 space-y-6">
                     {renderRun(['skills', 'education', 'languages', 'certifications', 'awards'])}
                </aside>

                {/* Main Content */}
                <main className="col-span-2 space-y-6">
                     {renderRun(['summary', 'experience', 'projects', 'trainings', 'publications', 'volunteer', 'custom'])}

                </main>
            </div>
        </div>
    );
};

export default React.memo(BloomTemplate);
