import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from '../../../../services/translationService';
import * as interviewRepo from '../../../../services/careerOs/interviewRepo';
import * as factRepo from '../../../../services/careerOs/factRepo';
import { generatePracticeQuestions, requestPracticeFeedback } from '../../../../services/careerOs/interviewApi';
import { factLabel } from '../../../../services/careerOs/careerFacts';
import { track } from '../../../../services/careerOs/careerEvents';
import type { CareerFact, InterviewSession, InterviewStatus, InterviewTheme, InterviewType, PracticeItem, ReadinessItem } from '../../../../services/careerOs/types';
import { newId } from '../../../../services/careerOs/util';
import { useOwnedQuery } from '../../data/useOwnedQuery';
import { useCareerOs } from '../../shell/CareerOsProvider';
import { Button, EvidenceBadge, ReadinessChecklist, StatePanel, StatusChip, type Tone } from '../../primitives';
import { classifyAiError, panelKindFor } from '../errors';
import { FailureNotice } from '../FailureNotice';
import { Checkbox, Panel, PaneHeading, Select, TextArea, TextInput } from '../fields';
import { formatInZone } from '../format';
import { isoToWallTime, localTimeZone, supportedTimeZones, wallTimeToIso } from '../timezone';
import { useAsyncAction } from '../useAsyncAction';
import type { Workspace } from '../useApplicationWorkspace';

/**
 * Interview preparation (REQ-20/COS-024): sessions with a recorded time,
 * IANA zone and type; role themes from the listing's requirements; story
 * candidates from achievement/experience facts; text practice with answers
 * saved through the repo and AI feedback that cites facts or abstains;
 * readiness as a checklist; self-reported result and recruiter feedback as
 * separate fields. No emotion or personality scoring exists here.
 */
const TYPES: InterviewType[] = ['phone', 'video', 'onsite', 'panel', 'technical', 'case', 'unknown'];

const sessionReadiness = (s: InterviewSession, t: (k: string, d: string) => string): ReadinessItem[] => {
    const covered = s.themes.filter((x) => x.covered).length;
    const answered = s.practice.filter((p) => p.answer.trim().length > 0).length;
    return [
        { id: 'themes', label: t('careeros.interview.readiness.themes', 'Themes covered ({done} of {total})').replace('{done}', String(covered)).replace('{total}', String(s.themes.length)), kind: 'necessary', state: s.themes.length > 0 && covered === s.themes.length ? 'complete' : 'incomplete', detail: s.themes.length === 0 ? t('careeros.interview.readiness.noThemes', 'No themes yet — add them from the listing requirements.') : undefined },
        { id: 'stories', label: t('careeros.interview.readiness.stories', 'Stories chosen ({count})').replace('{count}', String(s.storyFactIds.length)), kind: 'necessary', state: s.storyFactIds.length > 0 ? 'complete' : 'incomplete' },
        { id: 'practice', label: t('careeros.interview.readiness.practice', 'Practice questions answered ({done} of {total})').replace('{done}', String(answered)).replace('{total}', String(s.practice.length)), kind: 'optional', state: s.practice.length > 0 && answered === s.practice.length ? 'complete' : 'incomplete', detail: s.practice.length === 0 ? t('careeros.interview.readiness.noPractice', 'Generate questions or add your own.') : undefined },
    ];
};

const SessionForm: React.FC<{ initial?: InterviewSession; pending: boolean; onSubmit: (v: { scheduledAt: string | null; timeZone: string; interviewType: InterviewType }) => void; onCancel: () => void }> = ({ initial, pending, onSubmit, onCancel }) => {
    const { t } = useTranslation();
    const zones = useMemo(() => supportedTimeZones(), []);
    const [timeZone, setTimeZone] = useState(initial?.timeZone ?? localTimeZone());
    const [wall, setWall] = useState(initial?.scheduledAt ? isoToWallTime(initial.scheduledAt, initial.timeZone ?? localTimeZone()) : '');
    const [type, setType] = useState<InterviewType>(initial?.interviewType ?? 'unknown');
    const typeLabels: Record<InterviewType, string> = {
        phone: t('careeros.interview.type.phone', 'Phone'), video: t('careeros.interview.type.video', 'Video'), onsite: t('careeros.interview.type.onsite', 'On site'), panel: t('careeros.interview.type.panel', 'Panel'),
        technical: t('careeros.interview.type.technical', 'Technical'), case: t('careeros.interview.type.case', 'Case study'), unknown: t('careeros.common.unknown', 'Unknown'),
    };
    const zoneOptions = zones.includes(timeZone) ? zones : [timeZone, ...zones];
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            <TextInput label={t('careeros.interview.when', 'Scheduled time')} optional={t('careeros.common.optional', 'optional')} type="datetime-local" value={wall} onChange={(event) => setWall(event.target.value)} />
            <Select label={t('careeros.interview.timeZone', 'Time zone')} options={zoneOptions.map((z) => ({ value: z, label: z }))} value={timeZone} onChange={(event) => setTimeZone(event.target.value)} />
            <Select label={t('careeros.interview.typeLabel', 'Interview type')} options={TYPES.map((v) => ({ value: v, label: typeLabels[v] }))} value={type} onChange={(event) => setType(event.target.value as InterviewType)} />
            <div className="flex gap-2 sm:col-span-3">
                <Button variant="primary" loading={pending} onClick={() => onSubmit({ scheduledAt: wall ? wallTimeToIso(wall, timeZone) : null, timeZone, interviewType: type })}>{initial ? t('careeros.common.save', 'Save') : t('careeros.interview.create', 'Create session')}</Button>
                <Button variant="quiet" onClick={onCancel}>{t('btn.cancel', 'Cancel')}</Button>
            </div>
        </div>
    );
};

const SessionPanel: React.FC<{ session: InterviewSession; workspace: Workspace; facts: CareerFact[] }> = ({ session, workspace, facts }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [editing, setEditing] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [customQuestion, setCustomQuestion] = useState('');
    const [selfReported, setSelfReported] = useState(session.selfReportedResult ?? '');
    const [recruiter, setRecruiter] = useState(session.recruiterFeedback ?? '');
    const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
    useEffect(() => { setSelfReported(session.selfReportedResult ?? ''); setRecruiter(session.recruiterFeedback ?? ''); }, [session.id, session.selfReportedResult, session.recruiterFeedback]);

    const opportunity = workspace.data?.opportunity ?? null;
    const factsById = useMemo(() => new Map(facts.map((f) => [f.id, f])), [facts]);
    const storyCandidates = useMemo(() => facts.filter((f) => f.kind === 'achievement' || f.kind === 'experience' || f.kind === 'project'), [facts]);

    const replace = (next: InterviewSession) => {
        if (!workspace.data) return;
        workspace.setInterviews(workspace.data.interviews.map((s) => (s.id === next.id ? next : s)));
        invalidate('applications:');
    };

    const [update, updateState] = useAsyncAction(async (patch: Parameters<typeof interviewRepo.update>[2]) => {
        if (!userId) return;
        replace(await interviewRepo.update(userId, session.id, patch, session.revision));
    });

    const [saveDetails, detailsState] = useAsyncAction(async (v: { scheduledAt: string | null; timeZone: string; interviewType: InterviewType }) => {
        if (!userId) return;
        replace(await interviewRepo.update(userId, session.id, v, session.revision));
        setEditing(false);
    });

    const [saveAnswer, answerState] = useAsyncAction(async (item: PracticeItem) => {
        if (!userId) return;
        const text = answers[item.id] ?? item.answer;
        replace(await interviewRepo.saveAnswer(userId, session.id, item.id, text, session.revision));
        setAnswers((a) => { const next = { ...a }; delete next[item.id]; return next; });
    });

    const [generate, generateState] = useAsyncAction(async () => {
        const result = await generatePracticeQuestions(session.id);
        replace(result.session);
    });

    const [feedback, feedbackState] = useAsyncAction(async (item: PracticeItem) => {
        if (!userId) return;
        setFeedbackFor(item.id);
        try {
            const result = await requestPracticeFeedback(session.id, item.id);
            replace(result.session);
            if (!result.feedback.abstained) {
                await track(userId, 'interview_practice_completed', { subjectRefs: { interview: session.id, application: session.applicationId }, payload: { practiceItem: item.id, citations: result.feedback.citations.length }, dedupeKey: `interview_practice_completed:${session.id}:${item.id}` });
            }
        } finally {
            setFeedbackFor(null);
        }
    });

    const addThemesFromRequirements = () => {
        if (!opportunity) return;
        const existing = new Set(session.themes.map((x) => x.sourceRequirementId ?? x.theme));
        const added: InterviewTheme[] = opportunity.requirements.filter((r) => !existing.has(r.id)).map((r) => ({ id: newId(), theme: r.text, covered: false, sourceRequirementId: r.id }));
        if (added.length > 0) void update({ themes: [...session.themes, ...added] });
    };
    const toggleTheme = (theme: InterviewTheme) => void update({ themes: session.themes.map((x) => (x.id === theme.id ? { ...x, covered: !x.covered } : x)) });
    const toggleStory = (factId: string) => void update({ storyFactIds: session.storyFactIds.includes(factId) ? session.storyFactIds.filter((id) => id !== factId) : [...session.storyFactIds, factId] });
    const addCustomQuestion = () => {
        const question = customQuestion.trim();
        if (!question) return;
        void update({ practice: [...session.practice, { id: `q:user:${newId().slice(0, 8)}`, question, answer: '', feedback: null, answeredAt: null }] }).then((ok) => { if (ok) setCustomQuestion(''); });
    };

    const statusChip: Record<InterviewStatus, { label: string; tone: Tone }> = {
        planned: { label: t('careeros.interview.status.planned', 'Planned'), tone: 'neutral' },
        prepared: { label: t('careeros.interview.status.prepared', 'Prepared'), tone: 'info' },
        completed: { label: t('careeros.interview.status.completed', 'Completed'), tone: 'success' },
        cancelled: { label: t('careeros.interview.status.cancelled', 'Cancelled'), tone: 'neutral' },
    };
    const generateFailure = generateState.error ? classifyAiError(generateState.error) : null;
    const feedbackFailure = feedbackState.error ? classifyAiError(feedbackState.error) : null;
    const anyError = updateState.error ?? detailsState.error ?? answerState.error;

    return (
        <Panel as="section" aria-labelledby={`session-${session.id}`}>
            <PaneHeading
                id={`session-${session.id}`}
                title={session.scheduledAt ? formatInZone(session.scheduledAt, session.timeZone) : t('careeros.interview.unscheduled', 'Time not recorded')}
                description={`${{ phone: t('careeros.interview.type.phone', 'Phone'), video: t('careeros.interview.type.video', 'Video'), onsite: t('careeros.interview.type.onsite', 'On site'), panel: t('careeros.interview.type.panel', 'Panel'), technical: t('careeros.interview.type.technical', 'Technical'), case: t('careeros.interview.type.case', 'Case study'), unknown: t('careeros.common.unknown', 'Unknown') }[session.interviewType]}${session.timeZone ? ` · ${session.timeZone}` : ''}`}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusChip label={statusChip[session.status].label} tone={statusChip[session.status].tone} announce />
                        <Button size="sm" variant="secondary" icon={<CalendarClock size={14} />} onClick={() => setEditing((e) => !e)}>{t('careeros.interview.editTime', 'Edit time & type')}</Button>
                        {session.status === 'planned' && <Button size="sm" variant="secondary" onClick={() => { void update({ status: 'prepared' }); }}>{t('careeros.interview.markPrepared', 'Mark prepared')}</Button>}
                    </div>
                }
            />
            {editing && <div className="mt-4"><SessionForm initial={session} pending={detailsState.pending} onSubmit={(v) => { void saveDetails(v); }} onCancel={() => setEditing(false)} /></div>}
            {anyError ? <FailureNotice error={anyError} onReload={() => { void workspace.refresh(); }} onDismiss={() => { updateState.reset(); detailsState.reset(); answerState.reset(); }} className="mt-3" /> : null}

            <div className="mt-5 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-5">
                    <div>
                        <PaneHeading level={3} title={t('careeros.interview.themes', 'Role themes')} description={t('careeros.interview.themesHint', 'One theme per requirement from the listing. Tick a theme once you have a story ready for it.')} action={opportunity && opportunity.requirements.length > 0 ? <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={addThemesFromRequirements} loading={updateState.pending}>{t('careeros.interview.addThemes', 'Add from requirements')}</Button> : undefined} />
                        {session.themes.length === 0 ? (
                            <p className="mt-2 text-[13px] text-content-secondary">{opportunity ? t('careeros.interview.noThemes', 'No themes yet.') : t('careeros.interview.noOpportunityThemes', 'No listing is linked, so themes cannot be read from requirements.')}</p>
                        ) : (
                            <ul className="mt-2 space-y-1">
                                {session.themes.map((theme) => (
                                    <li key={theme.id}><Checkbox label={theme.theme} checked={theme.covered} onChange={() => toggleTheme(theme)} disabled={updateState.pending} /></li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <PaneHeading level={3} title={t('careeros.interview.stories', 'Story candidates')} description={t('careeros.interview.storiesHint', 'Achievements, roles and projects from your Career facts to draw on. Feedback cites only these.')} />
                        {storyCandidates.length === 0 ? (
                            <p className="mt-2 text-[13px] text-content-secondary">{t('careeros.interview.noFacts', 'No achievement or experience facts yet. Add them in the Career space.')}</p>
                        ) : (
                            <ul className="mt-2 space-y-1">
                                {storyCandidates.map((fact) => (
                                    <li key={fact.id} className="flex items-start gap-2">
                                        <Checkbox label={factLabel(fact)} checked={session.storyFactIds.includes(fact.id)} onChange={() => toggleStory(fact.id)} disabled={updateState.pending} className="flex-1" />
                                        <EvidenceBadge state={fact.confirmationState} className="mt-2" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <PaneHeading level={3} title={t('careeros.interview.practice', 'Text practice')} description={t('careeros.interview.practiceHint', 'Answer in writing; feedback lists strengths and gaps with the facts it relied on, or says when it cannot judge.')} action={<Button size="sm" variant="secondary" icon={<Sparkles size={14} />} onClick={() => { void generate(); }} loading={generateState.pending}>{t('careeros.interview.generate', 'Generate questions')}</Button>} />
                        {generateFailure ? <StatePanel kind={panelKindFor(generateFailure)} compact className="mt-2" title={generateFailure === 'ai-unavailable' ? t('careeros.interview.aiUnavailable', 'Questions could not be generated right now') : undefined} description={generateFailure === 'ai-unavailable' ? t('careeros.interview.aiUnavailableDescription', 'Add your own questions below, or try again later.') : undefined} secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: generateState.reset }} /> : null}
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                            <TextInput className="flex-1" label={t('careeros.interview.customQuestion', 'Add your own question')} value={customQuestion} onChange={(event) => setCustomQuestion(event.target.value)} />
                            <Button variant="secondary" icon={<Plus size={14} />} onClick={addCustomQuestion} disabled={!customQuestion.trim()} loading={updateState.pending}>{t('careeros.common.add', 'Add')}</Button>
                        </div>
                        {session.practice.length === 0 ? (
                            <p className="mt-3 text-[13px] text-content-secondary">{t('careeros.interview.noPractice', 'No practice questions yet.')}</p>
                        ) : (
                            <ol className="mt-3 space-y-3">
                                {session.practice.map((item, index) => {
                                    const draft = answers[item.id] ?? item.answer;
                                    const dirty = (answers[item.id] ?? item.answer) !== item.answer;
                                    return (
                                        <li key={item.id} className="rounded-xl border border-border-default p-3">
                                            <p className="text-sm font-semibold text-content-primary">{index + 1}. {item.question}</p>
                                            {item.themeId && <p className="text-xs text-content-muted">{session.themes.find((x) => x.id === item.themeId)?.theme}</p>}
                                            <TextArea className="mt-2" label={t('careeros.interview.yourAnswer', 'Your answer')} rows={4} value={draft} onChange={(event) => setAnswers((a) => ({ ...a, [item.id]: event.target.value }))} />
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Button size="sm" variant="primary" onClick={() => { void saveAnswer(item); }} loading={answerState.pending} disabled={!dirty}>{t('careeros.interview.saveAnswer', 'Save answer')}</Button>
                                                <Button size="sm" variant="secondary" icon={<Sparkles size={14} />} onClick={() => { void feedback(item); }} loading={feedbackState.pending && feedbackFor === item.id} disabled={dirty || item.answer.trim().length === 0}>{t('careeros.interview.getFeedback', 'Get feedback')}</Button>
                                            </div>
                                            {feedbackFailure && feedbackFor === null && feedbackState.error ? <StatePanel kind={panelKindFor(feedbackFailure)} compact className="mt-2" secondaryAction={{ label: t('careeros.common.dismiss', 'Dismiss'), onClick: feedbackState.reset }} /> : null}
                                            {item.feedback && (
                                                <div className="mt-3 rounded-lg bg-surface-canvas p-3 text-[13px]" role="status">
                                                    {item.feedback.abstained ? (
                                                        <p className="text-content-secondary">{t('careeros.interview.abstained', 'No feedback given: the answer was too short to judge or there are no facts to check it against. Nothing was invented.')}</p>
                                                    ) : (
                                                        <>
                                                            {item.feedback.strengths.length > 0 && <><p className="font-semibold text-status-success">{t('careeros.interview.strengths', 'Strengths')}</p><ul className="list-disc pl-5 text-content-primary">{item.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>}
                                                            {item.feedback.gaps.length > 0 && <><p className="mt-2 font-semibold text-status-warning">{t('careeros.interview.gaps', 'Gaps')}</p><ul className="list-disc pl-5 text-content-primary">{item.feedback.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></>}
                                                            <p className="mt-2 text-xs text-content-muted">
                                                                {item.feedback.citations.length > 0
                                                                    ? t('careeros.interview.citations', 'Based on: {facts}').replace('{facts}', item.feedback.citations.map((id) => { const f = factsById.get(id); return f ? factLabel(f) : id; }).join('; '))
                                                                    : t('careeros.interview.noCitations', 'No facts were cited.')}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>

                    <div>
                        <PaneHeading level={3} title={t('careeros.interview.results', 'Results')} description={t('careeros.interview.resultsHint', 'What you think went well or badly, and what the recruiter actually said — kept apart.')} />
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <TextArea label={t('careeros.interview.selfReported', 'Self-reported result')} rows={3} value={selfReported} onChange={(event) => setSelfReported(event.target.value)} />
                            <TextArea label={t('careeros.interview.recruiterFeedback', 'Recruiter feedback')} rows={3} value={recruiter} onChange={(event) => setRecruiter(event.target.value)} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="sm" variant="primary" loading={updateState.pending} disabled={selfReported === (session.selfReportedResult ?? '') && recruiter === (session.recruiterFeedback ?? '')} onClick={() => { void update({ selfReportedResult: selfReported || null, recruiterFeedback: recruiter || null }); }}>{t('careeros.interview.saveResults', 'Save results')}</Button>
                            {session.status !== 'completed' && <Button size="sm" variant="secondary" loading={updateState.pending} onClick={() => { void update({ selfReportedResult: selfReported || null, recruiterFeedback: recruiter || null, status: 'completed' }); }}>{t('careeros.interview.markCompleted', 'Mark completed')}</Button>}
                        </div>
                    </div>
                </div>
                <div>
                    <ReadinessChecklist items={sessionReadiness(session, t)} compact />
                </div>
            </div>
        </Panel>
    );
};

export const InterviewSection: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
    const { t } = useTranslation();
    const { userId, invalidate } = useCareerOs();
    const [creating, setCreating] = useState(false);
    const facts = useOwnedQuery(userId, 'facts:active', () => factRepo.list(userId as string));
    const sessions = workspace.data?.interviews ?? [];

    const [create, createState] = useAsyncAction(async (v: { scheduledAt: string | null; timeZone: string; interviewType: InterviewType }) => {
        if (!userId || !workspace.data) return;
        const opportunity = workspace.data.opportunity;
        const themes: InterviewTheme[] = (opportunity?.requirements ?? []).map((r) => ({ id: newId(), theme: r.text, covered: false, sourceRequirementId: r.id }));
        const created = await interviewRepo.create(userId, { applicationId: workspace.data.application.id, ...v, themes });
        workspace.setInterviews([...workspace.data.interviews, created]);
        invalidate('applications:');
        setCreating(false);
        await track(userId, 'interview_preparation_started', { subjectRefs: { interview: created.id, application: created.applicationId }, payload: { themes: themes.length, hasTime: created.scheduledAt !== null }, dedupeKey: `interview_preparation_started:${created.id}` });
    });

    return (
        <div className="space-y-4">
            <Panel as="section" aria-labelledby="interview-heading">
                <PaneHeading id="interview-heading" title={t('careeros.interview.title', 'Interview preparation')} description={t('careeros.interview.description', 'Record each interview\'s time and type, prepare themes and stories from your evidence, and practise in writing. Readiness is a checklist, not a score.')} action={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)} disabled={creating}>{t('careeros.interview.new', 'New session')}</Button>} />
                {creating && <div className="mt-4"><SessionForm pending={createState.pending} onSubmit={(v) => { void create(v); }} onCancel={() => setCreating(false)} /></div>}
                {createState.error ? <FailureNotice error={createState.error} onDismiss={createState.reset} className="mt-3" /> : null}
            </Panel>
            {facts.error ? <StatePanel kind="partial" compact title={t('careeros.interview.factsUnavailable', 'Career facts could not be loaded')} description={t('careeros.interview.factsUnavailableDescription', 'Story candidates and citations are shown without labels until they load.')} onRetry={() => { void facts.refresh(); }} /> : null}
            {sessions.length === 0 ? (
                <StatePanel kind="empty" compact title={t('careeros.interview.emptyTitle', 'No interview sessions yet')} description={t('careeros.interview.emptyDescription', 'Create a session when an interview is scheduled — or before, to start preparing themes and stories.')} />
            ) : (
                sessions.map((s) => <SessionPanel key={`${s.id}:${s.revision}`} session={s} workspace={workspace} facts={facts.data ?? []} />)
            )}
        </div>
    );
};

export default InterviewSection;
