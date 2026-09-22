// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { application, artifact, campaign, goal, interview, opportunity, outcome } from '../../../services/careerOs/__tests__/fixtures';
import type { ApplicationArtifact, ApplicationRecord, InterviewSession, OutcomeObservation } from '../../../services/careerOs/types';

const navigate = vi.fn();
const replace = vi.fn();
const invalidate = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate, context: null, contextLoading: false, refreshContext: vi.fn(), openAuth: vi.fn() }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace, back: () => false, reset: vi.fn(), route: { view: 'career', space: 'applications' } }), useBackHandler: () => undefined };
});
vi.mock('../../../lib/useMobileShell', () => ({ useMobileShell: () => false }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({
    track: vi.fn().mockResolvedValue(undefined),
    EVENT_DICTIONARY: { application_started: { description: 'Application started' }, cv_tailored: { description: 'Tailored CV accepted' } },
}));
vi.mock('../../../services/careerOs/applicationRepo', () => ({
    get: vi.fn(), update: vi.fn(), recordSubmission: vi.fn(), list: vi.fn(),
    SubmissionLockedError: class SubmissionLockedError extends Error { readonly code = 'submission_locked'; },
}));
vi.mock('../../../services/careerOs/opportunityRepo', () => ({ get: vi.fn() }));
vi.mock('../../../services/careerOs/campaignRepo', () => ({ get: vi.fn(), list: vi.fn(), assignApplication: vi.fn() }));
vi.mock('../../../services/careerOs/goalRepo', () => ({ get: vi.fn(), getPrimary: vi.fn() }));
vi.mock('../../../services/careerOs/artifactRepo', () => ({ list: vi.fn(), save: vi.fn(), snapshot: vi.fn(), remove: vi.fn() }));
vi.mock('../../../services/careerOs/interviewRepo', () => ({ listForApplication: vi.fn(), create: vi.fn(), update: vi.fn(), saveAnswer: vi.fn() }));
vi.mock('../../../services/careerOs/outcomeRepo', () => ({ list: vi.fn(), record: vi.fn(), correct: vi.fn() }));
vi.mock('../../../services/careerOs/analysisRepo', () => ({ latestForOpportunity: vi.fn(), save: vi.fn() }));
vi.mock('../../../services/careerOs/factRepo', () => ({ list: vi.fn(), create: vi.fn(), staleReferences: vi.fn(), addReferences: vi.fn() }));
vi.mock('../../../services/careerOs/eventRepo', () => ({ listRecent: vi.fn() }));
vi.mock('../../../services/careerOs/interviewApi', () => ({ generatePracticeQuestions: vi.fn(), requestPracticeFeedback: vi.fn() }));
vi.mock('../../../services/smartStudioService', () => ({ optimizeCoverLetter: vi.fn(), optimizeLinkedInProfile: vi.fn() }));
vi.mock('../../../services/repos/resumeRepo', () => ({ get: vi.fn(), list: vi.fn(), getPrimary: vi.fn(), create: vi.fn() }));
vi.mock('../../../services/repos/prismRepo', () => ({ getResumableForApplication: vi.fn() }));
vi.mock('../../../services/repos/versionRepo', () => ({ listForResume: vi.fn() }));

import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import * as opportunityRepo from '../../../services/careerOs/opportunityRepo';
import * as campaignRepo from '../../../services/careerOs/campaignRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as artifactRepo from '../../../services/careerOs/artifactRepo';
import * as interviewRepo from '../../../services/careerOs/interviewRepo';
import * as outcomeRepo from '../../../services/careerOs/outcomeRepo';
import * as analysisRepo from '../../../services/careerOs/analysisRepo';
import * as factRepo from '../../../services/careerOs/factRepo';
import * as eventRepo from '../../../services/careerOs/eventRepo';
import * as smartStudio from '../../../services/smartStudioService';
import * as resumeRepo from '../../../services/repos/resumeRepo';
import * as prismRepo from '../../../services/repos/prismRepo';
import * as versionRepo from '../../../services/repos/versionRepo';
import { track } from '../../../services/careerOs/careerEvents';
import { clearOwnedQueries } from '../data/useOwnedQuery';
import { isoToWallTime, wallTimeToIso } from '../application/timezone';
import { classifyError } from '../application/errors';
import ApplicationsSpace from '../spaces/ApplicationsSpace';

function setValue(el: HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(el, value);
    (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}
const buttonByText = (text: string, exact = false): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => (exact ? b.textContent === text : b.textContent?.includes(text)));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const byLabel = (label: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
    const el = [...document.querySelectorAll('label')].find((l) => l.textContent?.startsWith(label));
    if (!el) throw new Error(`label not found: ${label}`);
    return document.getElementById(el.getAttribute('for') as string) as HTMLInputElement;
};

let root: Root;
let container: HTMLDivElement;
async function mount(section: string) {
    await act(async () => { root = createRoot(container); root.render(<ApplicationsSpace route={{ view: 'career', space: 'applications', id: 'a1', section }} />); });
}

const APP: ApplicationRecord = application({ id: 'a1', opportunityId: 'o1', campaignId: 'c1', goalId: 'g1', goalRevision: 1, goalSnapshot: goal(), jobUrl: 'https://jobs.example.com/123', revision: 2 });
const OPP = opportunity({ id: 'o1', capturedContent: 'A long job description. '.repeat(10), requirements: [{ id: 'r1', text: 'Registered nurse licence required', kind: 'must' }] });
/** The application row the mocked repo serves; update() merges onto it like the server would. */
function setApp(app: ApplicationRecord) {
    vi.mocked(applicationRepo.get).mockImplementation(async () => app);
    vi.mocked(applicationRepo.update).mockImplementation(async (_u, _id, patch, rev) => ({ ...app, ...patch, revision: rev + 1 }));
}
let artifacts: ApplicationArtifact[];
let interviews: InterviewSession[];
let outcomes: OutcomeObservation[];

afterEach(async () => { await act(async () => { root?.unmount(); }); });
beforeEach(() => {
    vi.clearAllMocks();
    clearOwnedQueries();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    artifacts = []; interviews = []; outcomes = [];
    setApp(APP);
    vi.mocked(opportunityRepo.get).mockResolvedValue(OPP);
    vi.mocked(campaignRepo.get).mockResolvedValue(campaign({ id: 'c1', name: 'Autumn search' }));
    vi.mocked(goalRepo.get).mockResolvedValue(goal({ revision: 3, title: 'Senior nurse role (revised)' }));
    vi.mocked(artifactRepo.list).mockImplementation(async () => artifacts);
    vi.mocked(interviewRepo.listForApplication).mockImplementation(async () => interviews);
    vi.mocked(outcomeRepo.list).mockImplementation(async () => outcomes);
    vi.mocked(analysisRepo.latestForOpportunity).mockResolvedValue(null);
    vi.mocked(factRepo.list).mockResolvedValue([]);
    vi.mocked(factRepo.staleReferences).mockResolvedValue([]);
    vi.mocked(eventRepo.listRecent).mockResolvedValue([]);
    vi.mocked(resumeRepo.get).mockResolvedValue(null);
    vi.mocked(resumeRepo.list).mockResolvedValue([]);
    vi.mocked(prismRepo.getResumableForApplication).mockResolvedValue(null);
    vi.mocked(versionRepo.listForResume).mockResolvedValue([]);
});

describe('helpers', () => {
    it('converts a wall time in an IANA zone to an instant and back', () => {
        expect(wallTimeToIso('2026-07-01T10:00', 'Europe/London')).toBe('2026-07-01T09:00:00.000Z');
        expect(wallTimeToIso('2026-01-15T09:30', 'America/New_York')).toBe('2026-01-15T14:30:00.000Z');
        expect(isoToWallTime('2026-07-01T09:00:00.000Z', 'Europe/London')).toBe('2026-07-01T10:00');
        expect(wallTimeToIso('nonsense', 'UTC')).toBeNull();
    });
    it('classifies plan, AI and conflict failures', () => {
        expect(classifyError(Object.assign(new Error('x'), { code: 'limit_reached' }))).toBe('denied');
        expect(classifyError(Object.assign(new Error('x'), { code: 'feature_disabled' }))).toBe('ai-unavailable');
        expect(classifyError(Object.assign(new Error('x'), { code: 'conflict' }))).toBe('conflict');
    });
});

describe('ApplicationWorkspace', () => {
    it('renders the section named by the route, the decision-time goal with its change notice, and truthful readiness items', async () => {
        await mount('cover-letter');
        expect(document.querySelector('[aria-current="page"]')?.textContent).toBe('Cover letter');
        expect(document.body.textContent).toContain('Letter text');
        expect(document.body.textContent).toContain('Attempt 1');
        expect(document.body.textContent).toContain('Senior nurse role');
        expect(document.body.textContent).toContain('Decision-time goal — it has changed since');
        // Readiness is a checklist with the necessary items, no percentage.
        expect(document.body.textContent).toContain('Role analysis reviewed');
        expect(document.body.textContent).toContain('Application CV');
        expect(document.body.textContent).toContain('Submission recorded');
        expect(document.body.textContent).toContain('0 of 3 necessary');
        expect(document.body.textContent).not.toMatch(/\d+%/);
        // Readiness is persisted onto the application once computed.
        expect(vi.mocked(applicationRepo.update)).toHaveBeenCalledWith('u1', 'a1', { readiness: expect.objectContaining({ items: expect.any(Array) }) }, 2);
        // Switching a tab replaces the URL section (reload/back restore it).
        await act(async () => { buttonByText('Questions').click(); });
        expect(replace).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a1', section: 'questions' }));
    });

    it('cover letter: Save persists a cover_letter artifact; Generate failing shows AI unavailable and leaves the text alone', async () => {
        vi.mocked(artifactRepo.save).mockImplementation(async (_u, input) => artifact({ id: 'art-cl', kind: 'cover_letter', ...(input as object), revision: 1 } as never));
        vi.mocked(smartStudio.optimizeCoverLetter).mockRejectedValue(Object.assign(new Error('feature_disabled'), { code: 'feature_disabled' }));
        await mount('cover-letter');
        const box = byLabel('Letter text') as HTMLTextAreaElement;
        await act(async () => { setValue(box, 'Dear hiring manager, I am a nurse.'); });
        await act(async () => { buttonByText('Save', true).click(); });
        expect(vi.mocked(artifactRepo.save)).toHaveBeenCalledWith('u1', expect.objectContaining({ applicationId: 'a1', kind: 'cover_letter', plainText: 'Dear hiring manager, I am a nurse.', source: 'user', status: 'draft' }));
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'application_artifact_saved', expect.objectContaining({ subjectRefs: { application: 'a1', artifact: 'art-cl' } }));

        await act(async () => { buttonByText('Generate draft').click(); });
        expect(document.querySelector('[role="alert"]')?.textContent).toContain('Could not generate a draft right now');
        expect((byLabel('Letter text') as HTMLTextAreaElement).value).toBe('Dear hiring manager, I am a nurse.');
        expect(vi.mocked(artifactRepo.save)).toHaveBeenCalledTimes(1);
    });

    it('cv: a CV made in the builder backs the application as a separate copy or as-is; the plan limit sends the person to pricing', async () => {
        const saved = (id: string, title: string, isPrimary: boolean) => ({ id, title, isPrimary, data: { contact: { firstName: 'Ana' } }, settings: {}, templateId: 'modern', visibleSections: [], revision: 4, applicationId: null, origin: null }) as never;
        vi.mocked(resumeRepo.list).mockResolvedValue([saved('r1', 'Main CV', true), saved('r2', 'Short CV', false)]);
        vi.mocked(resumeRepo.create).mockResolvedValue({ id: 'r-copy', title: 'Main CV · Acme' } as never);
        const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
        await mount('cv');
        await flush();
        expect(document.body.textContent).toContain('Use a saved CV');

        await act(async () => { buttonByText('Use a copy').click(); });
        await flush();
        expect(vi.mocked(resumeRepo.create)).toHaveBeenCalledWith('u1', expect.objectContaining({
            isPrimary: false, applicationId: 'a1', templateId: 'modern', data: { contact: { firstName: 'Ana' } },
            origin: expect.objectContaining({ source: 'application_copy', sourceResumeId: 'r1', sourceRevision: 4 }),
        }));
        expect(vi.mocked(applicationRepo.update)).toHaveBeenCalledWith('u1', 'a1', { currentResumeId: 'r-copy' }, 2);
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'application_cv_linked', expect.objectContaining({ payload: { mode: 'copy', replaced: false } }));

        // Linking as-is uses the chosen CV itself — no copy is made.
        vi.mocked(resumeRepo.create).mockClear();
        vi.mocked(applicationRepo.update).mockClear();
        await act(async () => { setValue(byLabel('Saved CV') as HTMLSelectElement, 'r2'); });
        await act(async () => { buttonByText('Link as-is').click(); });
        await flush();
        expect(vi.mocked(resumeRepo.create)).not.toHaveBeenCalled();
        expect(vi.mocked(applicationRepo.update)).toHaveBeenCalledWith('u1', 'a1', { currentResumeId: 'r2' }, 2);

        // At the plan's resume limit a copy is refused server-side: upgrade, never a half-linked state.
        vi.mocked(applicationRepo.update).mockClear();
        vi.mocked(resumeRepo.create).mockRejectedValue(new Error('resume_limit_reached'));
        await act(async () => { buttonByText('Use a copy').click(); });
        await flush();
        expect(navigate).toHaveBeenCalledWith({ view: 'pricing' });
        expect(vi.mocked(applicationRepo.update)).not.toHaveBeenCalled();
    });

    it('interview: creating a session stores the scheduled instant with its IANA zone and emits interview_preparation_started', async () => {
        vi.mocked(interviewRepo.create).mockImplementation(async (_u, input) => interview({ id: 'i-new', ...input } as never));
        await mount('interview');
        await act(async () => { buttonByText('New session').click(); });
        await act(async () => {
            setValue(byLabel('Scheduled time') as HTMLInputElement, '2026-10-05T14:00');
            setValue(byLabel('Time zone') as HTMLSelectElement, 'Europe/London');
            setValue(byLabel('Interview type') as HTMLSelectElement, 'video');
        });
        await act(async () => { buttonByText('Create session').click(); });
        expect(vi.mocked(interviewRepo.create)).toHaveBeenCalledWith('u1', expect.objectContaining({
            applicationId: 'a1', scheduledAt: '2026-10-05T13:00:00.000Z', timeZone: 'Europe/London', interviewType: 'video',
            themes: [expect.objectContaining({ theme: 'Registered nurse licence required', covered: false, sourceRequirementId: 'r1' })],
        }));
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'interview_preparation_started', expect.objectContaining({ subjectRefs: { interview: 'i-new', application: 'a1' } }));
        expect(document.body.textContent).toContain('Europe/London');
        expect(document.body.textContent).toContain('Themes covered (0 of 1)');
    });

    it('submission: "Open employer site" only opens the URL; the dialog records the snapshot, the submitted outcome and the event', async () => {
        const open = vi.spyOn(window, 'open').mockImplementation(() => null);
        vi.mocked(applicationRepo.recordSubmission).mockImplementation(async (_u, _id, snapshot) => ({ ...APP, stage: 'submitted', submittedAt: snapshot.confirmedAt, submissionSnapshot: snapshot, revision: 3 }));
        vi.mocked(outcomeRepo.record).mockImplementation(async (_u, appId, kind, opts) => outcome({ id: 'x-sub', applicationId: appId, kind, observedAt: opts?.observedAt ?? '' }));
        await mount('activity');

        await act(async () => { buttonByText('Open employer site').click(); });
        expect(open).toHaveBeenCalledWith('https://jobs.example.com/123', '_blank', 'noopener,noreferrer');
        expect(vi.mocked(applicationRepo.recordSubmission)).not.toHaveBeenCalled();
        expect(vi.mocked(applicationRepo.update).mock.calls.every(([, , patch]) => !('stage' in patch))).toBe(true);
        expect(document.body.textContent).toContain('Not recorded as sent');

        await act(async () => { buttonByText('Record submission').click(); });
        await act(async () => { setValue(byLabel('How did you submit?') as HTMLSelectElement, 'email'); });
        await act(async () => { buttonByText('I sent this application').click(); });
        expect(vi.mocked(applicationRepo.recordSubmission)).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({ method: 'email', resumeId: null, artifactIds: [], confirmedAt: expect.any(String) }), expect.any(Number), { supersede: false });
        expect(vi.mocked(outcomeRepo.record)).toHaveBeenCalledWith('u1', 'a1', 'submitted', expect.objectContaining({ details: expect.objectContaining({ method: 'email' }) }));
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'application_submitted', expect.objectContaining({ subjectRefs: { application: 'a1', outcome: 'x-sub' } }));
        open.mockRestore();
    });

    it('outcomes: a correction supersedes the earlier observation while both stay in the history; unknown stays unknown', async () => {
        outcomes = [outcome({ id: 'x-1', applicationId: 'a1', kind: 'rejected', observedAt: '2026-09-10T12:00:00.000Z' })];
        setApp({ ...APP, stage: 'closed', closedReason: 'rejected', submittedAt: '2026-09-01T00:00:00Z' });
        vi.mocked(outcomeRepo.correct).mockImplementation(async (_u, appId, supersedesId, input) => outcome({ id: 'x-2', applicationId: appId, kind: 'correction', supersedesId, observedAt: input?.correctedObservedAt ?? '2026-09-10T12:00:00.000Z', details: { correctedKind: input?.correctedKind } }));
        await mount('activity');
        expect(document.body.textContent).toContain('Not selected');

        await act(async () => { buttonByText('Correct the latest observation').click(); });
        expect(document.body.textContent).toContain('Correcting "Not selected"');
        await act(async () => { setValue(byLabel('What happened?') as HTMLSelectElement, 'response'); });
        await act(async () => { buttonByText('Save correction').click(); });
        expect(vi.mocked(outcomeRepo.correct)).toHaveBeenCalledWith('u1', 'a1', 'x-1', expect.objectContaining({ correctedKind: 'response' }));
        // Stage follows the corrected observation; the original stays visible as superseded.
        expect(vi.mocked(applicationRepo.update)).toHaveBeenCalledWith('u1', 'a1', { stage: 'response', closedReason: null }, expect.any(Number));
        expect(document.body.textContent).toContain('superseded by a later correction');
        expect(document.body.textContent).toContain('Corrected to: Employer responded');
        expect(vi.mocked(track)).toHaveBeenCalledWith('u1', 'career_outcome_recorded', expect.objectContaining({ subjectRefs: { application: 'a1', outcome: 'x-2' } }));
    });

    it('no response: recording it never turns silence into a rejection', async () => {
        setApp({ ...APP, stage: 'submitted', submittedAt: '2026-08-01T00:00:00Z' });
        vi.mocked(outcomeRepo.record).mockImplementation(async (_u, appId, kind) => outcome({ id: 'x-nr', applicationId: appId, kind }));
        await mount('activity');
        expect(document.body.textContent).toContain('No response recorded yet');
        await act(async () => { buttonByText('Record response / outcome').click(); });
        await act(async () => { setValue(byLabel('What happened?') as HTMLSelectElement, 'no_response'); });
        expect(document.body.textContent).toContain('silence is not a rejection');
        await act(async () => { buttonByText('Record', true).click(); });
        expect(vi.mocked(outcomeRepo.record)).toHaveBeenCalledWith('u1', 'a1', 'no_response', expect.any(Object));
        expect(vi.mocked(applicationRepo.update).mock.calls.every(([, , patch]) => patch.stage !== 'closed')).toBe(true);
        expect(document.body.textContent).toContain('No response recorded');
        expect(document.body.textContent).not.toContain('Not selected');
    });
});
