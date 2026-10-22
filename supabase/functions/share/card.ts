// The 1200×630 share card (decision D4, revised after the M4 spike): text is shaped by HarfBuzz and
// drawn as glyph outlines, so resvg only renders paths. resvg's own text layout misplaced Malayalam
// vowel signs; HarfBuzz output matches Chromium glyph for glyph (docs/ARCHITECTURE.md → D4).
import * as hb from 'harfbuzzjs';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const read = (p: string) => Deno.readFile(new URL(p, import.meta.url));

type Face = { font: hb.Font; upem: number };
let ready: Promise<{ faces: Record<string, Face>; icon: string }> | null = null;

function load() {
  ready ??= (async () => {
    await initWasm(await read('./assets/resvg-2.6.2.wasm'));
    const face = async (file: string): Promise<Face> => {
      const f = new hb.Face(new hb.Blob((await read(`./fonts/${file}`)).buffer));
      return { font: new hb.Font(f), upem: f.upem };
    };
    const [mlR, mlB, laR, laB] = await Promise.all([
      face('NotoSansMalayalam-Regular.ttf'),
      face('NotoSansMalayalam-Bold.ttf'),
      face('Inter-Regular.ttf'),
      face('Inter-Bold.ttf'),
    ]);
    const art = new TextDecoder().decode(await read('./assets/icon-art.svg'));
    const inner = art.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    // The art is drawn for the dark app-icon square (white steam), so it always sits on one.
    const icon = `<rect width="512" height="512" rx="112" fill="#151413"/>${inner}`;
    return { faces: { mlR, mlB, laR, laB }, icon };
  })();
  return ready;
}

const MALAYALAM = /[ഀ-ൿ‌‍]/;
/** Split text into runs that each use one font: Malayalam (with its spaces) or everything else. */
const runs = (text: string) => text.match(/[ഀ-ൿ‌‍]+(?:\s+[ഀ-ൿ‌‍]+)*|[^ഀ-ൿ‌‍]+/g) ?? [];

type Shaped = { width: number; draw: (x: number, y: number) => string };

function shape(faces: Record<string, Face>, text: string, size: number, bold: boolean): Shaped {
  const parts = runs(text).map((p) => {
    const f = MALAYALAM.test(p) ? (bold ? faces.mlB : faces.mlR) : bold ? faces.laB : faces.laR;
    const buf = new hb.Buffer();
    buf.addText(p);
    buf.guessSegmentProperties();
    hb.shape(f!.font, buf);
    const s = size / f!.upem;
    const glyphs = buf.getGlyphInfos().map((g: { codepoint: number }, i: number) => ({
      path: f!.font.glyphToPath(g.codepoint) as string,
      pos: buf.getGlyphPositions()[i] as { xAdvance: number; xOffset: number; yOffset: number },
    }));
    return { s, glyphs, width: glyphs.reduce((w, g) => w + g.pos.xAdvance * s, 0) };
  });
  return {
    width: parts.reduce((w, p) => w + p.width, 0),
    draw: (x0, y) => {
      let x = x0;
      let out = '';
      for (const p of parts) {
        for (const g of p.glyphs) {
          if (g.path) {
            out += `<path transform="translate(${(x + g.pos.xOffset * p.s).toFixed(1)} ${(y - g.pos.yOffset * p.s).toFixed(1)}) scale(${p.s.toFixed(5)} ${(-p.s).toFixed(5)})" d="${g.path}"/>`;
          }
          x += g.pos.xAdvance * p.s;
        }
      }
      return out;
    },
  };
}

/** Greedy word wrap to at most `lines` lines; the last line ends in … if text was cut. */
function wrap(
  faces: Record<string, Face>,
  text: string,
  size: number,
  bold: boolean,
  max: number,
  lines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (shape(faces, next, size, bold).width <= max || !cur) cur = next;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    // Drop whole words first; cut inside a word (by whole grapheme clusters) only if one word is too long.
    let kept = out
      .slice(lines - 1)
      .join(' ')
      .split(' ');
    while (kept.length > 1 && shape(faces, `${kept.join(' ')}…`, size, bold).width > max)
      kept = kept.slice(0, -1);
    let last = kept.join(' ');
    const graphemes = [...new Intl.Segmenter('ml', { granularity: 'grapheme' }).segment(last)].map(
      (g) => g.segment,
    );
    while (graphemes.length > 1 && shape(faces, `${graphemes.join('')}…`, size, bold).width > max)
      graphemes.pop();
    last = graphemes.join('');
    out.splice(lines - 1, out.length, `${last.trimEnd()}…`);
  }
  return out;
}

export type CardData = {
  title: string; // the recipe's own-language title
  subtitle: string | null; // the other-language title
  meta: string; // "45 min · Serves 4"
  author: string; // "by Ammini"
  photo: Uint8Array | null; // JPEG/PNG of the cover, or null for the app icon
};

const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

export async function renderCard(d: CardData): Promise<Uint8Array> {
  const { faces, icon } = await load();
  const X = 560;
  const MAX = 580;
  let y = 170;
  let text = '';
  // Two title lines at most, so the credit always clears the brand line at the bottom.
  for (const line of wrap(faces, d.title, 62, true, MAX, 2)) {
    text += shape(faces, line, 62, true).draw(X, y);
    y += 78;
  }
  if (d.subtitle) {
    const [sub] = wrap(faces, d.subtitle, 34, false, MAX, 1);
    text += `<g fill="#6B6862">${shape(faces, sub!, 34, false).draw(X, y + 4)}</g>`;
    y += 60;
  }
  y += 24;
  text += `<g fill="#151413">${shape(faces, d.meta, 32, true).draw(X, y)}</g>`;
  text += `<g fill="#6B6862">${shape(faces, d.author, 30, false).draw(X, y + 50)}</g>`;
  const brand = `<g transform="translate(${X} 528) scale(0.11)">${icon}</g>${`<g fill="#151413">${shape(faces, 'പാചകം · Paachakam', 32, true).draw(X + 70, 565)}</g>`}`;

  const visual = d.photo
    ? `<g transform="rotate(-4 290 315)">
         <rect x="70" y="95" width="440" height="440" rx="26" fill="#FFFFFF" filter="url(#shadow)"/>
         <clipPath id="clip"><rect x="90" y="115" width="400" height="400" rx="16"/></clipPath>
         <image href="data:image/jpeg;base64,${b64(d.photo)}" x="90" y="115" width="400" height="400" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip)"/>
       </g>`
    : `<g transform="translate(80 105) scale(0.82)">${icon}</g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#151413" flood-opacity="0.18"/></filter></defs>
    <rect width="1200" height="630" fill="#F2F1EF"/>
    ${visual}
    <g fill="#151413">${text}</g>
    ${brand}
  </svg>`;
  return new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
}
