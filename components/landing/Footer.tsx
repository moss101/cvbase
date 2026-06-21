import React from 'react';

interface FooterProps {
    onNavigate: (target: 'templates' | 'builder' | 'examples' | 'resources' | 'pricing') => void;
}

const FOOTER_COLUMNS: { heading: string; links: { label: string; target: 'templates' | 'builder' | 'examples' | 'resources' | 'pricing' }[] }[] = [
    {
        heading: 'Product',
        links: [
            { label: 'Templates', target: 'templates' },
            { label: 'CV Builder', target: 'builder' },
            { label: 'Examples', target: 'examples' },
            { label: 'Pricing', target: 'pricing' },
        ],
    },
    {
        heading: 'Resources',
        links: [
            { label: 'Career Guides', target: 'resources' },
            { label: 'CV Writing Tips', target: 'resources' },
            { label: 'Interview Prep', target: 'resources' },
            { label: 'Help Center', target: 'resources' },
        ],
    },
];

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    return (
        <footer className="bg-ink text-paper/70 border-t border-paper/[0.08]">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
                <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
                    {/* Brand */}
                    <div>
                        <span className="font-display text-2xl font-semibold tracking-tight text-paper">
                            CVbase<span className="text-ember">.</span>
                        </span>
                        <p className="mt-5 text-[0.92rem] leading-relaxed text-paper/45 max-w-xs">
                            The CV builder for people who want replies. Professional, ATS-proof CVs,
                            typeset in minutes.
                        </p>
                        <p className="mt-6 flex items-center gap-2 font-label text-[0.64rem] tracking-[0.16em] uppercase text-paper/35">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                            </svg>
                            Encrypted · never sold
                        </p>
                    </div>

                    {FOOTER_COLUMNS.map((column) => (
                        <nav key={column.heading} aria-label={column.heading}>
                            <h3 className="font-label text-[0.64rem] tracking-[0.22em] uppercase text-paper/35 mb-5">{column.heading}</h3>
                            <ul className="space-y-3">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        <button
                                            onClick={() => onNavigate(link.target)}
                                            className="text-[0.92rem] text-paper/70 hover:text-paper transition-colors duration-300"
                                        >
                                            {link.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}

                    <nav aria-label="Company">
                        <h3 className="font-label text-[0.64rem] tracking-[0.22em] uppercase text-paper/35 mb-5">Company</h3>
                        <ul className="space-y-3">
                            {['About', 'Privacy Policy', 'Terms of Service', 'Contact'].map((label) => (
                                <li key={label}>
                                    <a
                                        href="#"
                                        onClick={(e) => e.preventDefault()}
                                        className="text-[0.92rem] text-paper/70 hover:text-paper transition-colors duration-300"
                                    >
                                        {label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="mt-16 pt-8 border-t border-paper/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-label text-[0.66rem] tracking-[0.12em] text-paper/35">
                        © {new Date().getFullYear()} CVBASE — SET IN FRAUNCES & INSTRUMENT SANS
                    </p>
                    <p className="font-label text-[0.66rem] tracking-[0.12em] text-paper/35">
                        MADE FOR THE SHORTLIST<span className="text-ember">.</span>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
