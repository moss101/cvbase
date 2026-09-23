/**
 * A question handed to the Coach from elsewhere (Ask CVbase, a Today
 * suggestion). The next conversation that opens prefills its composer with it
 * — the person still reads it and presses Send; nothing is sent for them.
 */
const KEY = 'cvbase:coach-handoff';

export function handOffToCoach(question: string): void {
    try { sessionStorage.setItem(KEY, question.slice(0, 4000)); } catch { /* the Coach still opens, just without the prefill */ }
}

/** Reads and clears the pending question. */
export function takeCoachHandoff(): string | null {
    try {
        const value = sessionStorage.getItem(KEY);
        if (value !== null) sessionStorage.removeItem(KEY);
        return value && value.trim() ? value : null;
    } catch {
        return null;
    }
}
