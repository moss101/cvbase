import React, { useState } from 'react';
import type { BillingCycle, Plan, PlanId } from '../../types';
import { PLANS, formatMoney, isUpgrade } from '../../services/subscriptionService';
import { useSubscription } from '../SubscriptionProvider';
import { CircleCheck, Minus, ArrowLeft, Lock, History, BanknoteX, ChevronDown } from 'lucide-react';
import { useTranslation, type Translate } from '../../services/translationService';

interface PricingPageProps {
    /** Rendered as a full standalone page (with back chrome) vs embedded in the dashboard. */
    standalone?: boolean;
    onBack?: () => void;
    onCheckout: (planId: PlanId, cycle: BillingCycle) => void;
    onManageBilling?: () => void;
}

const buildComparisonRows = (t: Translate): { label: string; values: (p: Plan) => string | boolean }[] => [
    { label: t('pricing.row.resumes', 'Resumes'), values: p => (p.limits.resumes === -1 ? t('pricing.unlimited', 'Unlimited') : String(p.limits.resumes)) },
    { label: t('pricing.row.atsScans', 'ATS scans'), values: p => (p.limits.atsScansPerMonth === -1 ? t('pricing.unlimited', 'Unlimited') : t('pricing.perMonth', '{n} / month').replace('{n}', String(p.limits.atsScansPerMonth))) },
    { label: t('pricing.row.liveRescore', 'Real-time ATS re-scoring'), values: p => p.limits.liveAtsRescore },
    { label: t('pricing.row.keywordAnalysis', 'Keyword & skills-gap analysis'), values: () => true },
    { label: t('pricing.row.roleFit', 'Role-fit & job analytics'), values: p => p.id !== 'free' },
    { label: t('pricing.row.aiActions', 'AI writing actions'), values: p => (p.limits.aiActionsPerMonth === -1 ? t('pricing.unlimited', 'Unlimited') : t('pricing.perMonth', '{n} / month').replace('{n}', String(p.limits.aiActionsPerMonth))) },
    { label: t('pricing.row.templates', 'Templates'), values: p => (p.limits.templates === 'all' ? t('pricing.all70', 'All 70+') : t('pricing.coreCollection', 'Core collection')) },
    { label: t('pricing.row.watermarkFree', 'Watermark-free PDF export'), values: p => p.limits.watermarkFree },
    { label: t('pricing.row.smartStudio', 'Smart Studio (LinkedIn + cover letters)'), values: p => p.limits.smartStudio },
    { label: t('pricing.row.aiHeadshot', 'AI professional headshot'), values: p => p.limits.aiHeadshot },
    { label: t('pricing.row.prioritySupport', 'Priority support'), values: p => p.limits.prioritySupport },
];

const buildFaqs = (t: Translate): { q: string; a: string }[] => [
    { q: t('pricing.faq1.q', 'Can I cancel anytime?'), a: t('pricing.faq1.a', 'Yes. Cancel in one click from Billing — you keep full access until the end of the period you already paid for, then drop to the Free plan automatically. No emails, no phone calls.') },
    { q: t('pricing.faq2.q', 'What happens when I upgrade mid-cycle?'), a: t('pricing.faq2.a', 'The unused value of your current period is automatically applied as credit to the new plan at checkout, so you never pay twice for the same days.') },
    { q: t('pricing.faq3.q', 'What payment methods do you accept?'), a: t('pricing.faq3.a', 'All major credit and debit cards (Visa, Mastercard, American Express, Discover). Charges appear as "CVBASE" on your statement.') },
    { q: t('pricing.faq4.q', 'Is the Free plan really free?'), a: t('pricing.faq4.a', 'Forever. One resume, three ATS scans a month and the core template collection — no card required.') },
    { q: t('pricing.faq5.q', 'Do unused scans roll over?'), a: t('pricing.faq5.a', 'Monthly allowances reset on the 1st of each calendar month and don\'t roll over. Pro and Elite include unlimited ATS scans, so there\'s nothing to count.') },
];

const PlanCard: React.FC<{
    plan: Plan;
    cycle: BillingCycle;
    currentPlanId: PlanId;
    onCheckout: (planId: PlanId, cycle: BillingCycle) => void;
    onManageBilling?: () => void;
    t: Translate;
}> = ({ plan, cycle, currentPlanId, onCheckout, onManageBilling, t }) => {
    const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const isCurrent = plan.id === currentPlanId;
    const upgrade = isUpgrade(currentPlanId, plan.id);

    return (
        <div className={`relative rounded-3xl p-7 flex flex-col transition-all duration-300 ${
            plan.highlight
                ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/30 scale-[1.02] border border-slate-700'
                : 'glass-card !translate-y-0'
        }`}>
            {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-lg ${
                    plan.highlight ? 'bg-gradient-to-r from-primary to-secondary text-white' : 'bg-amber-400 text-amber-950'
                }`}>{plan.badge}</span>
            )}
            <h3 className={`text-xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-800'}`}>{plan.name}</h3>
            <p className={`text-xs mt-1 ${plan.highlight ? 'text-slate-300' : 'text-gray-500'}`}>{plan.tagline}</p>

            <div className="mt-5 mb-1 flex items-end gap-1">
                <span className={`text-5xl font-black tracking-tight ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {price === 0 ? '$0' : `$${price}`}
                </span>
                <span className={`text-sm mb-1.5 font-medium ${plan.highlight ? 'text-slate-400' : 'text-gray-400'}`}>{t('pricing.perMonthSuffix', '/ month')}</span>
            </div>
            <p className={`text-[11px] h-4 ${plan.highlight ? 'text-slate-400' : 'text-gray-400'}`}>
                {price > 0 && cycle === 'yearly' && t('pricing.billedYearly', 'Billed {amount} yearly · save {pct}%').replace('{amount}', formatMoney(plan.yearlyPrice * 12)).replace('{pct}', String(Math.round((1 - plan.yearlyPrice / plan.monthlyPrice) * 100)))}
                {price > 0 && cycle === 'monthly' && t('pricing.billedMonthly', 'Billed monthly · cancel anytime')}
            </p>

            <ul className={`mt-6 space-y-2.5 text-sm flex-1 ${plan.highlight ? 'text-slate-200' : 'text-gray-600'}`}>
                {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                        <CircleCheck className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? 'text-secondary' : 'text-primary'}`} aria-hidden="true" />
                        {f}
                    </li>
                ))}
            </ul>

            {isCurrent ? (
                <button
                    onClick={onManageBilling}
                    className={`mt-7 w-full py-3 rounded-2xl font-bold text-sm border-2 transition ${
                        plan.highlight ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    {t('pricing.currentPlanCheck', '✓ Current plan')}{onManageBilling ? t('pricing.manageDot', ' · Manage') : ''}
                </button>
            ) : plan.id === 'free' ? (
                <button
                    onClick={onManageBilling}
                    className="mt-7 w-full py-3 rounded-2xl font-bold text-sm border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                >
                    {t('pricing.downgradeToFree', 'Downgrade to Free')}
                </button>
            ) : (
                <button
                    onClick={() => onCheckout(plan.id, cycle)}
                    className={`mt-7 w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${
                        plan.highlight
                            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-secondary/30 hover:opacity-95'
                            : 'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark'
                    }`}
                >
                    {upgrade ? t('pricing.upgradeTo', 'Upgrade to {plan}').replace('{plan}', plan.name) : t('pricing.switchTo', 'Switch to {plan}').replace('{plan}', plan.name)} →
                </button>
            )}
        </div>
    );
};

const BoolCell: React.FC<{ v: string | boolean; highlight?: boolean }> = ({ v, highlight }) => (
    <td className={`py-3.5 px-4 text-center text-sm ${highlight ? 'bg-secondary/5' : ''}`}>
        {typeof v === 'boolean'
            ? v
                ? <CircleCheck className="w-5 h-5 text-primary inline" aria-hidden="true" />
                : <Minus className="w-5 h-5 text-gray-300 inline" aria-hidden="true" />
            : <span className="font-semibold text-gray-700">{v}</span>}
    </td>
);

const PricingPage: React.FC<PricingPageProps> = ({ standalone, onBack, onCheckout, onManageBilling }) => {
    const { t } = useTranslation();
    const { billing } = useSubscription();
    const [cycle, setCycle] = useState<BillingCycle>('yearly');
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const currentPlanId = billing.subscription.planId;
    const COMPARISON_ROWS = buildComparisonRows(t);
    const FAQS = buildFaqs(t);

    const content = (
        <>
            <header className="text-center mb-10">
                {standalone && (
                    <button onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition">
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('btn.back', 'Back')}
                    </button>
                )}
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-3 leading-snug pb-1">
                    {t('pricing.heroTitle', 'Invest in your next offer')}
                </h1>
                <p className="text-gray-500 max-w-xl mx-auto">
                    {t('pricing.heroDesc', 'Plans that pay for themselves with one shortlist. Upgrade, downgrade or cancel anytime — unused time is always credited.')}
                </p>

                {/* Billing cycle toggle */}
                <div className="inline-flex items-center gap-1 mt-8 p-1.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-full shadow-sm">
                    {(['monthly', 'yearly'] as BillingCycle[]).map(c => (
                        <button
                            key={c}
                            onClick={() => setCycle(c)}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                                cycle === c ? 'bg-dark text-white shadow-lg' : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {c === 'monthly' ? t('pricing.monthly', 'Monthly') : t('pricing.yearly', 'Yearly')}
                            {c === 'yearly' && <span className={`ml-1.5 text-[10px] font-extrabold ${cycle === c ? 'text-emerald-300' : 'text-emerald-600'}`}>−33%</span>}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
                {PLANS.map(p => (
                    <PlanCard key={p.id} plan={p} cycle={cycle} currentPlanId={currentPlanId} onCheckout={onCheckout} onManageBilling={onManageBilling} t={t} />
                ))}
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-8 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-primary" aria-hidden="true" /> {t('pricing.secureCheckout', 'Secure 256-bit encrypted checkout')}</span>
                <span className="flex items-center gap-1.5"><History className="w-4 h-4 text-primary" aria-hidden="true" /> {t('pricing.cancelAnytime', 'Cancel anytime, keep access to period end')}</span>
                <span className="flex items-center gap-1.5"><BanknoteX className="w-4 h-4 text-primary" aria-hidden="true" /> {t('pricing.freeNoCard', 'Free plan needs no card')}</span>
            </div>

            {/* Comparison table */}
            <section className="max-w-5xl mx-auto mt-16">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">{t('pricing.compareTitle', 'Compare plans in detail')}</h2>
                <div className="glass-card rounded-3xl overflow-hidden !translate-y-0 overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                        <thead>
                            <tr className="border-b border-gray-200/80">
                                <th className="py-4 px-5 text-left text-xs font-extrabold uppercase tracking-wider text-gray-400">{t('pricing.feature', 'Feature')}</th>
                                {PLANS.map(p => (
                                    <th key={p.id} className={`py-4 px-4 text-center ${p.highlight ? 'bg-secondary/5' : ''}`}>
                                        <span className="font-extrabold text-gray-800">{p.name}</span>
                                        <span className="block text-[11px] font-medium text-gray-400">
                                            {p.monthlyPrice === 0 ? t('pricing.freeForever', 'Free forever') : t('pricing.fromPerMo', 'from ${price}/mo').replace('{price}', String(p.yearlyPrice))}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {COMPARISON_ROWS.map(row => (
                                <tr key={row.label} className="hover:bg-white/50 transition-colors">
                                    <td className="py-3.5 px-5 text-sm font-medium text-gray-600">{row.label}</td>
                                    {PLANS.map(p => <BoolCell key={p.id} v={row.values(p)} highlight={p.highlight} />)}
                                </tr>
                            ))}
                            <tr>
                                <td className="py-4 px-5" />
                                {PLANS.map(p => (
                                    <td key={p.id} className={`py-4 px-4 text-center ${p.highlight ? 'bg-secondary/5' : ''}`}>
                                        {p.id === currentPlanId ? (
                                            <span className="text-xs font-bold text-gray-400">{t('pricing.currentPlan', 'Current plan')}</span>
                                        ) : p.id !== 'free' ? (
                                            <button
                                                onClick={() => onCheckout(p.id, cycle)}
                                                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition"
                                            >
                                                {t('pricing.choosePlan', 'Choose {plan}').replace('{plan}', p.name)}
                                            </button>
                                        ) : null}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-2xl mx-auto mt-16 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">{t('pricing.faqTitle', 'Billing questions, answered')}</h2>
                <div className="space-y-3">
                    {FAQS.map((f, i) => (
                        <div key={i} className="glass-card rounded-2xl !translate-y-0 overflow-hidden">
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-5 text-left"
                            >
                                <span className="font-bold text-sm text-gray-800">{f.q}</span>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {openFaq === i && (
                                <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed animate-fade-in">{f.a}</p>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </>
    );

    if (!standalone) return <div>{content}</div>;

    return (
        <div className="min-h-screen relative overflow-x-clip">
            <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />
            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">{content}</div>
        </div>
    );
};

export default PricingPage;
