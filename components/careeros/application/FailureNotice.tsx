import React from 'react';
import { useTranslation } from '../../../services/translationService';
import { StatePanel } from '../primitives';
import { classifyError, panelKindFor } from './errors';

/**
 * The compact notice a screen shows beneath a failed action. A conflict gets
 * its own copy and a Reload action (the record changed elsewhere; nothing was
 * overwritten); the other kinds map onto StatePanel's standard states.
 */
export interface FailureNoticeProps {
    error: unknown;
    /** Reloads the record after a conflict (required to make the Reload button appear). */
    onReload?: () => void;
    onRetry?: () => void;
    onDismiss?: () => void;
    /** Overrides the generic title (e.g. "Could not save the note"). */
    title?: string;
    className?: string;
}

export const FailureNotice: React.FC<FailureNoticeProps> = ({ error, onReload, onRetry, onDismiss, title, className = '' }) => {
    const { t } = useTranslation();
    if (!error) return null;
    const kind = classifyError(error);
    if (kind === 'conflict') {
        return (
            <StatePanel
                kind="error"
                compact
                className={className}
                title={t('careeros.conflict.title', 'This record changed elsewhere')}
                description={t('careeros.conflict.description', 'It was updated from another tab or device. Reload to see the latest version — nothing you entered here was written over it.')}
                action={onReload ? { label: t('careeros.conflict.reload', 'Reload'), onClick: onReload } : undefined}
                secondaryAction={onDismiss ? { label: t('careeros.common.dismiss', 'Dismiss'), onClick: onDismiss } : undefined}
            />
        );
    }
    if (kind === 'not_found') {
        return (
            <StatePanel
                kind="error"
                compact
                className={className}
                title={t('careeros.notFound.recordTitle', 'That record is not available')}
                description={t('careeros.notFound.recordDescription', 'It may have been removed, or it is not in this account. Nothing else was opened in its place.')}
                secondaryAction={onDismiss ? { label: t('careeros.common.dismiss', 'Dismiss'), onClick: onDismiss } : undefined}
            />
        );
    }
    return (
        <StatePanel
            kind={panelKindFor(kind)}
            compact
            className={className}
            title={title}
            onRetry={onRetry}
            secondaryAction={onDismiss ? { label: t('careeros.common.dismiss', 'Dismiss'), onClick: onDismiss } : undefined}
        />
    );
};

export default FailureNotice;
