#!/usr/bin/env node
// Builds every app icon from one source, apps/web/src/brand/icon-art.svg (the art on a 512 grid,
// kept inside the maskable safe circle):
//   apps/web/public/favicon.svg              rounded square, for browser tabs and the top bar
//   apps/web/public/icons/icon-{192,512}.png rounded square with transparent corners (manifest "any")
//   apps/web/public/icons/maskable-512.png   full-bleed square; Android crops it to its own shape
//   apps/web/public/icons/apple-touch-icon.png  180px full-bleed; iOS rounds the corners itself
//   apps/web/public/icons/badge-96.png       white silhouette for Android's status bar (push)
// Usage: pnpm icons   (outputs are committed; rerun after editing the art)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG = '#151413'; // tokens: light.primary, the near-black of the v2 CTAs
const src = readFileSync(join(root, 'apps/web/src/brand/icon-art.svg'), 'utf8');
const art = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const svg = (rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rx}" fill="${BG}"/>${art}</svg>\n`;

const pub = join(root, 'apps/web/public');
mkdirSync(join(pub, 'icons'), { recursive: true });
writeFileSync(join(pub, 'favicon.svg'), svg(112));

const png = (rx, size, file) =>
  sharp(Buffer.from(svg(rx)), { density: 144 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(pub, 'icons', file));
// Android draws the notification badge from alpha only, so it's the art as a white silhouette.
const badge = async () => {
  const alpha = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${art}</svg>`),
    { density: 144 },
  )
    .resize(96, 96)
    .ensureAlpha()
    .extractChannel('alpha')
    .toBuffer();
  await sharp({ create: { width: 96, height: 96, channels: 3, background: '#ffffff' } })
    .joinChannel(alpha)
    .png({ compressionLevel: 9 })
    .toFile(join(pub, 'icons', 'badge-96.png'));
};
await Promise.all([
  png(112, 192, 'icon-192.png'),
  png(112, 512, 'icon-512.png'),
  png(0, 512, 'maskable-512.png'),
  png(0, 180, 'apple-touch-icon.png'),
  badge(),
]);
console.log('icons: favicon.svg and 5 PNGs written');
