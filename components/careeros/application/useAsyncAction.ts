import { useCallback, useRef, useState } from 'react';
import { classifyError, type FailureKind } from './errors';

/**
 * Wraps a mutation so a button cannot fire twice while it is pending and the
 * failure is classified for the screen (REQ-30). The action's own thrown
 * error is kept for copy that needs the code; the kind drives the panel.
 */
export interface AsyncActionState {
    pending: boolean;
    error: unknown;
    failure: FailureKind | null;
    reset: () => void;
}

export function useAsyncAction<Args extends unknown[]>(
    action: (...args: Args) => Promise<void>,
): [(...args: Args) => Promise<boolean>, AsyncActionState] {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const inFlight = useRef(false);
    const actionRef = useRef(action);
    actionRef.current = action;

    const run = useCallback(async (...args: Args): Promise<boolean> => {
        if (inFlight.current) return false;
        inFlight.current = true;
        setPending(true);
        setError(null);
        try {
            await actionRef.current(...args);
            return true;
        } catch (err) {
            setError(err);
            return false;
        } finally {
            inFlight.current = false;
            setPending(false);
        }
    }, []);

    const reset = useCallback(() => setError(null), []);
    return [run, { pending, error, failure: error ? classifyError(error) : null, reset }];
}
