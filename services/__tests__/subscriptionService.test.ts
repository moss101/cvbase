import { describe, it, expect } from 'vitest';
import {
  luhnValid,
  formatMoney,
  getPlan,
  cycleCharge,
  quoteCheckout,
  usageRemaining,
} from '../subscriptionService';
import type { BillingState } from '../../types';

describe('subscriptionService pure helpers', () => {
  it('luhnValid accepts a valid test card and rejects junk', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('1234')).toBe(false);
    expect(luhnValid('')).toBe(false);
  });

  it('formatMoney strips a trailing .00 but keeps real cents', () => {
    expect(formatMoney(12)).toBe('$12');
    expect(formatMoney(12.5)).toBe('$12.50');
    expect(formatMoney(0)).toBe('$0');
  });

  it('getPlan returns the requested plan and falls back to free', () => {
    expect(getPlan('pro').id).toBe('pro');
    expect(getPlan('elite').id).toBe('elite');
    // @ts-expect-error — exercising the runtime fallback for an unknown id
    expect(getPlan('nope').id).toBe('free');
  });

  it('cycleCharge bills yearly as 12x the monthly-equivalent yearly price', () => {
    const pro = getPlan('pro');
    expect(cycleCharge(pro, 'monthly')).toBe(pro.monthlyPrice);
    expect(cycleCharge(pro, 'yearly')).toBe(pro.yearlyPrice * 12);
  });
});

describe('quoteCheckout', () => {
  const baseState = (): BillingState => ({
    subscription: {
      planId: 'free',
      cycle: 'monthly',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    paymentMethods: [],
    invoices: [],
    usage: { month: '2026-06', atsScans: 0, aiActions: 0 },
    creditBalance: 0,
  });

  it('applies a percentage promo to the subtotal', () => {
    const q = quoteCheckout(baseState(), 'pro', 'monthly', {
      code: 'LAUNCH50',
      percentOff: 0.5,
      description: '50% off',
    });
    expect(q.subtotal).toBe(12);
    expect(q.discount).toBe(6);
    expect(q.total).toBe(6);
  });

  it('never produces a negative total', () => {
    const state = baseState();
    state.creditBalance = 1000;
    const q = quoteCheckout(state, 'pro', 'monthly', null);
    expect(q.total).toBe(0);
  });
});

describe('usageRemaining', () => {
  it('treats -1 limits as unlimited', () => {
    const state: BillingState = {
      subscription: {
        planId: 'elite',
        cycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date().toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      paymentMethods: [],
      invoices: [],
      usage: { month: '2026-06', atsScans: 999, aiActions: 999 },
      creditBalance: 0,
    };
    expect(usageRemaining(state, 'aiActions')).toBe(Infinity);
  });

  it('clamps remaining usage at zero', () => {
    const state: BillingState = {
      subscription: {
        planId: 'free',
        cycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date().toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      paymentMethods: [],
      invoices: [],
      usage: { month: '2026-06', atsScans: 99, aiActions: 0 },
      creditBalance: 0,
    };
    expect(usageRemaining(state, 'atsScans')).toBe(0);
  });
});
