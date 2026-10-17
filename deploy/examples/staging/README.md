# Staging on a Supabase CLI stack

A cheap staging setup for phone testing: the local CLI stack (`pnpm db:start`) plus one nginx container
that serves the built app and proxies the API paths over Docker's network.

1. Copy this folder to `deploy/local/staging/` (gitignored). In `nginx.conf`, replace `SUPABASE_GATEWAY`
   with the CLI gateway container name (`supabase_kong_<project_id>`). In `docker-compose.yml`, set the
   hostname and auth middleware.
2. In `supabase/.env`: `SITE_URL=https://<staging host>` and `AUTH_EXTERNAL_URL=https://<staging host>/auth/v1`,
   then `pnpm db:stop && pnpm db:start`.
3. Build: `VITE_SUPABASE_URL=https://<staging host> VITE_SITE_URL=https://<staging host> VITE_SUPABASE_PUBLISHABLE_KEY=<from supabase status> pnpm --filter @recipebook/web exec vite build --outDir ../../deploy/local/staging/site --emptyOutDir`
4. `docker compose up -d` in `deploy/local/staging/`.

After a host reboot, run `pnpm db:start` again: Docker restarts most CLI containers, but the Edge Functions
runtime needs the CLI. The staging nginx keeps running and shows errors for API calls until then.
