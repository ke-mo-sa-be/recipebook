# Roadmap

v1 scope is defined in [docs/PRD.md](docs/PRD.md). This file tracks the milestones and everything that is deliberately **not** in v1.

## v1 milestones

|     | Milestone                                                                                   | Status                                                      |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| M0  | Design gate: design system and low-fi wireframes                                            | **Approved 2026-10-17**                                     |
| M1  | Foundation: monorepo, local Supabase, profiles and roles, auth, i18n, theme, app shell, CI  | **Done** (v0.2.0). Google sign-in waits on an OAuth client  |
| M2  | Recipes: schema, wizard, photo pipeline, recipe page, scaler, measures, drafts              | **Accepted 2026-10-18** (v0.2.0)                            |
| M3  | Discovery: home feed, categories, search, filters                                           | **Built and tested** (v0.3.0): waiting for phone acceptance |
| M4  | Community: comments, likes, saves, cooked-it, variations, WhatsApp share card               | Planned                                                     |
| M5  | Cooking mode: steps, wake lock, timers, checklist, voice                                    | Planned                                                     |
| M6  | Trust: reports, admin panel, rate limits, Turnstile, legal pages, export and delete account | Planned                                                     |
| M7  | Polish: Malayalam pass, PWA/offline, performance, accessibility, URL import                 | Planned                                                     |
| M8  | Go-live: production compose, Traefik and Cloudflare examples, backups, monitoring           | Planned                                                     |

## Milestone acceptance criteria

After each milestone: docs and CHANGELOG updated, a tag `v0.<n>.0`, a staging deploy, and a "test on your phone" checklist in the CHANGELOG entry.

### M0 — Design gate _(approval required before any screens are built)_

- `docs/DESIGN_SYSTEM.md` covering:
  - colour tokens for light and dark (turmeric, chilli, curry-leaf, coconut cream),
  - type scale with Malayalam line-height tuned,
  - spacing, radius and shadows,
  - every component with its states (loading, empty, error, disabled, focus).
- Low-fi **HTML wireframes** (mobile first) for Home, Search, Recipe, Cooking mode, the 5-step Add wizard, Profile and Admin.
- **AC:**
  - A script checks every text/background pair at ≥ 4.5:1 (≥ 3:1 for large text) in both themes, and its output is in the doc.
  - Tap targets are ≥ 48 px and base text is ≥ 17 px.
  - The wireframes open on a phone.
  - **Project owner approves.**

_The non-UI half of M1 proceeds while M0 is in review._

### M1 — Foundation

- Toolchain:
  - pnpm monorepo, Node 24 pinned,
  - ESLint (including `i18next/no-literal-string`), Prettier, TypeScript strict,
  - Vitest,
  - local Supabase stack (CLI).
- Migrations: extensions and enums, `profiles`, the new-user trigger, the role helpers, the access-token hook, column grants.
- Auth:
  - email and password with verification and reset (dev mail goes to the local test inbox; real SMTP via env vars on staging and production),
  - Google sign-in,
  - handle setup on first sign-in.
- i18n (ml/en) with language detection and a switcher. Theme tokens, dark mode, and the text size setting (normal / large / XL).
- App shell: bottom nav on mobile, top nav on desktop, placeholder pages, friendly 404 and error screens.
- Staging host on the server. CI on GitHub. `packages/core` import from Edge Functions verified (D6).
- Docs written: AGENTS.md, PRD, ARCHITECTURE, DATABASE, SECURITY, CODE_STYLE, TESTING, README, CONTRIBUTING, ROADMAP, CHANGELOG, LICENSE, `.env.example`.
- **AC:**
  - On a phone: sign up, receive the verification email, verify, sign in. Google sign-in works. Password reset works.
  - Switching language changes every visible string, and lint fails on any hardcoded UI string.
  - Dark mode and XL text don't break the nav.
  - pgTAP: a user can't change their own `role` or `status`, and anon can't update any profile.
  - CI is green on GitHub.

### M2 — Recipes

- Recipe schema and RLS. Lookups: categories, regions, tags, the **units/measures table** and the **starter dictionary of about 150 ingredients**, reviewed by native Malayalam speakers from a spreadsheet.
- Image pipeline ([docs/API.md → Storage](docs/API.md#storage-m2)) and avatar upload.
- Add wizard (basics → photo → ingredients → steps → review):
  - autosaves the draft as you go,
  - ingredient autocomplete from the dictionary in ml, en and Manglish,
  - timer detection in steps,
  - publish and unpublish.
- Recipe page: servings scaler, traditional ↔ metric toggle, edit and delete.
- Seed data: 12 original recipes (Kerala and others, ml + en) and demo users.
- **AC:**
  - Create and publish a recipe on a phone with one thumb.
  - Close the browser midway through the wizard, reopen it, and the draft is restored.
  - A downloaded photo has **no EXIF or GPS data** (an automated test checks this).
  - Scaling servings 4 → 8 doubles the numbers, while "to taste" stays the same.
  - In metric mode, "1 glass" shows "≈ 200 ml".
  - Another user can't see your draft (pgTAP).
  - Unit tests cover the scaler, measures and timer parsing.

### M3 — Discovery

- Home feed: featured row, popular this week, latest, categories. ("Popular this week" waits for likes and saves in M4; v0.3.0 shows "Ready in 30 minutes" instead.)
- Category pages. The `search_recipes` RPC. Filters for category, diet, total time and region.
- **AC:**
  - "jeerakam", "jeeragam", "ജീരകം" and "cumin" all find the seed recipes that use cumin.
  - "kudampuli" finds the fish curry.
  - Filters combine correctly.
  - Search p95 is under 200 ms on about 1,200 synthetic recipes.
  - Friendly empty states and skeleton loaders.

### M4 — Community

- Comments (flat, realtime if cheap), likes, saves, cooked-it posts with a counter on the card, and "Make my version" with an "N variations" link.
- WhatsApp button first (`wa.me` with text and link), then the native share sheet.
- The `share-page` and `share-card` functions (D4 spike first).
- **AC:**
  - Pasting a link into WhatsApp shows the photo, title, time and servings, with **Malayalam rendered correctly**.
  - A variation shows "based on …". When the original is deleted, it shows "original removed".
  - Counts update right away.
  - pgTAP covers every community table.

### M5 — Cooking mode

- One step per screen with huge text, an ingredient checklist, tap-to-start timers (several can run at once, with sound and vibration), and screen wake lock.
- Voice commands "next" / "adutthathu" and "back" / "thirike" / "munpathe" using the Web Speech API. Big buttons remain the main controls.
- **AC:**
  - The screen stays on for 10+ minutes on Android Chrome.
  - Timers keep running while you move between steps.
  - Where voice is supported, saying "adutthathu" goes to the next step. Where it isn't, the mic button is hidden and nothing breaks.

### M6 — Trust

- Report button on recipes, comments, cooked-it posts and profiles, with auto-hide at 3 reports.
- Admin panel: report queue, hide, restore, delete, suspend, roles, featured row, dictionary, audit log.
- Rate limits in Postgres and Traefik. Turnstile on sign-up (GoTrue native) and on posting.
- Legal pages in ml and en.
- Export my data (JSON + schema.org Recipe, generated in the browser) and delete my account.
- **AC:**
  - Three reports hide the item. A moderator can restore it, and the restore appears in the log.
  - A suspended user can read but not post.
  - The 11th comment in an hour gets a friendly "slow down" message.
  - The export validates against schema.org Recipe.
  - Deleting an account leaves no rows and no files behind (checked by a query and a storage listing).

### M7 — Polish

- Full Malayalam pass, reviewed by native speakers.
- PWA: app-shell caching, offline saved recipes and cooking mode. (The manifest, icons, install prompt and offline page shipped early, in v0.2.1.)
- Performance budget: Lighthouse mobile ≥ 90 on Home, Recipe and Search, and initial JS ≤ 170 KB gzipped.
- Accessibility audit: axe clean, keyboard navigation, TalkBack spot check.
- URL import via the `import-recipe` function: JSON-LD only, SSRF protection (no private IPs, 5 s timeout, 2 MB cap), and source link kept.
- **AC:**
  - Lighthouse reports are attached.
  - In airplane mode, saved recipes and cooking mode still work.
  - Importing a public blog recipe gives a draft with only ingredients, steps and the source link.

### M8 — Go-live

- Production stack:
  - upstream Supabase compose, pinned, with the lite override,
  - the frontend container,
  - Traefik labels (example in `deploy/examples/`, real config in the gitignored `deploy/local/`).
- Reverse-proxy and tunnel steps documented. Studio on LAN only.
- Nightly backup (`pg_dump` plus the storage volume, keeping 7 daily and 4 weekly copies) with a **tested restore**.
- Uptime Kuma checks and ntfy alerts. Upgrade procedure. Go-live checklist.
- **AC:**
  - A restore drill on a scratch stack succeeds.
  - Measured RAM is ≤ 3 GB.
  - `curl` from outside can't reach Studio, `/pg` or any non-API gateway path.
  - Security headers are present: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.

## v1.5

The data model already has room for these (see [docs/DATABASE.md §6](docs/DATABASE.md)).

- **Voice recipe entry:** speak a recipe in Malayalam or English, and it's transcribed and structured for you to review. Default is local (Whisper + an Ollama LLM), with optional cloud.
- **Heritage card scan:** photograph a handwritten recipe card for OCR and structuring, with the original image kept. Optional private **family book** groups.
- **Festival collections:** an Onam sadya planner (menu plus quantities for N guests), Vishu, Christmas, Easter, Ramadan, Karkidakam.
- Variation change history.

## v2

- Pantry "what can I cook".
- Meal planner with a merged shopping list.
- Diet tags (low oil, diabetic-friendly…).

## Later / ideas

- Followers.
- **Push notifications** (asked for in M2 feedback). They're planned with M4, when there is something to notify about: comments, likes, "someone cooked your recipe". This needs web push (VAPID keys), a sender function and a permission prompt that shows only after the person does something that warrants it. On iPhone it works only for the installed app.
- **More languages** (asked for in M2 feedback). Each needs about 400 interface strings with native review, a font, dictionary names and a `lang` enum value for recipe content. This comes after the Malayalam family review, in an order Adrian picks.
- **Recipe translation:** a "Translate" button for steps written in another language. It needs an outside service and has a running cost. For now recipes show "Written in Malayalam / English".
- Native apps, if the PWA isn't enough.
- **Mealie import:** bring recipes from an existing self-hosted Mealie instance.
- Image pipeline fallback (wasm encoder) for Supabase Cloud free tier (decision D5).
- Move to TypeScript 7 once typescript-eslint supports it (decision D7).
- Per-ingredient densities, so "1 pidi rice" and "1 pidi grated coconut" get different gram estimates.

## Never

Ads, subscriptions, paywalls, or tracking and analytics SDKs that sell data.
