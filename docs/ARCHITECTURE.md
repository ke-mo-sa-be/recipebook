# Architecture

## 1. System overview

Paachakam is a static React PWA talking to a **self-hosted Supabase** stack: Postgres, Auth (GoTrue), PostgREST, Storage with imgproxy, Realtime and Edge Functions behind the Supabase API gateway. There is **no custom API server**:

- **Row-level security** in Postgres enforces business rules and permissions.
- **RPC functions** cover multi-step operations: search, make-variation, moderation.
- **Edge Functions** handle anything that needs a secret, an outbound call, or image or binary work.

The same frontend build runs against Supabase Cloud by changing env vars only. See D5 for the one caveat.

## 2. Architecture pattern

**Pattern:** a modular monolith on a backend-as-a-service.

**Why:** one person runs this on one home server. Supabase gives auth, an API, storage and realtime with no bespoke backend to secure and maintain. Postgres RLS keeps authorization next to the data.

## 3. Technology stack

| Layer          | Choice                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | React 19, Vite 8, TypeScript 6 (strict), Tailwind CSS 4, React Router 8, TanStack Query 5, react-i18next. PWA via vite-plugin-pwa (M7). |
| Shared logic   | `packages/core`: pure TypeScript and Zod, imported by the web app and by Edge Functions (Deno)                                          |
| Backend        | Self-hosted Supabase (upstream Docker compose, pinned), Edge Functions on Deno 2 (edge-runtime)                                         |
| Database       | Postgres 17 with `pg_trgm`, `unaccent`, `pg_cron`, `pg_net`                                                                             |
| Auth           | Supabase Auth: email + password with verification, plus Google OAuth. A custom access-token hook adds role claims.                      |
| Storage        | Supabase Storage (file backend) with imgproxy for re-encoding                                                                           |
| Hosting        | A Docker host behind Traefik and a Cloudflare Tunnel. The frontend is served as static files by nginx-unprivileged.                     |
| Email          | SMTP through env vars (any free-tier transactional provider). In dev, the bundled Mailpit test inbox.                                   |
| Bot protection | Cloudflare Turnstile (native GoTrue captcha for sign-up, plus a posting pass)                                                           |
| Analytics      | None. Only server-side, privacy-preserving counts.                                                                                      |
| AI (v1.5)      | A provider-agnostic interface in `packages/core/src/ai`. Local default: Whisper, Ollama, Tesseract.                                     |

Exact versions are pinned in each `package.json`. Container images are pinned in `deploy/compose/`.

## 4. System components

### Frontend (`apps/web`)

- Routes, screens, components and the design system.
- Client-side validation with the shared Zod schemas.
- Offline cache: TanStack Query persistence plus the service worker (M7).
- Client-side photo resize and WebP re-encode before upload, which drops EXIF.

### Backend (Supabase)

- Auth, sessions and email verification.
- PostgREST CRUD, with every row filtered by RLS.
- RPCs: `search_recipes`, `make_variation` and the moderation actions (M2–M6).
- Edge Functions:
  - `process-image`, `share` (link preview page and card image), `push`, `media-gc`, `import-recipe`,
  - `verify-human`, `delete-account`, `media-gc`,
  - `health`.

### Database

- The source of truth for data and permissions. See [`DATABASE.md`](DATABASE.md).
- Triggers keep counters, search documents and timestamps up to date.
- `pg_cron` runs nightly maintenance jobs.

## 5. Architecture diagram

```
Phone/Browser
   │  HTTPS (one origin)
Cloudflare Tunnel ─► Traefik ─┬─ /auth/v1 /rest/v1 /storage/v1 /realtime/v1 /functions/v1 ─► Supabase gateway ─► GoTrue · PostgREST · Storage(+imgproxy) · Realtime · Edge Functions ─► Postgres
                              ├─ /s/*  (rewrite → /functions/v1/share/*) ─► gateway
                              └─ everything else ─► nginx (static SPA)
Supabase Studio: LAN / SSH tunnel only — never routed by Traefik.
```

## 6. Data flow (example: publish a recipe)

1. The wizard validates each step with `packages/core` schemas and autosaves the draft (`update recipes … status = 'draft'`).
2. Photos are resized and re-encoded on the phone, uploaded to `incoming/{uid}/…`, then `process-image` writes the cleaned sizes to `public-media`.
3. On Publish, the client gets a Turnstile posting pass (`verify-human`), then sets `status = 'published'`.
4. RLS checks that you own the recipe and your account is active. Triggers check the posting pass and rate limit, and the publishable constraint checks the required fields.
5. Triggers refresh the search document. The response returns, and TanStack Query invalidates the feed and the profile.

## 7. Project structure

```
apps/web/            React PWA (features/<domain>/{components,hooks,api.ts,routes.tsx})
packages/core/       shared pure TS: schemas, measures, scaler, timers, manglish, schema.org
supabase/            config.toml, migrations/, seed/, functions/, tests/ (pgTAP)
deploy/              compose/, examples/ (Traefik, cloudflared), scripts/ (backup, promote-admin), local/ (gitignored)
docs/                blueprint docs + wireframes
scripts/             repo tooling (tokens, secret scan)
```

## 8. Dependency rules

- UI components never import `supabaseClient`. Only `features/*/api.ts` and `lib/*` may.
- `packages/core` imports only `zod`. It must not import from `apps/` or use DOM or Node APIs. Relative imports end in `.ts`, so Deno can load the source unbundled.
- There is no service-role / secret key anywhere under `apps/`. `scripts/check-no-secrets.mjs` enforces this in CI.
- Authorization lives in Postgres (RLS and grants), never only in the client. Client checks are for UX.
- Edge Functions verify the caller's JWT and re-check ownership before using the service role.
- Server-specific configuration lives in `deploy/local/` (gitignored), never in committed files.

## 9. Key technical decisions

Each of these was approved on 2026-10-16.

| #   | Decision                                                                                                                                                                                | Context                                                                          | Alternatives                                                | Reason                                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Use **whatever gateway the upstream self-host compose ships** (Envoy as of Sept 2026), unmodified. Rate limits go in Traefik (per IP, from `CF-Connecting-IP`) and Postgres (per user). | Upstream replaced Kong with Envoy.                                               | Pin the old Kong setup; add Envoy rate-limit filters        | Upgrades stay a version bump, with no forked gateway config.                                                                                                                                                                                        |
| D2  | **Single origin, path-routed.** Traefik forwards only the API prefixes to the gateway.                                                                                                  | Upstream serves Studio on `/` of the gateway, behind basic auth only.            | Separate API host, or expose the whole gateway              | Studio can't leak. No CORS. Simpler CSP. Free Cloudflare certificates only cover one subdomain level anyway.                                                                                                                                        |
| D3  | **Lite profile:** no `supavisor`, analytics off, Studio and `meta` on an opt-in profile.                                                                                                | RAM budget ≤ 3 GB on a shared home server                                        | Run the full stack                                          | Measured in M8.                                                                                                                                                                                                                                     |
| D4  | **Share card = text shaped by HarfBuzz (`harfbuzzjs` wasm) into glyph outlines, drawn by resvg (wasm). Fonts: Noto Sans Malayalam + Inter TTF.**                                        | Satori and resvg's own text layout can't be trusted with Malayalam.              | Satori; resvg text alone; a Chromium sidecar (about 300 MB) | **Spike 2026-10-22:** resvg 2.6.2 alone misplaced Malayalam vowel signs (കുടംപുളി, സ്വന്തം ചക്ക് garbled). HarfBuzz-shaped paths matched Chromium glyph for glyph, so no sidecar is needed. Renders in about 1.5 s; Cloudflare caches it for a day. |
| D5  | **Image pipeline uses Storage's imgproxy transform.**                                                                                                                                   | Self-hosted includes it. Supabase Cloud has it on paid plans only.               | Wasm encoder in the function                                | Fast and already in the stack. A wasm fallback is in the roadmap for Cloud free tier.                                                                                                                                                               |
| D6  | **`packages/core` is imported directly by Edge Functions** through each function's `deno.json` import map.                                                                              | Share schemas without duplication                                                | A copied `_shared/core` with a CI diff                      | **Verified 2026-10-16** on the Supabase CLI stack (`functions/health`). The self-host compose mounts `packages/core` read-only (checked in M8).                                                                                                     |
| D7  | Node 24 LTS, pnpm 11, TypeScript 6.0                                                                                                                                                    | typescript-eslint 8.71 supports TypeScript < 6.1                                 | TypeScript 7 (native)                                       | Move to TypeScript 7 when typescript-eslint supports it.                                                                                                                                                                                            |
| D8  | **Malayalam is the default UI language.** We don't auto-detect the browser language.                                                                                                    | Most phones in Kerala are set to English even when the person prefers Malayalam. | Follow `navigator.language`                                 | Brief: Malayalam-first. A first-visit chooser and Settings let people switch with one tap.                                                                                                                                                          |
| D9  | **Explicit grants** (`auto_expose_new_tables = false`)                                                                                                                                  | Supabase defaults to granting the API roles everything in `public`.              | Rely on RLS alone                                           | Two layers: a table nobody granted can't leak, even if RLS is misconfigured.                                                                                                                                                                        |

## 10. Performance considerations

- Initial JS ≤ 170 KB gzipped. Routes are code-split. Lighthouse mobile ≥ 90 on Home, Recipe and Search (checked in M7).
- Images: WebP at 400/800/1600 with `srcset`, lazy-loaded, with a dominant-colour placeholder. Cloudflare caches `public-media`.
- Fonts: self-hosted variable `woff2` split by `unicode-range`, so Malayalam glyphs only download when needed.
- Counters are denormalised on `recipes`. Feeds use keyset pagination and partial indexes. Search p95 < 200 ms on about 1,200 recipes.

## 11. Scalability considerations

- One Postgres instance is enough for many thousands of recipes. "Popular this week" starts as a view and becomes a materialised view refreshed by `pg_cron` if it gets slow.
- Storage is a file backend on a local volume, backed up nightly. It can move to S3-compatible storage through Storage env vars.

## 12. Failure scenarios

| Failure                       | Expected behaviour                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Database unavailable          | The frontend shell still loads from cache. Lists show a friendly error with Try again. Saved recipes and cooking mode keep working offline (M7). Uptime Kuma alerts the admin. |
| API timeout                   | TanStack Query retries reads twice with backoff. Writes are never retried automatically: the user sees "Couldn't save, try again", and drafts are also kept locally.           |
| Image processing fails        | The upload stays in `incoming` and is retried once. The user can continue without a photo. `media-gc` removes orphans after 24 hours.                                          |
| SMTP down                     | Sign-up shows "We couldn't send the email; try again in a few minutes". Google sign-in still works.                                                                            |
| Turnstile unreachable         | Posting asks you to try again. Reading is unaffected. Sign-up is blocked (fail closed).                                                                                        |
| Auth fails or session expires | Silent refresh. If that fails, you're sent to sign-in and your draft is preserved.                                                                                             |
| Share card render fails       | `share` redirects the card URL to the recipe cover photo (or answers 503), so previews still show something.                                                                   |
