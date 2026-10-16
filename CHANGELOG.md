# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [SemVer](https://semver.org/), with `v0.<milestone>.<patch>` until v1.

## [Unreleased]

### Added: M0, design gate (awaiting approval)

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

### Verified on 2026-10-16 (local stack)

- Signing up sends a verification email, sign-in is refused until the email is confirmed, and confirming signs you in.
- The JWT carries `user_role = user` and `account_status = active`.
- `PATCH profiles {"role":"admin"}` as a user is rejected with `42501`.
- Mutation check: temporarily granting `update(role)` makes the pgTAP suite fail, as it should.

### Not yet done in M1 (waiting on M0 approval or your accounts)

- App shell (bottom nav, top nav, routes), the auth screens, onboarding and the language chooser.
- Google sign-in end to end, which needs the OAuth client.
- Real SMTP (Brevo).
- Staging host on the server.
