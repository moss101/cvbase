import React, { useState, useEffect } from 'react';

interface HeaderProps {
    onLogin: () => void;
    onCreateCV: () => void;
    onNavigate: (target: 'templates' | 'builder' | 'examples' | 'resources' | 'pricing') => void;
}

const NAV_LINKS: { label: string; target: 'templates' | 'builder' | 'examples' | 'resources' | 'pricing' }[] = [
    { label: 'Templates', target: 'templates' },
    { label: 'Builder', target: 'builder' },
    { label: 'Examples', target: 'examples' },
    { label: 'Resources', target: 'resources' },
    { label: 'Pricing', target: 'pricing' },
];

const Wordmark: React.FC<{ inverted?: boolean }> = ({ inverted }) => (
    <span className={`font-display text-[1.45rem] font-semibold tracking-tight leading-none ${inverted ? 'text-paper' : 'text-ink'}`}>
        CVbase<span className="text-ember">.</span>
    </span>
);

const Header: React.FC<HeaderProps> = ({ onLogin, onCreateCV, onNavigate }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Lock body scroll while the overlay menu is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const handleNav = (target: 'templates' | 'builder' | 'examples' | 'resources' | 'pricing') => {
        setMobileOpen(false);
        onNavigate(target);
    };

    return (
        <>
            <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5 pointer-events-none">
                <nav
                    aria-label="Main"
                    className={`pointer-events-auto mx-auto max-w-5xl rounded-full border backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        scrolled
                            ? 'bg-paper/85 border-ink/10 shadow-[0_12px_40px_-12px_rgba(27,23,19,0.18)]'
                            : 'bg-paper/60 border-ink/[0.07] shadow-[0_4px_24px_-12px_rgba(27,23,19,0.10)]'
                    }`}
                >
                    <div className="flex h-14 items-center justify-between pl-6 pr-2.5 gap-4">
                        <a
                            href="#top"
                            onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="shrink-0"
                            aria-label="CVbase home"
                        >
                            <Wordmark />
                        </a>

                        {/* Desktop nav */}
                        <div className="hidden lg:flex items-center gap-0.5">
                            {NAV_LINKS.map((link) => (
                                <button
                                    key={link.target}
                                    onClick={() => handleNav(link.target)}
                                    className="px-3.5 py-2 rounded-full text-[0.9rem] font-medium text-ink-soft hover:text-ink hover:bg-ink/[0.05] transition-colors duration-300"
                                >
                                    {link.label}
                                </button>
                            ))}
                        </div>

                        {/* Desktop actions */}
                        <div className="hidden lg:flex items-center gap-1.5">
                            <button
                                onClick={onLogin}
                                className="px-4 py-2 rounded-full text-[0.9rem] font-semibold text-ink hover:bg-ink/[0.05] transition-colors duration-300"
                            >
                                Log in
                            </button>
                            <button
                                onClick={onCreateCV}
                                className="group flex items-center gap-2 pl-5 pr-1.5 py-1.5 rounded-full text-[0.9rem] font-semibold text-paper bg-ink hover:bg-ink/90 active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                            >
                                Create CV
                                <span className="grid place-items-center w-8 h-8 rounded-full bg-ember text-paper transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:scale-105" aria-hidden="true">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </button>
                        </div>

                        {/* Hamburger — two lines morph into an X */}
                        <button
                            className="lg:hidden relative grid place-items-center w-11 h-11 rounded-full hover:bg-ink/[0.05] transition-colors duration-300"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-expanded={mobileOpen}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                        >
                            <span
                                className={`absolute h-[1.5px] w-5 bg-ink rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                    mobileOpen ? 'rotate-45 translate-y-0' : '-translate-y-[3.5px]'
                                }`}
                            />
                            <span
                                className={`absolute h-[1.5px] w-5 bg-ink rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                    mobileOpen ? '-rotate-45 translate-y-0' : 'translate-y-[3.5px]'
                                }`}
                            />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Full-screen overlay menu */}
            <div
                className={`lg:hidden fixed inset-0 z-40 bg-paper/95 backdrop-blur-2xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-hidden={!mobileOpen}
            >
                <div className="flex flex-col justify-between h-full px-8 pt-32 pb-10">
                    <nav aria-label="Mobile">
                        <ul className="space-y-1">
                            {NAV_LINKS.map((link, i) => (
                                <li key={link.target} className="overflow-hidden">
                                    <button
                                        onClick={() => handleNav(link.target)}
                                        className={`block font-display text-4xl font-medium text-ink py-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-ember hover:italic ${
                                            mobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                                        }`}
                                        style={{ transitionDelay: mobileOpen ? `${100 + i * 60}ms` : '0ms' }}
                                    >
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div
                        className={`space-y-3 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            mobileOpen ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                        }`}
                        style={{ transitionDelay: mobileOpen ? '420ms' : '0ms' }}
                    >
                        <button
                            onClick={() => { setMobileOpen(false); onCreateCV(); }}
                            className="group flex w-full items-center justify-between pl-6 pr-2 py-2 rounded-full text-base font-semibold text-paper bg-ink active:scale-[0.98] transition-transform duration-300"
                        >
                            Create my CV
                            <span className="grid place-items-center w-10 h-10 rounded-full bg-ember text-paper" aria-hidden="true">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </span>
                        </button>
                        <button
                            onClick={() => { setMobileOpen(false); onLogin(); }}
                            className="w-full py-3.5 rounded-full text-base font-semibold text-ink border border-ink/15 hover:bg-ink/[0.04] transition-colors duration-300"
                        >
                            Log in
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Header;
