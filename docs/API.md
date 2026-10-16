# API Documentation

Recipebook has no custom API server. "The API" means:

- **PostgREST** for table CRUD, filtered by RLS,
- **Postgres RPCs** for multi-step operations,
- **Edge Functions** for work that needs secrets, outbound calls or binary processing,
- **Storage** for files.

The frontend calls all of these through `supabase-js`, from `features/<name>/api.ts`.

## Conventions

|                |                                                                                                                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL       | The site origin. Traefik routes `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1` and `/functions/v1` to the Supabase gateway (decision D2). Local dev: `http://<host>:54321`.                                                                                                                                   |
| Authentication | `apikey: <publishable key>` on every request, plus `Authorization: Bearer <user JWT>` when signed in. The secret / service-role key is used **only** inside Edge Functions.                                                                                                                                          |
| Authorization  | RLS on every table (see [`DATABASE.md`](DATABASE.md) §5). Edge Functions verify the JWT, then re-check ownership in code before using the service role.                                                                                                                                                              |
| Versioning     | Additive changes only. Breaking changes get a new RPC or function name (`…_v2`), and the old one is removed after the frontend no longer uses it.                                                                                                                                                                    |
| Error format   | PostgREST: `{ code, message, details, hint }`, with SQLSTATE codes. RPCs and triggers raise custom errors as `P0001` with `message` set to an **i18n key** (e.g. `errors.rateLimited`) so the UI can show friendly text in both languages. Edge Functions return `{ error: { code, message } }` with an HTTP status. |
| Pagination     | Keyset (cursor) on `(published_at, id)` or `(created_at, id)`. Never `offset` on feeds.                                                                                                                                                                                                                              |
| Rate limits    | Per IP at Traefik. Per user in Postgres triggers (limits in `DATABASE.md`). Auth endpoints use GoTrue's own limits.                                                                                                                                                                                                  |
| Validation     | Zod schemas from `packages/core` run on the client and in Edge Functions. Postgres CHECK constraints are the final word.                                                                                                                                                                                             |

## Implemented endpoints (M1)

### `GET /rest/v1/profiles`

- **Purpose:** read public profiles.
- **Permission:** anyone (RLS `profiles are public`).
- **Query:** PostgREST filters, e.g. `?handle=eq.amma&select=handle,display_name,avatar_path,bio,district`.
- **Success:** `200` with an array of profiles. Profiles hold no email or private data.
- **Tests:** `10_profiles.test.sql` (anon read).

### `PATCH /rest/v1/profiles?id=eq.<uid>`

- **Purpose:** update your own profile.
- **Permission:** signed in, own row, account active.
- **Body:** any of `handle`, `display_name`, `avatar_path`, `bio`, `district`, `preferred_lang`, `text_size`, `onboarded_at`. Validate with `profileUpdateSchema` from `@recipebook/core`.
- **Errors:**
  - `42501` if the body includes any other column (e.g. `role`) or the caller is anon,
  - `23505` if the handle is taken,
  - `23514` if a value breaks a constraint,
  - **0 rows** (not an error) when the row isn't yours or you're suspended.
- **Idempotency:** idempotent.
- **Tests:** `10_profiles.test.sql`.

### `GET /functions/v1/health`

- **Purpose:** liveness check for monitoring. It also proves Edge Functions can import `@recipebook/core` (decision D6).
- **Permission:** public (`verify_jwt = false`).
- **Success:** `200 {"ok": true, "core": "linked"}`, `cache-control: no-store`.
- **Side effects:** none.

### Auth (GoTrue, standard Supabase endpoints)

- **Sign up:** email + password with `options.data = { display_name, lang }`. A verification email is sent, and you can't sign in until you confirm (`email_not_confirmed`).
- **Google OAuth:** PKCE flow. The redirect allow-list is `SITE_URL/**`.
- **Password reset:** `resetPasswordForEmail`, then `/auth/reset` in the app.
- **Access token claims** added by the hook: `user_role` (`user`, `moderator` or `admin`) and `account_status`. They're for the UI only, because RLS reads the database.

## Planned endpoints

| Endpoint                                                                          | Milestone | Purpose                                                                               |
| --------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `rpc/make_variation(source_id)`                                                   | M4        | Copy a recipe into the caller's drafts, linked to the original                        |
| `rpc/search_recipes(q, category, diet, max_minutes, region, limit, cursor)`       | M3        | Ranked search: FTS + trigram + dictionary                                             |
| `rpc/mod_set_state`, `rpc/mod_suspend`, `rpc/admin_set_role`, `rpc/admin_feature` | M6        | Moderation. Each checks the role and writes to `moderation_actions`.                  |
| `functions/v1/process-image`                                                      | M2        | `incoming/{uid}/…` → cleaned WebP sizes in `public-media`                             |
| `functions/v1/share-page/:id` (public path `/s/:id`)                              | M4        | Open Graph HTML, then a redirect to `/r/:id`                                          |
| `functions/v1/share-card/:id`                                                     | M4        | 1200×630 PNG card (decision D4)                                                       |
| `functions/v1/verify-human`                                                       | M6        | Turnstile token → 30-minute posting pass                                              |
| `functions/v1/delete-account`                                                     | M6        | Delete storage objects, then the auth user (which cascades)                           |
| `functions/v1/media-gc`                                                           | M2        | Nightly job (`pg_cron` + `pg_net`) that removes orphaned media                        |
| `functions/v1/import-recipe`                                                      | M7        | URL → JSON-LD → validated draft. SSRF-guarded: no private IPs, 5 s timeout, 2 MB cap. |

Each planned endpoint gets a full contract here (permission, body, responses, side effects, idempotency, validation, tests) **before** it's implemented.

## Storage (planned, M2)

| Bucket         | Public?         | Who writes                                           | Limits                   | Paths                                                                                                                                                                                   |
| -------------- | --------------- | ---------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incoming`     | private         | authenticated, **own folder only**                   | 8 MB; jpeg/png/webp/heic | `{uid}/{uuid}.{ext}`                                                                                                                                                                    |
| `public-media` | **public read** | **service role only** (the `process-image` function) | 1 MB; **webp only**      | `avatars/{uid}/{uuid}-{400}.webp`<br>`recipes/{uid}/{recipe_id}/{uuid}-{400,800,1600}.webp`<br>`steps/…`<br>`cooked/{uid}/{uuid}-{400,800,1600}.webp`<br>`cards/{recipe_id}-{hash}.png` |

**How a photo gets in:**

1. The phone resizes the photo to at most 1600 px and re-encodes it as WebP in a canvas. This removes all EXIF data, including GPS, and cuts upload size on 4G by roughly 5–10×.
2. The photo uploads to `incoming/{uid}/…`.
3. The client calls `process-image(path, purpose)`. The function:
   - checks that you own the path and are within your upload limit,
   - re-encodes through Storage's imgproxy transform, which strips metadata again in case step 1 failed,
   - writes 3 sizes to `public-media`,
   - deletes the `incoming` file,
   - returns the paths.

Users **cannot** write to the public bucket at all. So everything public has passed through the server pipeline, and there's no way to upload directly and keep GPS data.

Old photos are cleaned up by triggers. Deleting a recipe, a step photo, a cooked post or an avatar adds its paths to `private.media_trash`. A nightly `pg_cron` job then calls `media-gc`, which deletes them through the Storage API. `incoming` files older than 24 hours are removed too.

Draft photos sit at unguessable UUID paths in the public bucket. That's acceptable, and `SECURITY.md` says so. Moderators can hard-delete illegal media.

---
