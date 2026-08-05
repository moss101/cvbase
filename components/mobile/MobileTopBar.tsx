import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface MobileTopBarProps {
    onBack?: () => void;
    /** Center content — a title, or a tappable section/progress block. */
    center?: React.ReactNode;
    onCenterClick?: () => void;
    trailing?: React.ReactNode;
}

/** Compact top bar for the mobile shell: back arrow, a title/subtitle slot
 *  (optionally tappable), and a trailing action slot. Status-bar-safe. */
const MobileTopBar: React.FC<MobileTopBarProps> = ({ onBack, center, onCenterClick, trailing }) => {
    const centerContent = (
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center">
            {center}
        </div>
    );

    return (
        <div className="pt-safe shrink-0 border-b border-border bg-white/95 backdrop-blur-md">
            <div className="flex h-14 items-center gap-1 px-2">
                <div className="flex min-w-[44px] items-center">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            aria-label="Back"
                            className="tap-target flex items-center justify-center rounded-full text-dark transition active:scale-95"
                        >
                            <ChevronLeft size={22} strokeWidth={2} />
                        </button>
                    )}
                </div>

                {onCenterClick ? (
                    <button type="button" onClick={onCenterClick} className="flex min-w-0 flex-1">
                        {centerContent}
                    </button>
                ) : centerContent}

                <div className="flex min-w-[44px] items-center justify-end gap-0.5">
                    {trailing}
                </div>
            </div>
        </div>
    );
};

export default MobileTopBar;
