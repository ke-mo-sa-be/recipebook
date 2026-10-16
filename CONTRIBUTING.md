# Contributing

Thanks for helping. This project is built for people who aren't technical, so the bar is **simple, friendly and safe**.

## Before you start

1. Read [AGENTS.md](AGENTS.md). It's the working rules for humans and AI agents alike, plus the docs it links to.
2. For anything beyond a small fix, open an issue first, so we can agree it fits the [PRD](docs/PRD.md) and [ROADMAP](ROADMAP.md).

## Development setup

See [README → Quick start](README.md#quick-start-development).

## Rules that CI enforces

- `pnpm check` passes: format, lint, typecheck, unit tests, token contrast and the secret scan.
- `pnpm test:db` passes. **Every new table or policy needs pgTAP tests**, including the expected denials.
- No hard-coded UI strings. Add keys to both `apps/web/src/i18n/locales/ml/` and `en/`. If you can't write Malayalam, add the English and mark the Malayalam value `"TODO-ml: <english>"`, and a reviewer will translate it.
- No secrets, real env files or server-specific config. Templates go in `deploy/examples/`.
- Dependencies are pinned to exact versions and justified in the PR.

## Pull requests

- Keep each PR to one focused change, using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Update the docs in the same PR if behaviour, the schema, the API or security rules change, and add a CHANGELOG entry under _Unreleased_.
- For UI changes, include screenshots at 360 px wide in light and dark mode, in Malayalam and English.
- Say what you tested and what you couldn't test.

## Content contributions

Recipes for the seed data must be **your own words**. Don't copy text or photos from blogs or books. Ingredient dictionary additions (Malayalam, English and Manglish spellings) are very welcome.

## Security

Please don't file public issues for vulnerabilities. See [docs/SECURITY.md §10](docs/SECURITY.md#10-reporting-a-vulnerability).

## Code of conduct

Be kind. This is a kitchen table, not a debate stage. The Community Guidelines (written in M6) apply here too.
