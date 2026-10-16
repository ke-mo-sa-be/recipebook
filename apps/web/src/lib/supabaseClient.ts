import { createClient } from '@supabase/supabase-js';
import { env } from './env.ts';

// Feature code calls Supabase through its own `features/<name>/api.ts`, never from components.
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
