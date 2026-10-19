// Web push for notifications (docs/API.md → push). Served by index.ts; tested by push_test.ts.
//   GET   the public VAPID key ({ publicKey: null } when the server has no keys), for subscribing.
//   POST  deliver pending notifications. Callers: the service role (fallback cron) or any signed-in
//         person (the app pokes right after a like or comment, so pushes arrive at once). Callers
//         can't choose what is sent: this only delivers notifications the database already created,
//         to their recipients' registered devices.
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders, fail, json, log } from '../_shared/http.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? '';
const configured = Boolean(PUBLIC_KEY && PRIVATE_KEY && SUBJECT);
if (configured) webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

// Same allowlist as the push_subscriptions check: never POST to anything but a real push service.
const PUSH_SERVICE =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)\//;

type Row = {
  id: number;
  kind: 'like' | 'comment';
  lang: 'ml' | 'en';
  actor_name: string;
  recipe_id: string;
  recipe_slug: string;
  title_ml: string | null;
  title_en: string | null;
  comment_body: string | null;
  unread: number;
  subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;
};

const TEXT = {
  en: {
    like: (who: string) => `❤️ ${who} liked your recipe`,
    comment: (who: string, recipe: string) => `💬 ${who} commented on ${recipe}`,
  },
  ml: {
    like: (who: string) => `❤️ ${who} നിങ്ങളുടെ റെസിപ്പി ഇഷ്ടപ്പെട്ടു`,
    comment: (who: string, recipe: string) => `💬 ${who} ${recipe}-ൽ കമന്റ് ചെയ്തു`,
  },
};

/** What the service worker shows: worded in the recipient's language. */
export function payload(n: Row) {
  const lang = n.lang === 'en' ? 'en' : 'ml';
  const recipe = (lang === 'ml' ? n.title_ml || n.title_en : n.title_en || n.title_ml) ?? '';
  const url = `/r/${n.recipe_id}/${n.recipe_slug}${n.kind === 'comment' ? '#comments' : ''}`;
  return {
    title: n.kind === 'like' ? TEXT[lang].like(n.actor_name) : TEXT[lang].comment(n.actor_name, recipe),
    body: n.kind === 'like' ? recipe : (n.comment_body ?? ''),
    url,
    tag: `${n.kind}-${n.recipe_id}`,
    lang,
    unread: Number(n.unread),
  };
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method === 'GET') return json(req, { publicKey: configured ? PUBLIC_KEY : null });
  if (req.method !== 'POST') return fail(req, 405, 'errors.generic');
  if (!configured) return fail(req, 503, 'push.errors.notConfigured');

  const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (jwt !== SERVICE_KEY) {
    const { data } = await admin.auth.getUser(jwt);
    if (!data.user) return fail(req, 401, 'errors.signInRequired');
  }

  const { data, error } = await admin.rpc('claim_push_batch', { max_rows: 50 });
  if (error) {
    log('push', 'claim failed', { reason: error.message });
    return fail(req, 500, 'errors.generic');
  }
  const rows = (data ?? []) as Row[];
  let sent = 0;
  const gone: string[] = [];
  const ok: string[] = [];
  await Promise.all(
    rows.flatMap((n) =>
      n.subscriptions.map(async (s) => {
        if (!PUSH_SERVICE.test(s.endpoint)) return void gone.push(s.id);
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload(n)),
            { TTL: 6 * 3600, urgency: 'normal', topic: `n${n.id}` },
          );
          sent++;
          ok.push(s.id);
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: the browser unsubscribed or the app was uninstalled; forget the device.
          if (status === 404 || status === 410) gone.push(s.id);
          else log('push', 'send failed', { status, reason: e instanceof Error ? e.message : String(e) });
        }
      }),
    ),
  );
  if (gone.length) await admin.from('push_subscriptions').delete().in('id', gone);
  if (ok.length)
    await admin.from('push_subscriptions').update({ last_ok_at: new Date().toISOString() }).in('id', ok);
  log('push', 'done', { notifications: rows.length, sent, removed: gone.length });
  return json(req, { notifications: rows.length, sent, removed: gone.length });
}
