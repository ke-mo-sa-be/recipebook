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
- **End-to-end:** Playwright against the dev stack, from M2 on:
  - sign up and verify through the Mailpit API,
  - sign in,
  - create and publish a recipe,
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
| E2E              | Playwright (from M2)                                                        |
| Accessibility    | axe (from M2, inside E2E), plus a TalkBack spot check in M7                 |
| Performance      | Lighthouse CI, mobile profile (M7)                                          |
| Contrast         | `pnpm tokens:check` (every token pair, both themes)                         |

## 4. Test file structure

```
packages/core/src/**/*.test.ts       unit
apps/web/src/**/*.test.tsx           component
supabase/tests/database/*.test.sql   pgTAP (shared helpers: _helpers.inc, included with \ir)
e2e/                                 Playwright (from M2)
```

## 5. Critical user flows

| Flow                          | Steps                                                                                                    | Expected result                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sign up with email (M1)**   | 1. Sign up with name, email and password. 2. Try to sign in. 3. Open the verification email. 4. Sign in. | Sign-in before verifying is refused (`email_not_confirmed`). After verifying, sign-in works, a profile exists with the handle derived from the name, and the JWT has `user_role = user`. _Verified manually on 2026-10-16 against the local stack._ |
| **Privilege escalation (M1)** | Signed in, `PATCH /rest/v1/profiles` with `{"role":"admin"}`.                                            | `42501 permission denied`. _Verified on 2026-10-16._                                                                                                                                                                                                |
| Create recipe (M2)            | Wizard to Publish.                                                                                       | The recipe is visible to anon. The draft was never visible to others.                                                                                                                                                                               |
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
