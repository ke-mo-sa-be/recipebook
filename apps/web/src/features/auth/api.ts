import { AuthError } from '@supabase/supabase-js';
import type { Lang } from '@recipebook/core';
import { supabase } from '../../lib/supabaseClient.ts';
import { env } from '../../lib/env.ts';
import { AppError } from '../../lib/appError.ts';
import { forgetThisDevice } from '../push/push.ts';

// GoTrue error codes → i18n keys. Anything unknown becomes a generic message (never raw server text).
const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: 'auth.errors.invalidCredentials',
  email_not_confirmed: 'auth.errors.emailNotConfirmed',
  user_already_exists: 'auth.errors.userExists',
  email_exists: 'auth.errors.userExists',
  weak_password: 'auth.errors.weakPassword',
  over_email_send_rate_limit: 'auth.errors.tooManyEmails',
  over_request_rate_limit: 'auth.errors.tooManyRequests',
  email_address_invalid: 'auth.errors.emailInvalid',
  same_password: 'auth.errors.samePassword',
  validation_failed: 'auth.errors.emailInvalid',
};

function toAppError(error: unknown): AppError {
  if (error instanceof AuthError && error.code && AUTH_ERRORS[error.code]) {
    return new AppError(AUTH_ERRORS[error.code]!, error);
  }
  return new AppError('auth.errors.generic', error);
}

const callbackUrl = (next = '/') => `${env.VITE_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

export async function signUp(input: { email: string; password: string; displayName: string; lang: Lang }) {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { display_name: input.displayName, lang: input.lang },
      emailRedirectTo: callbackUrl('/'),
    },
  });
  if (error) throw toAppError(error);
}

export async function signIn(input: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) throw toAppError(error);
}

export async function signInWithGoogle(next = '/') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(next) },
  });
  if (error) throw toAppError(error);
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: callbackUrl('/') },
  });
  if (error) throw toAppError(error);
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/auth/reset'),
  });
  if (error) throw toAppError(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAppError(error);
}

export async function signOut() {
  await forgetThisDevice(); // the next person on this phone must not get my notifications
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}

/**
 * Finish a redirect from an email link or Google. supabase-js usually exchanges `?code=` by itself
 * (detectSessionInUrl); this waits for that, and reports the cases people actually hit.
 */
export async function completeAuthRedirect(
  params: URLSearchParams,
): Promise<'signed-in' | 'confirmed' | 'failed'> {
  if (params.get('error') || params.get('error_description')) return 'failed';
  const code = params.get('code');
  const { data } = await supabase.auth.getSession();
  if (data.session) return 'signed-in';
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return 'signed-in';
    // The email link was opened in a different browser from the one that signed up, so the PKCE
    // verifier isn't here. GoTrue already confirmed the address before redirecting.
    return 'confirmed';
  }
  return 'failed';
}
