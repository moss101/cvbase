import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../../../services/translationService';
import { useAuth } from '../../AuthProvider';
import UserProfileForm from '../../UserProfileForm';
import { StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import { useOnline } from './useOnline';

/**
 * The existing profile form, unchanged, inside the Career space. Specialised
 * legacy fields (care specialties, licensed state, certifications) stay on
 * the profile row; the server projection turns them into profile_field
 * facts, so after a save the fact caches are invalidated here.
 */
export const ProfileView: React.FC = () => {
    const { t } = useTranslation();
    const { userProfile } = useAuth();
    const { invalidate } = useCareerOs();
    const online = useOnline();
    const lastSeen = useRef<string | undefined>(userProfile?.updatedAt);

    useEffect(() => {
        const stamp = userProfile?.updatedAt;
        if (stamp && stamp !== lastSeen.current) {
            lastSeen.current = stamp;
            invalidate('facts');
            invalidate('today');
        }
    }, [userProfile?.updatedAt, invalidate]);

    return (
        <div className="space-y-4">
            {!online && <StatePanel kind="offline" compact description={t('careeros.career.profileOffline', 'The profile can be read offline; saving needs a connection.')} />}
            <StatePanel
                kind="partial"
                compact
                title={t('careeros.career.profileNote', 'Specialised fields are preserved')}
                description={t('careeros.career.profileNoteDescription', 'Care specialties, licensed state and certifications stay on your profile exactly as before and appear as profile facts under Evidence. Facts you add there do not overwrite this form.')}
            />
            <UserProfileForm />
        </div>
    );
};

export default ProfileView;
