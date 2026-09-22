import React from 'react';
import { FileText, Image, ScrollText, Sparkles, BookOpen, ClipboardCheck } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ArtifactStatus } from '../../../services/careerOs/types';
import { EntityCard, type EntityCardAction } from './EntityCard';
import { StatusChip, type Tone } from './Pill';

/**
 * A document in the library: a CV, a report, a headshot, a cover letter, an
 * interview story or a piece of evidence. Shows the document's own status
 * (draft, reviewed, snapshot) and whether it has gone stale against the
 * facts it was built from — a snapshot never silently updates.
 */
export type DocumentKind = 'cv' | 'report' | 'headshot' | 'cover-letter' | 'story' | 'evidence';

export interface DocumentCardProps {
    title: string;
    kind: DocumentKind;
    status?: ArtifactStatus;
    /** The document no longer matches the facts or listing it was generated from. */
    stale?: boolean;
    /** "Updated 3 May" style text, already formatted by the caller. */
    updatedLabel?: string;
    /** The application this document belongs to, if any. */
    applicationLabel?: string;
    action?: EntityCardAction;
    secondaryAction?: EntityCardAction;
    loading?: boolean;
    compact?: boolean;
    className?: string;
}

const KIND_ICON: Record<DocumentKind, React.ReactNode> = {
    cv: <FileText />,
    report: <ClipboardCheck />,
    headshot: <Image />,
    'cover-letter': <ScrollText />,
    story: <BookOpen />,
    evidence: <Sparkles />,
};

export const DocumentCard: React.FC<DocumentCardProps> = ({
    title,
    kind,
    status,
    stale = false,
    updatedLabel,
    applicationLabel,
    action,
    secondaryAction,
    loading = false,
    compact = false,
    className = '',
}) => {
    const { t } = useTranslation();

    const kindLabel: Record<DocumentKind, string> = {
        cv: t('careeros.document.kind.cv', 'CV'),
        report: t('careeros.document.kind.report', 'Report'),
        headshot: t('careeros.document.kind.headshot', 'Headshot'),
        'cover-letter': t('careeros.document.kind.coverLetter', 'Cover letter'),
        story: t('careeros.document.kind.story', 'Interview story'),
        evidence: t('careeros.document.kind.evidence', 'Evidence'),
    };
    const statusChip: Record<ArtifactStatus, { label: string; tone: Tone }> = {
        draft: { label: t('careeros.document.status.draft', 'Draft'), tone: 'neutral' },
        reviewed: { label: t('careeros.document.status.reviewed', 'Reviewed'), tone: 'success' },
        snapshot: { label: t('careeros.document.status.snapshot', 'Submitted snapshot'), tone: 'info' },
    };

    return (
        <EntityCard
            kind={kindLabel[kind]}
            kindIcon={KIND_ICON[kind]}
            title={title}
            meta={applicationLabel ? t('careeros.document.forApplication', 'For {application}').replace('{application}', applicationLabel) : undefined}
            chips={
                <>
                    {status && <StatusChip label={statusChip[status].label} tone={statusChip[status].tone} />}
                    {stale && <StatusChip label={t('careeros.document.stale', 'Out of date')} tone="warning" />}
                </>
            }
            footnote={updatedLabel}
            action={action}
            secondaryAction={secondaryAction}
            loading={loading}
            compact={compact}
            className={className}
        />
    );
};

export default DocumentCard;
