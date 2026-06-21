import React, { useMemo, useState } from 'react';
import type { BillingCycle, PlanId } from '../../types';
import {
    quoteCheckout,
    validatePromoCode,
    processCardPayment,
    completeCheckout,
    formatMoney,
    detectCardBrand,
    type PromoCode,
} from '../../services/subscriptionService';
import { useSubscription } from '../SubscriptionProvider';
import { useAuth } from '../FirebaseProvider';

interface CheckoutPageProps {
    planId: PlanId;
    cycle: BillingCycle;
    onSuccess: () => void;
    onBack: () => void;
}

const BRAND_ICONS: Record<string, string> = {
    visa: 'VISA',
    mastercard: 'MC',
    amex: 'AMEX',
    discover: 'DISC',
    card: 'CARD',
};

const formatCardNumber = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const CheckoutPage: React.FC<CheckoutPageProps> = ({ planId, cycle: initialCycle, onSuccess, onBack }) => {
    const { billing, applyBilling } = useSubscription();
    const { user, userProfile } = useAuth();

    const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
    const [holder, setHolder] = useState(userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : '');
    const [email, setEmail] = useState(user?.email || '');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [country, setCountry] = useState('United States');
    const [postal, setPostal] = useState('');
    const [promoInput, setPromoInput] = useState('');
    const [promo, setPromo] = useState<PromoCode | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [done, setDone] = useState(false);

    const quote = useMemo(() => quoteCheckout(billing, planId, cycle, promo), [billing, planId, cycle, promo]);
    const brand = detectCardBrand(cardNumber);

    const applyPromo = () => {
        setPromoError(null);
        if (!promoInput.trim()) return;
        const found = validatePromoCode(promoInput);
        if (found) { setPromo(found); setPromoInput(''); }
        else setPromoError('That code isn\'t valid or has expired.');
    };

    const handlePay = async () => {
        setError(null);
        if (!email.trim() || !/.+@.+\..+/.test(email)) { setError('Enter a valid email for your receipt.'); return; }
        const [mm, yy] = expiry.split('/').map(s => parseInt(s?.trim(), 10));
        setProcessing(true);
        const result = await processCardPayment(
            { number: cardNumber, expMonth: mm || 0, expYear: yy || 0, cvc, holder },
            quote.total,
        );
        if (!result.ok || !result.paymentMethod) {
            setProcessing(false);
            setError(result.error || 'Payment failed.');
            return;
        }
        applyBilling(completeCheckout(billing, quote, result.paymentMethod));
        setProcessing(false);
        setDone(true);
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 relative">
                <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
                <div className="glass-card rounded-3xl !translate-y-0 p-10 max-w-md w-full text-center animate-fade-in relative z-10">
                    <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                        <span className="material-symbols-outlined text-4xl text-emerald-600">celebration</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Welcome to {quote.plan.name}!</h1>
                    <p className="text-sm text-gray-500 leading-relaxed mb-1">
                        Your {cycle} subscription is active. {quote.total > 0 ? `We charged ${formatMoney(quote.total)} and emailed a receipt${email ? ` to ${email}` : ''}.` : 'No charge was needed — your credit covered it.'}
                    </p>
                    <p className="text-xs text-gray-400 mb-7">Unlimited ATS scans and real-time re-scoring are unlocked now.</p>
                    <button
                        onClick={onSuccess}
                        className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all"
                    >
                        Go to my dashboard →
                    </button>
                </div>
            </div>
        );
    }

    const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-gray-300';
    const labelCls = 'block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5';

    return (
        <div className="min-h-screen relative overflow-x-clip">
            <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

            <div className="max-w-4xl mx-auto px-6 py-10 relative z-10">
                <button onClick={onBack} className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition">
                    <span className="material-symbols-outlined text-base">arrow_back</span> Back to plans
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* ===== Payment form ===== */}
                    <div className="lg:col-span-3 glass-card rounded-3xl !translate-y-0 p-8">
                        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">Checkout</h1>
                        <p className="text-sm text-gray-500 mb-7">You're one step from unlocking <strong className="text-gray-700">CVBase {quote.plan.name}</strong>.</p>

                        <div className="space-y-5">
                            <div>
                                <label className={labelCls}>Email for receipt</label>
                                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                            </div>
                            <div>
                                <label className={labelCls}>Cardholder name</label>
                                <input className={inputCls} value={holder} onChange={e => setHolder(e.target.value)} placeholder="Name as printed on card" />
                            </div>
                            <div>
                                <label className={labelCls}>Card number</label>
                                <div className="relative">
                                    <input
                                        className={`${inputCls} pr-16 font-mono tracking-wide`}
                                        inputMode="numeric"
                                        value={cardNumber}
                                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                                        placeholder="4242 4242 4242 4242"
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold px-2 py-1 rounded-md ${cardNumber ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        {BRAND_ICONS[brand]}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Expiry (MM/YY)</label>
                                    <input
                                        className={`${inputCls} font-mono`}
                                        inputMode="numeric"
                                        value={expiry}
                                        onChange={e => {
                                            let v = e.target.value.replace(/[^\d/]/g, '').slice(0, 5);
                                            if (v.length === 2 && !v.includes('/') && expiry.length < v.length) v += '/';
                                            setExpiry(v);
                                        }}
                                        placeholder="09/28"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Security code</label>
                                    <input className={`${inputCls} font-mono`} inputMode="numeric" value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder={brand === 'amex' ? '4 digits' : '3 digits'} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Country</label>
                                    <select className={inputCls} value={country} onChange={e => setCountry(e.target.value)}>
                                        {['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'India', 'Pakistan', 'United Arab Emirates', 'Singapore', 'Other'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Postal code</label>
                                    <input className={inputCls} value={postal} onChange={e => setPostal(e.target.value)} placeholder="ZIP / Postcode" />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium flex items-start gap-2">
                                <span className="material-symbols-outlined text-base mt-0.5">error</span>{error}
                            </div>
                        )}

                        <button
                            onClick={handlePay}
                            disabled={processing}
                            className="w-full mt-7 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold shadow-lg shadow-secondary/25 hover:opacity-95 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Processing securely…</>
                            ) : (
                                <><span className="material-symbols-outlined text-lg">lock</span> Pay {formatMoney(quote.total)} {cycle === 'yearly' ? 'for 1 year' : 'per month'}</>
                            )}
                        </button>
                        <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified_user</span>
                            256-bit encrypted · PCI-DSS compliant processing · Cancel anytime
                        </p>
                    </div>

                    {/* ===== Order summary ===== */}
                    <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-8">
                        <div className="glass-card rounded-3xl !translate-y-0 p-7">
                            <h2 className="font-extrabold text-gray-800 mb-5">Order summary</h2>

                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/15 mb-5">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md">
                                    <span className="material-symbols-outlined">workspace_premium</span>
                                </div>
                                <div>
                                    <p className="font-extrabold text-gray-800">CVBase {quote.plan.name}</p>
                                    <p className="text-[11px] text-gray-500">{quote.plan.tagline}</p>
                                </div>
                            </div>

                            {/* Cycle switcher */}
                            <div className="grid grid-cols-2 gap-2 mb-5">
                                {(['monthly', 'yearly'] as BillingCycle[]).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setCycle(c)}
                                        className={`p-3 rounded-xl border text-left transition ${cycle === c ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-gray-200 bg-white/60 hover:border-gray-300'}`}
                                    >
                                        <p className="text-xs font-bold text-gray-800 capitalize">{c}</p>
                                        <p className="text-[11px] text-gray-500">
                                            ${c === 'yearly' ? quote.plan.yearlyPrice : quote.plan.monthlyPrice}/mo
                                            {c === 'yearly' && <span className="text-emerald-600 font-bold"> · save {Math.round((1 - quote.plan.yearlyPrice / quote.plan.monthlyPrice) * 100)}%</span>}
                                        </p>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>{quote.plan.name} · {cycle === 'yearly' ? '12 months' : '1 month'}</span>
                                    <span className="font-semibold">{formatMoney(quote.subtotal)}</span>
                                </div>
                                {quote.discount > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">sell</span>{quote.promo?.code}</span>
                                        <span className="font-semibold">−{formatMoney(quote.discount)}</span>
                                    </div>
                                )}
                                {quote.creditApplied > 0 && (
                                    <div className="flex justify-between text-secondary-dark">
                                        <span className="flex items-center gap-1" title="Unused value from your current plan, automatically credited"><span className="material-symbols-outlined text-sm">swap_horiz</span>Unused plan credit</span>
                                        <span className="font-semibold">−{formatMoney(quote.creditApplied)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-3 border-t border-gray-100 text-gray-900">
                                    <span className="font-extrabold">Due today</span>
                                    <span className="font-black text-lg">{formatMoney(quote.total)}</span>
                                </div>
                                {cycle === 'yearly' && <p className="text-[11px] text-gray-400">Renews at {formatMoney(quote.plan.yearlyPrice * 12)}/year unless canceled.</p>}
                            </div>

                            {/* Promo code */}
                            <div className="mt-5">
                                {promo ? (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                                        <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-base">sell</span>{promo.code} — {promo.description}
                                        </span>
                                        <button onClick={() => setPromo(null)} className="text-emerald-600 hover:text-emerald-800">
                                            <span className="material-symbols-outlined text-base">close</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase placeholder:normal-case placeholder:text-gray-300"
                                            value={promoInput}
                                            onChange={e => setPromoInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && applyPromo()}
                                            placeholder="Promo code"
                                        />
                                        <button onClick={applyPromo} className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-600 transition">Apply</button>
                                    </div>
                                )}
                                {promoError && <p className="text-xs text-rose-600 mt-1.5 font-medium">{promoError}</p>}
                            </div>
                        </div>

                        <div className="glass-card rounded-3xl !translate-y-0 p-5 text-xs text-gray-500 leading-relaxed">
                            <p className="font-bold text-gray-700 mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-base text-primary">shield</span> 7-day satisfaction guarantee</p>
                            Not landing more interviews? Contact support within 7 days of your first payment for a full refund — no questions asked.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
