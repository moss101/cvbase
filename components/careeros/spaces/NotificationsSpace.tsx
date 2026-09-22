import React from 'react';
import { useTranslation } from '../../../services/translationService';
import type { CareerRoute } from '../../NavigationProvider';
import { SpaceHeader } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import InboxList from '../inbox/InboxList';

/**
 * Inbox (REQ-10, COS-029): an in-app list that separates action required
 * from information, with persisted read/dismiss state. It links to actions;
 * it never duplicates them and never introduces push or email.
 */
export interface SpaceProps {
    route: CareerRoute;
}

const NotificationsSpace: React.FC<SpaceProps> = () => {
    const { t } = useTranslation();
    const { userId } = useCareerOs();
    if (!userId) return null;
    return (
        <div className="mx-auto w-full max-w-3xl">
            <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={t('careeros.space.notifications', 'Inbox')} />
            <InboxList />
        </div>
    );
};

export default NotificationsSpace;
