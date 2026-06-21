import React from 'react';

/** Social-proof placeholders rendered as styled wordmarks (no image assets needed). */
const COMPANIES = [
    { name: 'Google', className: 'font-body font-bold tracking-tight' },
    { name: 'Microsoft', className: 'font-body font-semibold tracking-tight' },
    { name: 'amazon', className: 'font-body font-bold tracking-tight lowercase' },
    { name: 'Deloitte.', className: 'font-display font-semibold tracking-tight' },
    { name: 'PwC', className: 'font-display font-bold tracking-tight' },
    { name: 'Spotify', className: 'font-body font-bold tracking-tight' },
    { name: 'airbnb', className: 'font-body font-bold tracking-tight lowercase' },
    { name: 'KPMG', className: 'font-display font-bold italic tracking-tight' },
    { name: 'Siemens', className: 'font-label font-medium tracking-[0.14em] uppercase text-[0.78em]' },
    { name: 'HSBC', className: 'font-display font-bold tracking-tight' },
];

const TrustLogos: React.FC = () => {
    return (
        <section aria-label="Trusted by job seekers worldwide" className="border-y border-ink/[0.07] bg-paper-deep/60">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
                    <p className="shrink-0 font-label text-[0.66rem] tracking-[0.24em] uppercase text-ink-faint text-center lg:text-left lg:max-w-[200px] lg:leading-loose">
                        Our users were hired at
                    </p>

                    {/* Marquee */}
                    <div
                        className="relative flex-1 overflow-hidden w-full"
                        style={{
                            maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
                        }}
                    >
                        <ul className="flex items-center gap-14 w-max animate-marquee">
                            {[...COMPANIES, ...COMPANIES].map((company, i) => (
                                <li
                                    key={`${company.name}-${i}`}
                                    aria-hidden={i >= COMPANIES.length}
                                    className={`text-xl sm:text-2xl text-ink/30 whitespace-nowrap select-none transition-colors duration-500 hover:text-ink/70 ${company.className}`}
                                >
                                    {company.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TrustLogos;
