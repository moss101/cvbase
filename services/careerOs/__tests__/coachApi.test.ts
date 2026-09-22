import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api', () => ({ callFn: vi.fn(), streamFn: vi.fn() }));

import { callFn, type FnError } from '../../api';
import { sendCoachMessage } from '../coachApi';
import { GatewayError } from '../gateway';

const mockCall = vi.mocked(callFn);

const MESSAGE_ROW = {
  id: 'msg-2', user_id: 'u1', conversation_id: 'conv-1', role: 'assistant',
  content: 'You are preparing for Data Engineer at Acme.',
  citations: [{ kind: 'application', id: 'app-1', label: 'Data Engineer at Acme' }],
  proposals: [{ tool: 'prepare_interview', input: { applicationId: 'app-1' }, confirmationRequired: false, summary: 'Plan the themes' }],
  action_run_id: null, abstained: false, created_at: '2026-09-21T10:00:01Z',
};

describe('careerOs coachApi', () => {
  beforeEach(() => {
    mockCall.mockReset();
  });

  it('sends the trimmed message with context refs and maps the reply', async () => {
    mockCall.mockResolvedValue({
      conversationId: 'conv-1', created: true, message: MESSAGE_ROW, abstained: false, abstainReason: null, caveat: false, released: false,
      dropped: { citations: 1, proposals: 2 },
      conversation: { id: 'conv-1', title: 'What next?', context_refs: { application: { id: 'app-1', revision: 1 } }, summary: '', summary_source_ids: [], status: 'active', last_message_at: 'x', revision: 2, created_at: 'x', updated_at: 'x' },
      contextUsed: { ids: ['application:app-1', 'fact:f1'], refs: { application: 'app-1', opportunity: 'opp-1' }, revisions: { application: 1, opportunity: 3 } },
    });
    const reply = await sendCoachMessage({ message: '  What next?  ', contextRefs: { application: 'app-1' }, locale: 'de' });
    expect(mockCall).toHaveBeenCalledWith('career-coach', { message: 'What next?', contextRefs: { application: 'app-1' }, locale: 'de' });
    expect(reply.conversationId).toBe('conv-1');
    expect(reply.created).toBe(true);
    expect(reply.message).toMatchObject({ id: 'msg-2', conversationId: 'conv-1', role: 'assistant', abstained: false });
    expect(reply.message.citations).toEqual([{ kind: 'application', id: 'app-1', label: 'Data Engineer at Acme' }]);
    expect(reply.message.proposals[0]).toMatchObject({ tool: 'prepare_interview', confirmationRequired: false });
    expect(reply.dropped).toEqual({ citations: 1, proposals: 2 });
    expect(reply.conversation?.contextRefs).toEqual({ application: { id: 'app-1', revision: 1 } });
    expect(reply.contextUsed).toEqual({ ids: ['application:app-1', 'fact:f1'], refs: { application: 'app-1', opportunity: 'opp-1' }, revisions: { application: 1, opportunity: 3 } });
  });

  it('continues an existing conversation and surfaces the stored abstention when the model is unavailable', async () => {
    mockCall.mockResolvedValue({
      conversationId: 'conv-1', created: false,
      message: { ...MESSAGE_ROW, content: "I can't reach the model right now; your context is saved.", citations: [], proposals: [], abstained: true },
      abstained: true, released: true, contextUsed: { ids: [], refs: {}, revisions: {} },
    });
    const reply = await sendCoachMessage({ conversationId: 'conv-1', message: 'hello' });
    expect(mockCall).toHaveBeenCalledWith('career-coach', { conversationId: 'conv-1', message: 'hello' });
    expect(reply.abstained).toBe(true);
    expect(reply.released).toBe(true);
    expect(reply.message.abstained).toBe(true);
    expect(reply.conversation).toBeNull();
  });

  it('rejects an empty message locally and maps coded failures to GatewayError', async () => {
    await expect(sendCoachMessage({ message: '   ' })).rejects.toThrow('message is empty');
    expect(mockCall).not.toHaveBeenCalled();
    const err = new Error('not_found') as FnError;
    err.code = 'not_found';
    err.status = 404;
    err.extra = { error: 'not_found', entity: 'conversation' };
    mockCall.mockRejectedValue(err);
    const failure = await sendCoachMessage({ conversationId: 'nope', message: 'hi' }).catch((e) => e);
    expect(failure).toBeInstanceOf(GatewayError);
    expect(failure.code).toBe('not_found');
    expect(failure.extra.entity).toBe('conversation');
  });
});
