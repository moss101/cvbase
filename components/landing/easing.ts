import type { Easing } from 'motion/react';

/**
 * Shared cubic-bezier easing curves for the landing animations. Typed as the
 * 4-tuple Motion expects (a bare array literal widens to number[], which is not
 * assignable to Motion's Easing — the cause of the old strict-TS errors).
 */
export const EASE_OUT_EXPO: Easing = [0.32, 0.72, 0, 1];
export const EASE_IN_OUT_CUBIC: Easing = [0.65, 0, 0.35, 1];
