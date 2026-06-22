// Browser-only resume file handling. The pure, runtime-neutral parsing lives in
// lib/ats/resumeParse.ts (shared with the ats-analyze Edge Function) and is
// re-exported here so existing client imports of './resumeParser' keep working.
export * from '../lib/ats/resumeParse.ts';

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

export async function extractTextFromFile(file: File): Promise<{ text: string; imageOnly: boolean }> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.txt') || name.endsWith('.md')) {
        return { text: await file.text(), imageOnly: false };
    }

    if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { text: result.value, imageOnly: false };
    }

    if (name.endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        // Run the worker from the bundled module so no CDN fetch is needed.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url,
        ).toString();
        const data = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        let text = '';
        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            let lastY: number | null = null;
            for (const item of content.items as any[]) {
                if (typeof item.str !== 'string') continue;
                const y = item.transform?.[5];
                if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) text += '\n';
                else if (text && !text.endsWith('\n') && !text.endsWith(' ')) text += ' ';
                text += item.str;
                if (y !== undefined) lastY = y;
            }
            text += '\n';
        }
        const imageOnly = text.replace(/\s/g, '').length < 40;
        return { text, imageOnly };
    }

    throw new Error(`Unsupported file type. Please upload ${SUPPORTED_EXTENSIONS.join(', ')} or paste the text.`);
}
