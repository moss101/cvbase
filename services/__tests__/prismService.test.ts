import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api', () => ({ streamFn: vi.fn(), callFn: vi.fn() }));

import { callFn, streamFn } from '../api';
import { analyzeGaps, finalizeRun, generateResume, type PrismStageUpdate } from '../prismService';

const mockStream = vi.mocked(streamFn);
const mockCall = vi.mocked(callFn);

function emits(events: Record<string, unknown>[]) {
  mockStream.mockImplementation(async (_name, _body, onEvent) => {
    for (const e of events) onEvent(e);
  });
}

describe('prismService', () => {
  // mockReset returns the mock itself; don't return it from beforeEach or
  // vitest treats it as a cleanup hook and calls the mock with no arguments.
  beforeEach(() => {
    mockStream.mockReset();
    mockCall.mockReset();
  });

  it('analyze: forwards stage updates in order and resolves with runId + questions', async () => {
    const result = { runId: 'run-1', questions: [{ id: 'q1', gapArea: 'a', question: 'Q?' }] };
    emits([
      { type: 'stage', stage: 'gap_analyst', label: 'Comparing your CV against the job requirements' },
      { type: 'stage', stage: 'wizard_creator', label: 'Preparing a few questions to fill the gaps' },
      { type: 'done', result },
    ]);

    const stages: PrismStageUpdate[] = [];
    const out = await analyzeGaps({ jdText: 'jd', cvText: 'cv', templateId: 'classic' }, (u) => stages.push(u));

    expect(stages.map((s) => s.stage)).toEqual(['gap_analyst', 'wizard_creator']);
    expect(out).toEqual(result);
    expect(mockStream).toHaveBeenCalledWith(
      'prism-tailor',
      expect.objectContaining({ phase: 'analyze', jdText: 'jd', cvText: 'cv', templateId: 'classic' }),
      expect.any(Function),
    );
  });

  it('generate: sends only runId + answers (no raw CV/JD round-trip)', async () => {
    emits([{ type: 'done', result: { runId: 'run-1', resume: {}, atsScore: 80, unresolvedIssues: [] } }]);

    await generateResume({ runId: 'run-1', answers: [] }, () => {});

    expect(mockStream).toHaveBeenCalledWith(
      'prism-tailor',
      { phase: 'generate', runId: 'run-1', answers: [] },
      expect.any(Function),
    );
  });

  it('surfaces in-band pipeline errors as coded errors', async () => {
    emits([
      { type: 'stage', stage: 'writer', label: 'Writing your tailored resume' },
      { type: 'error', error: 'cost_cap_exceeded' },
    ]);

    await expect(
      generateResume({ runId: 'run-1', answers: [] }, () => {}),
    ).rejects.toMatchObject({ code: 'cost_cap_exceeded' });
  });

  it('rejects when the stream ends without a done event', async () => {
    emits([{ type: 'stage', stage: 'aggregator', label: 'Merging your CV, the job description, and your answers' }]);

    await expect(
      generateResume({ runId: 'run-1', answers: [] }, () => {}),
    ).rejects.toThrow('stream_ended_early');
  });

  it('finalize: posts the approved resume link for the run', async () => {
    mockCall.mockResolvedValue({});
    await finalizeRun('run-1', 'resume-9');
    expect(mockCall).toHaveBeenCalledWith('prism-tailor', {
      phase: 'finalize', runId: 'run-1', resumeId: 'resume-9',
    });
  });

  it('analyze: forwards the application binding fields (application, source resume + revision, idempotency key)', async () => {
    emits([{ type: 'done', result: { runId: 'run-2', questions: [] } }]);
    await analyzeGaps({
      jdText: 'jd', cvText: 'cv', templateId: 'classic',
      applicationId: 'app-1', sourceResumeId: 'res-1', sourceResumeRevision: 3, idempotencyKey: 'tailor:app-1:3',
    }, () => {});
    expect(mockStream).toHaveBeenCalledWith(
      'prism-tailor',
      {
        phase: 'analyze', jdText: 'jd', cvText: 'cv', templateId: 'classic',
        applicationId: 'app-1', sourceResumeId: 'res-1', sourceResumeRevision: 3, idempotencyKey: 'tailor:app-1:3',
      },
      expect.any(Function),
    );
  });

  it('generate: an in-band source_stale error surfaces as FnError code source_stale with the current revision', async () => {
    emits([{ type: 'error', error: 'source_stale', extra: { currentRevision: 4 } }]);
    await expect(
      generateResume({ runId: 'run-1', answers: [] }, () => {}),
    ).rejects.toMatchObject({ code: 'source_stale', extra: { currentRevision: 4 } });
  });

  it('generate: acknowledgeStale is forwarded so the server proceeds past the review prompt', async () => {
    emits([{ type: 'done', result: { runId: 'run-1', resume: {}, atsScore: 80, unresolvedIssues: [] } }]);
    await generateResume({ runId: 'run-1', answers: [], acknowledgeStale: true }, () => {});
    expect(mockStream).toHaveBeenCalledWith(
      'prism-tailor',
      { phase: 'generate', runId: 'run-1', answers: [], acknowledgeStale: true },
      expect.any(Function),
    );
  });

  it('checkpoint_degraded arrives as an ordinary stage update the wizard can show', async () => {
    const stages: PrismStageUpdate[] = [];
    emits([
      { type: 'stage', stage: 'checkpoint_degraded', label: 'Progress could not be saved; if this stops, you will restart this step' },
      { type: 'done', result: { runId: 'run-1', resume: {}, atsScore: 80, unresolvedIssues: [] } },
    ]);
    await generateResume({ runId: 'run-1', answers: [] }, (u) => stages.push(u));
    expect(stages).toEqual([{ stage: 'checkpoint_degraded', label: 'Progress could not be saved; if this stops, you will restart this step' }]);
  });

  it('finalize (object form): posts the application link and resolves with the reconciled result', async () => {
    const result = { runId: 'run-1', status: 'completed', applicationId: 'app-1', resumeId: 'resume-9' };
    mockCall.mockResolvedValue(result);
    await expect(finalizeRun({ runId: 'run-1', resumeId: 'resume-9', applicationId: 'app-1' })).resolves.toEqual(result);
    expect(mockCall).toHaveBeenCalledWith('prism-tailor', {
      phase: 'finalize', runId: 'run-1', resumeId: 'resume-9', applicationId: 'app-1',
    });
    mockCall.mockClear();
    await finalizeRun({ runId: 'run-1', resumeId: 'resume-9' });
    expect(mockCall).toHaveBeenCalledWith('prism-tailor', { phase: 'finalize', runId: 'run-1', resumeId: 'resume-9' });
  });
});
