// Liveness check for monitoring (Uptime Kuma) and proof that Edge Functions can import
// @recipebook/core directly from packages/core (decision D6 in docs/ARCHITECTURE.md).
import { DEFAULT_LANG, LANGS, handleSchema } from '@recipebook/core';

Deno.serve(() => {
  const coreOk = handleSchema.safeParse('kerala_cook').success && LANGS.includes(DEFAULT_LANG);
  return Response.json(
    { ok: coreOk, core: coreOk ? 'linked' : 'broken' },
    { headers: { 'cache-control': 'no-store' } },
  );
});
