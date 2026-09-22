import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight, Undo2 } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import type { ApplicationRecord, ApplicationStage } from '../../../services/careerOs/types';
import { ApplicationCard, Button, useApplicationStage } from '../primitives';
import { formatDate } from '../application/format';
import { earlierStage, laterStage, STAGE_ORDER, stageLabels } from './stages';

/**
 * The campaign's applications as a board (one column per stage, count in
 * the header) or a list. No drag: every card has "move earlier" / "move
 * later" buttons that work with a keyboard, and the list view is the same
 * data in one column. A move is announced and labelled "moved by you" with
 * an undo, because a stage the person set is never mistaken for one the
 * system observed.
 */
export interface LastMove {
    applicationId: string;
    title: string;
    from: ApplicationStage;
    to: ApplicationStage;
}

export interface ApplicationBoardProps {
    applications: ApplicationRecord[];
    view: 'board' | 'list';
    onMove: (application: ApplicationRecord, next: ApplicationStage) => void;
    onOpen: (application: ApplicationRecord) => void;
    onUnassign?: (application: ApplicationRecord) => void;
    busyId?: string | null;
    lastMove?: LastMove | null;
    onUndo?: () => void;
    campaignLabel?: string | null;
}

export const ApplicationBoard: React.FC<ApplicationBoardProps> = ({ applications, view, onMove, onOpen, onUnassign, busyId = null, lastMove = null, onUndo, campaignLabel }) => {
    const { t } = useTranslation();
    const labels = useMemo(() => stageLabels(t), [t]);
    const stageOf = useApplicationStage();

    const byStage = useMemo(() => {
        const map = new Map<ApplicationStage, ApplicationRecord[]>(STAGE_ORDER.map((s) => [s, []]));
        for (const app of applications) map.get(app.stage)?.push(app);
        return map;
    }, [applications]);

    const moveButtons = (app: ApplicationRecord) => {
        const earlier = earlierStage(app.stage);
        const later = laterStage(app.stage);
        const busy = busyId === app.id;
        return (
            <div className="flex items-center gap-1" role="group" aria-label={t('careeros.board.moveGroup', 'Move {title}').replace('{title}', app.jobTitle)}>
                <Button
                    size="sm"
                    variant="quiet"
                    icon={<ArrowLeft size={14} strokeWidth={2} />}
                    disabled={!earlier || busy}
                    aria-label={earlier ? t('careeros.board.moveTo', 'Move {title} to {stage}').replace('{title}', app.jobTitle).replace('{stage}', labels[earlier]) : t('smartStudio.tracker.movePrev', 'Move to previous stage')}
                    onClick={() => earlier && onMove(app, earlier)}
                >
                    {t('careeros.board.earlier', 'Earlier')}
                </Button>
                <Button
                    size="sm"
                    variant="quiet"
                    trailingIcon={<ArrowRight size={14} strokeWidth={2} />}
                    disabled={!later || busy}
                    aria-label={later ? t('careeros.board.moveTo', 'Move {title} to {stage}').replace('{title}', app.jobTitle).replace('{stage}', labels[later]) : t('smartStudio.tracker.moveNext', 'Move to next stage')}
                    onClick={() => later && onMove(app, later)}
                >
                    {t('careeros.board.later', 'Later')}
                </Button>
            </div>
        );
    };

    const card = (app: ApplicationRecord, compact: boolean) => (
        <div key={app.id}>
            <ApplicationCard
                compact={compact}
                jobTitle={app.jobTitle}
                company={app.company}
                stage={app.stage}
                closedReason={app.closedReason}
                readiness={app.readiness?.items ?? null}
                followUpLabel={app.followUpAt ? t('careeros.application.followUp', 'Follow up {date}').replace('{date}', formatDate(app.followUpAt)) : null}
                campaignLabel={campaignLabel ?? undefined}
                action={{ label: t('careeros.application.open', 'Open'), onClick: () => onOpen(app), loading: busyId === app.id }}
                secondaryAction={onUnassign ? { label: t('careeros.campaign.unassign', 'Unassign'), onClick: () => onUnassign(app) } : undefined}
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-1">
                {lastMove?.applicationId === app.id ? (
                    <span className="text-xs text-content-secondary">
                        {t('careeros.board.movedByYou', 'Moved by you from {from}').replace('{from}', labels[lastMove.from])}
                        {onUndo && (
                            <Button size="sm" variant="quiet" className="ml-1" icon={<Undo2 size={12} />} onClick={onUndo}>{t('careeros.common.undo', 'Undo')}</Button>
                        )}
                    </span>
                ) : <span />}
                {moveButtons(app)}
            </div>
        </div>
    );

    const announcement = lastMove
        ? t('careeros.board.announceMove', '{title} moved to {stage} — moved by you.').replace('{title}', lastMove.title).replace('{stage}', labels[lastMove.to])
        : '';

    return (
        <div>
            <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
            {view === 'board' ? (
                <div className="-mx-1 flex gap-3 overflow-x-auto pb-2" role="list" aria-label={t('careeros.board.label', 'Application board')}>
                    {STAGE_ORDER.map((stage) => {
                        const items = byStage.get(stage) ?? [];
                        return (
                            <section key={stage} role="listitem" aria-labelledby={`col-${stage}`} className="flex w-[min(280px,85vw)] shrink-0 flex-col rounded-2xl border border-border-default bg-surface-canvas p-3">
                                <h3 id={`col-${stage}`} className="flex items-center justify-between font-label text-[11px] uppercase tracking-[0.12em] text-content-secondary">
                                    <span>{labels[stage]}</span>
                                    <span className="rounded-full bg-surface-panel px-2 py-0.5 tabular-nums text-content-primary" aria-label={t('careeros.board.count', '{count} applications').replace('{count}', String(items.length))}>{items.length}</span>
                                </h3>
                                <div className="mt-3 space-y-3">
                                    {items.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border-default p-3 text-center text-xs text-content-muted">{t('smartStudio.tracker.noPositions', 'No positions here.')}</p>
                                    ) : items.map((app) => card(app, true))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <ol className="space-y-3" aria-label={t('careeros.board.listLabel', 'Applications by stage')}>
                    {STAGE_ORDER.flatMap((stage) => (byStage.get(stage) ?? []).map((app) => (
                        <li key={app.id}>
                            <span className="sr-only">{stageOf(app.stage, app.closedReason).label}</span>
                            {card(app, false)}
                        </li>
                    )))}
                </ol>
            )}
        </div>
    );
};

export default ApplicationBoard;
