// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { goal, run as runFixture } from '../../../services/careerOs/__tests__/fixtures';
import type { CoachConversation, CoachMessage } from '../../../services/careerOs/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();
const replace = vi.fn();
const invalidate = vi.fn();

vi.mock('../shell/CareerOsProvider', () => ({
    useCareerOs: () => ({ userId: 'u1', invalidate, isAdmin: false, context: null, contextLoading: false, refreshContext: vi.fn(), refreshInbox: vi.fn(), openAuth: vi.fn(), profile: null, migration: 'done' }),
}));
vi.mock('../../NavigationProvider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../NavigationProvider')>();
    return { ...actual, useNavigation: () => ({ navigate, replace, back: () => false, reset: vi.fn(), route: { view: 'career', space: 'coach' } }), useBackHandler: () => undefined };
});
vi.mock('../../../lib/useMobileShell', () => ({ useMobileShell: () => false }));
vi.mock('../../../services/supabase', () => ({ getSupabase: () => ({}), supabase: {} }));
vi.mock('../../../services/api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));
vi.mock('../../../services/translationService', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key, language: 'en', setLanguage: () => undefined }),
}));
vi.mock('../../../services/careerOs/careerEvents', () => ({ track: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/repos/accountRepo', () => ({ triggerDownload: vi.fn() }));
vi.mock('../coach/coachRepo', () => ({
    listConversations: vi.fn(), getConversation: vi.fn(), createConversation: vi.fn(), updateConversation: vi.fn(), rename: vi.fn(), archive: vi.fn(),
    reopen: vi.fn(), forgetSummary: vi.fn(), setContextRefs: vi.fn(), deleteConversation: vi.fn(), listMessages: vi.fn(), insertSystemMessage: vi.fn(),
    deleteMessages: vi.fn(), findActiveByContext: vi.fn(), matchesContext: vi.fn(),
}));
vi.mock('../../../services/careerOs/goalRepo', () => ({ list: vi.fn(), get: vi.fn(), getPrimary: vi.fn() }));
vi.mock('../../../services/careerOs/campaignRepo', () => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/opportunityRepo', () => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/applicationRepo', () => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../../services/careerOs/coachApi', () => ({ sendCoachMessage: vi.fn() }));
vi.mock('../../../services/careerOs/gateway', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../services/careerOs/gateway')>();
    return { ...actual, runTool: vi.fn(), confirmTool: vi.fn(), cancelRun: vi.fn() };
});

import * as coachRepo from '../coach/coachRepo';
import * as goalRepo from '../../../services/careerOs/goalRepo';
import * as applicationRepo from '../../../services/careerOs/applicationRepo';
import { sendCoachMessage } from '../../../services/careerOs/coachApi';
import { GatewayError, confirmTool, runTool } from '../../../services/careerOs/gateway';
import { track } from '../../../services/careerOs/careerEvents';
import { clearOwnedQueries } from '../data/useOwnedQuery';
import { buildConversationExport, citationRoute, isDone, resultRoute } from '../coach/coachFormat';
import { resolveContextRefs } from '../coach/useCoach';
import CoachThread from '../coach/CoachThread';
import AgentSuggestion from '../coach/AgentSuggestion';

const T0 = '2026-09-20T10:00:00.000Z';
const CONV_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

const conversation = (o: Partial<CoachConversation> = {}): CoachConversation => ({
    id: CONV_ID, title: 'Senior nurse move', contextRefs: {}, summary: '', summarySourceIds: [], status: 'active', lastMessageAt: T0, revision: 2, createdAt: T0, updatedAt: T0, ...o,
});
const message = (o: Partial<CoachMessage> = {}): CoachMessage => ({
    id: 'm1', conversationId: CONV_ID, role: 'assistant', content: 'Hello', citations: [], proposals: [], actionRunId: null, abstained: false, createdAt: T0, ...o,
});

function setValue(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
    (el as unknown as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker?.setValue('');
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
const buttonByText = (text: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
    if (!btn) throw new Error(`button not found: ${text}`);
    return btn as HTMLButtonElement;
};
const buttonByLabel = (label: string): HTMLButtonElement => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith(label));
    if (!btn) throw new Error(`button not found by label: ${label}`);
    return btn as HTMLButtonElement;
};
const click = async (el: Element) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const flush = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

let root: Root;
let container: HTMLDivElement;
let messages: CoachMessage[];
let conv: CoachConversation;

async function mount(node: React.ReactNode) {
    await act(async () => { root = createRoot(container); root.render(node); });
    await flush();
}

afterEach(async () => { await act(async () => { root?.unmount(); }); });
beforeEach(() => {
    vi.clearAllMocks();
    clearOwnedQueries();
    sessionStorage.clear();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    conv = conversation();
    messages = [message({ id: 'm1', role: 'user', content: 'What should I do next?' }), message({ id: 'm2', role: 'assistant', content: 'Review your goal first.', citations: [{ kind: 'goal', id: 'g1', label: 'Senior nurse role' }] })];
    vi.mocked(coachRepo.getConversation).mockImplementation(async () => conv);
    vi.mocked(coachRepo.listMessages).mockImplementation(async () => ({ messages, hasEarlier: false }));
    vi.mocked(coachRepo.setContextRefs).mockImplementation(async (_u, _id, refs, rev) => { conv = { ...conv, contextRefs: refs, revision: rev + 1 }; return conv; });
    vi.mocked(coachRepo.insertSystemMessage).mockImplementation(async (_u, id, content) => { const m = message({ id: `sys-${messages.length}`, conversationId: id, role: 'system', content }); messages = [...messages, m]; return m; });
    vi.mocked(goalRepo.list).mockResolvedValue([goal({ id: 'g1', title: 'Senior nurse role' }), goal({ id: 'g2', title: 'Clinical lead', isPrimary: false })]);
    vi.mocked(goalRepo.get).mockImplementation(async (_u, id) => goal({ id, title: id === 'g2' ? 'Clinical lead' : 'Senior nurse role', revision: 3 }));
    vi.mocked(applicationRepo.get).mockRejectedValue(new Error('unused'));
});

describe('coachFormat', () => {
    it('exports exactly this conversation: messages of another conversation are never included', () => {
        const doc = buildConversationExport(conv, [...messages, message({ id: 'x', conversationId: OTHER_ID, content: 'leak' })]);
        expect(doc.format).toBe('cvbase-coach-conversation');
        expect(doc.conversation.id).toBe(CONV_ID);
        expect(doc.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
        expect(JSON.stringify(doc)).not.toContain('leak');
        expect(doc.messages[1].citations[0]).toEqual({ kind: 'goal', id: 'g1', label: 'Senior nurse role' });
    });
    it('reports Done only for a completed receipt with a result reference, and links receipts to owned screens', () => {
        expect(isDone(runFixture({ status: 'completed', resultRef: { type: 'application', id: 'a1' } }))).toBe(true);
        expect(isDone(runFixture({ status: 'completed', resultRef: null }))).toBe(false);
        expect(isDone(runFixture({ status: 'running', resultRef: { type: 'prism' } }))).toBe(false);
        expect(resultRoute('start_application', { application: { id: 'a9' } } as never, runFixture())).toMatchObject({ space: 'applications', id: 'a9' });
        expect(resultRoute('request_tailoring', undefined, runFixture({ resultRef: { type: 'prism', applicationId: 'a3' } }))).toMatchObject({ space: 'applications', id: 'a3', section: 'cv' });
        expect(citationRoute({ kind: 'fact', id: 'f1' })).toMatchObject({ space: 'career', sub: 'evidence' });
        expect(citationRoute({ kind: 'interview', id: 'i1' }, 'a1')).toMatchObject({ space: 'applications', id: 'a1', section: 'interview' });
        expect(citationRoute({ kind: 'interview', id: 'i1' }, null)).toBeNull();
    });
    it('follows persisted application relations when resolving context, never the requested opportunity', async () => {
        vi.mocked(applicationRepo.get).mockResolvedValue({ id: 'a1', jobTitle: 'Nurse', company: 'Acme', revision: 4, opportunityId: 'o-persisted', campaignId: null, goalId: 'g1' } as never);
        const { get } = await import('../../../services/careerOs/opportunityRepo');
        vi.mocked(get).mockImplementation(async (_u, id) => ({ id, title: 'Role', company: 'Acme', revision: 1 }) as never);
        const { refs, title } = await resolveContextRefs('u1', { application: 'a1', opportunity: 'o-requested' });
        expect(refs.application).toEqual({ id: 'a1', revision: 4 });
        expect(refs.opportunity?.id).toBe('o-persisted');
        expect(refs.goal?.id).toBe('g1');
        expect(title).toBe('Nurse · Acme');
    });
});

describe('CoachThread', () => {
    it('renders the thread with citation chips and marks abstained replies honestly', async () => {
        messages.push(message({ id: 'm3', abstained: true, content: "I can't reach the model right now; your context is saved." }));
        await mount(<CoachThread conversationId={CONV_ID} onGone={vi.fn()} />);
        expect(document.body.textContent).toContain('Review your goal first.');
        expect(document.body.textContent).toContain("The coach didn't have enough evidence to answer this");
        const chip = buttonByText('Senior nurse role');
        await click(chip);
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'career', sub: 'goals', id: 'g1' }));
    });

    it('changing the context persists refs with the revision and stores a system message', async () => {
        await mount(<CoachThread conversationId={CONV_ID} onGone={vi.fn()} />);
        await click(buttonByLabel('Choose goal'));
        await flush();
        await click(buttonByText('Clinical lead'));
        await flush();
        expect(coachRepo.setContextRefs).toHaveBeenCalledWith('u1', CONV_ID, { goal: { id: 'g2', revision: 3 } }, 2);
        expect(coachRepo.insertSystemMessage).toHaveBeenCalledWith('u1', CONV_ID, 'Context changed to Goal: Clinical lead');
        await flush();
        expect(document.body.textContent).toContain('Context changed to Goal: Clinical lead');
    });

    it('sends through the coach API with the conversation id, clears the draft on success and keeps it on failure', async () => {
        vi.mocked(sendCoachMessage).mockImplementationOnce(async () => {
            messages = [...messages, message({ id: 'm9', content: 'Answer' })];
            return { conversationId: CONV_ID, created: false, message: messages[messages.length - 1], abstained: false, abstainReason: null, caveat: false, released: false, dropped: { citations: 0, proposals: 0 }, conversation: conv, contextUsed: { ids: [], refs: {}, revisions: {} } };
        });
        await mount(<CoachThread conversationId={CONV_ID} onGone={vi.fn()} />);
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        setValue(textarea, 'Which role fits?');
        await click(buttonByText('Send'));
        await flush();
        expect(sendCoachMessage).toHaveBeenCalledWith(expect.objectContaining({ conversationId: CONV_ID, message: 'Which role fits?', locale: 'en' }));
        expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
        expect(document.body.textContent).toContain('Answer');

        vi.mocked(sendCoachMessage).mockRejectedValueOnce(new GatewayError({ code: 'llm_unavailable', status: 503, message: 'down' } as never));
        setValue(document.querySelector('textarea') as HTMLTextAreaElement, 'Keep this draft');
        await click(buttonByText('Send'));
        await flush();
        expect(document.body.textContent).toContain('AI assistance is unavailable');
        expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Keep this draft');
    });

    it('shows the AI-unavailable state when the server stored an abstention and refunded the action', async () => {
        vi.mocked(sendCoachMessage).mockImplementationOnce(async () => {
            const stored = message({ id: 'm9', abstained: true, content: "I can't reach the model right now; your context is saved." });
            messages = [...messages, stored];
            return { conversationId: CONV_ID, created: false, message: stored, abstained: true, abstainReason: null, caveat: false, released: true, dropped: { citations: 0, proposals: 0 }, conversation: null, contextUsed: { ids: [], refs: {}, revisions: {} } };
        });
        await mount(<CoachThread conversationId={CONV_ID} onGone={vi.fn()} />);
        setValue(document.querySelector('textarea') as HTMLTextAreaElement, 'Hello?');
        await click(buttonByText('Send'));
        await flush();
        expect(document.body.textContent).toContain('AI assistance is unavailable');
        expect(document.body.textContent).toContain('nothing was charged');
        expect(document.body.textContent).toContain("The coach didn't have enough evidence to answer this");
    });

    it('a plan limit shows the denied state with the upgrade link', async () => {
        vi.mocked(sendCoachMessage).mockRejectedValueOnce(new GatewayError({ code: 'limit_reached', status: 402, message: 'limit' } as never));
        await mount(<CoachThread conversationId={CONV_ID} onGone={vi.fn()} />);
        setValue(document.querySelector('textarea') as HTMLTextAreaElement, 'More please');
        await click(buttonByText('Send'));
        await flush();
        expect(document.body.textContent).toContain('No AI actions left on your plan');
        await click(buttonByText('See plans'));
        expect(navigate).toHaveBeenCalledWith({ view: 'pricing' });
    });

    it('shows the derived summary as a derivation with its source count and forgets it with the revision', async () => {
        conv = conversation({ summary: 'You want a senior nurse role in London.', summarySourceIds: ['m1', 'm2', 'm3'] });
        vi.mocked(coachRepo.forgetSummary).mockImplementation(async (_u, id, rev) => ({ ...conv, id, summary: '', summarySourceIds: [], revision: rev + 1 }));
        await mount(<CoachThread conversationId={CONV_ID} onGone={vi.fn()} />);
        expect(document.body.textContent).toContain('Derived summary (from 3 messages)');
        expect(document.body.textContent).toContain('your career facts always take precedence');
        await click(buttonByText('Memory'));
        await click(buttonByText('Forget derived summary'));
        await click(buttonByText('Forget summary'));
        await flush();
        expect(coachRepo.forgetSummary).toHaveBeenCalledWith('u1', CONV_ID, 2);
        expect(document.body.textContent).not.toContain('Derived summary (from');
    });
});

describe('AgentSuggestion', () => {
    const proposal = { tool: 'record_outcome', input: { applicationId: 'a1', kind: 'offer' }, confirmationRequired: true, summary: 'Record an offer for Acme Health' };

    it('opens a confirmation bound to the server summary and hash, confirms with that hash, and says Done only after a completed receipt', async () => {
        const onExecuted = vi.fn();
        vi.mocked(runTool).mockResolvedValueOnce({
            run: runFixture({ id: 'r1', status: 'waiting_confirmation', resultRef: null }),
            confirmationRequired: { token: 'tok', contentHash: 'abcdef0123456789abcdef0123456789', summary: 'Record offer · Acme Health · 2026-09-20', destination: 'application a1', expiresAt: '2026-09-20T11:00:00.000Z', policy: 'explicit' },
        });
        vi.mocked(confirmTool).mockResolvedValueOnce({ run: runFixture({ id: 'r1', status: 'completed', resultRef: { type: 'outcome', id: 'x1', applicationId: 'a1' } }), result: { outcome: { id: 'x1' }, application: { id: 'a1' } } as never });
        await mount(<AgentSuggestion proposal={proposal} messageId="m2" index={0} conversationId={CONV_ID} onExecuted={onExecuted} />);
        expect(document.body.textContent).toContain('Needs your confirmation');
        await click(buttonByText('Run'));
        await flush();
        expect(runTool).toHaveBeenCalledWith('record_outcome', proposal.input, expect.objectContaining({ idempotencyKey: expect.stringMatching(/^coach:/) }));
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog?.textContent).toContain('Record offer · Acme Health · 2026-09-20');
        expect(dialog?.textContent).toContain('application a1');
        expect([...document.querySelectorAll('span')].some((el) => el.textContent === 'Done')).toBe(false);
        await click(buttonByText('Confirm and run'));
        await flush();
        const [, , confirmation, opts] = vi.mocked(confirmTool).mock.calls[0];
        expect(confirmation).toEqual({ token: 'tok', contentHash: 'abcdef0123456789abcdef0123456789' });
        expect(opts.idempotencyKey).toBe(vi.mocked(runTool).mock.calls[0][2].idempotencyKey);
        expect([...document.querySelectorAll('span')].some((el) => el.textContent === 'Done')).toBe(true);
        expect(onExecuted).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', status: 'completed' }), 'record_outcome');
        await click(buttonByText('Open result'));
        expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ space: 'applications', id: 'a1', section: 'activity' }));
    });

    it('a running receipt is "started", never Done, and cancel stops it', async () => {
        const { cancelRun } = await import('../../../services/careerOs/gateway');
        vi.mocked(runTool).mockResolvedValueOnce({ run: runFixture({ id: 'r2', status: 'running', resultRef: { type: 'prism', applicationId: 'a1' } }) });
        vi.mocked(cancelRun).mockResolvedValueOnce(runFixture({ id: 'r2', status: 'cancelled' }));
        await mount(<AgentSuggestion proposal={{ tool: 'request_tailoring', input: { applicationId: 'a1', sourceResumeId: 'r', sourceResumeRevision: 1 }, confirmationRequired: false, summary: 'Tailor the CV' }} messageId="m2" index={1} conversationId={CONV_ID} onExecuted={vi.fn()} />);
        await click(buttonByText('Run'));
        await flush();
        expect(document.body.textContent).toContain('Started — finish it in its workflow');
        expect([...document.querySelectorAll('span')].some((el) => el.textContent === 'Done')).toBe(false);
        await click(buttonByText('Cancel'));
        await flush();
        expect(cancelRun).toHaveBeenCalledWith('r2');
        expect(document.body.textContent).toContain('Cancelled');
    });

    it('a failed receipt shows the failure code and Retry only when retryable; explain-only tools render inline', async () => {
        vi.mocked(runTool).mockRejectedValueOnce(new GatewayError({ code: 'stale_context', status: 409, message: 'stale', extra: { run: { id: 'r3', status: 'failed', retryable: true, failure_code: 'stale_context', tool: 'start_application', idempotency_key: 'k' } } } as never));
        await mount(<AgentSuggestion proposal={{ tool: 'start_application', input: { opportunityId: 'o1' }, confirmationRequired: false, summary: 'Start' }} messageId="m2" index={2} conversationId={CONV_ID} onExecuted={vi.fn()} />);
        await click(buttonByText('Run'));
        await flush();
        expect(document.body.textContent).toContain('The records changed since the coach looked at them');
        expect(document.body.textContent).toContain('Retry');

        vi.mocked(runTool).mockResolvedValueOnce({
            run: runFixture({ id: 'r4', status: 'completed', resultRef: { type: 'comparison' } }),
            result: { opportunities: [{ id: 'o1', title: 'Nurse', company: 'Acme' }], coverage: { opportunityIds: ['o1'], rows: [{ text: 'Registered nurse', states: { o1: 'supported' } }], totals: [] } } as never,
        });
        await act(async () => { root.unmount(); });
        await mount(<AgentSuggestion proposal={{ tool: 'compare_opportunities', input: { opportunityIds: ['o1'] }, confirmationRequired: false, summary: 'Compare' }} messageId="m2" index={3} conversationId={CONV_ID} onExecuted={vi.fn()} />);
        expect(document.body.textContent).toContain('Read-only');
        await click(buttonByText('Show'));
        await flush();
        expect(document.querySelector('table')?.textContent).toContain('Registered nurse');
        expect(document.querySelector('table')?.textContent).toContain('Supported');
        expect(track).not.toHaveBeenCalledWith('u1', 'coach_action_executed', expect.anything());
    });

    it('refuses an unregistered tool without calling the gateway', async () => {
        await mount(<AgentSuggestion proposal={{ tool: 'delete_everything', input: {}, confirmationRequired: false, summary: 'nope' }} messageId="m2" index={4} conversationId={CONV_ID} onExecuted={vi.fn()} />);
        expect(document.body.textContent).toContain('This tool is not registered');
        expect([...document.querySelectorAll('button')].some((b) => b.textContent === 'Run')).toBe(false);
        expect(runTool).not.toHaveBeenCalled();
    });
});
