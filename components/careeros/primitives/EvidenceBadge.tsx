import React from 'react';
import { CircleCheck, CircleDashed, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ConfirmationState } from '../../../services/careerOs/types';

/**
 * How much a career fact can be trusted, in words. `verified` means a recorded
 * method, source and time — never an LLM confidence — so the label says what
 * happened, not how sure a model felt. Each state has its own icon and text;
 * the evidence colour only reinforces them.
 */
export interface EvidenceBadgeProps {
    state: ConfirmationState;
    size?: 'sm' | 'md';
    /** Optional visible detail, e.g. the verification source. */
    detail?: string;
    className?: string;
}

const TONE: Record<ConfirmationState, string> = {
    verified: 'border-evidence-verified/30 bg-evidence-verified/10 text-evidence-verified',
    user_confirmed: 'border-evidence-confirmed/30 bg-evidence-confirmed/10 text-evidence-confirmed',
    inferred: 'border-evidence-inferred/30 bg-evidence-inferred/10 text-evidence-inferred',
    incomplete: 'border-evidence-incomplete/30 bg-evidence-incomplete/10 text-evidence-incomplete',
};

const ICON: Record<ConfirmationState, React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean | 'true' }>> = {
    verified: ShieldCheck,
    user_confirmed: CircleCheck,
    inferred: Sparkles,
    incomplete: CircleDashed,
};

/** Translated label for an evidence state, for use outside the badge (tables, tooltips). */
export const useEvidenceLabel = (): ((state: ConfirmationState) => string) => {
    const { t } = useTranslation();
    return (state) => {
        switch (state) {
            case 'verified':
                return t('careeros.evidence.verified', 'Verified');
            case 'user_confirmed':
                return t('careeros.evidence.userConfirmed', 'Confirmed by you');
            case 'inferred':
                return t('careeros.evidence.inferred', 'Inferred');
            case 'incomplete':
            default:
                return t('careeros.evidence.incomplete', 'Incomplete');
        }
    };
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ state, size = 'sm', detail, className = '' }) => {
    const label = useEvidenceLabel()(state);
    const Icon = ICON[state];
    const iconSize = size === 'sm' ? 12 : 14;
    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full border font-semibold ${TONE[state]} ${
                size === 'sm' ? 'px-2 py-0.5 text-[11px] leading-4' : 'px-2.5 py-1 text-xs leading-4'
            } ${className}`}
        >
            <Icon size={iconSize} strokeWidth={2} aria-hidden="true" />
            <span className="truncate">{label}</span>
            {detail && <span className="truncate font-normal text-content-secondary">· {detail}</span>}
        </span>
    );
};

export default EvidenceBadge;
