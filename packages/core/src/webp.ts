// Removes metadata chunks (EXIF, XMP) from a WebP file without re-encoding. The photo pipeline
// already re-encodes uploads (dropping GPS and camera data), but libvips can leave a small EXIF
// block (orientation, resolution); public images must carry none at all.
// WebP layout: "RIFF" <u32 size> "WEBP", then chunks: <fourCC> <u32 size> <data, padded to even>.

const DROP = new Set(['EXIF', 'XMP ']);
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

const fourCC = (b: Uint8Array, at: number) => String.fromCharCode(b[at]!, b[at + 1]!, b[at + 2]!, b[at + 3]!);
const u32 = (b: Uint8Array, at: number) =>
  (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;

export function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && fourCC(bytes, 0) === 'RIFF' && fourCC(bytes, 8) === 'WEBP';
}

export function stripWebpMetadata(bytes: Uint8Array): Uint8Array {
  if (!isWebp(bytes)) throw new Error('not a WebP file');
  const kept: Uint8Array[] = [];
  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = fourCC(bytes, at);
    const size = u32(bytes, at + 4);
    const end = at + 8 + size + (size % 2);
    if (end > bytes.length) throw new Error('truncated WebP chunk');
    if (!DROP.has(id)) {
      const chunk = bytes.slice(at, end);
      if (id === 'VP8X') chunk[8] = chunk[8]! & ~(VP8X_EXIF_FLAG | VP8X_XMP_FLAG);
      kept.push(chunk);
    }
    at = end;
  }
  const bodyLength = kept.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(12 + bodyLength);
  out.set(bytes.subarray(0, 12));
  const riffSize = 4 + bodyLength; // "WEBP" + chunks
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >>> 8) & 0xff;
  out[6] = (riffSize >>> 16) & 0xff;
  out[7] = (riffSize >>> 24) & 0xff;
  let offset = 12;
  for (const c of kept) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** True if the file still has an EXIF or XMP chunk (used by tests and the pipeline's final check). */
export function webpHasMetadata(bytes: Uint8Array): boolean {
  let at = 12;
  while (at + 8 <= bytes.length) {
    const id = fourCC(bytes, at);
    if (DROP.has(id)) return true;
    const size = u32(bytes, at + 4);
    at += 8 + size + (size % 2);
  }
  return false;
}
