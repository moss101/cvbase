
import React from 'react';
import { useMobileShell } from '../../lib/useMobileShell';
import StickyActionBar from '../mobile/StickyActionBar';

interface FormActionsProps {
    onClear: () => void;
    onNext: () => void;
}

const FormActions: React.FC<FormActionsProps> = ({ onClear, onNext }) => {
    const isMobileShell = useMobileShell();

    // Mobile: a single flex-1 primary ("Save & Next") plus a small demoted
    // secondary, sticky in the safe area — not two equal-weight buttons.
    if (isMobileShell) {
        return (
            <StickyActionBar>
                <button
                    type="button"
                    onClick={onClear}
                    className="tap-target shrink-0 rounded-xl px-3 text-sm font-semibold text-gray-500 transition active:scale-95"
                >
                    Clear
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    className="tap-target flex flex-1 items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white shadow-sm transition active:scale-[0.98]"
                >
                    Save &amp; Next
                </button>
            </StickyActionBar>
        );
    }

    return (
        <div className="flex gap-5 justify-end mt-10 pt-8 border-t border-border">
            <button
                type="button"
                className="px-10 py-4 rounded-xl font-bold cursor-pointer text-base transition-all bg-white border border-border text-dark hover:border-dark hover:-translate-y-0.5 hover:shadow-md"
                onClick={onClear}
            >
                Clear Section
            </button>
            <button
                type="button"
                className="px-10 py-4 rounded-xl font-bold cursor-pointer text-base transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-dark hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30"
                onClick={onNext}
            >
                Save & Next
            </button>
        </div>
    );
};

export default FormActions;
