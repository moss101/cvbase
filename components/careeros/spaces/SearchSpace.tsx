import React, { useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import type { CareerRoute } from '../../NavigationProvider';
import { SpaceHeader } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import CommandPalette from '../search/CommandPalette';
import { recallSearchQuery } from '../search/useCommandPalette';

/**
 * `/app/search` (REQ-23): the command palette as a page, so search works
 * without the keyboard shortcut and "Show all" from the palette lands here.
 * The query is component state seeded from session storage — the router
 * keeps only view/type filters, never search text.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const SearchSpace: React.FC<SpaceProps> = () => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    const [initialQuery] = useState(() => recallSearchQuery());
    if (!userId) return null;
    return (
        <div className="mx-auto w-full max-w-3xl">
            <SpaceHeader
                eyebrow={t('careeros.shell.eyebrow', 'Career OS')}
                title={t('careeros.space.search', 'Search')}
                description={t('careeros.search.description', 'Jump to a space or find your own opportunities, applications, goals, facts, documents and conversations. Press Ctrl/⌘ K anywhere to open this as a palette.')}
            />
            <CommandPalette open inline onClose={() => undefined} initialQuery={initialQuery} />
        </div>
    );
};

export default SearchSpace;
