import React from 'react';
import { useTranslation } from '../../../../services/translationService';
import { optimizeLinkedInProfile } from '../../../../services/smartStudioService';
import { ArtifactEditor } from '../ArtifactEditor';
import type { Workspace } from '../useApplicationWorkspace';

/** LinkedIn positioning notes for this application (REQ-17). */
export const LinkedInSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const data = workspace.data;
    const targetRole = data?.opportunity?.title ?? data?.application.jobTitle ?? '';
    return (
        <ArtifactEditor
            workspace={workspace}
            kind="linkedin"
            heading={t('careeros.linkedin.title', 'LinkedIn positioning')}
            description={t('careeros.linkedin.description', 'Headline and About notes aimed at this role. Nothing is posted anywhere — you copy what you approve.')}
            fieldLabel={t('careeros.linkedin.field', 'Positioning notes')}
            placeholder={t('careeros.linkedin.placeholder', 'Current headline, About text, or the angle you want to take…')}
            generate={targetRole ? async (current) => {
                const [headline, ...rest] = current.split('\n');
                const result = await optimizeLinkedInProfile({ headline: headline?.trim() ?? '', about: rest.join('\n').trim(), targetRole });
                const text = [
                    `${t('careeros.linkedin.headlines', 'Headline suggestions')}:`,
                    ...result.headlineSuggestions.map((h) => `- ${h}`),
                    '',
                    `${t('careeros.linkedin.about', 'About')}:`,
                    result.aboutSuggestion,
                ].join('\n');
                return { text, notes: [...result.experienceTips, result.searchVisibilityFeedback].filter(Boolean) };
            } : undefined}
            generateLabel={t('careeros.linkedin.generate', 'Suggest positioning')}
            generateHint={t('careeros.linkedin.generateHint', 'Put your current headline on the first line and About text below it. Uses one AI action.')}
        />
    );
};

export default LinkedInSection;
