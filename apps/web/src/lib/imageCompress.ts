/**
 * Shrinks a photo on the phone before upload: longest side ≤ 1600 px, re-encoded to WebP (JPEG
 * where WebP encoding isn't supported). Re-encoding from pixels also drops EXIF, including GPS.
 * The server re-encodes again, so if this fails (e.g. HEIC on Android) the original is uploaded.
 */
export async function compressImage(file: Blob, maxSide = 1600): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode('image/webp');
  if (webp && webp.type === 'image/webp') return webp;
  return (await encode('image/jpeg')) ?? file;
}
