import { supabase } from '../../lib/supabaseClient.ts';
import { env } from '../../lib/env.ts';
import { AppError } from '../../lib/appError.ts';
import { compressImage } from '../../lib/imageCompress.ts';

export type PhotoSize = 400 | 800 | 1600;
export type PhotoTarget =
  | { purpose: 'avatar' }
  | { purpose: 'recipe-cover'; recipeId: string }
  | { purpose: 'step'; recipeId: string; stepId: string };

/** Public URL of a processed photo (stored as a base path; files are <base>-<size>.webp). */
export function photoUrl(base: string, size: PhotoSize = 800): string {
  return `${env.VITE_SUPABASE_URL}/storage/v1/object/public/public-media/${base}-${size}.webp`;
}

export function photoSrcSet(base: string): string {
  return ([400, 800, 1600] as const).map((s) => `${photoUrl(base, s)} ${s}w`).join(', ');
}

/** Phone → private incoming folder → process-image (re-encode, strip metadata, publish). Returns the base path. */
export async function uploadPhoto(file: File, target: PhotoTarget): Promise<string> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) throw new AppError('errors.signInRequired');
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage
    .from('incoming')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (up.error) throw new AppError('media.errors.uploadFailed', up.error);
  const { data, error } = await supabase.functions.invoke<{ path: string }>('process-image', {
    body: { ...target, path },
  });
  if (error || !data?.path) throw new AppError('media.errors.processFailed', error);
  return data.path;
}

export async function removePhoto(target: PhotoTarget): Promise<void> {
  const { error } = await supabase.functions.invoke('process-image', { body: { ...target, path: null } });
  if (error) throw new AppError('errors.generic', error);
}
