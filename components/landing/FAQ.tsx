import React from 'react';
import { motion } from 'motion/react';

const FAQ_ITEMS = [
    {
        q: 'Is CVbase really ATS-friendly?',
        a: 'Yes. Every template uses a clean, machine-readable structure — standard headings, parseable fonts, and no tables or graphics that trip up tracking systems. We test our layouts against the parsing behavior of the major applicant tracking systems used by large employers.',
    },
    {
        q: 'Can I download my CV as a PDF?',
        a: 'One click exports a pixel-perfect A4 PDF that looks identical to your on-screen preview — fonts, spacing, and colors included. No watermarks, no surprise quality loss.',
    },
    {
        q: 'How does the AI content assistant work?',
        a: 'The assistant analyzes your target role and industry, then suggests achievement-led bullet points, stronger action verbs, and quantified results based on what you\'ve written. Every suggestion is a starting point you can accept, edit, or ignore.',
    },
    {
        q: 'Is my personal data safe?',
        a: 'Your data is encrypted in transit and at rest, and we never sell it to recruiters, advertisers, or anyone else. You can export or permanently delete everything from your account at any time.',
    },
    {
        q: 'Can I create multiple versions of my CV?',
        a: 'Yes — and you should. Duplicate any CV in one click, then tailor the summary, skills, and keywords to each application. Tailored CVs consistently outperform one-size-fits-all versions.',
    },
    {
        q: 'Do I need design experience?',
        a: 'None at all. Templates handle layout, typography, and spacing automatically, so your CV stays balanced no matter how much content you add. You focus on the words; the design takes care of itself.',
    },
    {
        q: 'What makes CVbase better than other builders?',
        a: 'Three things in one tool: an ATS engine that scores and fixes your CV, an AI writing assistant trained on what recruiters respond to, and templates that are genuinely typeset, not decorated. The export you see is the export you get.',
    },
];

const FAQ: React.FC = () => {
    return (
        <section id="faq" className="py-24 lg:py-36 bg-paper-deep/50 border-y border-ink/[0.06]">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
                    {/* Sticky editorial header */}
                    <motion.div
                        initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                        className="lg:col-span-4"
                    >
                        <div className="lg:sticky lg:top-32">
                            <p className="font-label text-[0.7rem] tracking-[0.24em] uppercase text-ink-faint">
                                06 <span className="text-ember">—</span> Fine print
                            </p>
                            <h2 className="mt-5 font-display font-medium tracking-[-0.015em] text-ink text-4xl sm:text-5xl leading-[1.08]">
                                Questions, <span className="italic text-ember">answered</span>.
                            </h2>
                            <p className="mt-6 text-ink-soft leading-relaxed max-w-sm">
                                Everything worth knowing before you hit “Create my CV”. Nothing hidden in an accordion.
                            </p>
                            <p className="mt-8 text-[0.95rem] text-ink-soft">
                                Anything else?{' '}
                                <a href="mailto:support@cvbase.io" className="text-ink font-semibold border-b border-ink/25 pb-0.5 hover:text-ember hover:border-ember transition-colors duration-300">
                                    Talk to our team
                                </a>
                            </p>
                        </div>
                    </motion.div>

                    {/* Open Q&A — every answer visible */}
                    <div className="lg:col-span-8 sm:columns-2 gap-10">
                        {FAQ_ITEMS.map((item, i) => (
                            <motion.div
                                key={item.q}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.6, delay: 0.04 * i, ease: [0.32, 0.72, 0, 1] }}
                                className="break-inside-avoid mb-10"
                            >
                                <p className="font-label text-[0.62rem] tracking-[0.2em] uppercase text-ember mb-2.5">
                                    Q{i + 1}
                                </p>
                                <h3 className="font-display text-lg font-semibold text-ink leading-snug">{item.q}</h3>
                                <p className="mt-2.5 text-[0.93rem] text-ink-soft leading-relaxed">{item.a}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
