// Share links (docs/API.md → share). Served at the public path /s/* (the proxy rewrites it here):
//   /s/:id           Open Graph page for WhatsApp and other link previews, then a redirect to the recipe
//   /s/:id/card.png  the 1200×630 card image those previews show
// Public and read-only: only published, visible recipes; anything else is a plain "not found".
import { createClient } from '@supabase/supabase-js';
import { renderCard } from './card.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Row = {
  id: string;
  slug: string;
  title_ml: string | null;
  title_en: string | null;
  description: string | null;
  content_lang: 'ml' | 'en';
  total_minutes: number;
  servings: number | null;
  cover_path: string | null;
  updated_at: string;
  author: { display_name: string } | null;
};

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Title, other-language title and the meta/credit lines, in the recipe's own language. */
export function words(r: Row) {
  const ml = r.content_lang === 'ml';
  const title = (ml ? r.title_ml || r.title_en : r.title_en || r.title_ml) ?? '';
  const other = ml ? r.title_en : r.title_ml;
  const meta = [
    r.total_minutes > 0 ? (ml ? `${r.total_minutes} മിനിറ്റ്` : `${r.total_minutes} min`) : null,
    r.servings ? (ml ? `${r.servings} പേർക്ക്` : `Serves ${r.servings}`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const author = r.author
    ? ml
      ? `${r.author.display_name} പങ്കുവെച്ചത്`
      : `by ${r.author.display_name}`
    : '';
  return { title, subtitle: other && other !== title ? other : null, meta, author };
}

async function recipe(id: string): Promise<Row | null> {
  const admin = createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } });
  const { data } = await admin
    .from('recipes')
    .select(
      'id, slug, title_ml, title_en, description, content_lang, total_minutes, servings, cover_path, updated_at, author:profiles!recipes_author_id_fkey(display_name)',
    )
    .eq('id', id)
    .eq('status', 'published')
    .eq('mod_state', 'visible')
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/** The cover as JPEG (resvg can't read WebP), cropped square by the image transformer. */
async function coverJpeg(cover: string | null): Promise<Uint8Array | null> {
  if (!cover) return null;
  const res = await fetch(
    `${URL_}/storage/v1/render/image/public/public-media/${cover}-800.webp?width=440&height=440&resize=cover&quality=82`,
    { headers: { accept: 'image/jpeg' } },
  );
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('jpeg')) return null;
  return new Uint8Array(await res.arrayBuffer());
}

function notFound() {
  return new Response('<!doctype html><meta charset="utf-8"><title>Paachakam</title><p>Not found.</p>', {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(null, { status: 405 });
  // …/share/<id> or …/share/<id>/card.png, whatever prefix the proxy leaves in front.
  const m = /\/share\/([^/]+)(\/card\.png)?\/?$/.exec(new URL(req.url).pathname);
  if (!m || !UUID.test(m[1]!)) return notFound();
  const r = await recipe(m[1]!);
  if (!r) return notFound();
  const w = words(r);
  const version = Date.parse(r.updated_at) || 0;

  if (m[2]) {
    try {
      const png = await renderCard({ ...w, photo: await coverJpeg(r.cover_path) });
      return new Response(png, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
      });
    } catch (e) {
      console.log(JSON.stringify({ fn: 'share', event: 'card failed', reason: String(e) }));
      // Previews still get the cover (ARCHITECTURE: share card render fails).
      if (r.cover_path)
        return Response.redirect(
          `${SITE}/storage/v1/object/public/public-media/${r.cover_path}-800.webp`,
          302,
        );
      return new Response(null, { status: 503 });
    }
  }

  const page = `${SITE}/r/${r.id}/${r.slug}`;
  const image = `${SITE}/s/${r.id}/card.png?v=${version}`;
  const title = w.subtitle ? `${w.title} · ${w.subtitle}` : w.title;
  const description = [w.meta, w.author, r.description].filter(Boolean).join(' · ');
  const e = escapeHtml;
  const html = `<!doctype html>
<html lang="${r.content_lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} · Paachakam</title>
<meta name="description" content="${e(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Paachakam · പാചകം">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(page)}">
<meta property="og:image" content="${e(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${e(title)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${e(page)}">
<meta http-equiv="refresh" content="0; url=${e(page)}">
</head>
<body><p><a href="${e(page)}">${e(title)}</a></p></body>
</html>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
