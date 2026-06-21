import React from 'react';
import type { ResumeData, SectionId } from '../../types';

interface OptionalSectionsRendererProps {
    formData: ResumeData;
    visibleSections: SectionId[];
    excludeSections?: SectionId[];
    fontClass?: string;
    textClass?: string;
    titleClass?: string;
    subtextClass?: string;
    accentColor?: string;
    compact?: boolean;
    renderHeader: (title: string, stationCode?: string) => React.ReactNode;
}

export const OptionalSectionsRenderer: React.FC<OptionalSectionsRendererProps> = ({
    formData,
    visibleSections,
    excludeSections = [],
    fontClass = 'font-sans',
    textClass = 'text-slate-600 text-xs',
    titleClass = 'font-bold text-slate-800 text-xs',
    subtextClass = 'italic text-stone-500 text-[10px]',
    accentColor = '#0284C7',
    compact = false,
    renderHeader
}) => {
    const { certifications, languages, awards, trainings, publications, volunteer, custom } = formData;
    const exclude = new Set(excludeSections);

    const isVisible = (id: SectionId, items: any[] | undefined) => {
        return visibleSections.includes(id) && items && items.length > 0 && !exclude.has(id);
    };

    const spacingClass = compact ? 'mb-2.5' : 'mb-4';
    const itemSpacingClass = compact ? 'space-y-1' : 'space-y-2';

    return (
        <div className={`mt-2 ${fontClass}`}>
            {/* Certifications */}
            {isVisible('certifications', certifications) && (
                <section className={spacingClass}>
                    {renderHeader('Certifications', 'CERT')}
                    <div className={itemSpacingClass}>
                        {certifications.map((cert) => (
                            <div key={cert.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className={titleClass}>{cert.name}</h3>
                                    {cert.expiryDate && (
                                        <span className={subtextClass}>{cert.expiryDate}</span>
                                    )}
                                </div>
                                {cert.number && (
                                    <p className={`${subtextClass} leading-tight`}>License / ID: {cert.number}</p>
                                )}
                                {cert.description && (
                                    <p className={`${textClass} leading-relaxed mt-0.5`}>{cert.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Languages */}
            {isVisible('languages', languages) && (
                <section className={spacingClass}>
                    {renderHeader('Languages', 'LANG')}
                    <div className="flex flex-wrap gap-2">
                        {languages.map((lang) => (
                            <div 
                                key={lang.id} 
                                className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[11px] leading-tight flex items-baseline gap-1"
                            >
                                <span className={titleClass}>{lang.language}</span>
                                <span className={`${subtextClass} text-[9px]`}>({lang.proficiency})</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Awards */}
            {isVisible('awards', awards) && (
                <section className={spacingClass}>
                    {renderHeader('Awards', 'AWRD')}
                    <div className={itemSpacingClass}>
                        {awards.map((award) => (
                            <div key={award.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className={titleClass}>{award.title}</h3>
                                    <span className={subtextClass}>{award.date}</span>
                                </div>
                                <p className={subtextClass}>{award.issuer}</p>
                                {award.description && (
                                    <p className={`${textClass} leading-relaxed mt-0.5`}>{award.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Trainings & Courses */}
            {isVisible('trainings', trainings) && (
                <section className={spacingClass}>
                    {renderHeader('Trainings & Courses', 'TRNG')}
                    <div className={itemSpacingClass}>
                        {trainings.map((t) => (
                            <div key={t.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className={titleClass}>{t.course}</h3>
                                    <span className={subtextClass}>{t.date}</span>
                                </div>
                                <p className={subtextClass}>{t.institution}</p>
                                {t.description && (
                                    <p className={`${textClass} leading-relaxed mt-0.5`}>{t.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Publications */}
            {isVisible('publications', publications) && (
                <section className={spacingClass}>
                    {renderHeader('Publications', 'PUBL')}
                    <div className={itemSpacingClass}>
                        {publications.map((pub) => (
                            <div key={pub.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className={titleClass}>{pub.title}</h3>
                                    <span className={subtextClass}>{pub.date}</span>
                                </div>
                                <p className={subtextClass}>{pub.publisher}</p>
                                {pub.link && (
                                    <a 
                                        href={pub.link} 
                                        target="_blank" 
                                        referrerPolicy="no-referrer"
                                        rel="noopener noreferrer" 
                                        className="text-[10px] hover:underline block leading-tight break-all"
                                        style={{ color: accentColor }}
                                    >
                                        {pub.link}
                                    </a>
                                )}
                                {pub.description && (
                                    <p className={`${textClass} leading-relaxed mt-0.5`}>{pub.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Volunteering */}
            {isVisible('volunteer', volunteer) && (
                <section className={spacingClass}>
                    {renderHeader('Volunteering', 'VOL')}
                    <div className={itemSpacingClass}>
                        {volunteer.map((v) => (
                            <div key={v.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className={titleClass}>{v.role} @ {v.organization}</h3>
                                    <span className={subtextClass}>{v.startDate} – {v.endDate}</span>
                                </div>
                                {v.location && <p className={subtextClass}>{v.location}</p>}
                                {v.description && (
                                    <p className={`${textClass} leading-relaxed mt-0.5`}>{v.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Custom Section */}
            {isVisible('custom', custom) && (
                <section className={spacingClass}>
                    {renderHeader(custom[0]?.title ? 'Additional Profile' : 'Custom Section', 'CUST')}
                    <div className={itemSpacingClass}>
                        {custom.map((item) => (
                            <div key={item.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h3 className={titleClass}>{item.title}</h3>
                                    <span className={subtextClass}>{item.date}</span>
                                </div>
                                {item.subtitle && <p className={subtextClass}>{item.subtitle}</p>}
                                {item.description && (
                                    <p className={`${textClass} leading-relaxed mt-0.5`}>{item.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
