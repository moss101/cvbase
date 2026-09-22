import React from 'react';
import { Plug, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import { Button, Pill, StatusChip } from '../primitives';
import { ASSESSMENT_VERSION, CONNECTOR_ASSESSMENTS } from './connectorAssessment';

/**
 * `/app/settings/integrations` (COS-038 surface): an honest page. No
 * external connector is enabled, CVBase reads no mailbox, calendar, LinkedIn
 * account or job board, and manual import remains complete. The COS-038
 * assessment is shown per candidate source. There are no inputs here —
 * nothing on this page can collect a credential.
 */
export const IntegrationsPage: React.FC = () => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const constraintLabel = {
        rights: t('careeros.integrations.constraint.rights', 'Rights / terms'),
        scope: t('careeros.integrations.constraint.scope', 'Access scope'),
        retention: t('careeros.integrations.constraint.retention', 'Retention'),
    };
    return (
        <div className="space-y-5">
            <section className="rounded-2xl border border-border-default bg-surface-panel p-5" aria-labelledby="integrations-status">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} strokeWidth={2} className="text-status-success" aria-hidden="true" />
                    <h2 id="integrations-status" className="text-base font-semibold text-content-primary">{t('careeros.integrations.title', 'No external connectors are enabled')}</h2>
                </div>
                <p className="mt-2 text-sm text-content-secondary">
                    {t('careeros.integrations.description', 'CVBase does not read your mailbox, calendar, LinkedIn account or job boards. Everything in your Career OS came from what you pasted, imported or typed, and manual import remains complete.')}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="primary" size="sm" onClick={() => navigate(careerPath.toSpace('opportunities'))}>{t('careeros.integrations.importOpportunity', 'Import an opportunity')}</Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate(careerPath.toLibrary())}>{t('careeros.integrations.openLibrary', 'Open Library')}</Button>
                </div>
            </section>

            <section className="rounded-2xl border border-border-default bg-surface-panel p-5" aria-labelledby="integrations-assessment">
                <div className="flex flex-wrap items-center gap-2">
                    <Plug size={16} strokeWidth={2} className="text-content-muted" aria-hidden="true" />
                    <h2 id="integrations-assessment" className="text-base font-semibold text-content-primary">{t('careeros.integrations.assessmentTitle', 'Connector assessment')}</h2>
                    <Pill mono>{ASSESSMENT_VERSION}</Pill>
                </div>
                <p className="mt-1 text-[13px] text-content-secondary">{t('careeros.integrations.assessmentDescription', 'Each candidate source was assessed for permissions, scope, retention and disconnect behaviour. All are a no-go for this release; a permitted read-only source may be reconsidered later.')}</p>
                <ul className="mt-3 divide-y divide-border-default">
                    {CONNECTOR_ASSESSMENTS.map((c) => (
                        <li key={c.key} className="py-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-content-primary">{t(c.labelKey, c.label)}</span>
                                <StatusChip label={t('careeros.integrations.notConnected', 'Not connected')} tone="neutral" />
                                <StatusChip label={t('careeros.integrations.noGo', 'Assessed: no-go for this release')} tone="warning" />
                                <Pill mono>{constraintLabel[c.constraint]}</Pill>
                            </div>
                            <p className="mt-1 text-[13px] text-content-secondary">{t(c.reasonKey, c.reason)}</p>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-xs text-content-muted">{t('careeros.integrations.noCredentials', 'This page never asks for a password, token or account link.')}</p>
            </section>
        </div>
    );
};

export default IntegrationsPage;
