import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../services/translationService';

export type LegalTab = 'privacy' | 'terms';

interface LegalPageProps {
    onBack: () => void;
    initialTab?: LegalTab;
}

const LAST_UPDATED = 'June 26, 2026';
const CONTACT_EMAIL = 'privacy@cvbase.app';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <div className="space-y-3 text-[0.95rem] leading-relaxed text-gray-600">{children}</div>
    </section>
);

const PrivacyPolicy: React.FC = () => {
    const { t } = useTranslation();
    return (
    <div>
        <p className="text-sm text-gray-400 mb-8">{t('legal.lastUpdated', 'Last updated: {date}').replace('{date}', LAST_UPDATED)}</p>

        <Section title="Who we are">
            <p>CVBase is an online résumé/CV builder. This policy explains what personal data we
            collect, why, and the choices you have. It reflects how the product actually works today.</p>
        </Section>

        <Section title="What we collect">
            <p><strong>Account data:</strong> your email address and, if you sign in with Google, your
            name and basic profile from Google. Authentication is handled by Supabase Auth.</p>
            <p><strong>Résumé content:</strong> everything you put into your résumés, versions, and the
            job applications you track — names, contact details, work history, skills, and any photo you
            upload. This is stored in our Postgres database (Supabase), isolated per user by row-level
            security so only you (and our server functions) can read your rows.</p>
            <p><strong>Usage counters:</strong> per-month counts of AI actions and ATS scans, used to
            enforce plan limits. We do <em>not</em> log your résumé content alongside AI requests — our
            AI logs record only metadata (function name, model, a token estimate, and status).</p>
            <p><strong>Payment data:</strong> if you subscribe, payments are processed by Stripe. We never
            see or store your full card number; we keep only the subscription state Stripe sends us.</p>
        </Section>

        <Section title="How your data is used">
            <p>To provide the service: store and render your résumés, run ATS analysis, generate AI
            suggestions, process your subscription, and enforce your plan's limits.</p>
            <p><strong>AI processing:</strong> when you use an AI feature, the relevant résumé text or
            image is sent to Google's Gemini API to generate the result, then returned to you. The AI
            key lives only on our servers — it is never shipped to your browser. We do not sell your data
            or use your résumé content to train models.</p>
        </Section>

        <Section title="Photos & AI headshots">
            <p>If you use the Elite AI-headshot feature, your uploaded photo is sent to the image model
            and the generated headshot is stored privately in per-user storage (only accessible to you via
            short-lived signed URLs). You can remove the photo from your résumé at any time.</p>
        </Section>

        <Section title="Local storage">
            <p>Before you sign in, a working copy of your résumé is kept in your browser's local storage
            so you don't lose progress. Once you sign in, your data is saved to your account and synced
            across devices.</p>
        </Section>

        <Section title="Your rights">
            <p>You can view, edit, export (PDF/Word/JSON), and delete your résumés and tracked jobs at any
            time from within the app. To download a copy of everything in your account, or to permanently
            delete your account and all associated data, open <strong>Settings → Your data</strong>. Deletion
            cancels any active subscription and removes your résumés, versions, tracked jobs, ATS reports and
            photos immediately. If you cannot sign in, contact us at <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="Service providers">
            <p>We rely on Supabase (database, auth, storage), Stripe (payments), and Google Gemini (AI
            processing). Each processes data only to provide its part of the service.</p>
        </Section>

        <Section title="Changes & contact">
            <p>We'll update this page when our practices change and revise the date above. Questions:
            <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a>.</p>
        </Section>
    </div>
    );
};

const TermsOfService: React.FC = () => {
    const { t } = useTranslation();
    return (
    <div>
        <p className="text-sm text-gray-400 mb-8">{t('legal.lastUpdated', 'Last updated: {date}').replace('{date}', LAST_UPDATED)}</p>

        <Section title="Acceptance">
            <p>By creating an account or using CVBase, you agree to these terms. If you don't agree,
            please don't use the service.</p>
        </Section>

        <Section title="Your account">
            <p>You're responsible for the accuracy of what you put in your résumé and for keeping your
            login secure. You must own the rights to any content and photos you upload.</p>
        </Section>

        <Section title="Plans & billing">
            <p>Paid plans (Pro, Elite) are billed through Stripe on a monthly or yearly cycle. Your plan
            sets limits on resumes, AI actions, ATS scans, and premium features; these are enforced by our
            servers. You can manage or cancel your subscription anytime through the customer portal;
            cancellation takes effect at the end of the current billing period.</p>
        </Section>

        <Section title="AI features & accuracy">
            <p>CVBase uses AI to suggest content and analyze résumés. AI output can be wrong or
            incomplete — always review and edit it, and never present invented facts as true. Keep your
            résumé truthful and verifiable; you are responsible for its final content.</p>
        </Section>

        <Section title="No outcome guarantee">
            <p>A higher ATS or match score can help with automated screening, but it does <strong>not</strong>
            guarantee interviews, offers, or employment. Keep your résumé truthful, readable, and relevant.
            We make no warranty that using CVBase will produce any particular job-search outcome.</p>
        </Section>

        <Section title="Acceptable use">
            <p>Don't use CVBase to upload unlawful content, impersonate others, attempt to break our
            security or rate limits, or scrape the service. We may suspend accounts that abuse the service.</p>
        </Section>

        <Section title="Service 'as is'">
            <p>The service is provided "as is" without warranties of any kind. To the extent permitted by
            law, CVBase is not liable for indirect or consequential damages arising from your use of the
            service. Your résumé data remains yours.</p>
        </Section>

        <Section title="Changes & contact">
            <p>We may update these terms and will revise the date above; continued use means you accept
            the changes. Questions:
            <a className="text-primary underline" href={`mailto:${CONTACT_EMAIL}`}> {CONTACT_EMAIL}</a>.</p>
        </Section>
    </div>
    );
};

const LegalPage: React.FC<LegalPageProps> = ({ onBack, initialTab = 'privacy' }) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<LegalTab>(initialTab);

    return (
        <div className="min-h-screen bg-light">
            <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-8"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    {t('btn.back', 'Back')}
                </button>

                <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('legal.title', 'Legal')}</h1>

                <div className="flex gap-2 mb-8 border-b border-gray-200">
                    {([['privacy', t('legal.privacyPolicy', 'Privacy Policy')], ['terms', t('legal.termsOfService', 'Terms of Service')]] as const).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`px-4 py-2.5 text-sm font-bold -mb-px border-b-2 transition-colors ${
                                tab === id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <article className="glass-card rounded-2xl p-6 sm:p-10 !translate-y-0">
                    {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
                </article>
            </div>
        </div>
    );
};

export default LegalPage;
