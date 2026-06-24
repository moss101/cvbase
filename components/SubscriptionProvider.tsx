import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import type { BillingState, Plan, PlanId, BillingCycle } from '../types';
import {
    PLANS,
    getPlan,
    loadBillingState,
    usageRemaining,
    type UsageKind,
} from '../services/subscriptionService';
import { getSubscription } from '../services/repos/billingRepo';
import { getUsage } from '../services/repos/usageRepo';
import { callFn } from '../services/api';

interface SubscriptionContextType {
    billing: BillingState;
    plan: Plan;
    /** Remaining quota for a metered feature (Infinity = unlimited). Display only;
     *  the Edge Functions enforce limits server-side. */
    remaining: (kind: UsageKind) => number;
    /** Legacy client meter — a no-op now (the server meters via usage_counters). */
    consume: (kind: UsageKind) => boolean;
    /** Start Stripe Checkout for a plan+cycle (redirects to Stripe). */
    startCheckout: (planId: PlanId, cycle: BillingCycle) => Promise<void>;
    /** Open the Stripe Customer Portal (manage plan, payment methods, invoices). */
    openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
    const ctx = useContext(SubscriptionContext);
    if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
    return ctx;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const uid = user?.id || null;
    const [billing, setBilling] = useState<BillingState>(() => loadBillingState(null));

    // Server is the source of truth: the subscriptions table (written only by the
    // Stripe webhook) sets the plan; usage_counters sets the live usage.
    useEffect(() => {
        let cancelled = false;
        setBilling(loadBillingState(uid));
        if (!uid) return;
        const month = new Date().toISOString().slice(0, 7);
        Promise.all([getSubscription(uid), getUsage(uid, month)])
            .then(([sub, usage]) => {
                if (cancelled) return;
                setBilling(prev => ({
                    ...prev,
                    subscription: sub
                        ? {
                              ...prev.subscription,
                              planId: sub.planId,
                              cycle: sub.cycle,
                              status: sub.status,
                              currentPeriodStart: sub.currentPeriodStart || prev.subscription.currentPeriodStart,
                              currentPeriodEnd: sub.currentPeriodEnd || prev.subscription.currentPeriodEnd,
                              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                          }
                        : prev.subscription,
                    usage: { month, atsScans: usage.atsScans, aiActions: usage.aiActions },
                }));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [uid]);

    const remaining = useCallback((kind: UsageKind) => usageRemaining(billing, kind), [billing]);
    const consume = useCallback((_kind: UsageKind): boolean => true, []);

    const startCheckout = useCallback(async (planId: PlanId, cycle: BillingCycle) => {
        const { url } = await callFn<{ url: string }>('stripe-checkout', { planId, cycle });
        if (url) window.location.href = url;
    }, []);

    const openPortal = useCallback(async () => {
        const { url } = await callFn<{ url: string }>('stripe-portal', {});
        if (url) window.location.href = url;
    }, []);

    const value = useMemo<SubscriptionContextType>(() => ({
        billing,
        plan: getPlan(billing.subscription.planId),
        remaining,
        consume,
        startCheckout,
        openPortal,
    }), [billing, remaining, consume, startCheckout, openPortal]);

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export { PLANS };
