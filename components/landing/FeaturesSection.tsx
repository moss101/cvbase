import React from 'react';
import { motion } from 'motion/react';

const cardReveal = (delay: number) => ({
    initial: { opacity: 0, y: 36 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.7, delay, ease: [0.32, 0.72, 0, 1] },
});

/* Double-bezel: outer shell + inner bright core */
const cardClass =
    'group relative flex flex-col rounded-[1.75rem] bg-ink/[0.04] ring-1 ring-ink/[0.07] p-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_32px_70px_-26px_rgba(27,23,19,0.35)] hover:-translate-y-1';

const innerClass =
    'flex flex-col flex-1 rounded-[calc(1.75rem-0.5rem)] bg-paper-bright shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] p-6 sm:p-7';

const FeaturesSection: React.FC = () => {
    return (
        <section id="features" className="py-24 lg:py-36 bg-paper-deep/50 border-y border-ink/[0.06]">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    className="max-w-2xl mb-16 lg:mb-20"
                >
                    <p className="font-label text-[0.7rem] tracking-[0.24em] uppercase text-ink-faint">
                        02 <span className="text-ember">—</span> The toolkit
                    </p>
                    <h2 className="mt-5 font-display font-medium tracking-[-0.015em] text-ink text-4xl sm:text-5xl leading-[1.08] [text-wrap:balance]">
                        Every tool between a blank page and a <span className="italic text-ember">signed offer</span>.
                    </h2>
                </motion.div>

                <div className="grid lg:grid-cols-12 gap-5 lg:gap-6">
                    {/* AI Content Assistant — wide card with before/after rewrite UI */}
                    <motion.article {...cardReveal(0)} className={`${cardClass} lg:col-span-7`}>
                        <div className={innerClass}>
                            <div className="flex-1 mb-7 rounded-2xl bg-paper border border-ink/[0.06] p-5 sm:p-6">
                                {/* Before */}
                                <div className="rounded-xl bg-paper-bright border border-ink/[0.08] p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-label text-[0.6rem] tracking-[0.18em] uppercase text-ink-faint">Your draft</span>
                                        <span className="px-2 py-0.5 rounded-md bg-ink/[0.05] text-ink-faint text-[0.65rem] font-semibold">Weak</span>
                                    </div>
                                    <p className="text-[0.9rem] text-ink-faint line-through decoration-ink/20">
                                        Responsible for managing the company's social media accounts.
                                    </p>
                                </div>

                                {/* Editor's arrow */}
                                <div className="flex items-center justify-center gap-2.5 py-3">
                                    <span className="grid place-items-center w-7 h-7 rounded-full bg-ink">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="#FAF7F2" />
                                        </svg>
                                    </span>
                                    <span className="font-label text-[0.66rem] tracking-[0.18em] uppercase text-ink-soft">AI rewrite</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-ember" aria-hidden="true">
                                        <path d="M12 5v14m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>

                                {/* After */}
                                <div className="rounded-xl bg-paper-bright border-2 border-ember/60 p-4 shadow-[0_14px_30px_-12px_rgba(200,68,44,0.3)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-label text-[0.6rem] tracking-[0.18em] uppercase text-ember">Suggested</span>
                                        <span className="px-2 py-0.5 rounded-md bg-ember-tint text-ember-deep text-[0.65rem] font-semibold">✓ Strong</span>
                                    </div>
                                    <p className="text-[0.9rem] text-ink font-medium">
                                        Grew engagement 340% across 5 channels, converting 12k followers into a qualified lead pipeline worth $86k/quarter.
                                    </p>
                                    <div className="flex gap-2 mt-3.5">
                                        <span className="px-3.5 py-1.5 rounded-full bg-ink text-paper text-[0.72rem] font-semibold cursor-default">Accept</span>
                                        <span className="px-3.5 py-1.5 rounded-full bg-ink/[0.05] text-ink-soft text-[0.72rem] font-semibold cursor-default">Try another</span>
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-display text-2xl font-semibold text-ink">The AI editor</h3>
                            <p className="mt-2.5 text-[0.97rem] leading-relaxed text-ink-soft max-w-lg">
                                It rewrites vague duties into quantified achievements — the language recruiters
                                shortlist. Every suggestion is yours to accept, sharpen, or ignore.
                            </p>
                        </div>
                    </motion.article>

                    {/* ATS Checker — gauge + checklist */}
                    <motion.article {...cardReveal(0.1)} className={`${cardClass} lg:col-span-5`}>
                        <div className={innerClass}>
                            <div className="flex-1 mb-7 rounded-2xl bg-paper border border-ink/[0.06] p-5 flex flex-col items-center justify-center gap-5">
                                <div className="relative w-28 h-28">
                                    <svg viewBox="0 0 112 112" className="w-28 h-28 -rotate-90">
                                        <circle cx="56" cy="56" r="46" fill="none" stroke="#E9E2D5" strokeWidth="9" />
                                        <motion.circle
                                            cx="56" cy="56" r="46" fill="none" stroke="#C8442C" strokeWidth="9" strokeLinecap="round"
                                            strokeDasharray="289"
                                            initial={{ strokeDashoffset: 289 }}
                                            whileInView={{ strokeDashoffset: 17 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="font-display text-4xl font-semibold text-ink">94</span>
                                        <span className="font-label text-[0.55rem] tracking-[0.2em] uppercase text-ink-faint mt-0.5">ATS Score</span>
                                    </div>
                                </div>
                                <ul className="w-full max-w-[230px] space-y-2.5">
                                    {['Keywords matched', 'Clean structure', 'Parseable fonts'].map((check) => (
                                        <li key={check} className="flex items-center gap-3 text-[0.85rem] font-medium text-ink-soft">
                                            <span className="grid place-items-center w-5 h-5 rounded-md bg-ember-tint text-ember-deep shrink-0">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                            {check}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <h3 className="font-display text-2xl font-semibold text-ink">The ATS checker</h3>
                            <p className="mt-2.5 text-[0.97rem] leading-relaxed text-ink-soft">
                                Score your CV against tracking systems before you apply — and fix every red flag in one click.
                            </p>
                        </div>
                    </motion.article>

                    {/* Templates — mini thumbnails */}
                    <motion.article {...cardReveal(0)} className={`${cardClass} lg:col-span-5`}>
                        <div className={innerClass}>
                            <div className="flex-1 mb-7 rounded-2xl bg-paper border border-ink/[0.06] p-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-paper-bright border border-ink/[0.08] overflow-hidden group-hover:-translate-y-1 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
                                        <div className="h-5 bg-ink" />
                                        <div className="p-2.5 space-y-1.5">
                                            <div className="h-1 rounded-full bg-ink/[0.12] w-full" />
                                            <div className="h-1 rounded-full bg-ink/[0.12] w-3/4" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-full" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-1/2" />
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-paper-bright border border-ink/[0.08] overflow-hidden flex group-hover:-translate-y-1 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] delay-75">
                                        <div className="w-1/3 bg-ink" />
                                        <div className="flex-1 p-2.5 space-y-1.5">
                                            <div className="h-1 rounded-full bg-ink/[0.12] w-full" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-2/3" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-full" />
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-paper-bright border border-ink/[0.08] overflow-hidden group-hover:-translate-y-1 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] delay-100">
                                        <div className="h-5 bg-ember" />
                                        <div className="p-2.5 space-y-1.5">
                                            <div className="h-1 rounded-full bg-ink/[0.12] w-5/6" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-full" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-2/3" />
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-paper-bright border border-ink/[0.08] overflow-hidden relative group-hover:-translate-y-1 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] delay-150">
                                        <div className="p-2.5 space-y-1.5">
                                            <div className="h-1.5 rounded-full bg-ink/20 w-1/2" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-full" />
                                            <div className="h-1 rounded-full bg-ink/[0.07] w-3/4" />
                                        </div>
                                        <div className="absolute inset-0 grid place-items-center bg-ink/90">
                                            <span className="text-paper font-label text-[0.7rem] tracking-[0.1em]">+36 more</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <h3 className="font-display text-2xl font-semibold text-ink">The templates</h3>
                            <p className="mt-2.5 text-[0.97rem] leading-relaxed text-ink-soft">
                                Industry-specific layouts, typeset like fine print. Switch designs anytime — your content carries over untouched.
                            </p>
                        </div>
                    </motion.article>

                    {/* Download & Share — export mock */}
                    <motion.article {...cardReveal(0.1)} className={`${cardClass} lg:col-span-7`}>
                        <div className={innerClass}>
                            <div className="flex-1 mb-7 rounded-2xl bg-paper border border-ink/[0.06] p-5 sm:p-6 flex flex-col justify-center gap-3">
                                <div className="flex items-center gap-3.5 rounded-xl bg-paper-bright border border-ink/[0.08] px-4 py-3.5">
                                    <span className="grid place-items-center w-10 h-10 rounded-lg bg-ember-tint text-ember-deep shrink-0">
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M6 3.5h9.5L19 7v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
                                            <path d="M8.5 14.5h7M8.5 17.5h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                                        </svg>
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[0.9rem] font-semibold text-ink truncate">Sarah-Mitchell-CV.pdf</p>
                                        <p className="font-label text-[0.62rem] tracking-[0.08em] text-ink-faint mt-0.5">A4 · 184 KB · print-ready</p>
                                    </div>
                                    <span className="grid place-items-center w-9 h-9 rounded-full bg-ink text-paper shrink-0">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5M5 18.5h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 rounded-xl bg-paper-bright border border-ink/[0.08] px-4 py-3.5">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-ink-soft shrink-0" aria-hidden="true">
                                        <path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                                        <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                                    </svg>
                                    <span className="flex-1 font-label text-[0.78rem] text-ink-faint truncate">cvbase.io/cv/sarah-mitchell</span>
                                    <span className="px-3 py-1.5 rounded-full bg-ink/[0.05] text-ink text-[0.7rem] font-bold shrink-0">Copy link</span>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 font-label text-[0.66rem] tracking-[0.12em] uppercase text-ember-deep">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Exported in 1.2s — no watermark
                                </div>
                            </div>
                            <h3 className="font-display text-2xl font-semibold text-ink">The export</h3>
                            <p className="mt-2.5 text-[0.97rem] leading-relaxed text-ink-soft max-w-lg">
                                A pixel-perfect PDF, or a live link that updates itself every time you edit. What you see is exactly what the recruiter gets.
                            </p>
                        </div>
                    </motion.article>

                    {/* Customization — full-width horizontal card */}
                    <motion.article {...cardReveal(0.05)} className={`${cardClass} lg:col-span-12`}>
                        <div className={`${innerClass} lg:flex-row lg:items-center lg:gap-12`}>
                            <div className="lg:max-w-md">
                                <h3 className="font-display text-2xl font-semibold text-ink">The fine-tuning</h3>
                                <p className="mt-2.5 text-[0.97rem] leading-relaxed text-ink-soft">
                                    Colors, typefaces, spacing, section order — every detail adjustable,
                                    every change previewed live. Your CV, your typography.
                                </p>
                            </div>
                            <div className="flex-1 mt-7 lg:mt-0 rounded-2xl bg-paper border border-ink/[0.06] p-5 sm:p-6 grid sm:grid-cols-3 gap-6">
                                <div>
                                    <p className="font-label text-[0.6rem] tracking-[0.18em] uppercase text-ink-faint mb-3">Accent color</p>
                                    <div className="flex items-center gap-2">
                                        <span className="w-7 h-7 rounded-full bg-ember ring-2 ring-offset-2 ring-offset-paper ring-ember" />
                                        <span className="w-7 h-7 rounded-full bg-ink" />
                                        <span className="w-7 h-7 rounded-full bg-[#3E5C4B]" />
                                        <span className="w-7 h-7 rounded-full bg-[#34527E]" />
                                        <span className="w-7 h-7 rounded-full bg-[#8A6D3B]" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-label text-[0.6rem] tracking-[0.18em] uppercase text-ink-faint mb-3">Typeface</p>
                                    <div className="flex items-center justify-between rounded-xl bg-paper-bright border border-ink/[0.08] px-3.5 py-2.5">
                                        <span className="text-[0.85rem] font-semibold text-ink font-display">Fraunces</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-ink-faint" aria-hidden="true">
                                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-label text-[0.6rem] tracking-[0.18em] uppercase text-ink-faint">Spacing</p>
                                        <span className="font-label text-[0.66rem] text-ember-deep">72%</span>
                                    </div>
                                    <div className="relative h-2 rounded-full bg-ink/[0.08] mt-4">
                                        <div className="absolute inset-y-0 left-0 w-[72%] rounded-full bg-ember" />
                                        <span className="absolute top-1/2 left-[72%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-paper-bright border-2 border-ember shadow" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.article>
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
