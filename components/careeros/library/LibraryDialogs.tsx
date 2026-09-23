import React, { useEffect, useState } from 'react';
import { ClipboardCheck, History, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { careerPath, useNavigation } from '../../NavigationProvider';
import * as headshotRepo from '../../../services/repos/headshotRepo';
import * as atsReportRepo from '../../../services/repos/atsReportRepo';
import * as versionRepo from '../../../services/repos/versionRepo';
import type { StoredVersion } from '../../../services/repos/mappers';
import Dialog from '../../common/Dialog';
import { Button, Skeleton, StatePanel, StatusChip } from '../primitives';
import { dateLabel } from './libraryFormat';
import { formatDate } from '../application/format';

/**
 * The three Library detail dialogs. Each reads its owner-scoped row only
 * when opened (a signed URL or report body is never fetched for the list)
 * and covers loading, missing/expired and error states.
 */

// ---- Headshot ----------------------------------------------------------------

export const HeadshotDialog: React.FC<{ userId: string; storagePath: string; createdAt: string; onClose: () => void }> = ({ storagePath, createdAt, onClose }) => {
    const { t } = useTranslation();
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<'sign' | 'expired' | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setUrl(null);
        setError(null);
        headshotRepo.signedUrl(storagePath)
            .then((signed) => { if (!cancelled) setUrl(signed); })
            .catch(() => { if (!cancelled) setError('sign'); });
        return () => { cancelled = true; };
    }, [storagePath, attempt]);

    return (
        <Dialog open onClose={onClose} title={<><ImageIcon className="h-[1em] w-[1em] text-primary" aria-hidden="true" />{t('careeros.document.kind.headshot', 'Headshot')}</>} panelClassName="max-w-lg">
            {error ? (
                <StatePanel
                    kind="error"
                    compact
                    title={error === 'expired' ? t('careeros.library.headshotExpired', 'The link to this image expired') : t('careeros.library.headshotUnavailable', 'This image could not be opened')}
                    description={t('careeros.library.headshotRetry', 'Private images use short-lived links. Request a fresh one to try again.')}
                    onRetry={() => setAttempt((n) => n + 1)}
                />
            ) : !url ? (
                <div role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <Skeleton variant="block" className="h-72" />
                </div>
            ) : (
                <img
                    src={url}
                    alt={t('careeros.library.headshotAlt', 'Your AI headshot from {date}').replace('{date}', dateLabel(createdAt))}
                    className="mx-auto max-h-[60vh] rounded-xl object-contain"
                    onError={() => setError('expired')}
                />
            )}
            <p className="mt-3 text-xs text-content-muted">{t('careeros.library.headshotPrivacy', 'Stored privately in your account; links expire after an hour.')}</p>
        </Dialog>
    );
};

// ---- ATS report --------------------------------------------------------------

export const ReportDialog: React.FC<{ userId: string; reportId: string; onClose: () => void }> = ({ userId, reportId, onClose }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [report, setReport] = useState<atsReportRepo.StoredAtsReport | null | undefined>(undefined);
    const [error, setError] = useState<unknown>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setReport(undefined);
        setError(null);
        atsReportRepo.getById(userId, reportId)
            .then((row) => { if (!cancelled) setReport(row); })
            .catch((err: unknown) => { if (!cancelled) setError(err); });
        return () => { cancelled = true; };
    }, [userId, reportId, attempt]);

    const score = report?.score ?? null;
    return (
        <Dialog open onClose={onClose} title={<><ClipboardCheck className="h-[1em] w-[1em] text-primary" aria-hidden="true" />{t('careeros.library.reportTitle', 'ATS report')}</>} panelClassName="max-w-lg max-h-[85vh]" bodyClassName="overflow-y-auto">
            {error !== null ? (
                <StatePanel kind="error" compact onRetry={() => setAttempt((n) => n + 1)} />
            ) : report === undefined ? (
                <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <Skeleton variant="title" width="40%" />
                    <Skeleton variant="text" lines={3} />
                </div>
            ) : report === null ? (
                <StatePanel kind="empty" compact title={t('careeros.library.reportMissing', 'This report is no longer available')} description={t('careeros.library.reportMissingDescription', 'It may have been deleted. Run a new check from the ATS checker.')} />
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusChip label={score === null ? t('careeros.library.notScored', 'Not scored') : t('careeros.library.score', 'Score {score}/100').replace('{score}', String(score))} tone={score === null ? 'neutral' : score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger'} />
                        <span className="text-xs text-content-muted">{dateLabel(report.createdAt)}</span>
                    </div>
                    {report.jobDescription && (
                        <p className="text-sm text-content-secondary">{atsReportRepo.jdHeadline(report.jobDescription, 160)}</p>
                    )}
                    {Array.isArray((report.report as { keywords?: unknown }).keywords) && (
                        <p className="text-xs text-content-muted">{t('careeros.library.reportKeywords', 'Keyword analysis included')}</p>
                    )}
                    <p className="text-[13px] text-content-secondary">{t('careeros.library.reportHint', 'The full breakdown opens in the ATS checker, which renders every section of the report.')}</p>
                    <Button variant="primary" size="sm" onClick={() => { onClose(); navigate(careerPath.toLibraryTool('ats')); }}>{t('careeros.library.openAts', 'Open ATS checker')}</Button>
                </div>
            )}
        </Dialog>
    );
};

// ---- CV versions -------------------------------------------------------------

export const VersionsDialog: React.FC<{ userId: string; resumeId: string; title: string; onClose: () => void }> = ({ userId, resumeId, title, onClose }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const [versions, setVersions] = useState<StoredVersion[] | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setVersions(null);
        setError(null);
        versionRepo.listForResume(userId, resumeId)
            .then((rows) => { if (!cancelled) setVersions(rows); })
            .catch((err: unknown) => { if (!cancelled) setError(err); });
        return () => { cancelled = true; };
    }, [userId, resumeId, attempt]);

    return (
        <Dialog open onClose={onClose} title={<><History className="h-[1em] w-[1em] text-primary" aria-hidden="true" />{t('finalizeForm.versionHistory', 'Version history')}</>} panelClassName="max-w-lg max-h-[85vh]" bodyClassName="overflow-y-auto">
            <p className="mb-3 text-sm text-content-secondary">{title}</p>
            {error !== null ? (
                <StatePanel kind="error" compact onRetry={() => setAttempt((n) => n + 1)} />
            ) : versions === null ? (
                <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
                    <span className="sr-only">{t('label.loading', 'Loading')}</span>
                    <Skeleton variant="block" className="h-10" />
                    <Skeleton variant="block" className="h-10" />
                </div>
            ) : versions.length === 0 ? (
                <StatePanel kind="empty" compact title={t('careeros.library.noVersions', 'No saved versions yet')} description={t('careeros.library.noVersionsDescription', 'Snapshots are saved from the editor before tailoring or big edits.')} />
            ) : (
                <ul className="divide-y divide-border-default">
                    {versions.map((v) => (
                        <li key={v.id ?? v.createdAt} className="flex items-center justify-between gap-3 py-2">
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-content-primary">{v.label}</span>
                                <span className="block text-xs text-content-muted">{v.createdAt ? formatDate(v.createdAt, undefined, true) : ''}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-3 text-xs text-content-muted">{t('careeros.library.restoreInEditor', 'Restoring a version rewrites the CV, so it happens inside the editor where you can review it first.')}</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => { onClose(); navigate(careerPath.toCvEdit(resumeId)); }}>{t('careeros.library.openEditorRestore', 'Open in editor to restore')}</Button>
        </Dialog>
    );
};
