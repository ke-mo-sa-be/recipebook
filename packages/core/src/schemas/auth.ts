import { z } from 'zod';

// Messages are i18n keys; the web app translates them.
// Trim first: phone keyboards often add a trailing space after autocomplete.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'auth.errors.emailInvalid' }));
// 8 matches GoTrue's minimum_password_length; 72 is bcrypt's input limit.
export const passwordSchema = z
  .string()
  .min(8, { message: 'auth.errors.passwordShort' })
  .max(72, { message: 'auth.errors.passwordLong' });

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, { message: 'profile.errors.nameRequired' }).max(60),
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'auth.errors.passwordRequired' }),
});

/** Only same-site paths are allowed as post-login destinations (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
