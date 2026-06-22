import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser } from '../_shared/auth.ts';
import { checkAndMeter } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { geminiFromFile } from '../_shared/gemini.ts';
import { sanitizeText } from '../_shared/sanitize.ts';

const EXTRACT_PROMPT =
  'Act as an expert ATS scanner and resume text extractor. Extract ALL text content from this PDF ' +
  '(contact info, professional summary, work experience with companies/titles/dates/bullets, projects, ' +
  'education, and skills). Return ONLY the raw extracted text — no preamble or formatting notes.';

// ai-parse-pdf: server-side text extraction for image-only PDFs (the client
// parses normal PDFs locally). Holds the Gemini key; metered as an AI action.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const body = await req.json().catch(() => ({}));
    const base64Data = String(body?.base64Data ?? '');
    if (!base64Data) throw new HttpError(400, 'missing_pdf');

    await checkAndMeter(user.id, 'aiActions');

    const text = sanitizeText(await geminiFromFile(base64Data, 'application/pdf', EXTRACT_PROMPT));
    await logAi(user.id, { function: 'ai-parse-pdf', model: 'gemini-2.5-flash', status: 'ok' });
    return ok({ text });
  } catch (err) {
    if (userId) await logAi(userId, { function: 'ai-parse-pdf', model: 'gemini-2.5-flash', status: 'error' });
    return fail(err);
  }
});
