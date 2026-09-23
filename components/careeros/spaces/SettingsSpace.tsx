import React, { Suspense, lazy, useCallback, useId, useState } from 'react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation, type CareerRoute } from '../../NavigationProvider';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import type { StoredResume } from '../../../services/repos/mappers';
import type { ResumeData } from '../../../types';
import { useToast } from '../../common/Toast';
import { JSONBackupModal } from '../../common/JSONBackupModal';
import { Button, Skeleton, SpaceHeader, StatePanel } from '../primitives';
import { useCareerOs } from '../shell/CareerOsProvider';
import ProactiveSettings from '../settings/ProactiveSettings';
import IntegrationsPage from '../settings/IntegrationsPage';

/**
 * Settings (IA ledger KEEP): the existing SettingsPanel is embedded (in its
 * Career OS presentation, same controls) beneath a new Career OS section —
 * proactive assistance (COS-037) — and `/app/settings/integrations` is the
 * honest connectors page (COS-038). The JSON backup modal is wired to the
 * primary CV, the same document the legacy dashboard backs up.
 */
const SettingsPanel = lazy(() => import('../../SettingsPanel'));

export interface SpaceProps {
    route: CareerRoute;
}


const PanelLoader: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">{t('label.loading', 'Loading')}</span>
            <Skeleton variant="title" width="30%" />
            <Skeleton variant="block" className="h-32" />
        </div>
    );
};

const SettingsSpace: React.FC<SpaceProps> = ({ route }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const { userId, invalidate } = useCareerOs();
    const { toast } = useToast();
    const careerOsHeadingId = useId();
    const [backup, setBackup] = useState<{ open: boolean; resume: StoredResume | null; loading: boolean; error: boolean }>({ open: false, resume: null, loading: false, error: false });

    const openBackup = useCallback(async () => {
        if (!userId) return;
        setBackup({ open: true, resume: null, loading: true, error: false });
        try {
            const primary = await resumeRepo.getPrimary(userId);
            setBackup({ open: true, resume: primary, loading: false, error: false });
        } catch {
            setBackup({ open: true, resume: null, loading: false, error: true });
        }
    }, [userId]);

    const importData = useCallback(async (data: ResumeData) => {
        if (!userId || !backup.resume) return;
        try {
            await resumeRepo.upsertPrimary(userId, { ...backup.resume, data });
            invalidate('library');
            toast({ variant: 'success', title: t('careeros.settings.backupImported', 'Your primary CV was replaced with the imported data.') });
            setBackup((b) => ({ ...b, open: false }));
        } catch {
            toast({ variant: 'error', title: t('careeros.settings.backupImportFailed', 'The import could not be saved. Your CV is unchanged.') });
        }
    }, [userId, backup.resume, invalidate, toast, t]);

    if (!userId) return null;

    if (route.sub === 'integrations') {
        return (
            <div className="mx-auto w-full max-w-[1240px] [&>*]:max-w-3xl">
                <SpaceHeader
                    eyebrow={t('mobile.settings', 'Settings')}
                    title={t('careeros.integrations.pageTitle', 'Integrations')}
                    action={<Button variant="quiet" size="sm" onClick={() => navigate(careerPath.toSpace('settings'))}>{t('careeros.settings.back', 'Back to settings')}</Button>}
                />
                <IntegrationsPage />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1240px] [&>*]:max-w-4xl">
            <SpaceHeader eyebrow={t('careeros.shell.eyebrow', 'Career OS')} title={t('mobile.settings', 'Settings')} description={t('careeros.settings.description', 'Proactive reminders and integrations for Career OS, then everything that changes how CVBase looks and behaves.')} />
            <section aria-labelledby={careerOsHeadingId} className="mb-10 space-y-4">
                <h2 id={careerOsHeadingId} className="text-[15px] font-semibold text-content-primary">{t('careeros.settings.careerOs', 'Career OS')}</h2>
                <ProactiveSettings />
                <div className="rounded-2xl border border-border-default bg-surface-panel p-6 sm:p-7">
                    <h3 className="text-[15px] font-semibold text-content-primary">{t('careeros.integrations.pageTitle', 'Integrations')}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-content-secondary">{t('careeros.settings.integrationsSummary', 'No external connectors are enabled. See what was assessed and why manual import stays the only source.')}</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate(careerPath.toIntegrations())}>{t('careeros.settings.openIntegrations', 'View integrations')}</Button>
                </div>
            </section>
            <Suspense fallback={<PanelLoader />}>
                <SettingsPanel
                    embedded
                    onViewLegal={(tab) => navigate({ view: 'legal', legalTab: tab })}
                    onManageBilling={() => navigate(careerPath.toSpace('billing'))}
                    onOpenBackup={() => { void openBackup(); }}
                />
            </Suspense>
            {backup.open && backup.loading && <StatePanel kind="loading" compact className="mt-4" />}
            {backup.open && !backup.loading && backup.error && (
                <StatePanel kind="error" compact className="mt-4" title={t('careeros.settings.backupLoadFailed', 'Your primary CV could not be loaded for backup')} onRetry={() => { void openBackup(); }} secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: () => setBackup((b) => ({ ...b, open: false })) }} />
            )}
            {backup.open && !backup.loading && !backup.error && !backup.resume && (
                <StatePanel kind="empty" compact className="mt-4" title={t('careeros.settings.noPrimaryCv', 'There is no primary CV to back up yet')} action={{ label: t('careeros.library.newCv', 'New CV'), onClick: () => navigate(careerPath.toNewCv()) }} secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: () => setBackup((b) => ({ ...b, open: false })) }} />
            )}
            {backup.open && backup.resume && (
                <JSONBackupModal isOpen onClose={() => setBackup((b) => ({ ...b, open: false }))} currentData={backup.resume.data} onImportData={(data) => { void importData(data); }} />
            )}
        </div>
    );
};

export default SettingsSpace;
