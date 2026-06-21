import React from 'react';
import { motion } from 'motion/react';

const STEPS: { n: string; title: string; description: string; visual: React.ReactNode }[] = [
    {
        n: '01',
        title: 'Choose a template',
        description:
            'Pick a professionally typeset layout that fits your industry and seniority. Switch anytime — your content carries over untouched.',
        visual: (
            <div className="flex items-center justify-center gap-3 h-full">
                <div className="w-16 h-[84px] rounded-md bg-paper-bright border border-ink/[0.08] shadow-sm rotate-[-6deg] overflow-hidden">
                    <div className="h-4 bg-ink/25" />
                    <div className="p-1.5 space-y-1">
                        <div className="h-[3px] rounded-full bg-ink/[0.12] w-full" />
                        <div className="h-[3px] rounded-full bg-ink/[0.07] w-3/4" />
                        <div className="h-[3px] rounded-full bg-ink/[0.07] w-full" />
                    </div>
                </div>
                <div className="relative w-[4.5rem] h-24 rounded-md bg-paper-bright border-2 border-ember shadow-[0_14px_30px_-8px_rgba(200,68,44,0.35)] overflow-hidden z-10">
                    <div className="h-[18px] bg-ink" />
                    <div className="p-1.5 space-y-1">
                        <div className="h-[3px] rounded-full bg-ink/[0.12] w-full" />
                        <div className="h-[3px] rounded-full bg-ink/[0.07] w-2/3" />
                        <div className="h-[3px] rounded-full bg-ink/[0.07] w-full" />
                        <div className="h-[3px] rounded-full bg-ink/[0.07] w-1/2" />
                    </div>
                    <span className="absolute top-1 right-1 grid place-items-center w-4 h-4 rounded-full bg-ember">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#FAF7F2" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                </div>
                <div className="w-16 h-[84px] rounded-md bg-paper-bright border border-ink/[0.08] shadow-sm rotate-[6deg] overflow-hidden flex">
                    <div className="w-1/3 bg-ink/30" />
                    <div className="flex-1 p-1.5 space-y-1">
                        <div className="h-[3px] rounded-full bg-ink/[0.12] w-full" />
                        <div className="h-[3px] rounded-full bg-ink/[0.07] w-3/4" />
                    </div>
                </div>
            </div>
        ),
    },
    {
        n: '02',
        title: 'Add your details',
        description:
            'Write with the AI editor at your shoulder — it tightens your wording and turns duties into achievements as you type.',
        visual: (
            <div className="flex flex-col justify-center gap-2.5 h-full px-4 max-w-xs mx-auto w-full">
                <div className="rounded-lg bg-paper-bright border border-ink/[0.08] px-3.5 py-2.5">
                    <p className="font-label text-[0.52rem] tracking-[0.18em] uppercase text-ink-faint">Job title</p>
                    <p className="text-[0.78rem] font-semibold text-ink mt-0.5">Senior Product Manager</p>
                </div>
                <div className="rounded-lg bg-paper-bright border-2 border-ember/70 shadow-[0_10px_24px_-10px_rgba(200,68,44,0.35)] px-3.5 py-2.5">
                    <p className="font-label text-[0.52rem] tracking-[0.18em] uppercase text-ember">Achievement</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[0.78rem] font-medium text-ink-soft">Led a team of 12 to ship</p>
                        <span className="w-[2px] h-3.5 bg-ember rounded-sm animate-caret" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5 self-end">
                    <span className="grid place-items-center w-4 h-4 rounded-full bg-ink">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="#FAF7F2" /></svg>
                    </span>
                    <span className="font-label text-[0.56rem] tracking-[0.14em] uppercase text-ink-faint">AI is polishing…</span>
                </div>
            </div>
        ),
    },
    {
        n: '03',
        title: 'Send it with confidence',
        description:
            'Export a pixel-perfect, ATS-ready PDF — checked, scored, and typeset. Then start clearing space in your calendar for interviews.',
        visual: (
            <div className="flex flex-col items-center justify-center gap-3 h-full">
                <div className="flex items-center gap-3 rounded-xl bg-paper-bright border border-ink/[0.08] px-4 py-3">
                    <span className="grid place-items-center w-8 h-8 rounded-lg bg-ember-tint text-ember-deep">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 3.5h9.5L19 7v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /></svg>
                    </span>
                    <div>
                        <p className="text-[0.74rem] font-semibold text-ink">My-CV.pdf</p>
                        <div className="mt-1.5 h-1 w-28 rounded-full bg-ink/[0.08] overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-ember"
                                initial={{ width: '0%' }}
                                whileInView={{ width: '100%' }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.1, delay: 0.7, ease: 'easeInOut' }}
                            />
                        </div>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 font-label text-[0.58rem] tracking-[0.16em] uppercase text-ember-deep">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Ready to send
                </span>
            </div>
        ),
    },
];

const HowItWorks: React.FC = () => {
    return (
        <section id="how-it-works" className="py-24 lg:py-36">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    className="max-w-2xl mb-12 lg:mb-16"
                >
                    <p className="font-label text-[0.7rem] tracking-[0.24em] uppercase text-ink-faint">
                        03 <span className="text-ember">—</span> The process
                    </p>
                    <h2 className="mt-5 font-display font-medium tracking-[-0.015em] text-ink text-4xl sm:text-5xl leading-[1.08] [text-wrap:balance]">
                        Blank page to interview-ready in <span className="italic text-ember">three moves</span>.
                    </h2>
                </motion.div>

                <ol>
                    {STEPS.map((step, i) => (
                        <motion.li
                            key={step.n}
                            initial={{ opacity: 0, y: 32 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                            className="group grid lg:grid-cols-12 gap-6 lg:gap-10 items-center py-10 lg:py-14 border-t border-ink/[0.08] last:border-b"
                        >
                            {/* Giant numeral */}
                            <div className={`lg:col-span-2 ${i % 2 === 1 ? 'lg:order-3 lg:text-right' : ''}`}>
                                <span className="font-display font-light text-[4.5rem] lg:text-[6rem] leading-none text-ink/[0.13] tracking-[-0.04em] transition-colors duration-700 group-hover:text-ember/35 select-none">
                                    {step.n}
                                </span>
                            </div>
                            {/* Copy */}
                            <div className={`lg:col-span-4 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                                <h3 className="font-display text-[1.6rem] font-semibold text-ink">{step.title}</h3>
                                <p className="mt-3 text-[0.97rem] leading-relaxed text-ink-soft max-w-md">{step.description}</p>
                            </div>
                            {/* Visual */}
                            <div className={`lg:col-span-6 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                                <div className="h-48 rounded-[1.4rem] bg-paper-deep/80 border border-ink/[0.06] overflow-hidden">
                                    {step.visual}
                                </div>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </div>
        </section>
    );
};

export default HowItWorks;
