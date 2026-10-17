// Shared HTTP helpers for Edge Functions: CORS for the app's own origins, JSON errors with i18n keys.
const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('SITE_URL') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(['http://localhost:5173', 'http://localhost:4173']);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  return {
    'access-control-allow-origin': allowed.includes(origin) ? origin : (allowed[0] ?? ''),
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders(req), 'cache-control': 'no-store' } });
}

/** Errors carry an i18n key, never internal details. */
export function fail(req: Request, status: number, code: string): Response {
  return json(req, { error: { code, message: code } }, status);
}

export function log(fn: string, event: string, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn, event, ...extra }));
}
