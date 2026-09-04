import { describe, it, expect } from 'vitest';
import { historyReducer, initHistoryState, type HistoryState } from './useHistory';

const limit = 50;
const coalesceMs = 400;

const set = <T>(state: HistoryState<T>, value: T | ((prev: T) => T), now: number, field?: string) =>
    historyReducer(state, { type: 'set', value, field, now, limit, coalesceMs });

describe('lib/builder/useHistory historyReducer', () => {
    it('starts with empty past/future and the initial value as present', () => {
        const state = initHistoryState('a');
        expect(state).toEqual({ past: [], present: 'a', future: [], lastField: null, lastEditAt: 0 });
    });

    it('pushes a past entry and clears future on a plain set', () => {
        let state = initHistoryState(0);
        state = set(state, 1, 1000, 'counter');
        expect(state.past).toEqual([0]);
        expect(state.present).toBe(1);
        expect(state.future).toEqual([]);
    });

    it('is a no-op when the new value is referentially identical to present', () => {
        const value = { a: 1 };
        let state = initHistoryState(value);
        state = set(state, value, 1000, 'obj');
        expect(state.past).toEqual([]);
        expect(state.present).toBe(value);
    });

    it('supports an updater function, like useState', () => {
        let state = initHistoryState(1);
        state = set(state, (prev) => prev + 1, 1000, 'counter');
        expect(state.present).toBe(2);
        expect(state.past).toEqual([1]);
    });

    it('undo moves present back onto future and pops past', () => {
        let state = initHistoryState('a');
        state = set(state, 'b', 1000, 'f');
        state = set(state, 'c', 2000, 'f'); // outside coalesce window -> new step
        state = historyReducer(state, { type: 'undo' });
        expect(state).toMatchObject({ past: ['a'], present: 'b', future: ['c'] });
    });

    it('redo moves future back onto present and pushes past', () => {
        let state = initHistoryState('a');
        state = set(state, 'b', 1000, 'f');
        state = set(state, 'c', 2000, 'f');
        state = historyReducer(state, { type: 'undo' });
        state = historyReducer(state, { type: 'redo' });
        expect(state).toMatchObject({ past: ['a', 'b'], present: 'c', future: [] });
    });

    it('undo on an empty past is a no-op', () => {
        const state = initHistoryState('a');
        expect(historyReducer(state, { type: 'undo' })).toBe(state);
    });

    it('redo on an empty future is a no-op', () => {
        const state = initHistoryState('a');
        expect(historyReducer(state, { type: 'redo' })).toBe(state);
    });

    it('a fresh edit after undo discards the redo branch', () => {
        let state = initHistoryState('a');
        state = set(state, 'b', 1000, 'f');
        state = set(state, 'c', 2000, 'f');
        state = historyReducer(state, { type: 'undo' }); // present: b, future: [c]
        state = set(state, 'd', 3000, 'f');
        expect(state).toMatchObject({ past: ['a', 'b'], present: 'd', future: [] });
    });

    it('coalesces same-field edits within the coalesce window into one undo step', () => {
        let state = initHistoryState('');
        state = set(state, 'H', 1000, 'summary');
        state = set(state, 'He', 1100, 'summary');
        state = set(state, 'Hel', 1200, 'summary');
        state = set(state, 'Hell', 1300, 'summary');
        state = set(state, 'Hello', 1350, 'summary');
        // All five keystrokes collapse into a single past entry (the value
        // before the first of them).
        expect(state.past).toEqual(['']);
        expect(state.present).toBe('Hello');

        const undone = historyReducer(state, { type: 'undo' });
        expect(undone.present).toBe('');
    });

    it('does not coalesce once the gap between edits exceeds coalesceMs', () => {
        let state = initHistoryState('');
        state = set(state, 'H', 1000, 'summary');
        state = set(state, 'He', 1000 + coalesceMs + 1, 'summary');
        expect(state.past).toEqual(['', 'H']);
        expect(state.present).toBe('He');
    });

    it('does not coalesce edits to a different field even within the window', () => {
        let state = initHistoryState({ firstName: '', lastName: '' });
        state = set(state, { firstName: 'J', lastName: '' }, 1000, 'contact:firstName');
        state = set(state, { firstName: 'J', lastName: 'D' }, 1050, 'contact:lastName');
        expect(state.past).toHaveLength(2);
        expect(state.present).toEqual({ firstName: 'J', lastName: 'D' });
    });

    it('untagged (no field) rapid edits still coalesce with each other via the default bucket', () => {
        let state = initHistoryState('');
        state = set(state, 'a', 1000);
        state = set(state, 'ab', 1100);
        state = set(state, 'abc', 1200);
        expect(state.past).toEqual(['']);
        expect(state.present).toBe('abc');
    });

    it('bounds the past stack to `limit` entries, dropping the oldest', () => {
        let state = initHistoryState(0);
        // Each edit is its own step (far apart in time, distinct fields) so
        // the bound is exercised on step count, not coalescing.
        for (let i = 1; i <= limit + 10; i++) {
            state = set(state, i, i * 10_000, `field-${i}`);
        }
        expect(state.past).toHaveLength(limit);
        expect(state.past[0]).toBe(10); // the oldest 10 steps (values 0..9) were dropped
        expect(state.present).toBe(limit + 10);
    });

    it('reset clears past/future and replaces present, e.g. for loading a different document', () => {
        let state = initHistoryState('a');
        state = set(state, 'b', 1000, 'f');
        state = historyReducer(state, { type: 'reset', value: 'fresh-document' });
        expect(state).toEqual(initHistoryState('fresh-document'));
    });
});
