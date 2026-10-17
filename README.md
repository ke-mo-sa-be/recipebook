# Paachakam · പാചകം

**A free community recipe app, built for Kerala home cooks first and open to everyone.**
Malayalam-first, with English as an equal. Kitchen-proof: big text, one step at a time, the screen stays on. No ads, no life stories, no tracking. Free forever. Self-hostable. AGPL-3.0.

> **Status: early development (M1).** The design is approved. Accounts, profiles, settings and the app shell work; recipes arrive in M2. Nothing is usable by the public yet. See [ROADMAP.md](ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md).
>
> The repository and package names (`recipebook`, `@recipebook/*`) predate the product name and are kept for stability.

## What makes it different

- **Malayalam-first UI** with a bilingual ingredient dictionary. Search works in Malayalam, English and Manglish: _jeerakam ↔ ജീരകം ↔ cumin_.
- **Hands-free cooking mode:** one step per screen, huge text, wake lock, tap-to-start timers, an ingredient checklist, and voice "next / അടുത്തത്" where supported.
- **Kerala kitchen measures:** glass, cup, pidi, pinch, to taste, with approximate metric values. The servings scaler leaves "to taste" alone.
- **"Cooked it" photos, variations** ("make my version") and **WhatsApp share cards**.
- **You own your data:** export your recipes (JSON + schema.org) or delete everything.

## Screenshots

Coming with M2. In the meantime, see the low-fi wireframes in [`docs/wireframes/index.html`](docs/wireframes/index.html).

## Quick start (development)

**Requirements:** Node 24 LTS, pnpm 11 (`corepack enable`), Docker, and the [Supabase CLI](https://supabase.com/docs/guides/local-development) 2.121+.

```bash
git clone https://github.com/ke-mo-sa-be/recipebook.git && cd recipebook
pnpm install
cp .env.example .env                      # then fill in values from `supabase status`
cp .env.example supabase/.env             # server-side values for the CLI (keep SITE_URL etc.)
pnpm db:start                             # local Supabase: Postgres, Auth, Storage, Functions, Mailpit
pnpm dev                                  # http://localhost:5173
```

Useful commands:

| Command         | What it does                                                     |
| --------------- | ---------------------------------------------------------------- |
| `pnpm check`    | format, lint, typecheck, unit tests, contrast check, secret scan |
| `pnpm test:db`  | pgTAP row-level-security tests against the local database        |
| `pnpm db:reset` | Re-apply all migrations and the seed data                        |
| `pnpm tokens`   | Regenerate theme CSS from `apps/web/src/theme/tokens.json`       |

Test emails (verification and reset) appear in the local Mailpit inbox. Its URL is printed by `supabase status`.

## Documentation

|                                                                                                                      |                                        |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                                                                                           | What we're building and why            |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) · [docs/UX_FLOWS.md](docs/UX_FLOWS.md)                                | Look, feel, screens and flows          |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DATABASE.md](docs/DATABASE.md) · [docs/API.md](docs/API.md)     | How it works                           |
| [docs/SECURITY.md](docs/SECURITY.md) · [docs/TESTING.md](docs/TESTING.md) · [docs/CODE_STYLE.md](docs/CODE_STYLE.md) | Rules                                  |
| [SELF_HOSTING.md](SELF_HOSTING.md)                                                                                   | Run your own instance                  |
| [CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md)                                                          | Contributing, for humans and AI agents |

## Licence

[AGPL-3.0](LICENSE). Sticker art: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT). Icons: [Lucide](https://lucide.dev) (ISC). If you run a modified version for others, you must share your changes. The sample recipes in `supabase/seed/` (from M2) are written for this project and released under the same licence.
