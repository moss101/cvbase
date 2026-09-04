// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const isNativePlatform = vi.fn();
const writeFile = vi.fn();
const share = vi.fn();
const toastEmit = vi.fn();
const captureException = vi.fn();

vi.mock('@capacitor/core', () => ({
    Capacitor: { isNativePlatform: () => isNativePlatform() },
}));
vi.mock('@capacitor/filesystem', () => ({
    Filesystem: { writeFile: (...args: unknown[]) => writeFile(...args) },
    Directory: { Cache: 'CACHE', Documents: 'DOCUMENTS' },
}));
vi.mock('@capacitor/share', () => ({
    Share: { share: (...args: unknown[]) => share(...args) },
}));
vi.mock('../../../components/common/Toast', () => ({
    toastBus: { emit: (...args: unknown[]) => toastEmit(...args) },
}));
vi.mock('../../monitoring', () => ({
    captureException: (...args: unknown[]) => captureException(...args),
}));

// Imported after the mocks above so saveFile.ts picks up the mocked modules.
const { saveFile, blobToBase64 } = await import('../saveFile');

const blob = new Blob(['hello world'], { type: 'application/pdf' });

describe('lib/export/saveFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('blobToBase64 strips the data: URL prefix', async () => {
        const b64 = await blobToBase64(new Blob(['hi'], { type: 'text/plain' }));
        expect(b64).not.toMatch(/^data:/);
        expect(typeof b64).toBe('string');
        expect(b64.length).toBeGreaterThan(0);
    });

    describe('on the web (Capacitor.isNativePlatform() === false)', () => {
        beforeEach(() => isNativePlatform.mockReturnValue(false));

        it('triggers an anchor download and resolves "downloaded"', async () => {
            const clickSpy = vi.fn();
            const appendSpy = vi.spyOn(document.body, 'appendChild');
            const createObjectURL = vi.fn(() => 'blob:mock-url');
            const revokeObjectURL = vi.fn();
            (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
            (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;

            const realCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
                const el = realCreateElement(tag);
                if (tag === 'a') vi.spyOn(el, 'click').mockImplementation(clickSpy);
                return el;
            });

            const result = await saveFile({ blob, filename: 'resume.pdf', mimeType: 'application/pdf' });

            expect(result).toBe('downloaded');
            expect(createObjectURL).toHaveBeenCalledWith(blob);
            expect(clickSpy).toHaveBeenCalledTimes(1);
            expect(appendSpy).toHaveBeenCalled();
            expect(writeFile).not.toHaveBeenCalled();
            expect(share).not.toHaveBeenCalled();
        });
    });

    describe('on native (Capacitor.isNativePlatform() === true)', () => {
        beforeEach(() => isNativePlatform.mockReturnValue(true));

        it('writes to the Cache directory and shares via the system share sheet', async () => {
            writeFile.mockResolvedValueOnce({ uri: 'file:///cache/resume.pdf' });
            share.mockResolvedValueOnce(undefined);

            const result = await saveFile({ blob, filename: 'resume.pdf', mimeType: 'application/pdf' });

            expect(result).toBe('shared');
            expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'resume.pdf', directory: 'CACHE' }));
            expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///cache/resume.pdf' }));
            expect(toastEmit).not.toHaveBeenCalled();
        });

        it('falls back to Documents + a toast when the share sheet fails', async () => {
            writeFile.mockResolvedValueOnce({ uri: 'file:///cache/resume.pdf' }); // cache write ok
            share.mockRejectedValueOnce(new Error('no share target'));
            writeFile.mockResolvedValueOnce({ uri: 'file:///documents/resume.pdf' }); // documents fallback

            const result = await saveFile({ blob, filename: 'resume.pdf', mimeType: 'application/pdf' });

            expect(result).toBe('saved');
            expect(writeFile).toHaveBeenNthCalledWith(2, expect.objectContaining({ path: 'resume.pdf', directory: 'DOCUMENTS' }));
            expect(toastEmit).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('Documents') }));
            expect(captureException).toHaveBeenCalled();
        });

        it('falls back to Documents + a toast when even the Cache write fails', async () => {
            writeFile.mockRejectedValueOnce(new Error('disk full'));
            writeFile.mockResolvedValueOnce({ uri: 'file:///documents/resume.pdf' });

            const result = await saveFile({ blob, filename: 'resume.pdf', mimeType: 'application/pdf' });

            expect(result).toBe('saved');
            expect(share).not.toHaveBeenCalled();
            expect(toastEmit).toHaveBeenCalled();
        });

        it('propagates an error when both the Cache and Documents writes fail', async () => {
            writeFile.mockRejectedValueOnce(new Error('disk full'));
            writeFile.mockRejectedValueOnce(new Error('still full'));

            await expect(saveFile({ blob, filename: 'resume.pdf', mimeType: 'application/pdf' })).rejects.toThrow('still full');
        });
    });
});
