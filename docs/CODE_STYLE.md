# Code Style & Conventions

## 1. General principles

- Prefer readable code over clever code, and consistency over novelty.
- Keep functions focused, and don't add abstractions until they're needed.
- Reuse existing components (`components/ui`), hooks, and `packages/core` utilities.
- Make small, focused changes that leave unrelated files alone.

## 2. Naming

| Thing                | Convention                                                                                               | Example                            |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| React components     | `PascalCase`, declared with `function` (not `const X = () =>`, which the i18n lint rule doesn't inspect) | `function RecipeCard()`            |
| Hooks                | `useCamelCase`                                                                                           | `useRecipe(id)`                    |
| Functions, variables | `camelCase`                                                                                              | `scaleAmount`                      |
| Constants            | `UPPER_SNAKE` for module-level constant tables                                                           | `DISTRICTS`, `HANDLE_PATTERN`      |
| Files                | Components `PascalCase.tsx`. Everything else `camelCase.ts`. Tests `*.test.ts(x)` next to the code.      | `RecipeCard.tsx`, `scale.ts`       |
| i18n keys            | `namespace.area.key`, in camelCase segments                                                              | `recipe.actions.startCooking`      |
| Database             | `snake_case`. Plural table names. FKs `<thing>_id`. Timestamps `*_at`.                                   | `recipe_steps.recipe_id`           |
| RPCs                 | `verb_noun`                                                                                              | `make_variation`, `search_recipes` |
| Edge Functions       | `kebab-case` folder names                                                                                | `process-image`                    |
| Migrations           | `YYYYMMDDHHMMSS_short_name.sql`                                                                          | `20261016080100_profiles.sql`      |

## 3. Folder structure

- **Features:** `apps/web/src/features/<domain>/` holds that domain's `components/`, `hooks/`, `api.ts` (the only place it calls Supabase) and `routes.tsx`.
- **Design-system primitives:** `apps/web/src/components/ui/`. No business logic.
- **Cross-cutting utilities:** `apps/web/src/lib/`, for the Supabase client, query client, wake lock, speech and image compression.
- **Pure, shared logic:** `packages/core/src/`. If an Edge Function also needs it, it belongs here.
- **Tests:** next to the code (`*.test.ts`). Database tests go in `supabase/tests/database/NN_name.test.sql`.

## 4. Imports

- Relative imports carry the explicit `.ts` / `.tsx` extension. That's required in `packages/core` (for Deno) and used everywhere for consistency.
- Import order: external packages, then `@recipebook/core`, then relative imports. Use `import type` for type-only imports (`verbatimModuleSyntax` enforces it).
- No deep imports into another feature's internals. Share through `packages/core` or `components/ui`.

## 5. Components

Components should:

- have a single responsibility,
- take data through props, with data fetching in hooks that call `api.ts`,
- use design tokens only (Tailwind utilities mapped to tokens), with no raw hex values or pixel font sizes,
- get **every** user-visible string, including `aria-label`, `alt` and `title`, from `t()`, with keys added to both `ml` and `en` in the same change,
- set `lang` on content whose language differs from the UI (for example `recipe.content_lang`),
- implement loading, empty, error and disabled states (see `DESIGN_SYSTEM.md` §12).

## 6. Functions

- Each function does one logical thing and has a clear name.
- Return early and avoid deep nesting.
- Pure where possible, especially in `packages/core`.

## 7. Error handling

- **Do:**
  - in feature `api.ts`, check `{ error }` from supabase-js and throw a typed `AppError` with an i18n key,
  - let TanStack Query surface errors to an `ErrorState`,
  - in Postgres, raise user-facing errors with an i18n key as the message,
  - in Edge Functions, return `{ error: { code, message } }` with the right status.
- **Don't:**
  - swallow errors silently (an empty `catch {}` needs a comment saying why it's safe),
  - show raw database messages to users,
  - use `console.log` in committed code.

## 8. Comments

Comments explain _why_: the reason something exists, an important trade-off, or behaviour that isn't obvious. Don't write comments that repeat the code. SQL migrations get a header comment saying what they add and any security reasoning.

## 9. Logging

- **Web:** no logging in production builds apart from `console.error` in error boundaries.
- **Edge Functions:** a structured `console.log(JSON.stringify({ fn, event, … }))`, never with tokens, emails or request bodies (see `SECURITY.md` §7).

## 10. Formatting

|               |                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatter     | Prettier 3 (`.prettierrc.json`: single quotes, 110 columns, trailing commas)                                                                              |
| Linter        | ESLint 10 flat config, using typescript-eslint, react-hooks, react-refresh and `i18next/no-literal-string` (JSX)                                          |
| Type checking | TypeScript 6, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, through `pnpm typecheck`. Edge Functions are checked with `deno check` in CI. |
| SQL           | Lower-case keywords, two-space indent, one statement per logical block. `pnpm db:lint` must be clean.                                                     |

## 11. Do

- Reuse existing patterns.
- Keep changes focused.
- Follow the project conventions.
- Remove dead code.
- Pin new dependencies to exact versions.

## 12. Don't

- Create duplicate utilities.
- Add unnecessary dependencies.
- Ignore the architecture (see `ARCHITECTURE.md` §8).
- Change unrelated files.
- Hard-code UI strings, colours or the brand name.
