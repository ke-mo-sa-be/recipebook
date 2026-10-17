import { describe, expect, it } from 'vitest';
import { isWebp, stripWebpMetadata, webpHasMetadata } from './webp.ts';

const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
function chunk(id: string, data: number[]) {
  return [...enc(id), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])];
}
function webp(...chunks: number[][]) {
  const body = chunks.flat();
  return new Uint8Array([...enc('RIFF'), ...le32(4 + body.length), ...enc('WEBP'), ...body]);
}

// VP8X with EXIF + XMP flags set, image data, then metadata chunks (odd-sized EXIF to test padding).
const vp8x = chunk('VP8X', [0x08 | 0x04 | 0x10, 0, 0, 0, 1, 0, 0, 1, 0, 0]);
const image = chunk('VP8 ', [1, 2, 3, 4, 5, 6]);
const exif = chunk('EXIF', enc('Exif\0\0GPS-secret'));
const xmp = chunk('XMP ', enc('<x:xmpmeta/>'));

describe('stripWebpMetadata', () => {
  const input = webp(vp8x, image, exif, xmp);

  it('removes EXIF and XMP chunks and keeps the image', () => {
    const out = stripWebpMetadata(input);
    expect(isWebp(out)).toBe(true);
    expect(webpHasMetadata(input)).toBe(true);
    expect(webpHasMetadata(out)).toBe(false);
    expect(String.fromCharCode(...out)).not.toContain('GPS-secret');
    expect(out.length).toBe(12 + vp8x.length + image.length);
  });

  it('fixes the RIFF size and clears the VP8X metadata flags', () => {
    const out = stripWebpMetadata(input);
    const size = out[4]! | (out[5]! << 8) | (out[6]! << 16) | (out[7]! << 24);
    expect(size).toBe(out.length - 8);
    expect(out[20]! & 0x0c).toBe(0); // EXIF and XMP flags off
    expect(out[20]! & 0x10).toBe(0x10); // alpha flag untouched
  });

  it('leaves a clean file unchanged and rejects non-WebP data', () => {
    const clean = webp(image);
    expect(stripWebpMetadata(clean)).toEqual(clean);
    expect(() => stripWebpMetadata(new Uint8Array(enc('not an image file')))).toThrow();
  });
});
