# Self-hosting

> **Status:** stub. The full guide, production compose and backup scripts arrive in **M8**. What's below is the plan everything is being built towards.

## Shape of a deployment

- **Supabase:** the [official self-hosted Docker compose](https://github.com/supabase/supabase/tree/master/docker), pinned to a tested release. Our `deploy/compose/supabase.override.yml` applies a **lite profile**:
  - no pooler, no analytics,
  - Studio and `meta` behind an opt-in `studio` profile,
  - `packages/core` mounted read-only for Edge Functions.

  The target is ≤ 3 GB RAM in total.

- **Frontend:** the static Vite build served by `nginx-unprivileged` (`deploy/compose/docker-compose.yml`), with security headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- **Reverse proxy:** any proxy that can route by path. The examples in `deploy/examples/` use Traefik behind a Cloudflare Tunnel.
  - `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1`, `/functions/v1` → Supabase gateway
  - `/s/*` → gateway, rewritten to `/functions/v1/share-page/*`
  - everything else → frontend
  - **Never route the gateway's `/` (Studio) or `/pg` publicly.**
- **Email:** any SMTP provider, configured through env vars.
- **Backups:** a nightly `pg_dump` plus the storage volume, with retention and a documented, tested restore.

## Running on Supabase Cloud instead

Point `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at your Cloud project, then push the migrations (`supabase db push`) and functions (`supabase functions deploy`).

**Caveat (decision D5):** Storage image transformations need a paid Cloud plan, and photo processing depends on them.

## Upgrades

Upgrades will be documented in M8: bump the pinned image tags, take a backup, apply migrations, check health.
