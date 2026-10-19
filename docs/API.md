# API Documentation

Paachakam has no custom API server. "The API" means:

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

## Implemented endpoints (M2)

### Recipes: `GET/POST/PATCH/DELETE /rest/v1/recipes`

- **Read:** anyone can read `published` recipes. Drafts are visible only to their author, moderators and admins (RLS, `private.can_read_recipe`). The same rule covers `recipe_ingredients`, `recipe_steps` and `recipe_tags`.
- **Create:** a signed-in, active user inserts `{ author_id: auth.uid(), title_ml?, title_en?, content_lang }`. Status always starts as `draft`, and inserting `published` directly is refused (42501).
- **Update:** only the author (while active) can update. `cover_path` is not writable, because only `process-image` sets it. Setting `status = 'published'` runs the publish check, which raises `P0001` with one of these i18n keys: `recipe.errors.titleRequired`, `recipe.errors.basicsRequired` (category, diet, servings), `recipe.errors.ingredientsRequired` or `recipe.errors.stepsRequired`. The check also sets `published_at`.
- **Delete:** the author or an admin can delete. Moderators can't (they hide recipes, from M6). Photos of deleted rows go to `private.media_trash`.
- Lookups (`categories`, `regions`, `tags`, `units`, `ingredients`) are public read. Only admins can write the dictionary.

### `POST /rest/v1/rpc/save_recipe_items`

The wizard's autosave for ingredients and steps, in one transaction.

- **Body:** `{ p_recipe: uuid, p_ingredients: jsonb[], p_steps: jsonb[] }`. Each item may carry its existing `id`. List order becomes `position`.
- **Permission:** `security invoker`, so RLS applies. A caller who isn't the author gets `42501 errors.forbidden`.
- **Behaviour:** upserts by id, so a moved row keeps its id (and so its step photo). Rows not in the list are deleted. Positions are deferred-unique, so reordering never conflicts. The call is idempotent: sending the same lists twice changes nothing.
- **Tests:** `supabase/tests/database/20_recipes.test.sql`.

### `POST /functions/v1/process-image`

Turns an uploaded photo into public, metadata-free WebP and attaches it.

- **Permission:** a signed-in user (`Authorization: Bearer <access token>`). Ownership is checked with the caller's own RLS.
- **Body:** one of
  - `{ purpose: "avatar", path }`,
  - `{ purpose: "recipe-cover", path, recipeId }`,
  - `{ purpose: "step", path, recipeId, stepId }`.

  `path` is the object name inside `incoming/` and must start with `{uid}/`. `path: null` removes the current photo.

- **Responses:**
  - `200 { path: "<base>" }`: the files are `<base>-{400,800,1600}.webp` in `public-media`, and the row (`profiles.avatar_path`, `recipes.cover_path` or `recipe_steps.photo_path`) now points at `<base>`. A removal returns `{ path: null }`.
  - `401 errors.signInRequired`,
  - `403 errors.forbidden`: someone else's folder or recipe,
  - `404 errors.notFound`: the step isn't in that recipe,
  - `400 errors.generic`: an invalid body,
  - `422 media.errors.processFailed`: the render or upload failed. Files written so far are removed.
- **Side effects:** the `incoming` original is always deleted, on success or failure. The replaced photo's files are queued in `private.media_trash` by a trigger.
- **Privacy:** imgproxy re-encodes to WebP with `resize=contain`, then `stripWebpMetadata` (in `@recipebook/core`) drops any EXIF/XMP chunks. The function refuses to write a file that still has metadata. E2E uploads a JPEG with GPS and a camera model, and checks the public file has neither.

### `POST /functions/v1/media-gc`

- **Permission:** service role only (`Authorization: Bearer <service key>`). Anything else gets 403.
- **Behaviour:** claims up to 200 rows from `private.media_trash` (`public.claim_media_trash`), deletes their three sizes from `public-media`, then deletes `incoming` objects older than 24 hours (`public.stale_incoming_objects`). Both RPCs are executable by `service_role` only.
- **Response:** `200 { removedPublic, removedIncoming }`.
- **Schedule:** run it by hand or from host cron for now (see `SELF_HOSTING.md`). A `pg_cron` schedule arrives in M8.

## Implemented endpoints (M3)

### `POST /rest/v1/rpc/search_recipes`

Search, category pages and the kitchen picker all use this one call.

- **Permission:** anyone (anon and authenticated). It only ever returns `published`, `visible` recipes. It runs as its owner so it can read the private search index (`private.recipe_search`, `private.search_vocab`).
- **Body** (every field optional):

  | Field                       | Meaning                                                                                                                                                                                                                                                                                                                                    |
  | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `q`                         | Free text in Malayalam, English or Manglish. Every word must match one of: the start of a title word (strongest), a dictionary ingredient the recipe uses (jeeragam / jeerakam / ജീരകം / cumin all name cumin), or the start of a word anywhere in the recipe. Words of 5+ letters also match close spellings from the vocabulary (typos). |
  | `category`, `region`, `tag` | Slugs (`seafood`, `central-kerala`, `onam`).                                                                                                                                                                                                                                                                                               |
  | `diet`                      | `veg` also includes `vegan`. The others match exactly.                                                                                                                                                                                                                                                                                     |
  | `max_minutes`               | Total time limit. Recipes without a time are left out.                                                                                                                                                                                                                                                                                     |
  | `with_groups`               | `[[ingredient ids], …]`. A recipe must use something from at least one group, and ranks higher the more groups it covers. The kitchen picker sends one group per sticker, e.g. "coconut" = all coconut forms.                                                                                                                              |

- **Response:** recipe rows ordered by kitchen-group hits, then relevance, then featured, then newest. Because it returns `setof recipes`, PostgREST embeds work (`?select=…,author:profiles(…),ingredients:recipe_ingredients(…)`). Page with `limit`/`offset` (supabase-js `.range()`), and ask for `count: 'exact'` for the total.
- **Speed:** each call is planned with its real values (dynamic SQL; the values are passed as parameters, never spliced into the text). `pnpm bench:search` clones the seed to 1,212 recipes and times typical queries: p95 is at most 17 ms (2026-10-19).
- **Tests:** `supabase/tests/database/30_search.test.sql` and `e2e/search.spec.ts`.

### `POST /rest/v1/rpc/category_counts`

Returns `[{ category_id, recipes }]` for published, visible recipes. Anyone can call it. It feeds the Home category grid.

### Featured recipes

`recipes.featured_at` is set by admins: by SQL until the M6 admin panel, and by the seed for 3 recipes in dev. Users can't write it. Home reads `recipes?featured_at=not.is.null&order=featured_at.desc&limit=3`.

## Planned endpoints

| Endpoint                                                                          | Milestone | Purpose                                                                               |
| --------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `rpc/make_variation(source_id)`                                                   | M4        | Copy a recipe into the caller's drafts, linked to the original                        |
| `rpc/mod_set_state`, `rpc/mod_suspend`, `rpc/admin_set_role`, `rpc/admin_feature` | M6        | Moderation. Each checks the role and writes to `moderation_actions`.                  |
| `functions/v1/share-page/:id` (public path `/s/:id`)                              | M4        | Open Graph HTML, then a redirect to `/r/:id`                                          |
| `functions/v1/share-card/:id`                                                     | M4        | 1200×630 PNG card (decision D4)                                                       |
| `functions/v1/verify-human`                                                       | M6        | Turnstile token → 30-minute posting pass                                              |
| `functions/v1/delete-account`                                                     | M6        | Delete storage objects, then the auth user (which cascades)                           |
| `functions/v1/import-recipe`                                                      | M7        | URL → JSON-LD → validated draft. SSRF-guarded: no private IPs, 5 s timeout, 2 MB cap. |

Each planned endpoint gets a full contract here (permission, body, responses, side effects, idempotency, validation, tests) **before** it's implemented.

## Storage (M2)

| Bucket         | Public?         | Who writes                                           | Limits                   | Paths                                                                                                                                                                                   |
| -------------- | --------------- | ---------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `incoming`     | private         | authenticated, **own folder only**                   | 8 MB; jpeg/png/webp/heic | `{uid}/{uuid}.{ext}`                                                                                                                                                                    |
| `public-media` | **public read** | **service role only** (the `process-image` function) | 1 MB; **webp only**      | `avatars/{uid}/{uuid}-{400}.webp`<br>`recipes/{uid}/{recipe_id}/{uuid}-{400,800,1600}.webp`<br>`steps/…`<br>`cooked/{uid}/{uuid}-{400,800,1600}.webp`<br>`cards/{recipe_id}-{hash}.png` |

**How a photo gets in:**

1. The phone resizes the photo to at most 1600 px and re-encodes it as WebP in a canvas. This removes all EXIF data, including GPS, and cuts upload size on 4G by roughly 5–10×.
2. The photo uploads to `incoming/{uid}/…`.
3. The client calls `process-image` (contract above). The function:
   - checks that you own the path and the recipe or step,
   - re-encodes through Storage's imgproxy transform and strips any WebP metadata that survives,
   - writes 3 sizes to `public-media` and points the row at them,
   - deletes the `incoming` file,
   - returns the base path.

   Per-user upload limits arrive with rate limiting in M6.

Users **cannot** write to the public bucket at all. So everything public has passed through the server pipeline, and there's no way to upload directly and keep GPS data.

Old photos are cleaned up by triggers. Deleting a recipe, a step photo, a cooked post or an avatar adds its paths to `private.media_trash`. Then `media-gc` (contract above; run from host cron until `pg_cron` arrives in M8) deletes them through the Storage API. `incoming` files older than 24 hours are removed too.

Draft photos sit at unguessable UUID paths in the public bucket. That's acceptable, and `SECURITY.md` says so. Moderators can hard-delete illegal media.

---
