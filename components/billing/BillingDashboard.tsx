import React, { useState } from 'react';
import { useSubscription } from '../SubscriptionProvider';
import { useAuth } from '../AuthProvider';
import {
    getPlan,
    formatMoney,
    cycleCharge,
    downloadInvoice,
} from '../../services/subscriptionService';
import type { Invoice } from '../../types';
import { useMobileShell } from '../../lib/useMobileShell';
import { Download } from 'lucide-react';

interface BillingDashboardProps {
    onChangePlan: () => void;
}

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const UsageMeter: React.FC<{ label: string; used: number; limit: number; icon: string }> = ({ label, used, limit, icon }) => {
    const unlimited = limit === -1;
    const pct = unlimited ? 0 : Math.min((used / Math.max(limit, 1)) * 100, 100);
    const tone = unlimited ? 'text-emerald-600' : pct >= 100 ? 'text-rose-600' : pct >= 66 ? 'text-amber-600' : 'text-gray-700';
    return (
        <div className="p-4 rounded-2xl bg-white/70 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-primary">{icon}</span>{label}
                </span>
                <span className={`text-xs font-extrabold ${tone}`}>
                    {unlimited ? 'Unlimited' : `${used} / ${limit}`}
                </span>
            </div>
            <div className="w-full bg-gray-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-1.5 rounded-full transition-all ${unlimited ? 'bg-gradient-to-r from-emerald-400 to-primary w-full opacity-40' : pct >= 100 ? 'bg-rose-500' : 'bg-primary'}`}
                    style={unlimited ? undefined : { width: `${pct}%` }}
                />
            </div>
            {unlimited && <p className="text-[10px] text-gray-400 mt-1">No monthly cap on your plan</p>}
        </div>
    );
};

const STATUS_CHIP: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    refunded: 'bg-slate-100 text-slate-600',
    failed: 'bg-rose-100 text-rose-700',
};

const BillingDashboard: React.FC<BillingDashboardProps> = ({ onChangePlan }) => {
    const { billing, plan, openPortal } = useSubscription();
    const { user, userProfile } = useAuth();
    const [confirmCancel, setConfirmCancel] = useState(false);
    const isMobileShell = useMobileShell();

    const sub = billing.subscription;
    const isFree = sub.planId === 'free';
    const pendingPlan = sub.pendingPlanId ? getPlan(sub.pendingPlanId) : null;
    const renewalAmount = cycleCharge(plan, sub.cycle);

    const customerName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : '';
    const customerEmail = user?.email || '';

    const handleDownload = (inv: Invoice) => downloadInvoice(inv, customerName, customerEmail);

    return (
        <div>
            <header className="mb-8">
                <p className="dashboard-eyebrow mb-3">Account & usage</p>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Billing & Plans</h1>
                <p className="text-gray-500">Manage your subscription, payment methods and receipts.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ===== Current plan ===== */}
                <div className={`lg:col-span-2 rounded-3xl p-7 relative overflow-hidden ${isFree ? 'glass-card !translate-y-0' : 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isFree ? 'text-gray-400' : 'text-secondary'}`}>Current plan</p>
                            <h2 className={`text-3xl font-black flex items-center gap-3 ${isFree ? 'text-gray-800' : 'text-white'}`}>
                                CVBase {plan.name}
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                    sub.cancelAtPeriodEnd ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    {sub.cancelAtPeriodEnd ? 'Canceling' : 'Active'}
                                </span>
                            </h2>
                            <p className={`text-sm mt-1 ${isFree ? 'text-gray-500' : 'text-slate-300'}`}>{plan.tagline}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-3xl font-black ${isFree ? 'text-gray-800' : 'text-white'}`}>
                                {formatMoney(sub.cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)}
                                <span className={`text-sm font-medium ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>/mo</span>
                            </p>
                            {!isFree && <p className="text-[11px] text-slate-400">billed {sub.cycle}</p>}
                        </div>
                    </div>

                    <div className={`mt-6 grid sm:grid-cols-2 gap-3 text-sm ${isFree ? 'text-gray-600' : 'text-slate-200'}`}>
                        {!isFree && (
                            <>
                                <div className={`p-3.5 rounded-2xl ${isFree ? 'bg-white/70 border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                                    <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>
                                        {sub.cancelAtPeriodEnd ? 'Access ends' : pendingPlan ? 'Switches' : 'Renews'}
                                    </p>
                                    <p className="font-bold">
                                        {fmtDate(sub.currentPeriodEnd)}
                                        {!sub.cancelAtPeriodEnd && !pendingPlan && <span className={`font-medium ${isFree ? 'text-gray-400' : 'text-slate-400'}`}> · {formatMoney(renewalAmount)}</span>}
                                    </p>
                                </div>
                                <div className={`p-3.5 rounded-2xl ${isFree ? 'bg-white/70 border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                                    <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>Member since</p>
                                    <p className="font-bold">{fmtDate(sub.createdAt)}</p>
                                </div>
                            </>
                        )}
                        {billing.creditBalance > 0 && (
                            <div className={`p-3.5 rounded-2xl ${isFree ? 'bg-white/70 border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                                <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>Account credit</p>
                                <p className="font-bold text-emerald-500">{formatMoney(billing.creditBalance)} — applied to your next charge</p>
                            </div>
                        )}
                    </div>

                    {pendingPlan && !sub.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">schedule</span>
                                Scheduled: switching to <strong>{pendingPlan.name}</strong> on {fmtDate(sub.currentPeriodEnd)}.
                            </span>
                            <button onClick={openPortal} className="text-xs font-bold text-amber-700 hover:underline shrink-0">Keep {plan.name}</button>
                        </div>
                    )}
                    {sub.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base">info</span>
                                Your plan is set to cancel. You keep {plan.name} features until {fmtDate(sub.currentPeriodEnd)}.
                            </span>
                            <button onClick={openPortal} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0">Resume plan</button>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={onChangePlan}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition"
                        >
                            {isFree ? 'Upgrade plan' : 'Change plan'}
                        </button>
                        {!isFree && !sub.cancelAtPeriodEnd && (
                            confirmCancel ? (
                                <span className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className={`w-full sm:w-auto ${isFree ? 'text-gray-600' : 'text-slate-300'}`}>Cancel at period end?</span>
                                    <button onClick={() => { openPortal(); setConfirmCancel(false); }} className="tap-target px-3 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition">Yes, cancel</button>
                                    <button onClick={() => setConfirmCancel(false)} className={`tap-target px-3 rounded-lg text-xs font-bold transition ${isFree ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>Keep plan</button>
                                </span>
                            ) : (
                                <button
                                    onClick={() => setConfirmCancel(true)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${isFree ? 'text-gray-500 hover:bg-gray-100' : 'text-slate-300 hover:bg-white/10'}`}
                                >
                                    Cancel subscription
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* ===== Usage ===== */}
                <div className="glass-card rounded-3xl p-6 !translate-y-0">
                    <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">data_usage</span> This month's usage
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-4">Resets on the 1st of each month.</p>
                    <div className="space-y-3">
                        <UsageMeter label="ATS scans" used={billing.usage.atsScans} limit={plan.limits.atsScansPerMonth} icon="radar" />
                        <UsageMeter label="AI writing actions" used={billing.usage.aiActions} limit={plan.limits.aiActionsPerMonth} icon="auto_awesome" />
                    </div>
                    {isFree && (
                        <button onClick={onChangePlan} className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-secondary/20 text-secondary-dark text-xs font-bold hover:from-primary/20 hover:to-secondary/20 transition">
                            Remove limits with Pro →
                        </button>
                    )}
                </div>

                {/* ===== Payment methods ===== */}
                <div className="glass-card rounded-3xl p-6 !translate-y-0 lg:col-span-1">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">credit_card</span> Payment methods
                    </h3>
                    {billing.paymentMethods.length === 0 ? (
                        <p className="text-sm text-gray-500">No cards saved yet. A card is added automatically when you subscribe to a paid plan.</p>
                    ) : (
                        <div className="space-y-3">
                            {billing.paymentMethods.map(m => (
                                <div key={m.id} className="p-4 rounded-2xl bg-white/70 border border-gray-100 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-extrabold px-2 py-1.5 rounded-md bg-slate-800 text-white uppercase">{m.brand}</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">•••• {m.last4}</p>
                                            <p className="text-[11px] text-gray-400">Expires {String(m.expMonth).padStart(2, '0')}/{m.expYear} · {m.holder}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {m.isDefault ? (
                                            <span className="text-[10px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary px-2 py-1 rounded-full">Default</span>
                                        ) : (
                                            <button onClick={openPortal} className="text-[11px] font-bold text-gray-400 hover:text-primary transition px-1.5">Make default</button>
                                        )}
                                        <button onClick={openPortal} className="tap-target flex items-center justify-center text-gray-300 hover:text-rose-500 transition" title="Remove card">
                                            <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== Payment history ===== */}
                <div className="glass-card rounded-3xl p-6 !translate-y-0 lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">receipt_long</span> Payment history
                    </h3>
                    {billing.invoices.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="material-symbols-outlined text-4xl text-gray-200">receipt</span>
                            <p className="text-sm text-gray-500 mt-2">No payments yet — invoices appear here after your first subscription.</p>
                        </div>
                    ) : isMobileShell ? (
                        <div className="divide-y divide-gray-100 border-t border-gray-100">
                            {billing.invoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between gap-3 py-3.5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate font-mono text-xs font-bold text-gray-600">{inv.number}</p>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_CHIP[inv.status]}`}>{inv.status}</span>
                                        </div>
                                        <p className="mt-1 truncate text-sm text-gray-700">{getPlan(inv.planId).name} · {inv.cycle}</p>
                                        <p className="text-[11px] text-gray-400">{fmtDate(inv.date)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <p className="font-bold text-gray-800">{formatMoney(inv.total)}</p>
                                        <button
                                            onClick={() => handleDownload(inv)}
                                            aria-label="Download receipt"
                                            className="tap-target flex items-center justify-center rounded-lg text-gray-400 transition hover:bg-primary/5 hover:text-primary"
                                        >
                                            <Download size={17} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                        <th className="py-2.5 pr-4">Invoice</th>
                                        <th className="py-2.5 pr-4">Date</th>
                                        <th className="py-2.5 pr-4">Description</th>
                                        <th className="py-2.5 pr-4">Amount</th>
                                        <th className="py-2.5 pr-4">Status</th>
                                        <th className="py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {billing.invoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-white/60 transition-colors">
                                            <td className="py-3 pr-4 font-mono text-xs font-bold text-gray-600">{inv.number}</td>
                                            <td className="py-3 pr-4 text-gray-500">{fmtDate(inv.date)}</td>
                                            <td className="py-3 pr-4 text-gray-700">
                                                {getPlan(inv.planId).name} · {inv.cycle}
                                                {inv.cardLast4 && <span className="block text-[11px] text-gray-400">{inv.cardBrand?.toUpperCase()} •••• {inv.cardLast4}</span>}
                                            </td>
                                            <td className="py-3 pr-4 font-bold text-gray-800">{formatMoney(inv.total)}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full ${STATUS_CHIP[inv.status]}`}>{inv.status}</span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => handleDownload(inv)}
                                                    className="text-gray-400 hover:text-primary transition p-1.5 rounded-lg hover:bg-primary/5"
                                                    title="Download receipt"
                                                >
                                                    <span className="material-symbols-outlined text-lg">download</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillingDashboard;
