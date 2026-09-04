/**
 * Bounded undo/redo history over a single piece of state (the resume's
 * `ResumeData`), used by ResumeBuilder in place of a plain `useState`.
 *
 * `historyReducer` is a pure function — no timers, no DOM — so the coalescing
 * and bounding logic is unit-testable without React or fake timers; `now` is
 * threaded through as data instead of read from `Date.now()` inside the
 * reducer. `useHistory` is the thin React wrapper that supplies `now` from
 * the real clock and exposes a `setState(value, field?)` API compatible with
 * `React.Dispatch<React.SetStateAction<T>>` (callers that don't know about
 * history, like the section forms owned elsewhere, can pass just a value or
 * an updater function and it works exactly like `useState`'s setter).
 */
import { useCallback, useReducer } from 'react';

export const DEFAULT_HISTORY_LIMIT = 50;
export const DEFAULT_COALESCE_MS = 400;

/** Bucket key used when a caller doesn't supply a `field` — rapid, untagged
 *  edits (e.g. typing in a plain input whose owner doesn't know about
 *  history) still coalesce with each other instead of each keystroke
 *  becoming its own undo step. */
const DEFAULT_FIELD = '__default__';

export interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
    lastField: string | null;
    lastEditAt: number;
}

export type HistoryAction<T> =
    | { type: 'set'; value: T | ((prev: T) => T); field?: string; now: number; limit: number; coalesceMs: number }
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'reset'; value: T };

export function initHistoryState<T>(value: T): HistoryState<T> {
    return { past: [], present: value, future: [], lastField: null, lastEditAt: 0 };
}

export function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
    switch (action.type) {
        case 'reset':
            return initHistoryState(action.value);

        case 'undo': {
            if (state.past.length === 0) return state;
            const previous = state.past[state.past.length - 1];
            return {
                past: state.past.slice(0, -1),
                present: previous,
                future: [state.present, ...state.future],
                lastField: null,
                lastEditAt: 0,
            };
        }

        case 'redo': {
            if (state.future.length === 0) return state;
            const [next, ...rest] = state.future;
            return {
                past: [...state.past, state.present],
                present: next,
                future: rest,
                lastField: null,
                lastEditAt: 0,
            };
        }

        case 'set': {
            const nextValue = typeof action.value === 'function'
                ? (action.value as (prev: T) => T)(state.present)
                : action.value;

            if (nextValue === state.present) return state;

            const field = action.field ?? DEFAULT_FIELD;
            const withinCoalesceWindow = action.now - state.lastEditAt <= action.coalesceMs;
            const coalesce = field === state.lastField && withinCoalesceWindow;

            if (coalesce) {
                // This edit and the previous one collapse into a single undo
                // step: replace `present` without pushing a new past entry.
                return { ...state, present: nextValue, lastField: field, lastEditAt: action.now };
            }

            const past = [...state.past, state.present].slice(-action.limit);
            return { past, present: nextValue, future: [], lastField: field, lastEditAt: action.now };
        }

        default:
            return state;
    }
}

export interface UseHistoryOptions {
    /** Maximum past entries retained. Defaults to 50. */
    limit?: number;
    /** Edits to the same `field` within this window coalesce into one undo
     *  step. Defaults to 400ms. */
    coalesceMs?: number;
}

export interface UseHistoryResult<T> {
    state: T;
    /** Drop-in replacement for a `useState` setter, with an optional `field`
     *  key for coalescing. Accepts a value or an updater function. */
    setState: (value: T | ((prev: T) => T), field?: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    /** Replace the current state and clear all history — for loading a
     *  different document entirely (example data, a JSON import, a restored
     *  version, a cloud hydration), where "undo" back into the previous
     *  document would make no sense. */
    reset: (value: T) => void;
}

export function useHistory<T>(initial: T, options: UseHistoryOptions = {}): UseHistoryResult<T> {
    const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
    const coalesceMs = options.coalesceMs ?? DEFAULT_COALESCE_MS;

    const [state, dispatch] = useReducer(historyReducer<T>, initial, initHistoryState);

    const setState = useCallback(
        (value: T | ((prev: T) => T), field?: string) => {
            dispatch({ type: 'set', value, field, now: Date.now(), limit, coalesceMs });
        },
        [limit, coalesceMs],
    );

    const undo = useCallback(() => dispatch({ type: 'undo' }), []);
    const redo = useCallback(() => dispatch({ type: 'redo' }), []);
    const reset = useCallback((value: T) => dispatch({ type: 'reset', value }), []);

    return {
        state: state.present,
        setState,
        undo,
        redo,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        reset,
    };
}
