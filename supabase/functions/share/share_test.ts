// deno test --allow-read --allow-write --allow-env --allow-net --config supabase/functions/share/deno.json supabase/functions/share/
import { assert, assertEquals } from 'jsr:@std/assert@1.0.13';
import { renderCard } from './card.ts';
import { escapeHtml, words } from './handler.ts';

const base = {
  id: 'r1',
  slug: 'kerala-fish-curry',
  title_ml: 'മീൻ കറി',
  title_en: 'Kerala Fish Curry',
  description: 'കുടംപുളിയിട്ട് വെച്ച എരിവുള്ള നാടൻ മീൻ കറി.',
  content_lang: 'ml' as const,
  total_minutes: 45,
  servings: 4,
  cover_path: null,
  updated_at: '2026-10-22T10:00:00Z',
  author: { display_name: 'Ammini' },
};

Deno.test('card words follow the recipe language', () => {
  assertEquals(words(base), {
    title: 'മീൻ കറി',
    subtitle: 'Kerala Fish Curry',
    meta: '45 മിനിറ്റ് · 4 പേർക്ക്',
    author: 'Ammini പങ്കുവെച്ചത്',
  });
  const en = words({ ...base, content_lang: 'en', title_ml: null, servings: null, total_minutes: 0 });
  assertEquals(en, { title: 'Kerala Fish Curry', subtitle: null, meta: '', author: 'by Ammini' });
});

Deno.test('HTML is escaped', () => {
  assertEquals(
    escapeHtml(`<b>"Tom" & 'Jerry'</b>`),
    '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
  );
});

Deno.test('renders a 1200×630 PNG with and without a photo, long titles wrapped', async () => {
  const w = words({
    ...base,
    title_ml: 'കുടംപുളിയിട്ട് വെച്ച എരിവുള്ള നാടൻ മീൻ കറി, അമ്മയുടെ രീതിയിൽ ചട്ടിയിൽ',
  });
  const photo = await Deno.readFile(new URL('../../../e2e/fixtures/photo-with-gps.jpg', import.meta.url));
  for (const [name, p] of [
    ['no-photo', null],
    ['photo', photo],
  ] as const) {
    const png = await renderCard({ ...w, photo: p });
    assertEquals([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG');
    const view = new DataView(png.buffer, png.byteOffset);
    assertEquals([view.getUint32(16), view.getUint32(20)], [1200, 630]);
    assert(png.length > 20_000, 'has real content');
    const out = Deno.env.get('CARD_OUT');
    if (out) await Deno.writeFile(`${out}/card-${name}.png`, png);
  }
});
