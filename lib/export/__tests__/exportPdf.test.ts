// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printVectorPdf, renderImagePdfBlob, waitForCaptureReady, CAPTURE_ROOT_ID } from '../exportPdf';

/**
 * `printVectorPdf` drives the real browser print pipeline (a hidden iframe's
 * `contentWindow.print()`), which jsdom does not implement — calling it is a
 * harmless no-op there, never a real dialog, which is exactly what makes
 * jsdom a safer place than a live browser to assert on the markup it builds
 * *before* printing: real resume text, cloned stylesheets, and critically no
 * `<canvas>` or whole-page screenshot `<img>` (i.e. it is not secretly a
 * rasterised capture wearing a print-dialog costume).
 */

/** Waits for the exported iframe's own `print()` to be called (patched to
 *  capture instead of doing anything), independent of `printVectorPdf`'s own
 *  returned promise — that one only resolves on the `afterprint` event or an
 *  8s fallback timeout, neither of which jsdom will ever fire quickly. */
function captureNextPrintedIframe(): Promise<{
    iframe: HTMLIFrameElement;
    bodyHtml: string;
    bodyText: string;
    hasCanvas: boolean;
    imgSrcs: string[];
    stylesheetCount: number;
    titleText: string | null;
}> {
    return new Promise((resolve) => {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                for (const node of Array.from(m.addedNodes)) {
                    if (node instanceof HTMLIFrameElement) {
                        const iframe = node;
                        const win = iframe.contentWindow as (Window & { print: () => void }) | null;
                        if (!win) continue;
                        win.print = () => {
                            const doc = iframe.contentDocument!;
                            observer.disconnect();
                            resolve({
                                iframe,
                                bodyHtml: doc.body.innerHTML,
                                bodyText: doc.body.textContent ?? '',
                                hasCanvas: !!doc.querySelector('canvas'),
                                imgSrcs: Array.from(doc.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? ''),
                                stylesheetCount: doc.querySelectorAll('link[rel="stylesheet"], style').length,
                                titleText: doc.querySelector('title')?.textContent ?? null,
                            });
                        };
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true });
    });
}

const mountCaptureRoot = (): HTMLElement => {
    const root = document.createElement('div');
    root.id = CAPTURE_ROOT_ID;
    root.innerHTML = `
        <div style="width:794px">
            <h1>Jordan Rivera</h1>
            <section data-section="summary"><h2>Professional Summary</h2><p>Built things that shipped.</p></section>
            <section data-section="experience"><h2>Experience</h2><div class="break-inside-avoid"><h3>Acme Corp</h3><p>Did the work.</p></div></section>
        </div>
    `;
    document.body.appendChild(root);
    return root;
};

describe('lib/export/exportPdf', () => {
    beforeEach(() => {
        document.getElementById(CAPTURE_ROOT_ID)?.remove();
        document.querySelectorAll('iframe').forEach((el) => el.remove());
        document.head.querySelectorAll('style[data-test-clone], link[data-test-clone]').forEach((el) => el.remove());
    });

    afterEach(() => {
        document.getElementById(CAPTURE_ROOT_ID)?.remove();
        document.querySelectorAll('iframe').forEach((el) => el.remove());
    });

    describe('printVectorPdf', () => {
        it('throws a clear error when the capture root is not mounted', async () => {
            await expect(printVectorPdf({ filename: 'no-root' })).rejects.toThrow(/not mounted/);
        });

        it('clones the capture markup into a hidden iframe as real text — no canvas, no page-screenshot <img>', async () => {
            mountCaptureRoot();
            const captured = captureNextPrintedIframe();

            void printVectorPdf({ filename: 'Jordan_Rivera_Resume' });
            const result = await captured;

            expect(result.hasCanvas).toBe(false);
            expect(result.imgSrcs).toEqual([]); // no rasterised screenshot of the page
            expect(result.bodyText).toContain('Jordan Rivera');
            expect(result.bodyText).toContain('Professional Summary');
            expect(result.bodyText).toContain('Built things that shipped.');
            expect(result.bodyHtml).toContain('data-section="summary"');
            expect(result.bodyHtml).toContain('data-section="experience"');
            // wrapped in #print-resume-container > #capture-root, matching the
            // existing @media print selectors in styles/index.css
            expect(result.bodyHtml).toContain('id="print-resume-container"');
            expect(result.bodyHtml).toContain(`id="${CAPTURE_ROOT_ID}"`);
        });

        it('seeds the iframe document title from the requested filename', async () => {
            mountCaptureRoot();
            const captured = captureNextPrintedIframe();
            void printVectorPdf({ filename: 'Alex_Chen_Resume_2026' });
            const result = await captured;
            expect(result.titleText).toBe('Alex_Chen_Resume_2026');
        });

        it('clones same-origin stylesheets from the main document head into the iframe', async () => {
            const style = document.createElement('style');
            style.setAttribute('data-test-clone', 'true');
            style.textContent = '[data-section]{break-inside:avoid}';
            document.head.appendChild(style);

            mountCaptureRoot();
            const captured = captureNextPrintedIframe();
            void printVectorPdf({ filename: 'style-clone-test' });
            const result = await captured;

            expect(result.stylesheetCount).toBeGreaterThan(0);
            expect(result.bodyHtml || result.iframe.contentDocument!.head.innerHTML).toBeTruthy();
            expect(result.iframe.contentDocument!.head.innerHTML).toContain('break-inside:avoid');
        });
    });

    describe('waitForCaptureReady', () => {
        it('resolves even when document.fonts is unavailable (jsdom) and never hangs', async () => {
            const root = mountCaptureRoot();
            await expect(waitForCaptureReady(root, 50)).resolves.toBeUndefined();
        });

        it('resolves once every image under root has settled (loaded or errored)', async () => {
            const root = mountCaptureRoot();
            const img = document.createElement('img');
            // No real network in jsdom — dispatch the settle event manually,
            // like a real broken/loaded image would.
            root.appendChild(img);
            const ready = waitForCaptureReady(root, 50);
            queueMicrotask(() => img.dispatchEvent(new Event('error')));
            await expect(ready).resolves.toBeUndefined();
        });
    });

    describe('renderImagePdfBlob', () => {
        it('throws the same clear error when the capture root is not mounted', async () => {
            await expect(renderImagePdfBlob({ quality: 'standard' })).rejects.toThrow(/not mounted/);
        });
    });
});
