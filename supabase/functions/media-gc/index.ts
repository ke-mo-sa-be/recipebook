// Nightly clean-up (scheduled in M8; can be called by hand): deletes public images whose rows were
// replaced or deleted, and abandoned uploads left in incoming/ for more than a day.
// Service-role only: the caller must present the service key.
import { createClient } from '@supabase/supabase-js';
import { json, log } from '../_shared/http.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SIZES = [400, 800, 1600];

Deno.serve(async (req) => {
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${SERVICE_KEY}`) {
    return json(req, { error: { code: 'errors.forbidden', message: 'errors.forbidden' } }, 403);
  }
  const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: bases, error: e1 } = await admin.rpc('claim_media_trash', { max_rows: 200 });
  if (e1) return json(req, { error: { code: 'errors.generic', message: e1.message } }, 500);
  const files = (bases as string[]).flatMap((b) => SIZES.map((s) => `${b}-${s}.webp`));
  if (files.length) await admin.storage.from('public-media').remove(files);

  const { data: stale, error: e2 } = await admin.rpc('stale_incoming_objects');
  if (e2) return json(req, { error: { code: 'errors.generic', message: e2.message } }, 500);
  if ((stale as string[]).length) await admin.storage.from('incoming').remove(stale as string[]);

  log('media-gc', 'done', { public: files.length, incoming: (stale as string[]).length });
  return json(req, { removedPublic: files.length, removedIncoming: (stale as string[]).length });
});
