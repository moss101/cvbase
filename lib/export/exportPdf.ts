/**
 * The resume PDF export pipeline.
 *
 * Two independent paths:
 *
 * - `printVectorPdf` (the primary, default path on web): clones the rendered
 *   capture markup plus the app's own compiled stylesheets into a same-origin
 *   hidden iframe, waits for fonts/images to be ready inside it, and calls
 *   the browser's native print-to-PDF via `iframe.contentWindow.print()`. The
 *   resulting PDF has a real text layer (selectable, searchable, small file
 *   size) because nothing was rasterised — it is exactly the same mechanism
 *   as Cmd/Ctrl+P "Save as PDF", just scoped to one hidden document instead
 *   of the whole app.
 *
 * - `renderImagePdfBlob` (the secondary "Image PDF (exact look)" path, and
 *   the *only* path available on native): rasterises the capture element via
 *   html2pdf.js (html2canvas + jsPDF) into a Blob. This is the previous
 *   behaviour, kept for pixel-parity edge cases and because a Capacitor
 *   WebView cannot produce a file from `window.print()` at all.
 *
 * Both operate on an already-mounted `#capture-root` element — the caller
 * (ResumeBuilder) is responsible for mounting the hidden CaptureTemplate
 * before calling either one, and waiting for `document.fonts.ready` plus a
 * couple of animation frames so the mount has actually committed to the DOM.
 */

export const CAPTURE_ROOT_ID = 'capture-root';

/** Resolves once every <img> under `root` has finished loading (or errored),
 *  bounded so a broken/slow image can never hang the export indefinitely. */
async function waitForImages(root: HTMLElement, timeoutMs = 4000): Promise<void> {
    const images = Array.from(root.querySelectorAll('img'));
    if (images.length === 0) return;
    await Promise.race([
        Promise.all(
            images.map((img) => {
                if (img.complete) return Promise.resolve();
                return new Promise<void>((resolve) => {
                    img.addEventListener('load', () => resolve(), { once: true });
                    img.addEventListener('error', () => resolve(), { once: true });
                });
            }),
        ),
        new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
}

/** Fonts + images ready, plus two animation frames so layout has settled
 *  after a mount/style change. Replaces the old arbitrary `setTimeout`s.
 *  Bounded: `document.fonts.ready` is not guaranteed to resolve in every
 *  embedder (some WebViews / automation contexts never settle it), so this
 *  never blocks the export longer than the timeout waiting on it alone. */
export async function waitForCaptureReady(root: HTMLElement, fontsTimeoutMs = 3000): Promise<void> {
    try {
        await Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => setTimeout(resolve, fontsTimeoutMs)),
        ]);
    } catch {
        /* font loading status is unavailable in some embedders — proceed anyway */
    }
    await waitForImages(root);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function getCaptureRoot(captureRootId: string): HTMLElement {
    const el = document.getElementById(captureRootId);
    if (!el) throw new Error(`Capture root #${captureRootId} is not mounted`);
    return el;
}

/** Clones every same-origin stylesheet (<link rel="stylesheet"> and <style>)
 *  from the main document's <head> into `targetHead`, resolving link hrefs to
 *  absolute URLs first so they resolve correctly from inside the iframe. */
function cloneStylesInto(targetHead: HTMLHeadElement): Promise<void>[] {
    const waits: Promise<void>[] = [];
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
        if (node instanceof HTMLLinkElement) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = node.href; // DOM property, already absolute
            waits.push(
                new Promise<void>((resolve) => {
                    link.addEventListener('load', () => resolve(), { once: true });
                    link.addEventListener('error', () => resolve(), { once: true });
                    setTimeout(() => resolve(), 3000); // never block export on a slow stylesheet
                }),
            );
            targetHead.appendChild(link);
        } else if (node instanceof HTMLStyleElement) {
            targetHead.appendChild(node.cloneNode(true));
        }
    });
    return waits;
}

/** Creates a same-origin, off-screen iframe with an empty (about:blank)
 *  document, ready for `contentDocument` manipulation. */
function createHiddenIframe(): Promise<HTMLIFrameElement> {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve(iframe), 3000); // about:blank should load near-instantly; never hang the export on it
        const settle = (fn: () => void) => { clearTimeout(timeout); fn(); };
        iframe.addEventListener('load', () => settle(() => resolve(iframe)), { once: true });
        iframe.addEventListener('error', () => settle(() => reject(new Error('Print iframe failed to load'))), { once: true });
        document.body.appendChild(iframe);
        // about:blank fires 'load' once appended; guard in case it already did.
        if (iframe.contentDocument?.readyState === 'complete') settle(() => resolve(iframe));
    });
}

export interface PrintVectorPdfOptions {
    /** Document title while the iframe prints — most browsers seed the "Save
     *  as PDF" filename from it. */
    filename: string;
    captureRootId?: string;
}

/**
 * The primary web export path: real text-layer PDF via the browser's own
 * print pipeline, scoped to a hidden same-origin iframe so it never touches
 * the visible app chrome. Resolves once the print dialog has been invoked —
 * on browsers that offer "Save as PDF" this is effectively the export; on
 * others it is the closest equivalent available without a native file API.
 */
export async function printVectorPdf({ filename, captureRootId = CAPTURE_ROOT_ID }: PrintVectorPdfOptions): Promise<void> {
    const source = getCaptureRoot(captureRootId);
    await waitForCaptureReady(source);

    const iframe = await createHiddenIframe();
    const idoc = iframe.contentDocument;
    if (!idoc) throw new Error('Print iframe has no document');

    const titleEl = idoc.createElement('title');
    titleEl.textContent = filename;
    idoc.head.appendChild(titleEl);

    const styleWaits = cloneStylesInto(idoc.head);

    const container = idoc.createElement('div');
    container.id = 'print-resume-container';
    const captureClone = source.cloneNode(true) as HTMLElement;
    container.appendChild(captureClone);
    idoc.body.appendChild(container);
    idoc.body.style.margin = '0';
    idoc.body.style.background = '#ffffff';

    await Promise.all(styleWaits);
    await waitForCaptureReady(idoc.body);

    return new Promise<void>((resolve) => {
        const cleanup = () => {
            // A synchronous print() call blocks until the dialog closes on
            // some browsers and returns immediately on others; either way,
            // tear the iframe down shortly after so it doesn't linger.
            setTimeout(() => iframe.remove(), 500);
            resolve();
        };
        const win = iframe.contentWindow;
        if (!win) {
            cleanup();
            return;
        }
        // afterprint fires once the dialog is dismissed (accepted or
        // cancelled) on browsers that support it; a timeout covers the rest.
        win.addEventListener('afterprint', cleanup, { once: true });
        setTimeout(cleanup, 8000);
        win.focus();
        win.print();
    });
}

export type PdfQuality = 'standard' | 'high';

export interface RenderImagePdfOptions {
    quality: PdfQuality;
    captureRootId?: string;
}

/**
 * The secondary "Image PDF (exact look)" path, and the only PDF path
 * available inside a native Capacitor WebView (print-to-PDF cannot produce a
 * file there). Rasterises the capture element via html2pdf.js and returns
 * the resulting PDF as a Blob for the caller to hand to `saveFile`.
 */
export async function renderImagePdfBlob({ quality, captureRootId = CAPTURE_ROOT_ID }: RenderImagePdfOptions): Promise<Blob> {
    const element = getCaptureRoot(captureRootId);
    await waitForCaptureReady(element);

    // html2pdf was previously a `window` global supplied by a cdnjs <script>
    // tag, which made PDF export fail offline — fatal for the packaged mobile
    // apps. It is now a bundled dependency, imported on demand so its
    // html2canvas + jsPDF payload stays out of the initial chunk.
    const mod: any = await import('html2pdf.js');
    const html2pdf = mod?.default ?? mod;

    const opt = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: quality === 'high' ? 2.5 : 1.5,
            useCORS: true,
            letterRendering: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    const blob: Blob = await html2pdf().set(opt).from(element).outputPdf('blob');
    return blob;
}
