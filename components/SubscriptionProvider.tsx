import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import type { BillingState, Plan, PlanId, BillingCycle } from '../types';
import {
    PLANS,
    getPlan,
    loadBillingState,
    saveBillingState,
    fetchCloudBillingState,
    usageRemaining,
    recordUsage,
    cancelSubscription,
    resumeSubscription,
    scheduleDowngrade,
    removePaymentMethod,
    setDefaultPaymentMethod,
    type UsageKind,
} from '../services/subscriptionService';

interface SubscriptionContextType {
    billing: BillingState;
    plan: Plan;
    /** Replace the whole billing state (used by checkout). */
    applyBilling: (next: BillingState) => void;
    /** Returns remaining quota for a metered feature (Infinity = unlimited). */
    remaining: (kind: UsageKind) => number;
    /** Consume one unit of a metered feature. Returns false if exhausted. */
    consume: (kind: UsageKind) => boolean;
    cancel: () => void;
    resume: () => void;
    downgrade: (planId: PlanId, cycle: BillingCycle) => void;
    removeMethod: (id: string) => void;
    setDefaultMethod: (id: string) => void;
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

    // Reload when the signed-in user changes; prefer the freshest copy from the cloud.
    useEffect(() => {
        let cancelled = false;
        const local = loadBillingState(uid);
        setBilling(local);
        if (uid) {
            fetchCloudBillingState(uid).then(cloud => {
                if (cancelled || !cloud) return;
                const cloudUpdated = new Date(cloud.subscription.updatedAt).getTime();
                const localUpdated = new Date(local.subscription.updatedAt).getTime();
                if (cloudUpdated > localUpdated) setBilling(cloud);
            });
        }
        return () => { cancelled = true; };
    }, [uid]);

    const applyBilling = useCallback((next: BillingState) => {
        setBilling(next);
        saveBillingState(uid, next);
    }, [uid]);

    const remaining = useCallback((kind: UsageKind) => usageRemaining(billing, kind), [billing]);

    const consume = useCallback((kind: UsageKind): boolean => {
        if (usageRemaining(billing, kind) <= 0) return false;
        applyBilling(recordUsage(billing, kind));
        return true;
    }, [billing, applyBilling]);

    const value = useMemo<SubscriptionContextType>(() => ({
        billing,
        plan: getPlan(billing.subscription.planId),
        applyBilling,
        remaining,
        consume,
        cancel: () => applyBilling(cancelSubscription(billing)),
        resume: () => applyBilling(resumeSubscription(billing)),
        downgrade: (planId, cycle) => applyBilling(scheduleDowngrade(billing, planId, cycle)),
        removeMethod: id => applyBilling(removePaymentMethod(billing, id)),
        setDefaultMethod: id => applyBilling(setDefaultPaymentMethod(billing, id)),
    }), [billing, applyBilling, remaining, consume]);

    return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export { PLANS };
