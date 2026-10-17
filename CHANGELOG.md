# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [SemVer](https://semver.org/), with `v0.<milestone>.<patch>` until v1.

## [Unreleased]

### Design v2 (proposed 2026-10-17, awaiting approval)

- New direction after review of the M1 build: a neutral canvas, white cards, one black action per screen, two-tone headlines, and **die-cut ingredient stickers** as the signature element. `docs/DESIGN_SYSTEM.md` has been rewritten as v2.
- Hi-fi mockups (`docs/design/hifi.src.html`, built by `node scripts/build-mockups.mjs`) in light and dark, covering:
  - mobile: Home, "What's in your kitchen?", Recipe (top and scrolled), Cooking mode, Add recipe (ingredients), Search, Cookbook (profile), Sign in, Home in Malayalam,
  - desktop: Home, Recipe, Cookbook.
- Stickers: 71 Fluent Emoji 3D images (MIT), listed in `scripts/stickers.json`. `pnpm stickers` converts them to 192 px WebP with a baked-in white outline (296 KB total).
- Tokens v2: neutral palette, black and white primary, chilli accent used sparingly, Inter replacing Figtree, larger radii, softer shadows, per-language letter-spacing. All 66 contrast pairs pass.
- The app screens still use the v1 components. They will be rebuilt on v2 once the design is approved.

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
- Real email: staging uses the local test inbox until SMTP (Brevo) is set up.
- Staging goes live after Authelia is restarted (the new access rule is written and validated) and the Cloudflare public hostname is added.
- The JS bundle is 221 KB gzipped against the 170 KB M7 budget. Route-level code splitting is planned.
- E2E runs locally in the Playwright container. It joins CI in M2.
