#!/usr/bin/env node
// Builds the hi-fi design mockups into one self-contained HTML file (works offline, on a phone, or
// attached to a message): inlines the real generated tokens.css, the sticker images and the fonts.
//   node scripts/build-mockups.mjs [outFile]     default: docs/design/hifi.html (gitignored)
// In the source, write src="stk:tomato" (quoted) for a sticker and <!-- inline:tokens --> for the tokens.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const web = join(root, 'apps/web');
const out = process.argv[2] ?? join(root, 'docs/design/hifi.html');

const b64 = (path) => readFileSync(path).toString('base64');
const fonts = {
  inter: join(web, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  ml: join(
    web,
    'node_modules/@fontsource-variable/noto-sans-malayalam/files/noto-sans-malayalam-malayalam-wght-normal.woff2',
  ),
};
const fontCss = `
@font-face { font-family: 'Inter Variable'; font-weight: 100 900; font-display: swap;
  src: url(data:font/woff2;base64,${b64(fonts.inter)}) format('woff2'); }
@font-face { font-family: 'Noto Sans Malayalam Variable'; font-weight: 100 900; font-display: swap;
  unicode-range: U+0D00-0D7F, U+200C-200D, U+25CC;
  src: url(data:font/woff2;base64,${b64(fonts.ml)}) format('woff2'); }`;

let html = readFileSync(join(root, 'docs/design/hifi.src.html'), 'utf8');
const tokens = readFileSync(join(web, 'src/theme/tokens.css'), 'utf8');
html = html.replace('<!-- inline:tokens -->', `<style>${fontCss}\n${tokens}</style>`);

const used = new Set();
html = html.replace(/"stk:([a-z0-9-]+)"/g, (_, slug) => {
  used.add(slug);
  return `"#stk-${slug}"`;
});
// Substitute each sticker reference with its data URI (files are ~4 KB each, so repeats are cheap).
for (const slug of used) {
  const uri = `data:image/webp;base64,${b64(join(web, 'public/stickers', `${slug}.webp`))}`;
  html = html.replaceAll(`#stk-${slug}`, uri);
}
writeFileSync(out, html);
console.log(`mockups: ${out} (${(html.length / 1024).toFixed(0)} KB, ${used.size} stickers)`);
