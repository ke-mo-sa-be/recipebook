import { z } from 'zod';

// Public, browser-safe configuration only. The service-role / secret key must never appear here —
// CI fails if it does (scripts/check-no-secrets.mjs).
const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_SITE_URL: z.url(),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
  // Show "Continue with Google" only once an OAuth client is configured on the server.
  VITE_AUTH_GOOGLE: z.enum(['true', 'false']).default('false'),
});

export const env = envSchema.parse(import.meta.env);
