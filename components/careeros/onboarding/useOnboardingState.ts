import { useCallback, useRef, useState } from 'react';
import * as careerProfileRepo from '../../../services/careerOs/careerProfileRepo';
import { ConflictError, type CareerProfile, type OnboardingState } from '../../../services/careerOs/types';

/**
 * Persists onboarding progress after every step (COS-030). Each write
 * carries the profile revision; a ConflictError re-reads the profile, merges
 * the patch over the newer state and writes once more, so two tabs or a
 * retried request cannot lose a step or overwrite a newer one.
 */
export type OnboardingPatch = Partial<OnboardingState>;

export interface OnboardingPersistence {
    /** The latest profile this hook has seen (context may lag a write). */
    current: CareerProfile;
    state: OnboardingState;
    save: (patch: OnboardingPatch) => Promise<CareerProfile>;
    saving: boolean;
    error: boolean;
}

export const useOnboardingState = (userId: string, profile: CareerProfile, onSaved?: (profile: CareerProfile) => void): OnboardingPersistence => {
    const [current, setCurrent] = useState<CareerProfile>(profile);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(false);
    const latest = useRef(current);
    latest.current = current;

    const save = useCallback(async (patch: OnboardingPatch): Promise<CareerProfile> => {
        setSaving(true);
        setError(false);
        try {
            const base = latest.current;
            let saved: CareerProfile;
            try {
                saved = await careerProfileRepo.updateOnboarding(userId, { ...base.onboarding, ...patch }, base.revision);
            } catch (err) {
                if (!(err instanceof ConflictError)) throw err;
                const fresh = await careerProfileRepo.get(userId);
                if (!fresh) throw err;
                saved = await careerProfileRepo.updateOnboarding(userId, { ...fresh.onboarding, ...patch }, fresh.revision);
            }
            latest.current = saved;
            setCurrent(saved);
            onSaved?.(saved);
            return saved;
        } catch (err) {
            setError(true);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [userId, onSaved]);

    return { current, state: current.onboarding, save, saving, error };
};

/** Which step a resumed flow should open on. */
export const resumeStep = (state: OnboardingState): OnboardingState['step'] & string => {
    if (state.completedAt) return 'done';
    return state.step ?? 'objective';
};
