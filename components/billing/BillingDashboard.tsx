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
import { Download, Clock, Info, Gauge, CreditCard, Trash2, ReceiptText, Receipt } from 'lucide-react';
import { Icon } from '../common/icons';
import { useTranslation, type Translate } from '../../services/translationService';

interface BillingDashboardProps {
    onChangePlan: () => void;
}

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const UsageMeter: React.FC<{ label: string; used: number; limit: number; icon: string; t: Translate }> = ({ label, used, limit, icon, t }) => {
    const unlimited = limit === -1;
    const pct = unlimited ? 0 : Math.min((used / Math.max(limit, 1)) * 100, 100);
    const tone = unlimited ? 'text-emerald-600' : pct >= 100 ? 'text-rose-600' : pct >= 66 ? 'text-amber-600' : 'text-gray-700';
    return (
        <div className="p-4 rounded-2xl bg-white/70 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                    <Icon name={icon} className="w-4 h-4 text-primary" aria-hidden="true" />{label}
                </span>
                <span className={`text-xs font-extrabold ${tone}`}>
                    {unlimited ? t('pricing.unlimited', 'Unlimited') : `${used} / ${limit}`}
                </span>
            </div>
            <div className="w-full bg-gray-200/70 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-1.5 rounded-full transition-all ${unlimited ? 'bg-gradient-to-r from-emerald-400 to-primary w-full opacity-40' : pct >= 100 ? 'bg-rose-500' : 'bg-primary'}`}
                    style={unlimited ? undefined : { width: `${pct}%` }}
                />
            </div>
            {unlimited && <p className="text-[10px] text-gray-400 mt-1">{t('billing.noMonthlyCap', 'No monthly cap on your plan')}</p>}
        </div>
    );
};

const STATUS_CHIP: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    refunded: 'bg-slate-100 text-slate-600',
    failed: 'bg-rose-100 text-rose-700',
};

const BillingDashboard: React.FC<BillingDashboardProps> = ({ onChangePlan }) => {
    const { t } = useTranslation();
    const STATUS_LABEL: Record<string, string> = {
        paid: t('billing.status.paid', 'paid'),
        refunded: t('billing.status.refunded', 'refunded'),
        failed: t('billing.status.failed', 'failed'),
    };
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
                <p className="dashboard-eyebrow mb-3">{t('billing.eyebrow', 'Account & usage')}</p>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('mobile.billingPlans', 'Billing & Plans')}</h1>
                <p className="text-gray-500">{t('billing.headerDesc', 'Manage your subscription, payment methods and receipts.')}</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ===== Current plan ===== */}
                <div className={`lg:col-span-2 rounded-3xl p-7 relative overflow-hidden ${isFree ? 'glass-card !translate-y-0' : 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isFree ? 'text-gray-400' : 'text-secondary'}`}>{t('pricing.currentPlan', 'Current plan')}</p>
                            <h2 className={`text-3xl font-black flex items-center gap-3 ${isFree ? 'text-gray-800' : 'text-white'}`}>
                                CVBase {plan.name}
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                    sub.cancelAtPeriodEnd ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    {sub.cancelAtPeriodEnd ? t('billing.canceling', 'Canceling') : t('billing.active', 'Active')}
                                </span>
                            </h2>
                            <p className={`text-sm mt-1 ${isFree ? 'text-gray-500' : 'text-slate-300'}`}>{plan.tagline}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-3xl font-black ${isFree ? 'text-gray-800' : 'text-white'}`}>
                                {formatMoney(sub.cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)}
                                <span className={`text-sm font-medium ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>/mo</span>
                            </p>
                            {!isFree && <p className="text-[11px] text-slate-400">{t('billing.billedCycle', 'billed {cycle}').replace('{cycle}', sub.cycle === 'yearly' ? t('pricing.yearly', 'Yearly').toLowerCase() : t('pricing.monthly', 'Monthly').toLowerCase())}</p>}
                        </div>
                    </div>

                    <div className={`mt-6 grid sm:grid-cols-2 gap-3 text-sm ${isFree ? 'text-gray-600' : 'text-slate-200'}`}>
                        {!isFree && (
                            <>
                                <div className={`p-3.5 rounded-2xl ${isFree ? 'bg-white/70 border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                                    <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>
                                        {sub.cancelAtPeriodEnd ? t('billing.accessEnds', 'Access ends') : pendingPlan ? t('billing.switches', 'Switches') : t('billing.renews', 'Renews')}
                                    </p>
                                    <p className="font-bold">
                                        {fmtDate(sub.currentPeriodEnd)}
                                        {!sub.cancelAtPeriodEnd && !pendingPlan && <span className={`font-medium ${isFree ? 'text-gray-400' : 'text-slate-400'}`}> · {formatMoney(renewalAmount)}</span>}
                                    </p>
                                </div>
                                <div className={`p-3.5 rounded-2xl ${isFree ? 'bg-white/70 border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                                    <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>{t('billing.memberSince', 'Member since')}</p>
                                    <p className="font-bold">{fmtDate(sub.createdAt)}</p>
                                </div>
                            </>
                        )}
                        {billing.creditBalance > 0 && (
                            <div className={`p-3.5 rounded-2xl ${isFree ? 'bg-white/70 border border-gray-100' : 'bg-white/5 border border-white/10'}`}>
                                <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-0.5 ${isFree ? 'text-gray-400' : 'text-slate-400'}`}>{t('billing.accountCredit', 'Account credit')}</p>
                                <p className="font-bold text-emerald-500">{t('billing.creditAppliedNext', '{amount} — applied to your next charge').replace('{amount}', formatMoney(billing.creditBalance))}</p>
                            </div>
                        )}
                    </div>

                    {pendingPlan && !sub.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" aria-hidden="true" />
                                {t('billing.scheduledSwitch', 'Scheduled: switching to')} <strong>{pendingPlan.name}</strong> {t('billing.onDate', 'on {date}.').replace('{date}', fmtDate(sub.currentPeriodEnd))}
                            </span>
                            <button onClick={openPortal} className="text-xs font-bold text-amber-700 hover:underline shrink-0">{t('billing.keepPlan', 'Keep {plan}').replace('{plan}', plan.name)}</button>
                        </div>
                    )}
                    {sub.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2"><Info className="w-4 h-4" aria-hidden="true" />
                                {t('billing.planSetToCancel', 'Your plan is set to cancel. You keep {plan} features until {date}.').replace('{plan}', plan.name).replace('{date}', fmtDate(sub.currentPeriodEnd))}
                            </span>
                            <button onClick={openPortal} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0">{t('billing.resumePlan', 'Resume plan')}</button>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={onChangePlan}
                            className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition"
                        >
                            {isFree ? t('billing.upgradePlan', 'Upgrade plan') : t('billing.changePlan', 'Change plan')}
                        </button>
                        {!isFree && !sub.cancelAtPeriodEnd && (
                            confirmCancel ? (
                                <span className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className={`w-full sm:w-auto ${isFree ? 'text-gray-600' : 'text-slate-300'}`}>{t('billing.cancelAtPeriodEndQ', 'Cancel at period end?')}</span>
                                    <button onClick={() => { openPortal(); setConfirmCancel(false); }} className="tap-target px-3 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition">{t('billing.yesCancel', 'Yes, cancel')}</button>
                                    <button onClick={() => setConfirmCancel(false)} className={`tap-target px-3 rounded-lg text-xs font-bold transition ${isFree ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>{t('billing.keepPlanShort', 'Keep plan')}</button>
                                </span>
                            ) : (
                                <button
                                    onClick={() => setConfirmCancel(true)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition ${isFree ? 'text-gray-500 hover:bg-gray-100' : 'text-slate-300 hover:bg-white/10'}`}
                                >
                                    {t('billing.cancelSubscription', 'Cancel subscription')}
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* ===== Usage ===== */}
                <div className="glass-card rounded-3xl p-6 !translate-y-0">
                    <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <Gauge className="w-[1em] h-[1em] text-primary text-xl" aria-hidden="true" /> {t('billing.thisMonthUsage', "This month's usage")}
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-4">{t('billing.resetsOnFirst', 'Resets on the 1st of each month.')}</p>
                    <div className="space-y-3">
                        <UsageMeter label={t('billing.atsScansLabel', 'ATS scans')} used={billing.usage.atsScans} limit={plan.limits.atsScansPerMonth} icon="radar" t={t} />
                        <UsageMeter label={t('billing.aiActionsLabel', 'AI writing actions')} used={billing.usage.aiActions} limit={plan.limits.aiActionsPerMonth} icon="auto_awesome" t={t} />
                    </div>
                    {isFree && (
                        <button onClick={onChangePlan} className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-secondary/20 text-secondary-dark text-xs font-bold hover:from-primary/20 hover:to-secondary/20 transition">
                            {t('billing.removeLimitsWithPro', 'Remove limits with Pro →')}
                        </button>
                    )}
                </div>

                {/* ===== Payment methods ===== */}
                <div className="glass-card rounded-3xl p-6 !translate-y-0 lg:col-span-1">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard className="w-[1em] h-[1em] text-primary text-xl" aria-hidden="true" /> {t('billing.paymentMethods', 'Payment methods')}
                    </h3>
                    {billing.paymentMethods.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('billing.noCardsSaved', 'No cards saved yet. A card is added automatically when you subscribe to a paid plan.')}</p>
                    ) : (
                        <div className="space-y-3">
                            {billing.paymentMethods.map(m => (
                                <div key={m.id} className="p-4 rounded-2xl bg-white/70 border border-gray-100 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-extrabold px-2 py-1.5 rounded-md bg-slate-800 text-white uppercase">{m.brand}</span>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">•••• {m.last4}</p>
                                            <p className="text-[11px] text-gray-400">{t('billing.expires', 'Expires {date} · {holder}').replace('{date}', `${String(m.expMonth).padStart(2, '0')}/${m.expYear}`).replace('{holder}', m.holder)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {m.isDefault ? (
                                            <span className="text-[10px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary px-2 py-1 rounded-full">{t('billing.default', 'Default')}</span>
                                        ) : (
                                            <button onClick={openPortal} className="text-[11px] font-bold text-gray-400 hover:text-primary transition px-1.5">{t('billing.makeDefault', 'Make default')}</button>
                                        )}
                                        <button onClick={openPortal} className="tap-target flex items-center justify-center text-gray-300 hover:text-rose-500 transition" title={t('billing.removeCard', 'Remove card')} aria-label={t('billing.removeCard', 'Remove card')}>
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
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
                        <ReceiptText className="w-[1em] h-[1em] text-primary text-xl" aria-hidden="true" /> {t('billing.paymentHistory', 'Payment history')}
                    </h3>
                    {billing.invoices.length === 0 ? (
                        <div className="text-center py-8">
                            <Receipt className="w-10 h-10 text-gray-200" aria-hidden="true" />
                            <p className="text-sm text-gray-500 mt-2">{t('billing.noPaymentsYet', 'No payments yet — invoices appear here after your first subscription.')}</p>
                        </div>
                    ) : isMobileShell ? (
                        <div className="divide-y divide-gray-100 border-t border-gray-100">
                            {billing.invoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between gap-3 py-3.5">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate font-mono text-xs font-bold text-gray-600">{inv.number}</p>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_CHIP[inv.status]}`}>{STATUS_LABEL[inv.status] ?? inv.status}</span>
                                        </div>
                                        <p className="mt-1 truncate text-sm text-gray-700">{getPlan(inv.planId).name} · {inv.cycle}</p>
                                        <p className="text-[11px] text-gray-400">{fmtDate(inv.date)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <p className="font-bold text-gray-800">{formatMoney(inv.total)}</p>
                                        <button
                                            onClick={() => handleDownload(inv)}
                                            aria-label={t('billing.downloadReceipt', 'Download receipt')}
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
                                        <th className="py-2.5 pr-4">{t('billing.invoice', 'Invoice')}</th>
                                        <th className="py-2.5 pr-4">{t('billing.date', 'Date')}</th>
                                        <th className="py-2.5 pr-4">{t('billing.description', 'Description')}</th>
                                        <th className="py-2.5 pr-4">{t('billing.amount', 'Amount')}</th>
                                        <th className="py-2.5 pr-4">{t('billing.statusLabel', 'Status')}</th>
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
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full ${STATUS_CHIP[inv.status]}`}>{STATUS_LABEL[inv.status] ?? inv.status}</span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => handleDownload(inv)}
                                                    className="text-gray-400 hover:text-primary transition p-1.5 rounded-lg hover:bg-primary/5"
                                                    title={t('billing.downloadReceipt', 'Download receipt')}
                                                    aria-label={t('billing.downloadReceipt', 'Download receipt')}
                                                >
                                                    <Download className="w-[1em] h-[1em] text-lg" aria-hidden="true" />
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
