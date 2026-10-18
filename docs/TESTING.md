# Testing

We don't stop at "the code looks right": every milestone is checked by automated tests **and** on a real phone.

## 1. Testing goals

The functionality that matters most, in order:

1. **Permissions:** nobody can read drafts or write other people's data, and suspensions and roles hold. This is RLS.
2. Account flows: sign up, verify, sign in, reset, Google.
3. Recipe creation without data loss: wizard autosave and drafts.
4. Correct scaling and measures (`packages/core`).
5. Search that finds Malayalam, English and Manglish ingredient names.
6. Cooking mode on a real Android phone.
7. Account deletion that leaves nothing behind.

## 2. Test types

- **Unit:** pure logic in `packages/core` (schemas, scaler, measures, timer detection, Manglish normaliser, schema.org mapping) and React components with Testing Library.
- **Database / integration:** pgTAP tests in `supabase/tests/database/`, run against the real local Supabase stack. **Every table has policy tests** from the viewpoints of anon, another user, the owner, a moderator and a suspended user. They include the expected denials (`throws_ok … '42501'`, or 0 rows affected). `01_rls_coverage.test.sql` fails if any `public` table lacks RLS, any `private` table is readable by API roles, or a `security definer` function in `public` doesn't pin its `search_path`.
- **End-to-end:** Playwright against a built app and the local dev stack (`e2e/`). Implemented:
  - M1: sign up and verify through the Mailpit API, sign in, password reset, and a no-clipping layout check (Home, Settings, auth pages, Me, a cookbook and a recipe page; ml and en; three text sizes; 360 and 412 px),
  - M2 (`recipe.spec.ts`): the whole Add wizard to Publish, with a GPS-tagged photo, Manglish ingredient search, step timer detection, the draft surviving a reload, the scaler (4 → 8 doubles), metric mode, a byte check that the public photo has no EXIF/XMP or camera data, and a signed-out visitor seeing the recipe without an Edit button.

  To be added:
  - search,
  - cook,
  - share (checking the Open Graph HTML),
  - report and moderate,
  - export and delete the account.

- **Manual phone check:** each milestone's CHANGELOG entry includes a "test on your phone" list, run on a mid-range Android phone in Chrome on 4G.

## 3. Testing tools

| Type             | Tool                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| Unit / component | Vitest 5, @testing-library/react, jsdom                                     |
| Database         | pgTAP through `supabase test db` (pg_prove)                                 |
| Edge Functions   | `deno check` (CI). Behaviour tests with `deno test` as functions are added. |
| E2E              | Playwright 1.63, run in its official Docker image (see §7)                  |
| Accessibility    | axe (from M2, inside E2E), plus a TalkBack spot check in M7                 |
| Performance      | Lighthouse CI, mobile profile (M7)                                          |
| Contrast         | `pnpm tokens:check` (every token pair, both themes)                         |

## 4. Test file structure

```
packages/core/src/**/*.test.ts       unit
apps/web/src/**/*.test.tsx           component
supabase/tests/database/*.test.sql   pgTAP (shared helpers: _helpers.inc, included with \ir)
e2e/                                 Playwright: auth.spec.ts, layout.spec.ts, recipe.spec.ts
```

## 5. Critical user flows

| Flow                          | Steps                                                                                                    | Expected result                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign up with email (M1)**   | 1. Sign up with name, email and password. 2. Try to sign in. 3. Open the verification email. 4. Sign in. | Sign-in before verifying is refused (`email_not_confirmed`). After verifying, sign-in works, a profile exists with the handle derived from the name, and the JWT has `user_role = user`. _Verified manually on 2026-10-16 against the local stack._ |
| **Privilege escalation (M1)** | Signed in, `PATCH /rest/v1/profiles` with `{"role":"admin"}`.                                            | `42501 permission denied`. _Verified on 2026-10-16._                                                                                                                                                                                                |
| **Create recipe (M2)**        | Wizard to Publish.                                                                                       | The recipe is visible to anon. The draft was never visible to others. _Automated: `e2e/recipe.spec.ts` and pgTAP `20_recipes`._                                                                                                                     |
| Delete account (M6)           | Settings → Delete → confirm.                                                                             | No rows remain for that user in any table, and no files under their storage prefixes.                                                                                                                                                               |

## 6. Coverage

- **Target:** `packages/core` ≥ 90% lines. RLS: 100% of policies have a test, which review enforces and `01_rls_coverage` partly checks. UI: critical components and flows rather than a percentage.
- **Priorities:** authorization, data changes, the scaler and measures, auth flows, upload sanitising, account deletion.

## 7. Commands

|                 |                                                                                 |
| --------------- | ------------------------------------------------------------------------------- |
| All fast checks | `pnpm check` (format, lint, typecheck, unit tests, token contrast, secret scan) |
| Unit tests      | `pnpm test` (`pnpm test:watch` while developing)                                |
| Database tests  | `pnpm db:start` once, then `pnpm test:db`                                       |
| Schema lint     | `pnpm db:lint`                                                                  |
| Type check      | `pnpm typecheck`                                                                |
| Build           | `pnpm build`                                                                    |

CI (`.github/workflows/ci.yml`) runs all of these on every push and PR: web checks, `deno check` for functions, and pgTAP plus schema lint against a fresh local Supabase.

## 8. Definition of done

- [ ] Tests pass (`pnpm test`, `pnpm test:db`)
- [ ] The build passes
- [ ] Lint and format pass
- [ ] Type checking passes
- [ ] The critical flow for the change was verified (automated, or manually on a phone, and noted)
- [ ] There are no blocking errors in the browser console
- [ ] Unverified items are stated plainly in the CHANGELOG entry

## Running the E2E tests

Needs the local stack (`pnpm db:start`), a build pointed at it, and the preview server:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SITE_URL=http://localhost:4173 VITE_SUPABASE_PUBLISHABLE_KEY=<from supabase status> pnpm --filter @recipebook/web build
pnpm --filter @recipebook/web preview --port 4173
docker run --rm --network host --ipc host -u "$(id -u):$(id -g)" -e HOME=/tmp -e E2E_PUBLISHABLE_KEY=<key> -e E2E_SERVICE_KEY=<local service_role key> -v "$PWD:$PWD" -w "$PWD" mcr.microsoft.com/playwright:v1.63.0-noble ./node_modules/.bin/playwright test
```

The tests read auth emails from Mailpit and rewrite the link host to the local gateway, so they also work when the stack is configured for a staging hostname. Each run creates uniquely named test accounts. `recipe.spec.ts` creates its cook through the auth admin API, so it needs the **local** stack's service key (`supabase status`) and skips without it. Never point it at a shared server.

The auth tests read confirmation and reset emails from Mailpit, so run E2E with `SMTP_ENABLED=false` in `supabase/.env`. With real SMTP on, sign-ups would send real emails to `example.com` addresses.

Run the container rather than Playwright on the host: the host is missing Chromium's system libraries.
