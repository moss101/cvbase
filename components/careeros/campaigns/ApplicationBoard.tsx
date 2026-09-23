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

    // On the board a card is a canvas tile inside the lane; in the list it is a divided row.
    const card = (app: ApplicationRecord, compact: boolean) => (
        <div key={app.id}>
            <ApplicationCard
                flush
                className={compact ? 'rounded-xl bg-surface-canvas p-3' : 'py-4'}
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
                // Phones stack the lanes (no clipped columns); from 768px they sit side by side and scroll.
                <div className="flex flex-col md:flex-row md:overflow-x-auto md:pb-2" role="list" aria-label={t('careeros.board.label', 'Application board')}>
                    {STAGE_ORDER.map((stage) => {
                        const items = byStage.get(stage) ?? [];
                        return (
                            // Lanes are unframed columns split by hairlines — the board is one surface, not boxes in boxes.
                            <section key={stage} role="listitem" aria-labelledby={`col-${stage}`} className="flex w-full flex-col border-t border-border-default py-4 first:border-t-0 first:pt-0 md:w-[264px] md:shrink-0 md:border-l md:border-t-0 md:px-3 md:py-0 md:first:border-l-0 md:first:pl-0">
                                <h3 id={`col-${stage}`} className="flex items-center justify-between text-[13px] font-semibold text-content-primary">
                                    <span>{labels[stage]}</span>
                                    <span className="rounded-full bg-surface-canvas px-2 py-0.5 text-[12px] tabular-nums text-content-secondary" aria-label={t('careeros.board.count', '{count} applications').replace('{count}', String(items.length))}>{items.length}</span>
                                </h3>
                                <div className="mt-3 space-y-3">
                                    {items.length === 0 ? (
                                        <p className="py-2 text-xs text-content-muted">{t('smartStudio.tracker.noPositions', 'No positions here.')}</p>
                                    ) : items.map((app) => card(app, true))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <ol className="divide-y divide-border-default" aria-label={t('careeros.board.listLabel', 'Applications by stage')}>
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
