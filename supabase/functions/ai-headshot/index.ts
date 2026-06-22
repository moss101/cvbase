import { handleOptions } from '../_shared/cors.ts';
import { ok, fail, HttpError } from '../_shared/respond.ts';
import { getUser, serviceClient } from '../_shared/auth.ts';
import { checkAndMeter, requireFeature } from '../_shared/entitlement.ts';
import { logAi } from '../_shared/aiLog.ts';
import { geminiImage } from '../_shared/gemini.ts';

const PROMPT =
  "Transform this image into a professional headshot for a resume / LinkedIn profile. " +
  "Do NOT alter the person's facial features — they must remain clearly identifiable. Dress them in " +
  "appropriate high-end business attire, replace the background with a neutral professional one, apply " +
  "subtle natural retouching (no heavy/artificial editing), and add a small, subtle, semi-transparent " +
  '"cvbase" watermark in the bottom-right corner.';

// ai-headshot: Elite-only AI headshot. Calls the image model server-side and
// stores the result privately to headshots/{uid}/...; returns a signed URL.
Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  let userId: string | null = null;
  try {
    const user = await getUser(req);
    userId = user.id;
    const body = await req.json().catch(() => ({}));
    const imageBase64 = String(body?.imageBase64 ?? '');
    const mimeType = String(body?.mimeType ?? 'image/png');
    if (!imageBase64) throw new HttpError(400, 'missing_image');

    await requireFeature(user.id, 'aiHeadshot'); // Elite only
    await checkAndMeter(user.id, 'aiActions');

    const outB64 = await geminiImage(PROMPT, imageBase64, mimeType);
    if (!outB64) throw new HttpError(502, 'no_image_generated');

    const bytes = Uint8Array.from(atob(outB64), (c) => c.charCodeAt(0));
    const path = `${user.id}/${Date.now()}.png`;
    const svc = serviceClient();
    const up = await svc.storage.from('headshots').upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (up.error) throw new HttpError(500, 'storage_failed', { detail: up.error.message });
    const signed = await svc.storage.from('headshots').createSignedUrl(path, 3600);

    await logAi(user.id, { function: 'ai-headshot', model: 'gemini-2.5-flash-image', status: 'ok' });
    return ok({ path, signedUrl: signed.data?.signedUrl ?? null });
  } catch (err) {
    if (userId) await logAi(userId, { function: 'ai-headshot', model: 'gemini-2.5-flash-image', status: 'error' });
    return fail(err);
  }
});
