# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [SemVer](https://semver.org/), with `v0.<milestone>.<patch>` until v1.

## [Unreleased]

## [0.4.0] - 2026-10-20

### M4 part 1: community and notifications (built and tested; waiting for phone acceptance)

- **Likes and saves.** Who liked or saved what is private; the counts are public. Counts change the moment you tap and roll back if the server refuses. The **Saved** page now lists your saved recipes.
- **Comments.** Flat, newest last; edit (marked "edited") and delete your own. Posting needs a published recipe and an active account, and is limited to 10 comments per 10 minutes until M6's rate limits.
- **Counts** live in `recipe_stats` (kept by triggers) and show on cards.
- **Notifications:**
  - written by triggers when someone likes (once per person, ever) or comments on your recipe, never for your own actions,
  - a bell with an unread badge in the desktop top bar and on Home; `/notifications` lists them and marks them read,
  - a comment notification opens the recipe at its comments.
- **Push:**
  - the `push` Edge Function sends web push in the recipient's language via `web-push` 3.6.7,
  - the app pokes it right after a like or comment, so pushes arrive at once,
  - Settings has an on/off switch per device, and iPhones are told to add the app to the Home Screen first,
  - signing out removes the device's subscription.
  - Push endpoints are limited to known push services (no SSRF).
  - The encryption is verified under Deno against an independent RFC 8291 decryption.
  - Push stays off until the server has VAPID keys (`nirvanahome-infra/scripts/paachakam-push-keys.sh`).
- **"Popular this week"** on Home: likes plus 2× saves over the last 7 days.
- **Fixed before release:** deleting accounts or recipes with several likes, saves or comments failed with a foreign-key error from the counter trigger. It now skips recipes being deleted. Verified against the data that failed.
- **Tests:**
  - pgTAP 148, including 48 for community,
  - unit 92,
  - Deno 2 (push),
  - E2E 36, including `community.spec.ts`.
  - Search and layout specs no longer assume exact counts, since other specs publish into the same seed.
- **Docs:** SECURITY now says staging is a public preview with real accounts. That makes the CLI's open database port a real risk; see the infra note.

**Not yet verified / known gaps**

- Push on a real phone: it needs the VAPID keys on the server, then your phone test.
- The new Malayalam strings need a native speaker's check.
- Cooked-it posts, "Make my version" and the WhatsApp share card are M4 part 2.

**Test on your phone**

1. Run `~/nirvanahome-infra/scripts/paachakam-push-keys.sh` once on the server, so push can work.
2. Sign in, open any recipe, then tap Like and Save: the like count should change at once. Open Saved.
3. Write a comment, edit it, and see "edited".
4. Sign in as someone else (a family member), and like and comment on one of your recipes. Your bell should show 2, and Notifications should list both.
5. Settings → Notifications on this phone → Turn on. On iPhone, add to the Home Screen first and open the app from there. Then have someone like your recipe: a notification should arrive, and tapping it should open the recipe.
6. Sign out, and check the phone gets no more notifications for that account.

## [0.3.0] - 2026-10-19

### M3, discovery (built and tested; waiting for phone acceptance)

- **Spelling-proof search** (`search_recipes`):
  - Every query word must match a title word, a dictionary ingredient the recipe uses, or any recipe text. Malayalam, English and Manglish are folded together by `private.manglish_key`, the SQL twin of the core `manglishKey()` with pgTAP parity cases.
  - "jeerakam", "jeeragam", "ജീരകം" and "cumin" find the same recipes. "kudampuli" finds the fish curry, and so does "meen curry": fish types gained "meen / മീൻ / fish" aliases in reference data v2.
  - Words of 5+ letters also match close spellings from a vocabulary of recipe words, so typos like "kudampuly" still work.
- **Search page:**
  - results are kept in the URL, so Back and shared links work,
  - a Filters sheet for category, food type (Veg includes vegan), time, region and occasion,
  - removable filter chips, a result count, "Show more", skeleton cards, and an empty state that offers to clear filters.
- **Kitchen picker** on Home now works. Each sticker maps to a group of dictionary ingredients (coconut = every coconut form), and recipes covering more of your picks rank first.
- **Category pages** (`/c/:slug`) have food-type and time chips. Home gains "Picked for you" (admin-featured), "Ready in 30 minutes" and "Browse by category" with counts. The Home chips are now real filters.
- **Speed:**
  - The search index lives in `private.recipe_search`, kept in sync by triggers, with trigram GIN indexes.
  - The RPC runs dynamic SQL, so each call is planned with its real values. The first version, a SQL-language body, was planned with placeholders and ran 40× slower.
  - `pnpm bench:search` (1,212 cloned recipes): p95 at most 17 ms, against a 200 ms target.
- **Layout fixes:**
  - the desktop top bar no longer overflows in Malayalam at 1024–1366 px: Home and Saved go icon-only below 1280 px, and the search field shrinks first,
  - the category grid uses 4 columns on desktop, so Malayalam words don't break,
  - the Filters footer stacks on phones.
- **Tests:**
  - pgTAP 99, including 35 for search,
  - unit 90,
  - E2E 32: `search.spec.ts`, a 1024 px desktop layout project, and the new pages in the layout check.
  - Schema lint is clean. `manglish_key` is marked stable, because `unaccent` is.

**Not yet verified / known gaps**

- "Popular this week" waits for likes and saves (M4). There is no popularity boost in ranking yet.
- The new Malayalam strings and the meen aliases need a native speaker's check.
- `auth.spec.ts` wasn't run this round, because staging sends real email.

**Test on your phone**

1. Search "jeeragam", then "ജീരകം": both should find Dal Tadka and Avial.
2. Search "meen curry" and "kudampuly" (with the typo): both should find Kerala Fish Curry.
3. Tap Filters, choose Veg and Under 30 min, then Show recipes: you should get Sulaimani, Pazham Pori and Puttu. Tap a chip to remove it.
4. On Home, pick Coconut and Shallots in "What's in your kitchen?", then tap Find recipes.
5. Scroll Home: you should see Picked for you, Ready in 30 minutes, and Browse by category. Open Curry and tap Non-veg.
6. On a laptop, check that the top bar fits in Malayalam.

## [0.2.2] - 2026-10-18

- **Welcome animation rebuilt** after Adrian found v0.2.1's jittery. പാ · ച · കം are now three slot-machine reels. Each rolls through the same syllable in eight other Indian scripts (Tamil, Telugu, Kannada, Devanagari, Bengali, Gujarati, Odia, Gurmukhi) and locks into Malayalam left to right. The reels then close up into the word, with "Paachakam · One word, nine scripts" below.
- **Why the old one jittered:**
  - every word had different metrics, so the stage resized and the caption jumped,
  - 150 ms per word strobed,
  - each word mounted with a 75° flip.
- **The fix:** only transform and opacity animate, on a fixed-size stage, and the reels slow down as they lock. An E2E check samples the reels every frame and fails on any movement or resize.
- Font subsets updated to the syllables, adding Gurmukhi (16 KB in total). They are still pixel-identical to the full fonts.

## [0.2.1] - 2026-10-18

M2.1 polish, from Adrian's first round of phone feedback.

- **Small text size** (15 px root), alongside Normal, Large and Extra large. A migration widens the `profiles.text_size` check, and pgTAP covers it.
- **Theme button**: a sun / moon button flips light and dark. It sits in the desktop top bar and in the top row of the phone screens (Home, recipe, cookbook, Search, Saved, Settings). Settings still offers Auto.
- **"Written in Malayalam / English"** on a recipe whose text isn't in your interface language. Recipe text is what the cook wrote, so it doesn't switch with the interface (option (a) of three; translation is on the "Later" list).
- **Version and What's new:**
  - Settings → About shows the version, which comes from `apps/web/package.json` at build time.
  - `/whats-new` lists plain-language notes for cooks in both languages (`features/about/releases.ts`). A test fails if the current version has no notes.
  - After an update, Home shows a one-time "Paachakam was updated" card.
- **Installable app (PWA):**
  - a web manifest, plus a service worker that only adds an offline page, so deploys are picked up on the next visit,
  - an install card on Home: an Install button where the browser offers one, and Share → Add to Home Screen steps on iPhone,
  - "Not now" hides the card for 30 days, and Home shows at most one card at a time.
- **App icon:** a steaming uruli of curry with a curry-leaf sprig, die-cut like the stickers, on the near-black primary. One SVG source builds the favicon, the 192 / 512 px and maskable PNGs and the Apple touch icon (`pnpm icons`).
- **Welcome animation:**
  - "Cooking" in Tamil, Telugu, Kannada, Hindi, Bengali, Marathi, Gujarati and Odia flips past, landing on പാചകം / Paachakam with stickers,
  - about 2 s, once per session, only when a visit lands on Home, and skippable,
  - off under reduced motion,
  - fonts are 13 KB of Noto subsets, rendering pixel-identical to the full fonts.
- **Tests:** unit 87, pgTAP 64, E2E 16 (layout, recipe, intro). `auth.spec.ts` was left out of this run because staging now sends real email.

**Not yet verified / known gaps**

- The eight words and the new Malayalam strings need a native speaker's check.
- The install card and the installed app were tested in Chromium and with an iPhone user agent, not yet on a real iPhone or Android phone.

## [0.2.0] - 2026-10-18

The first tagged release. It covers the M0 design gate, the M1 foundation and auth, design v2, and M2 recipes. Adrian accepted it on a phone on 2026-10-18, on the public staging site with real email.

### M2, recipes (accepted 2026-10-18)

- **Name:** the product is **Paachakam / പാചകം** (`apps/web/src/brand/brand.ts`).
- **Core logic** (`packages/core`, unit-tested):
  - a units table with Kerala measures and approximate metric values (glass ≈ 200 ml, cup 240 ml, tea cup 150 ml, ladle 60 ml, pidi ≈ 30 g), shared with the database through the seed generator,
  - a servings scaler: "to taste" never scales, pinches stay whole, counts round to halves,
  - fraction formatting (½, ¼, ¾),
  - timer detection in step text, in English and Malayalam ("half an hour", "10 മിനിറ്റ്"),
  - Manglish name matching, so "jeeragam", "jeerakam", "ജീരകം" and "cumin" all find cumin,
  - a WebP metadata stripper.
- **Database:**
  - recipes, ingredients, steps, tags and lookups, with RLS on every table,
  - a publish check whose errors are i18n keys,
  - the `save_recipe_items` autosave RPC, which keeps row ids when you reorder,
  - photo columns that only the pipeline can set, and a media trash queue,
  - `incoming` (private, own folder only) and `public-media` (public, service-only, WebP) buckets.

  pgTAP has 37 new assertions (62 in total), including "another user can't see your draft".

- **Seed:** `scripts/build-seed.ts` generates two things from `supabase/seed/`:
  - the reference data migration: 16 units, 12 categories, 7 regions, 9 tags and a 154-ingredient bilingual dictionary,
  - the dev seed: 4 fictional cooks and 12 original bilingual recipes.

  `pnpm seed:check` in `pnpm check` fails when the outputs are stale.

- **Photo pipeline:**
  - the phone resizes the photo to WebP and uploads it to `incoming/<uid>/`,
  - the `process-image` function checks ownership, renders 400/800/1600 px through imgproxy, strips any EXIF or XMP, writes to `public-media`, sets the row and always deletes the original,
  - `media-gc` empties the trash queue and removes abandoned uploads.

  Contracts are in `docs/API.md`. Avatars use the same pipeline (Settings → Profile photo).

- **Add wizard** (`/add`, then `/edit/:id/:step`):
  - name and language first, then Basics, Photo, Ingredients, Steps and Review,
  - autosaves as you type, with a Saved / Saving indicator, so a reload or closed tab loses nothing,
  - dictionary search with stickers and sensible default units,
  - an amount stepper,
  - steps with automatic timers you can dismiss, and step photos,
  - a review checklist, publish, and a drafts list.
- **Recipe page** (`/r/:id/:slug`):
  - a polaroid cover, the author and diet mark,
  - a servings scaler and a Traditional / Metric toggle (e.g. "1 tsp ≈ 5 ml"),
  - grouped ingredients with stickers, steps with timer pills and photos, and tips,
  - Edit / Delete / Unpublish for the owner,
  - "Start cooking" is shown, marked Soon (M5).
- **Home** shows "Fresh from the community". The **cookbook** tabs now list published recipes, and your own drafts.
- **Fixes found by the extended layout test:** at 360 px the cookbook tabs scrolled sideways, which hid "Cooked it", so they now wrap. The Malayalam cookbook title clipped at XL text, so headlines now break long words.
- **Tests:**
  - E2E `recipe.spec.ts` drives the full wizard to publish on a Pixel 7 profile, including a GPS-tagged photo whose public copy is byte-checked for EXIF, XMP and camera data,
  - the layout check now also covers a cookbook and a recipe page.

  Unit 82, pgTAP 62, E2E 17: all pass locally.

- **Staging** is now public at `paachakam.<staging domain>` with no Authelia in front. Demo account passwords were rotated before it opened.
- **Real email** is configured entirely from `supabase/.env`: `SMTP_ENABLED`, host, port, user, password, sender. The committed config holds no account details, and CI runs with `SMTP_ENABLED=false`. The auth email rate limit went from 2 to 30 an hour, because 2 would block a second sign-up within the hour.

**Not yet verified / known gaps**

- The Malayalam strings, dictionary names and measure values still need a family review.
- `media-gc` isn't scheduled yet. Run it from host cron (`SELF_HOSTING.md`) until `pg_cron` arrives in M8.
- E2E isn't in CI yet, because it needs the full local stack with storage and functions.
- Upload limits per user arrive with rate limiting in M6.

**Test on your phone**

1. Open the staging site and sign up (or sign in).
2. Tap the black **+**, type a recipe name, and tap Start.
3. Pick a category, food type and servings. Watch "Saved" appear.
4. Add a photo from your camera. It should appear within a few seconds.
5. Search "jeeragam" and "kudampuli", add both, and change an amount with − / +.
6. Write a step containing "10 minutes" and check that a 10 min timer appears.
7. Close the tab, reopen the site, open Profile → Drafts, and check that everything is still there.
8. Review → Publish. On the recipe page, change servings 4 → 8 and switch to Metric.
9. Open the recipe in a private window (signed out). It should show with no Edit button.

### Design v2 (approved 2026-10-17) and app screens rebuilt on it

- New direction after review of the M1 build: a neutral canvas, white cards, one black action per screen, two-tone headlines, and **die-cut ingredient stickers** as the signature element. `docs/DESIGN_SYSTEM.md` has been rewritten as v2.
- Hi-fi mockups (`docs/design/hifi.src.html`, built by `node scripts/build-mockups.mjs`) in light and dark, covering:
  - mobile: Home, "What's in your kitchen?", Recipe (top and scrolled), Cooking mode, Add recipe (ingredients), Search, Cookbook (profile), Sign in, Home in Malayalam,
  - desktop: Home, Recipe, Cookbook.
- Stickers: 71 Fluent Emoji 3D images (MIT), listed in `scripts/stickers.json`. `pnpm stickers` converts them to 192 px WebP with a baked-in white outline (296 KB total).
- Tokens v2: neutral palette, black and white primary, chilli accent used sparingly, Inter replacing Figtree, larger radii, softer shadows, per-language letter-spacing. All 66 contrast pairs pass.
- **App rebuilt on v2:**
  - new primitives: `Sticker` / `StickerRow`, `IconButton`, `Chip`, `Composer`, two-tone `Headline`, `Avatar`,
  - mobile **floating pill nav** with a raised black "+" (below 1024 px), and a desktop **top bar** with the search field, Home / Saved, a black "Add a recipe" and the avatar,
  - Home: greeting, search composer ("Scan a recipe" marked Soon), quick-pick chips, and the **"What's in your kitchen?" sticker picker**, which links to search with the picked ingredients (results arrive in M3),
  - the profile is now "Name's cookbook." with chip tabs and sticker empty states,
  - Search, Saved, Add, Settings, all auth screens, onboarding, the language chooser and 404 use sticker clusters and two-tone headlines,
  - buttons are pills, inputs are 54 px with rounded corners, the segmented control has a white thumb, and sheets are rounded with a canvas background.
- Layout fixes found by the tests:
  - on phones, the Home hero column stretched to the chip row's natural width (about 600 px), so it is now a `minmax(0,1fr)` grid,
  - the kitchen picker uses 3 columns on phones with capped label size, so long Malayalam names such as വെളുത്തുള്ളി fit at 360 px.
- The layout test now measures against `clientWidth` and checks real text overflow. Mobile Chrome widens `innerWidth` to fit overflowing content, which had hidden the bug above.

### Added: M0, design gate (approved 2026-10-17)

- `docs/DESIGN_SYSTEM.md`:
  - a warm spice palette (turmeric, chilli, curry leaf, coconut cream) with a real dark theme,
  - Figtree and Noto Sans Malayalam with Malayalam-specific line-heights,
  - a 17 px base and a three-step text-size setting,
  - 48/56 px tap targets, and states for every component.
- Design tokens in `apps/web/src/theme/tokens.json`. `pnpm tokens` generates the CSS and the Tailwind theme. `pnpm tokens:check` verifies WCAG contrast: **all 60 pairs pass** (30 per theme).
- Low-fi wireframes in `docs/wireframes/index.html`: Home, Search, Recipe, Cooking mode, the 5-step Add wizard, Profile and Settings, and Admin.

### Added: M1, foundation (non-UI part)

- pnpm monorepo:
  - `apps/web` (React 19, Vite 8, TypeScript 6, Tailwind 4, react-i18next, supabase-js) and `packages/core` (pure TypeScript and Zod, shared with Edge Functions),
  - Node 24 LTS and every dependency pinned to exact versions.
- Tooling:
  - ESLint (including `i18next/no-literal-string` for JSX), Prettier, Vitest,
  - `pnpm check`,
  - a secret scan (`scripts/check-no-secrets.mjs`).
- Supabase local stack config:
  - email confirmation required, 8-character minimum password,
  - Google provider through env vars,
  - custom access-token hook,
  - explicit grants (`auto_expose_new_tables = false`),
  - Studio, analytics, S3 and vector turned off to save RAM.
- Migrations:
  - `private` schema, `pg_trgm` and `unaccent`, base enums,
  - `profiles` with column-level update grants, RLS, a new-user trigger (public fields are never derived from the email address), role and status helpers, and an access-token hook adding `user_role` and `account_status` claims.
- pgTAP tests: 25 assertions covering RLS coverage guard rails, profile policies, privilege escalation, suspension and the token hook.
- Edge Function `health`. It proves Edge Functions can import `@recipebook/core` directly (decision D6, verified).
- `deploy/scripts/promote-admin.sh` sets the first admin from the server.
- CI (GitHub Actions, pinned by SHA):
  - web checks, build and `pnpm audit`,
  - `deno check` for functions,
  - pgTAP and schema lint against a fresh local Supabase.
- Docs:
  - `AGENTS.md`, plus `docs/PRD.md`, `ARCHITECTURE.md` (decisions D1–D9), `DATABASE.md`, `API.md`, `SECURITY.md`, `CODE_STYLE.md`, `TESTING.md` and `UX_FLOWS.md`,
  - README, CONTRIBUTING, ROADMAP and SELF_HOSTING (stub),
  - AGPL-3.0 licence and `.env.example`.

### Added: M1, app shell and auth (UI)

- App shell:
  - mobile bottom nav (Home · Search · Add · Saved · Profile, every icon labelled) and desktop top nav,
  - skip link, offline banner, friendly 404 and crash screens,
  - routes per `docs/UX_FLOWS.md`, with Saved and Add requiring sign-in.
- First-visit language chooser (bilingual, Malayalam preselected).
- Auth screens:
  - sign up (name, email, password), "check your email" with a 60 s resend cooldown,
  - sign in, forgot password, set a new password, and the email/OAuth callback,
  - "Continue with Google", hidden until `VITE_AUTH_GOOGLE=true` (needs the OAuth client),
  - errors mapped to plain-language messages in both languages; links opened in another browser get "That link worked, please sign in".
- First sign-in onboarding: confirm name, pick a username, optional district.
- Settings: language, text size (normal / large / extra large), theme (auto / light / dark), profile (name, username, district, bio), sign out. Signed-in choices are saved to the profile and follow the person to other devices.
- Public profile page (`/u/:handle`) with Recipes / Variations / Cooked it tabs (empty states until M2/M4).
- Placeholder Home, Search, Saved and Add screens with "coming soon" copy.
- 147 UI strings in Malayalam and English (Malayalam is a first draft for review in M7).
- Staging setup: `deploy/examples/staging/` (nginx serving the app and proxying the API paths to the CLI stack, with security headers), and an Authelia rule for the staging host (family and admins only).

### Changed

- Line-height tokens now switch by the `lang` attribute, so Malayalam gets taller lines even inside utility-styled text.
- The bottom nav sizes each slot to its label and uses px icon sizes, so long Malayalam labels such as "പ്രൊഫൈൽ" fit whole on a 360 px phone at every text size.

### Fixed

- Email addresses with a leading or trailing space (common after phone keyboard autocomplete) were rejected. They are now trimmed before validation.
- The secret scan flagged supabase-js's own `sb_secret_` prefix check and the library's doc comments. It now looks for real key values, and still catches service-role JWTs and secret keys.

### Tests

- 32 unit and component tests: nav, sign-up validation and submit, settings applying instantly, the language chooser, locale key and placeholder parity, and every `t('…')` key existing.
- Playwright E2E (`pnpm test:e2e`), 15 tests:
  - the full journey: language → sign up → sign-in refused before confirming → email link → onboarding (including a bad username) → profile → settings in Malayalam, extra-large text and dark mode → save profile → sign out,
  - sign in on a fresh browser restores language and text size from the profile; a wrong password is explained,
  - password reset by email (old password rejected, new one works),
  - no clipping or sideways scrolling on 5 screens × 2 languages × 3 text sizes at 360 px and 412 px.

### Verified on 2026-10-16 (local stack)

- Signing up sends a verification email, sign-in is refused until the email is confirmed, and confirming signs you in.
- The JWT carries `user_role = user` and `account_status = active`.
- `PATCH profiles {"role":"admin"}` as a user is rejected with `42501`.
- Mutation check: temporarily granting `update(role)` makes the pgTAP suite fail, as it should.

### Known gaps

- Google sign-in end to end: needs the Google Cloud OAuth client.
- Real email: staging used the local test inbox until 2026-10-18. It now sends real email (see M2).
- Staging went live behind SSO, with the design mockups at `/design/`. Since M2 it's public.
- The JS bundle is 225 KB gzipped against the 170 KB M7 budget. Route-level code splitting is planned.
- E2E runs locally in the Playwright container. It joins CI in M2.

[Unreleased]: https://github.com/ke-mo-sa-be/recipebook/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/ke-mo-sa-be/recipebook/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ke-mo-sa-be/recipebook/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/ke-mo-sa-be/recipebook/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/ke-mo-sa-be/recipebook/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/ke-mo-sa-be/recipebook/releases/tag/v0.2.0
