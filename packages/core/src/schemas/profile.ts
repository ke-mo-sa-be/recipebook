import { z } from 'zod';
import { LANGS } from '../lang.ts';
import { DISTRICTS } from '../districts.ts';

// Limits mirror the CHECK constraints on public.profiles — keep them in sync (see docs/DATABASE.md).
export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
export const TEXT_SIZES = ['small', 'normal', 'large', 'xl'] as const;

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(HANDLE_PATTERN, { message: 'profile.errors.handle' });

export const profileUpdateSchema = z.object({
  handle: handleSchema,
  display_name: z.string().trim().min(1, { message: 'profile.errors.nameRequired' }).max(60),
  bio: z.string().trim().max(280).nullable(),
  district: z.enum(DISTRICTS).nullable(),
  preferred_lang: z.enum(LANGS),
  text_size: z.enum(TEXT_SIZES),
});
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
