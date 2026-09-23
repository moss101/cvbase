import React, { useId, useState } from 'react';
import { ArrowRight, CheckCheck, ChevronDown, Clock, Info, RotateCcw, X } from 'lucide-react';
import { useTranslation } from '../../../services/translationService';
import { useNavigation, careerPath } from '../../NavigationProvider';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { Button, Skeleton, StatePanel } from '../primitives';
import { evidenceRefRoute } from '../career/factFormat';
import { expectedOutcome } from './actionOutcome';
import { useActionControls } from './useActionControls';
import type { RankedAction } from './useTodayData';

/**
 * Layer one of Today: the single most important next step — what to do, why
 * it matters, what finishing it leaves you with — with one primary action.
 * Everything else the rules found waits under "Then", folded until asked for.
 */
export interface NextActionProps {
    userId: string;
    actions: RankedAction[];
    loading: boolean;
    failed: boolean;
    online: boolean;
    onChanged: () => void;
    onRetry: () => void;
}

const dayLabel = (iso: string, language: string): string => {
    try { return new Intl.DateTimeFormat(language, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)); } catch { return iso.slice(0, 10); }
};

/** "today", "tomorrow", "in 3 days" or a date — how far away a recorded date is. */
function relativeWhen(t: (k: string, f: string) => string, language: string, iso: string, now: Date = new Date()): string {
    const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const days = Math.round((day(new Date(iso)) - day(now)) / 86_400_000);
    if (days <= 0) return t('careeros.when.today', 'today');
    if (days === 1) return t('careeros.when.tomorrow', 'tomorrow');
    if (days <= 7) return t('careeros.when.inDays', 'in {n} days').replace('{n}', String(days));
    return t('careeros.when.onDate', 'on {date}').replace('{date}', dayLabel(iso, language));
}

/** What is at stake for the person — from the same ranking signals the rules used, never the rule itself. */
function whyItMatters(t: (k: string, f: string) => string, language: string, ranked: RankedAction): string | null {
    const r = ranked.candidate?.ranking;
    if (!r) return null;
    if (r.deadlineAt) {
        const when = relativeWhen(t, language, r.deadlineAt);
        if (ranked.action.actionType === 'PREPARE_INTERVIEW') return t('careeros.today.next.whyInterview', 'The interview is {when}. Preparation time only shrinks from here.').replace('{when}', when);
        if (ranked.action.actionType === 'FOLLOW_UP_APPLICATION') return t('careeros.today.next.whyFollowUp', 'You planned to follow up {when}; a timely note keeps the application in mind.').replace('{when}', when);
        return t('careeros.today.next.whyDue', 'It is due {when} — the soonest date you have recorded.').replace('{when}', when);
    }
    if (r.unblocks) return t('careeros.today.next.whyUnblocks', 'Other steps wait on this one.');
    if (r.goalRelevant) return t('careeros.today.next.whyGoal', 'It moves your primary goal forward.');
    return t('careeros.today.next.whySmall', 'A small step you can finish now.');
}

export const NextAction: React.FC<NextActionProps> = ({ userId, actions, loading, failed, online, onChanged, onRetry }) => {
    const { t } = useTranslation();
    const { navigate } = useNavigation();
    const headingId = useId();

    if (loading) {
        return (
            <section className="cos-panel p-6 md:p-7" aria-busy="true" aria-label={t('careeros.today.next.title', 'Next step')}>
                <Skeleton variant="title" width="55%" />
                <div className="mt-3"><Skeleton variant="text" lines={2} /></div>
            </section>
        );
    }
    if (failed) {
        return <StatePanel kind="error" title={t('careeros.today.actions.error', 'The action queue could not be loaded')} description={t('careeros.today.actions.errorDescription', 'Your records are unchanged. The rest of Today still works.')} onRetry={onRetry} />;
    }
    if (actions.length === 0) {
        return (
            <section aria-labelledby={headingId} className="cos-panel p-6 md:p-7">
                <h2 id={headingId} className="text-[20px] font-semibold tracking-[-0.015em] text-content-primary">{t('careeros.today.next.clearTitle', 'You are clear for now')}</h2>
                <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-content-secondary">{t('careeros.today.actions.emptyDescription', 'Actions appear when a rule finds one: an import to review, an interview coming up, a follow-up you set. Nothing is invented to fill this space.')}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => navigate(careerPath.toSpace('opportunities'))}>{t('careeros.today.next.addOpportunity', 'Find or add an opportunity')}</Button>
                    <Button variant="quiet" onClick={() => navigate(careerPath.toCareer('achievements'))}>{t('careeros.today.next.logAchievement', 'Record an achievement')}</Button>
                </div>
            </section>
        );
    }

    const [first, ...rest] = actions;
    return <NextActionPanel key={first.action.id} userId={userId} ranked={first} then={rest} online={online} onChanged={onChanged} headingId={headingId} />;
};

const NextActionPanel: React.FC<{ userId: string; ranked: RankedAction; then: RankedAction[]; online: boolean; onChanged: () => void; headingId: string }> = ({ userId, ranked, then, online, onChanged, headingId }) => {
    const { t, language } = useTranslation();
    const { navigate } = useNavigation();
    const { action, candidate } = ranked;
    const controls = useActionControls(userId, action, onChanged);
    const [snoozeOpen, setSnoozeOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [thenOpen, setThenOpen] = useState(false);
    const thenId = useId();

    const dominant = whyItMatters(t, language, ranked);
    const outcome = expectedOutcome(t, action.actionType);
    const due = candidate?.ranking.deadlineAt ?? null;
    const [sourcesOpen, setSourcesOpen] = useState(false);
    const meta: string[] = [];
    if (action.estimatedEffort) meta.push(action.estimatedEffort);
    // The date is already in "Why it matters" when a deadline leads; say it once.
    if (due && !dominant) meta.push(t('careeros.today.next.due', 'Due {date}').replace('{date}', dayLabel(due, language)));
    const inProgress = action.status === 'IN_PROGRESS';

    return (
        <section aria-labelledby={headingId} className="cos-panel overflow-hidden">
            <div className="p-6 md:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 max-w-[64ch]">
                        <h2 id={headingId} className="text-[21px] font-semibold leading-snug tracking-[-0.015em] text-content-primary md:text-[23px]">{action.title}</h2>
                        <p className="mt-2 text-[15px] leading-relaxed text-content-secondary">{action.reason}</p>
                        {action.resurfacedReason && (
                            <p className="mt-2 flex items-start gap-1.5 text-[13px] text-content-secondary">
                                <RotateCcw size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{t('careeros.today.action.resurfaced', 'Resurfaced because: {reason}').replace('{reason}', action.resurfacedReason.replace(/^Returned because\s*/i, ''))}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 lg:w-56">
                        <Button
                            variant="primary"
                            fullWidth
                            loading={controls.busy}
                            disabled={!online}
                            icon={<ArrowRight size={16} strokeWidth={2} />}
                            onClick={() => { void controls.begin(); }}
                        >
                            {inProgress ? t('careeros.today.action.resume', 'Resume') : t('careeros.today.action.begin', 'Begin')}
                        </Button>
                        {!online && <p className="text-center text-[12.5px] text-status-warning">{t('careeros.today.action.offline', 'Needs a connection to start')}</p>}
                        {meta.length > 0 && (
                            <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-content-muted">
                                <Clock size={13} aria-hidden="true" />
                                <span>{meta.join(' · ')}</span>
                            </p>
                        )}
                    </div>
                </div>

                {(dominant || outcome) && (
                    <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 border-t border-border-default pt-5 sm:grid-cols-2">
                        {dominant && (
                            <div className="min-w-0">
                                <dt className="text-[12.5px] font-medium text-content-muted">{t('careeros.today.next.why', 'Why it matters')}</dt>
                                <dd className="mt-1 text-[14px] leading-relaxed text-content-primary">{dominant}</dd>
                            </div>
                        )}
                        {outcome && (
                            <div className="min-w-0">
                                <dt className="text-[12.5px] font-medium text-content-muted">{t('careeros.today.next.outcome', 'What you get')}</dt>
                                <dd className="mt-1 text-[14px] leading-relaxed text-content-primary">{outcome}</dd>
                            </div>
                        )}
                    </dl>
                )}

                {action.evidenceRefs.length > 0 && sourcesOpen && (
                    <div id={`${headingId}-sources`} className="mt-4 flex flex-wrap items-center gap-1.5 text-[12.5px]">
                        <span className="text-content-muted">{t('careeros.action.evidence', 'Based on')}:</span>
                        {action.evidenceRefs.slice(0, 5).map((ref) => {
                            const route = evidenceRefRoute(ref.kind, ref.id);
                            const chip = 'inline-flex max-w-full items-center rounded-full border border-border-default bg-surface-canvas px-2.5 py-0.5 text-[12px] font-medium text-content-secondary';
                            return route ? (
                                <button key={`${ref.kind}:${ref.id}`} type="button" onClick={() => navigate(route)} className={`${chip} hover:text-content-primary`}>
                                    <span className="truncate">{ref.label}</span>
                                </button>
                            ) : (
                                <span key={`${ref.kind}:${ref.id}`} className={chip}><span className="truncate">{ref.label}</span></span>
                            );
                        })}
                        <span className="text-content-muted">· {action.source === 'rule' ? `${t('careeros.today.source.rule', 'Rule')} ${action.ruleVersion}` : t('careeros.today.source.coach', 'Coach')}</span>
                    </div>
                )}
                {controls.error && <p role="alert" className="mt-3 text-[13px] text-status-danger">{controls.error}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-1 border-t border-border-default bg-surface-canvas px-4 py-2 md:px-5">
                <Button variant="quiet" size="sm" icon={<Clock size={14} />} aria-expanded={snoozeOpen} onClick={() => setSnoozeOpen((v) => !v)} disabled={controls.busy}>{t('careeros.today.action.snooze', 'Snooze')}</Button>
                <Button variant="quiet" size="sm" icon={<CheckCheck size={14} />} onClick={() => setReportOpen(true)} disabled={controls.busy || !online}>{t('careeros.today.action.didElsewhere', 'I did this elsewhere')}</Button>
                <Button variant="quiet" size="sm" icon={<X size={14} />} onClick={() => { void controls.dismiss(); }} disabled={controls.busy}>{t('careeros.today.action.dismiss', 'Dismiss')}</Button>
                {action.evidenceRefs.length > 0 && (
                    <Button variant="quiet" size="sm" icon={<Info size={14} />} aria-expanded={sourcesOpen} aria-controls={`${headingId}-sources`} onClick={() => setSourcesOpen((v) => !v)} title={t('careeros.today.next.sources', 'Sources')}>
                        {/* Icon-only below 1440px so the footer stays on one row. */}
                        <span className="max-[1439px]:sr-only">{t('careeros.today.next.sources', 'Sources')}</span>
                    </Button>
                )}
                {then.length > 0 && (
                    <button type="button" onClick={() => setThenOpen((v) => !v)} aria-expanded={thenOpen} aria-controls={thenId} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-content-secondary hover:text-content-primary">
                        {t('careeros.today.next.then', 'Then · {count} more').replace('{count}', String(then.length))}
                        <ChevronDown size={15} className={`transition-transform duration-150 ${thenOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                )}
                {snoozeOpen && (
                    <div role="group" aria-label={t('careeros.today.action.snoozeUntil', 'Snooze until')} className="flex w-full flex-wrap gap-2 pb-1 pt-1">
                        <Button variant="secondary" size="sm" onClick={() => { void controls.snooze(1).then(() => setSnoozeOpen(false)); }} loading={controls.busy}>{t('careeros.today.action.snoozeTomorrow', 'Tomorrow')}</Button>
                        <Button variant="secondary" size="sm" onClick={() => { void controls.snooze(7).then(() => setSnoozeOpen(false)); }} loading={controls.busy}>{t('careeros.today.action.snoozeWeek', 'Next week')}</Button>
                    </div>
                )}
            </div>

            {then.length > 0 && thenOpen && (
                <ol id={thenId} className="divide-y divide-border-default border-t border-border-default">
                    {then.map((r) => <ThenRow key={r.action.id} userId={userId} ranked={r} online={online} onChanged={onChanged} />)}
                </ol>
            )}

            <ConfirmDialog
                open={reportOpen}
                title={t('careeros.today.action.reportTitle', 'Record this as done outside CVBase?')}
                description={t('careeros.today.action.reportDescription', 'It is recorded with source "reported by you" — not as a verified result — and leaves the queue.')}
                confirmLabel={t('careeros.today.action.reportConfirm', 'Record as done')}
                onCancel={() => setReportOpen(false)}
                onConfirm={() => { setReportOpen(false); void controls.reportDone(); }}
            />
        </section>
    );
};

const ThenRow: React.FC<{ userId: string; ranked: RankedAction; online: boolean; onChanged: () => void }> = ({ userId, ranked, online, onChanged }) => {
    const { t } = useTranslation();
    const { action } = ranked;
    const controls = useActionControls(userId, action, onChanged);
    return (
        <li className="flex items-center gap-4 px-6 py-3.5 md:px-7">
            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-content-primary">{action.title}</p>
                <p className="truncate text-[13px] text-content-secondary">{action.reason}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { void controls.begin(); }} loading={controls.busy} disabled={!online}>
                {action.status === 'IN_PROGRESS' ? t('careeros.today.action.resume', 'Resume') : t('careeros.today.action.begin', 'Begin')}
            </Button>
        </li>
    );
};

export default NextAction;
