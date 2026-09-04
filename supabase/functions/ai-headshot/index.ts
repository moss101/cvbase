import { z } from 'npm:zod@3.24.1';
import { withAiHandler, estimateTokens } from '../_shared/handler.ts';
import { HttpError } from '../_shared/respond.ts';
import { geminiImage, IMAGE_MODEL } from '../_shared/gemini.ts';
import { base64Schema, CAPS } from '../_shared/body.ts';

const PROMPT =
  "Transform this image into a professional headshot for a resume / LinkedIn profile. " +
  "Do NOT alter the person's facial features — they must remain clearly identifiable. Dress them in " +
  "appropriate high-end business attire, replace the background with a neutral professional one, apply " +
  "subtle natural retouching (no heavy/artificial editing), and add a small, subtle, semi-transparent " +
  '"cvbase" watermark in the bottom-right corner.';

const SIGNED_URL_TTL_SEC = 3600;
/** Raw JSON body cap: 8 MB of image is ~10.7 MB of base64 plus envelope. */
const MAX_BODY_BYTES = 12 * 1024 * 1024;

const Body = z.object({
  imageBase64: base64Schema(CAPS.headshotBytes),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']).default('image/png'),
});

// ai-headshot: Elite-only AI headshot. Calls the image model server-side,
// stores the result privately at headshots/{uid}/... and indexes it in the
// `headshots` table. The response keeps `imageBase64`/`path`/`signedUrl`
// (what the client reads today) and adds `url`/`headshotId`/`storagePath`.
Deno.serve(withAiHandler('ai-headshot', {
  schema: Body,
  maxBodyBytes: MAX_BODY_BYTES,
  feature: 'aiHeadshot',
  meter: 'aiActions',
  rateLimit: { perHour: 5 },
  model: IMAGE_MODEL,
  promptVersion: 'v1',
}, async (ctx) => {
  const { imageBase64, mimeType } = ctx.body;
  // The image API reports no token usage; the prompt text is the only estimate we have.
  ctx.addTokens(estimateTokens(PROMPT));
  const outB64 = await geminiImage(PROMPT, imageBase64, mimeType);
  if (!outB64) throw new HttpError(502, 'no_image_generated');

  const bytes = Uint8Array.from(atob(outB64), (c) => c.charCodeAt(0));
  const storagePath = `${ctx.userId}/${Date.now()}.png`;
  const up = await ctx.svc.storage.from('headshots').upload(storagePath, bytes, { contentType: 'image/png', upsert: true });
  if (up.error) throw new HttpError(500, 'storage_failed', { detail: up.error.message });
  const signed = await ctx.svc.storage.from('headshots').createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  const url = signed.data?.signedUrl ?? null;

  // Index row (20260901300000_account_lifecycle.sql). Missing table / RLS
  // hiccup must not fail a headshot the user already paid an action for.
  let headshotId: string | null = null;
  const ins = await ctx.svc.from('headshots').insert({ user_id: ctx.userId, storage_path: storagePath }).select('id').single();
  if (ins.error) ctx.log('warn', { code: 'headshot_index_failed', detail: ins.error.message });
  else headshotId = (ins.data as { id: string } | null)?.id ?? null;

  return { imageBase64: outB64, url, headshotId, storagePath, path: storagePath, signedUrl: url };
}));
