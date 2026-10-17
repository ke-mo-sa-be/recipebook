#!/usr/bin/env node
// Downloads the sticker set listed in scripts/stickers.json (Fluent Emoji 3D, MIT) and writes
// apps/web/public/stickers/<slug>.webp at 192px (crisp at 96px display on 2x screens).
// Usage: pnpm stickers            (only fetches missing files)
//        pnpm stickers --force    (re-fetch everything)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'scripts/stickers.json'), 'utf8'));
const out = join(root, 'apps/web/public/stickers');
const force = process.argv.includes('--force');
const RAW = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main';
mkdirSync(out, { recursive: true });

const SIZE = 192; // output px
const PAD = 14; // transparent margin so the outline is never clipped
const OUTLINE = 4; // white die-cut border width in px

// Bakes a white "die-cut sticker" outline around the art: dilate the alpha channel (blur, then
// threshold), fill that shape white, and lay the original on top. Baked in, so the UI needs only
// a single drop-shadow filter instead of eight stacked ones per image.
async function toSticker(png, target) {
  const inner = SIZE - 2 * PAD;
  const art = await sharp(png)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  // Separate pipelines: sharp applies each operation once per pipeline (a second blur() would win).
  const spread = await sharp(art).extractChannel('alpha').blur(OUTLINE).toBuffer();
  const solid = await sharp(spread).threshold(3).toBuffer();
  const mask = await sharp(solid).blur(0.8).toBuffer(); // soften the edge for antialiasing
  const white = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' } })
    .joinChannel(mask)
    .png()
    .toBuffer();
  await sharp(white)
    .composite([{ input: art }])
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(target);
}

let made = 0;
for (const [slug, name] of Object.entries(manifest.stickers)) {
  const target = join(out, `${slug}.webp`);
  if (!force && existsSync(target)) continue;
  const file = `${name.toLowerCase().replaceAll(' ', '_')}_3d.png`;
  const res = await fetch(`${RAW}/assets/${encodeURIComponent(name)}/3D/${file}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const png = Buffer.from(await res.arrayBuffer());
  await toSticker(png, target);
  made++;
}
const lic = await fetch(`${RAW}/LICENSE`);
writeFileSync(
  join(out, 'LICENSE'),
  `Sticker images: Fluent Emoji by Microsoft (${manifest.source}), converted to WebP.\n\n${await lic.text()}`,
);
console.log(`stickers: ${made} written, ${Object.keys(manifest.stickers).length} total`);
