// The photo pipeline (docs/API.md → Storage). A signed-in person uploads a photo to their own
// incoming/<uid>/ folder; this function checks they may attach it, re-encodes it through Storage's
// image transform (imgproxy: resize + WebP, camera/GPS data dropped), strips any remaining WebP
// metadata, writes three sizes to the public bucket, points the row at it (or, for "I cooked this",
// creates the post) and deletes the original.
// Users can never write the public bucket directly.
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { isWebp, stripWebpMetadata, webpHasMetadata } from '@recipebook/core';
import { corsHeaders, fail, json, log } from '../_shared/http.ts';

const SIZES = [400, 800, 1600] as const;
const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const body = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('avatar'), path: z.string().nullable() }),
  z.object({ purpose: z.literal('recipe-cover'), path: z.string().nullable(), recipeId: z.uuid() }),
  z.object({ purpose: z.literal('step'), path: z.string().nullable(), recipeId: z.uuid(), stepId: z.uuid() }),
  // "I cooked this": a new post on someone's published recipe (create_cooked_post checks the rest).
  z.object({
    purpose: z.literal('cooked'),
    path: z.string(),
    recipeId: z.uuid(),
    note: z.string().max(140).optional(),
  }),
]);

/** A refusal from the database that the person should see (its message is an i18n key). */
class Refused extends Error {
  constructor(
    public status: number,
    public key: string,
  ) {
    super(key);
  }
}
type Body = z.infer<typeof body>;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return fail(req, 405, 'errors.generic');

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });
  // Verify the caller with the service client: a client that already carries the user's
  // Authorization header would send it twice from getUser(jwt), which the gateway rejects.
  const { data: who, error: authError } = await admin.auth.getUser(jwt);
  const user = who.user;
  if (!user) {
    log('process-image', 'unauthenticated', { reason: authError?.message ?? 'no user' });
    return fail(req, 401, 'errors.signInRequired');
  }
  // Ownership checks run with the caller's own permissions (RLS), not the service role.
  const asUser = createClient(URL_, ANON_KEY, {
    global: { headers: { authorization: auth } },
    auth: { persistSession: false },
  });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(req, 400, 'errors.generic');
  const input: Body = parsed.data;

  // The photo must be in the caller's own incoming folder.
  if (input.path !== null && (!input.path.startsWith(`${user.id}/`) || input.path.includes('..'))) {
    return fail(req, 403, 'errors.forbidden');
  }

  if (input.purpose === 'recipe-cover' || input.purpose === 'step') {
    const { data: recipe } = await asUser
      .from('recipes')
      .select('id, author_id')
      .eq('id', input.recipeId)
      .maybeSingle();
    if (!recipe || recipe.author_id !== user.id) return fail(req, 403, 'errors.forbidden');
    if (input.purpose === 'step') {
      const { data: step } = await asUser
        .from('recipe_steps')
        .select('id')
        .eq('id', input.stepId)
        .eq('recipe_id', input.recipeId)
        .maybeSingle();
      if (!step) return fail(req, 404, 'errors.notFound');
    }
  }

  const target = async (base: string | null) => {
    if (input.purpose === 'avatar')
      return admin.from('profiles').update({ avatar_path: base }).eq('id', user.id);
    if (input.purpose === 'recipe-cover')
      return admin.from('recipes').update({ cover_path: base }).eq('id', input.recipeId);
    if (input.purpose === 'cooked') {
      const { error } = await admin.rpc('create_cooked_post', {
        author: user.id,
        recipe: input.recipeId,
        photo: base,
        note: input.note ?? null,
      });
      if (error?.message === 'cooked.errors.tooFast') throw new Refused(429, error.message);
      if (error?.code === '42501') throw new Refused(403, 'errors.forbidden');
      return { error };
    }
    return admin.from('recipe_steps').update({ photo_path: base }).eq('id', input.stepId);
  };

  // path: null removes the photo (the old files are queued for clean-up by a DB trigger).
  if (input.path === null) {
    const { error } = await target(null);
    if (error) return fail(req, 500, 'errors.generic');
    return json(req, { path: null });
  }

  const folder =
    input.purpose === 'avatar'
      ? `avatars/${user.id}`
      : input.purpose === 'recipe-cover'
        ? `recipes/${user.id}/${input.recipeId}`
        : input.purpose === 'cooked'
          ? `cooked/${user.id}`
          : `steps/${user.id}/${input.recipeId}`;
  const base = `${folder}/${crypto.randomUUID()}`;
  const written: string[] = [];
  try {
    for (const size of SIZES) {
      const res = await fetch(
        `${URL_}/storage/v1/render/image/authenticated/incoming/${input.path}?width=${size}&height=${size}&resize=contain&quality=80`,
        { headers: { authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, accept: 'image/webp' } },
      );
      if (!res.ok) throw new Error(`render ${size}: HTTP ${res.status}`);
      const raw = new Uint8Array(await res.arrayBuffer());
      if (!isWebp(raw)) throw new Error(`render ${size}: not WebP`);
      const clean = stripWebpMetadata(raw);
      if (webpHasMetadata(clean)) throw new Error('metadata survived');
      const name = `${base}-${size}.webp`;
      const { error } = await admin.storage
        .from('public-media')
        .upload(name, clean, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (error) throw new Error(`upload ${size}: ${error.message}`);
      written.push(name);
    }
    const { error } = await target(base);
    if (error) throw new Error(`update row: ${error.message}`);
  } catch (e) {
    log('process-image', 'failed', {
      user: user.id,
      purpose: input.purpose,
      reason: e instanceof Error ? e.message : String(e),
    });
    if (written.length) await admin.storage.from('public-media').remove(written);
    if (e instanceof Refused) return fail(req, e.status, e.key);
    return fail(req, 422, 'media.errors.processFailed');
  } finally {
    // The original (possibly with GPS data) never lingers.
    await admin.storage.from('incoming').remove([input.path]);
  }
  log('process-image', 'ok', { user: user.id, purpose: input.purpose });
  return json(req, { path: base });
});
