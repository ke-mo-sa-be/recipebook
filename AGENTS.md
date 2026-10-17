# AI Coding Agent Instructions

## 1. Project context

- **Project:** Paachakam / പാചകം (the name lives only in `apps/web/src/brand/brand.ts`; the repo and packages keep the older `recipebook` name)
- **Purpose:** a free, public, open-source community recipe platform, built for Kerala first and open to everyone. Malayalam comes first, with English as an equal. It's built to be kitchen-proof.
- **Primary users:** home cooks in Kerala, often with low tech confidence (comfortable with WhatsApp and YouTube), using mid-range Android phones on 4G.

## 2. Source of truth

Before any significant change, read the relevant docs in `/docs`:

| Doc                                              | Read it when                                            |
| ------------------------------------------------ | ------------------------------------------------------- |
| [`docs/PRD.md`](docs/PRD.md)                     | Any feature work: scope, acceptance criteria, non-goals |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Any UI. Tokens are in `apps/web/src/theme/tokens.json`. |
| [`docs/UX_FLOWS.md`](docs/UX_FLOWS.md)           | Screens, states, routes                                 |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)   | Where code goes, dependency rules, decisions D1–D7      |
| [`docs/DATABASE.md`](docs/DATABASE.md)           | Any schema or RLS change                                |
| [`docs/API.md`](docs/API.md)                     | RPCs, Edge Functions, storage paths                     |
| [`docs/SECURITY.md`](docs/SECURITY.md)           | Auth, permissions, uploads, secrets                     |
| [`docs/CODE_STYLE.md`](docs/CODE_STYLE.md)       | Always                                                  |
| [`docs/TESTING.md`](docs/TESTING.md)             | Before calling anything done                            |

Don't contradict these documents without first naming the conflict. Where `ROADMAP.md` and `PRD.md` disagree about what is in v1, `PRD.md` wins.

## 3. General rules

- Understand existing code before you change it. Reuse the existing components, hooks and `packages/core` utilities.
- Follow the design system: tokens only, no hard-coded colours or sizes. Tap targets ≥ 48 px. Every icon gets a text label.
- **Every UI string comes from `apps/web/src/i18n/locales/{ml,en}`.** Add both languages in the same change. Lint enforces this for JSX.
- Follow the database conventions: a migration for every schema change, RLS on every table, explicit grants, and a pgTAP test for every policy.
- Never put a service-role / secret key anywhere under `apps/`. Never commit secrets, real env files or server-specific config (that goes in the gitignored `deploy/local/`).
- Don't invent business requirements. If the PRD is silent, ask.
- Avoid new dependencies. If one is needed, justify it in the PR or commit and pin the exact version.
- Keep changes focused on the task. Don't reformat unrelated files.
- Respect sources: an import keeps structured data and the source link only, never blog prose or photos.

## 4. Planning (non-trivial tasks)

1. Read the relevant docs and code.
2. List the files you'll touch, any schema or API changes, and the tests you'll need.
3. Write a short plan. If it changes product behaviour, the schema or security, get approval first.

## 5. Implementation

- Make focused changes that follow established patterns and preserve existing behaviour.
- Features live in `apps/web/src/features/<name>/`. They talk to Supabase only through that feature's `api.ts`.
- Pure logic (scaler, measures, schemas, parsers) goes in `packages/core`. No DOM or Node APIs there, and relative imports use explicit `.ts` extensions.
- Prefer RLS + PostgREST + RPC. Use an Edge Function only when the work needs a secret, an external call or binary processing.

## 6. Validation

After implementing, run:

```bash
pnpm check            # format, lint, typecheck, unit tests, token contrast, secret scan
pnpm test:db          # pgTAP RLS tests (needs `pnpm db:start`)
pnpm db:lint
pnpm build
```

Then review the diff for unintended changes. For UI work, check the screen at 360 × 800 in both themes, in both languages, and at XL text size.

## 7. Documentation

Update the docs in the same change whenever any of these change: product behaviour, architecture, schema, API contracts, security rules or conventions. Add a `CHANGELOG.md` entry under _Unreleased_.

## 8. Conflict handling

If requirements conflict, don't guess. Name the conflict and ask.

## 9. Completion criteria

A task is complete only when:

- the requirements and acceptance criteria are met,
- `pnpm check`, `pnpm test:db` and `pnpm build` pass,
- no unintended files changed,
- the security rules are respected,
- the docs and CHANGELOG are updated,
- anything you couldn't verify is stated plainly.

Commit messages use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`…).
