import type {
    BillingCycle,
    BillingState,
    Invoice,
    PaymentMethod,
    Plan,
    PlanId,
    Subscription,
} from '../types';

// =========================================================================
// Plan catalog
// =========================================================================

export const PLANS: Plan[] = [
    {
        id: 'free',
        name: 'Free',
        tagline: 'Everything you need to get started',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: [
            '1 resume',
            '3 ATS scans / month',
            '10 AI writing actions / month',
            'Core template collection',
            'PDF export',
            'Job application tracker',
        ],
        limits: {
            resumes: 1,
            atsScansPerMonth: 3,
            aiActionsPerMonth: 10,
            templates: 'basic',
            liveAtsRescore: false,
            smartStudio: false,
            aiHeadshot: false,
            prioritySupport: false,
            watermarkFree: false,
        },
    },
    {
        id: 'pro',
        name: 'Pro',
        tagline: 'For an active job search',
        monthlyPrice: 12,
        yearlyPrice: 8,
        badge: 'Most popular',
        highlight: true,
        features: [
            'Unlimited resumes',
            'Unlimited ATS scans',
            'Real-time ATS re-scoring as you type',
            'Full keyword & skills-gap analysis',
            'All 70+ premium templates',
            '200 AI writing actions / month',
            'Watermark-free PDF export',
        ],
        limits: {
            resumes: -1,
            atsScansPerMonth: -1,
            aiActionsPerMonth: 200,
            templates: 'all',
            liveAtsRescore: true,
            smartStudio: false,
            aiHeadshot: false,
            prioritySupport: false,
            watermarkFree: true,
        },
    },
    {
        id: 'elite',
        name: 'Elite',
        tagline: 'The full career acceleration suite',
        monthlyPrice: 24,
        yearlyPrice: 16,
        badge: 'Best value',
        features: [
            'Everything in Pro',
            'Smart Studio: LinkedIn & cover letter AI',
            'AI professional headshot generator',
            'Unlimited AI writing actions',
            'Role-fit & job analytics insights',
            'Priority support',
        ],
        limits: {
            resumes: -1,
            atsScansPerMonth: -1,
            aiActionsPerMonth: -1,
            templates: 'all',
            liveAtsRescore: true,
            smartStudio: true,
            aiHeadshot: true,
            prioritySupport: true,
            watermarkFree: true,
        },
    },
];

export const getPlan = (id: PlanId): Plan => PLANS.find(p => p.id === id) || PLANS[0];

const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, elite: 2 };
export const isUpgrade = (from: PlanId, to: PlanId) => PLAN_RANK[to] > PLAN_RANK[from];

export interface PromoCode {
    code: string;
    /** 0–1 fraction off the first charge */
    percentOff: number;
    description: string;
}

const PROMO_CODES: PromoCode[] = [
    { code: 'CVBASE20', percentOff: 0.2, description: '20% off your first payment' },
    { code: 'LAUNCH50', percentOff: 0.5, description: '50% off your first payment' },
    { code: 'FRIEND10', percentOff: 0.1, description: '10% off your first payment' },
];

export const validatePromoCode = (code: string): PromoCode | null =>
    PROMO_CODES.find(p => p.code === code.trim().toUpperCase()) || null;

// =========================================================================
// Pricing helpers
// =========================================================================

/** Price actually charged at checkout for a plan+cycle (before discounts). */
export const cycleCharge = (plan: Plan, cycle: BillingCycle): number =>
    cycle === 'yearly' ? plan.yearlyPrice * 12 : plan.monthlyPrice;

export const formatMoney = (amount: number): string =>
    `$${amount.toFixed(2).replace(/\.00$/, '')}`;

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const addCycle = (from: Date, cycle: BillingCycle): Date => {
    const d = new Date(from);
    if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
};

/**
 * Unused value remaining on the current subscription, used as credit
 * when switching plans mid-period.
 */
export const prorationCredit = (state: BillingState): number => {
    const sub = state.subscription;
    if (sub.planId === 'free' || sub.status !== 'active') return 0;
    const plan = getPlan(sub.planId);
    const start = new Date(sub.currentPeriodStart).getTime();
    const end = new Date(sub.currentPeriodEnd).getTime();
    const now = Date.now();
    if (now >= end || end <= start) return 0;
    const remainingFraction = (end - now) / (end - start);
    return Math.round(cycleCharge(plan, sub.cycle) * remainingFraction * 100) / 100;
};

export interface CheckoutQuote {
    plan: Plan;
    cycle: BillingCycle;
    subtotal: number;
    discount: number;
    creditApplied: number;
    total: number;
    promo: PromoCode | null;
}

export const quoteCheckout = (
    state: BillingState,
    planId: PlanId,
    cycle: BillingCycle,
    promo: PromoCode | null,
): CheckoutQuote => {
    const plan = getPlan(planId);
    const subtotal = cycleCharge(plan, cycle);
    const discount = promo ? Math.round(subtotal * promo.percentOff * 100) / 100 : 0;
    const availableCredit = prorationCredit(state) + state.creditBalance;
    const creditApplied = Math.min(availableCredit, Math.max(subtotal - discount, 0));
    const total = Math.max(Math.round((subtotal - discount - creditApplied) * 100) / 100, 0);
    return { plan, cycle, subtotal, discount, creditApplied, total, promo };
};

// =========================================================================
// Card validation (the simulated gateway still validates like a real one)
// =========================================================================

export const luhnValid = (num: string): boolean => {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 19) return false;
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let d = parseInt(digits[i], 10);
        if (dbl) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        dbl = !dbl;
    }
    return sum % 10 === 0;
};

export const detectCardBrand = (num: string): PaymentMethod['brand'] => {
    const d = num.replace(/\D/g, '');
    if (/^4/.test(d)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
    if (/^3[47]/.test(d)) return 'amex';
    if (/^6(011|5)/.test(d)) return 'discover';
    return 'card';
};

export interface CardInput {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    holder: string;
}

export const validateCard = (card: CardInput): string | null => {
    if (!card.holder.trim()) return 'Cardholder name is required.';
    if (!luhnValid(card.number)) return 'Card number is invalid.';
    if (!card.expMonth || card.expMonth < 1 || card.expMonth > 12) return 'Expiry month is invalid.';
    const now = new Date();
    const yr = card.expYear < 100 ? 2000 + card.expYear : card.expYear;
    if (yr < now.getFullYear() || (yr === now.getFullYear() && card.expMonth < now.getMonth() + 1)) {
        return 'This card has expired.';
    }
    const cvcLen = detectCardBrand(card.number) === 'amex' ? 4 : 3;
    if (!new RegExp(`^\\d{${cvcLen}}$`).test(card.cvc)) return `Security code must be ${cvcLen} digits.`;
    return null;
};

// =========================================================================
// State persistence — localStorage source of truth, Firestore best-effort
// =========================================================================

const STORAGE_PREFIX = 'cvbase-billing-v1';
const storageKey = (uid: string | null) => `${STORAGE_PREFIX}:${uid || 'guest'}`;

const defaultState = (): BillingState => {
    const now = new Date();
    return {
        subscription: {
            planId: 'free',
            cycle: 'monthly',
            status: 'active',
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: addCycle(now, 'monthly').toISOString(),
            cancelAtPeriodEnd: false,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        },
        paymentMethods: [],
        invoices: [],
        usage: { month: monthKey(), atsScans: 0, aiActions: 0 },
        creditBalance: 0,
    };
};

/** Apply time-based transitions: usage reset, scheduled downgrades, expiry. */
const reconcile = (state: BillingState): BillingState => {
    const next: BillingState = JSON.parse(JSON.stringify(state));
    const nowIso = new Date().toISOString();

    if (next.usage.month !== monthKey()) {
        next.usage = { month: monthKey(), atsScans: 0, aiActions: 0 };
    }

    const sub = next.subscription;
    if (sub.planId !== 'free' && new Date(sub.currentPeriodEnd).getTime() < Date.now()) {
        if (sub.cancelAtPeriodEnd || sub.pendingPlanId === 'free') {
            // Subscription lapsed back to free.
            next.subscription = {
                ...defaultState().subscription,
                createdAt: sub.createdAt,
                updatedAt: nowIso,
            };
        } else if (sub.pendingPlanId) {
            sub.planId = sub.pendingPlanId;
            sub.cycle = sub.pendingCycle || sub.cycle;
            sub.pendingPlanId = undefined;
            sub.pendingCycle = undefined;
            sub.currentPeriodStart = nowIso;
            sub.currentPeriodEnd = addCycle(new Date(), sub.cycle).toISOString();
            sub.updatedAt = nowIso;
        } else {
            // Simulate auto-renewal so the demo subscription never silently dies.
            sub.currentPeriodStart = nowIso;
            sub.currentPeriodEnd = addCycle(new Date(), sub.cycle).toISOString();
            sub.updatedAt = nowIso;
        }
    }
    return next;
};

export const loadBillingState = (uid: string | null): BillingState => {
    try {
        const raw = localStorage.getItem(storageKey(uid));
        if (raw) return reconcile(JSON.parse(raw) as BillingState);
    } catch {
        /* fall through to default */
    }
    return defaultState();
};

export const saveBillingState = (uid: string | null, state: BillingState): void => {
    try {
        localStorage.setItem(storageKey(uid), JSON.stringify(state));
    } catch {
        /* storage unavailable — state stays in memory */
    }
    // Cloud billing sync removed with Firebase. Real subscription state will live
    // in the Postgres `subscriptions` table (written by the Stripe webhook in W4).
};

export const fetchCloudBillingState = async (uid: string): Promise<BillingState | null> => {
    // No cloud billing store until W4 (Stripe -> Postgres `subscriptions`).
    // Simulated billing is localStorage-only; callers fall back to local state.
    return null;
};

// =========================================================================
// Simulated payment gateway
// =========================================================================

export interface PaymentResult {
    ok: boolean;
    error?: string;
    paymentMethod?: PaymentMethod;
}

const GATEWAY_DECLINE_CARDS = ['4000000000000002', '4000000000009995'];

export const processCardPayment = (card: CardInput, amount: number): Promise<PaymentResult> =>
    new Promise(resolve => {
        const validationError = validateCard(card);
        if (validationError) {
            resolve({ ok: false, error: validationError });
            return;
        }
        const digits = card.number.replace(/\D/g, '');
        setTimeout(() => {
            if (GATEWAY_DECLINE_CARDS.includes(digits)) {
                resolve({ ok: false, error: 'Your card was declined. Please try a different payment method.' });
                return;
            }
            if (amount < 0) {
                resolve({ ok: false, error: 'Invalid charge amount.' });
                return;
            }
            resolve({
                ok: true,
                paymentMethod: {
                    id: `pm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
                    brand: detectCardBrand(digits),
                    last4: digits.slice(-4),
                    expMonth: card.expMonth,
                    expYear: card.expYear < 100 ? 2000 + card.expYear : card.expYear,
                    holder: card.holder.trim(),
                    isDefault: true,
                    addedAt: new Date().toISOString(),
                },
            });
        }, 1400 + Math.random() * 600);
    });

// =========================================================================
// Subscription operations (pure: take state, return new state)
// =========================================================================

let invoiceCounter = 0;
const nextInvoiceNumber = (state: BillingState): string => {
    invoiceCounter = Math.max(invoiceCounter, state.invoices.length) + 1;
    return `CVB-${new Date().getFullYear()}-${String(invoiceCounter).padStart(4, '0')}`;
};

export const completeCheckout = (
    state: BillingState,
    quote: CheckoutQuote,
    paymentMethod: PaymentMethod,
): BillingState => {
    const now = new Date();
    const nowIso = now.toISOString();
    const availableCredit = prorationCredit(state) + state.creditBalance;
    const leftoverCredit = Math.max(Math.round((availableCredit - quote.creditApplied) * 100) / 100, 0);

    const invoice: Invoice = {
        id: `inv_${Date.now().toString(36)}`,
        number: nextInvoiceNumber(state),
        date: nowIso,
        description: `CVBase ${quote.plan.name} — ${quote.cycle === 'yearly' ? 'Annual' : 'Monthly'} subscription`,
        planId: quote.plan.id,
        cycle: quote.cycle,
        subtotal: quote.subtotal,
        discount: quote.discount,
        creditApplied: quote.creditApplied,
        total: quote.total,
        currency: 'USD',
        status: 'paid',
        cardBrand: paymentMethod.brand,
        cardLast4: paymentMethod.last4,
        promoCode: quote.promo?.code,
    };

    const methods = [
        paymentMethod,
        ...state.paymentMethods
            .filter(m => m.last4 !== paymentMethod.last4 || m.brand !== paymentMethod.brand)
            .map(m => ({ ...m, isDefault: false })),
    ];

    const subscription: Subscription = {
        planId: quote.plan.id,
        cycle: quote.cycle,
        status: 'active',
        currentPeriodStart: nowIso,
        currentPeriodEnd: addCycle(now, quote.cycle).toISOString(),
        cancelAtPeriodEnd: false,
        defaultPaymentMethodId: paymentMethod.id,
        createdAt: state.subscription.createdAt,
        updatedAt: nowIso,
    };

    return {
        ...state,
        subscription,
        paymentMethods: methods,
        invoices: [invoice, ...state.invoices],
        creditBalance: leftoverCredit,
    };
};

/** Schedule a downgrade (incl. to free) at the end of the current period. */
export const scheduleDowngrade = (state: BillingState, planId: PlanId, cycle: BillingCycle): BillingState => ({
    ...state,
    subscription: {
        ...state.subscription,
        pendingPlanId: planId,
        pendingCycle: cycle,
        cancelAtPeriodEnd: planId === 'free',
        updatedAt: new Date().toISOString(),
    },
});

export const cancelSubscription = (state: BillingState): BillingState => ({
    ...state,
    subscription: {
        ...state.subscription,
        cancelAtPeriodEnd: true,
        pendingPlanId: 'free',
        pendingCycle: 'monthly',
        updatedAt: new Date().toISOString(),
    },
});

export const resumeSubscription = (state: BillingState): BillingState => ({
    ...state,
    subscription: {
        ...state.subscription,
        cancelAtPeriodEnd: false,
        pendingPlanId: undefined,
        pendingCycle: undefined,
        updatedAt: new Date().toISOString(),
    },
});

export const removePaymentMethod = (state: BillingState, id: string): BillingState => {
    const remaining = state.paymentMethods.filter(m => m.id !== id);
    if (remaining.length && !remaining.some(m => m.isDefault)) remaining[0].isDefault = true;
    return { ...state, paymentMethods: remaining };
};

export const setDefaultPaymentMethod = (state: BillingState, id: string): BillingState => ({
    ...state,
    paymentMethods: state.paymentMethods.map(m => ({ ...m, isDefault: m.id === id })),
    subscription: { ...state.subscription, defaultPaymentMethodId: id, updatedAt: new Date().toISOString() },
});

// =========================================================================
// Usage / entitlements
// =========================================================================

export type UsageKind = 'atsScans' | 'aiActions';

export const usageLimit = (state: BillingState, kind: UsageKind): number => {
    const limits = getPlan(state.subscription.planId).limits;
    return kind === 'atsScans' ? limits.atsScansPerMonth : limits.aiActionsPerMonth;
};

export const usageRemaining = (state: BillingState, kind: UsageKind): number => {
    const limit = usageLimit(state, kind);
    if (limit === -1) return Infinity;
    return Math.max(limit - state.usage[kind], 0);
};

export const recordUsage = (state: BillingState, kind: UsageKind): BillingState => ({
    ...state,
    usage: { ...state.usage, month: monthKey(), [kind]: state.usage[kind] + 1 },
});

// =========================================================================
// Invoice download (self-contained HTML receipt)
// =========================================================================

export const downloadInvoice = (invoice: Invoice, customerName: string, customerEmail: string): void => {
    const row = (label: string, value: string, strong = false) =>
        `<tr><td style="padding:6px 0;color:#5A5247;">${label}</td><td style="padding:6px 0;text-align:right;${strong ? 'font-weight:700;color:#1B1713;font-size:16px;' : ''}">${value}</td></tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoice.number}</title></head>
<body style="font-family:Georgia,serif;background:#FAF7F2;margin:0;padding:40px;color:#1B1713;">
<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #E5DFD3;border-radius:12px;padding:48px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
    <div style="font-size:24px;font-weight:700;">CVBase</div>
    <div style="text-align:right;">
      <div style="font-size:13px;color:#8B8274;letter-spacing:1px;text-transform:uppercase;">Invoice</div>
      <div style="font-weight:700;">${invoice.number}</div>
    </div>
  </div>
  <div style="margin-bottom:28px;font-size:14px;color:#5A5247;">
    Billed to <strong style="color:#1B1713;">${customerName || 'CVBase Customer'}</strong>${customerEmail ? ` · ${customerEmail}` : ''}<br/>
    ${new Date(invoice.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
    · Paid with ${invoice.cardBrand ? invoice.cardBrand.toUpperCase() : 'card'} •••• ${invoice.cardLast4 || ''}
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #E5DFD3;padding-top:12px;">
    ${row(invoice.description, formatMoney(invoice.subtotal))}
    ${invoice.discount > 0 ? row(`Promo ${invoice.promoCode || ''}`, `−${formatMoney(invoice.discount)}`) : ''}
    ${invoice.creditApplied > 0 ? row('Account credit applied', `−${formatMoney(invoice.creditApplied)}`) : ''}
    <tr><td colspan="2" style="border-top:1px solid #E5DFD3;"></td></tr>
    ${row('Total paid', formatMoney(invoice.total), true)}
  </table>
  <div style="margin-top:36px;font-size:12px;color:#8B8274;">Status: ${invoice.status.toUpperCase()} · Currency: ${invoice.currency}<br/>Thank you for building your career with CVBase.</div>
</div></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cvbase-invoice-${invoice.number}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};
