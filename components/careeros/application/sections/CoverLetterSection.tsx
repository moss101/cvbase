import React from 'react';
import { useTranslation } from '../../../../services/translationService';
import { optimizeCoverLetter } from '../../../../services/smartStudioService';
import { ArtifactEditor } from '../ArtifactEditor';
import type { Workspace } from '../useApplicationWorkspace';

/** Cover letter draft for this application (REQ-17); generation uses the captured listing. */
export const CoverLetterSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const jd = workspace.data?.opportunity?.capturedContent ?? '';
    const canGenerate = jd.trim().length >= 80;
    return (
        <ArtifactEditor
            workspace={workspace}
            kind="cover_letter"
            heading={t('careeros.coverLetter.title', 'Cover letter')}
            description={t('careeros.coverLetter.description', 'Saved with this application. Generate a draft from the listing and your text, then review every line before you use it.')}
            fieldLabel={t('careeros.coverLetter.field', 'Letter text')}
            placeholder={t('careeros.coverLetter.placeholder', 'Write or paste your cover letter…')}
            generate={canGenerate ? async (current) => {
                const result = await optimizeCoverLetter(current.trim() || t('careeros.coverLetter.seed', 'Please draft a cover letter for this role based on the job description.'), jd);
                return {
                    text: result.improvedCoverLetter,
                    notes: [...result.critique, ...(result.missingCompetencies.length ? [t('careeros.coverLetter.missing', 'Not evidenced: {items}').replace('{items}', result.missingCompetencies.join(', '))] : [])],
                };
            } : undefined}
            generateLabel={t('careeros.coverLetter.generate', 'Generate draft')}
            generateHint={canGenerate ? t('careeros.coverLetter.generateHint', 'Uses one AI action. The draft is saved as a new AI version; your current text is kept in the history.') : t('careeros.coverLetter.noJd', 'Generation needs the listing text on the linked opportunity.')}
        />
    );
};

export default CoverLetterSection;
