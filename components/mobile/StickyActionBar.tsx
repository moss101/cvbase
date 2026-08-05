import React from 'react';

interface StickyActionBarProps {
    children: React.ReactNode;
}

/** Safe-area-aware sticky footer for a single primary action (plus an
 *  optional secondary). `sticky` (not `fixed`) so it participates in its
 *  parent's existing scroll container instead of needing reserved padding. */
const StickyActionBar: React.FC<StickyActionBarProps> = ({ children }) => (
    <div className="pb-safe sticky bottom-0 z-20 mt-8 flex items-center gap-3 border-t border-border bg-white/95 pt-3 backdrop-blur-md">
        {children}
    </div>
);

export default StickyActionBar;
