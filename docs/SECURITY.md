# Security Guidelines

This is a public site that anyone can sign up to, and many users aren't technical. Security is a requirement, not a later phase. To report a vulnerability, see [Reporting](#10-reporting-a-vulnerability).

## 1. Authentication

- **Provider:** Supabase Auth (GoTrue), self-hosted.
- **Methods:**
  - email + password: minimum 8 characters, **email verification required** before sign-in, reset by email, a 60-second resend cooldown,
  - Google OAuth, using the PKCE flow.
- **Sessions:** a JWT that lasts 1 hour, plus refresh-token rotation (reuse window 10 s). The access-token hook adds `user_role` and `account_status` claims **for UI only**.
- **Bot protection:** Cloudflare Turnstile on sign-up and password reset (GoTrue's native captcha) and on posting (M6).

## 2. Authorization

**Roles** live in `profiles.role`: `user`, `moderator` and `admin`. They are changed only by admin RPCs (M6) or by `deploy/scripts/promote-admin.sh` on the server.

| Role           | Can                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor (anon) | Read published, visible content and public profiles                                                                                                                                         |
| User           | Everything a visitor can, plus create and edit their own content, like, save, comment, post cooked-it, report, export and delete their own account. Suspended users can read but not write. |
| Moderator      | Everything a user can, plus see hidden content, hide or restore content, suspend users, handle reports, read the moderation log                                                             |
| Admin          | Everything a moderator can, plus delete any content, change roles, manage the featured row and the ingredient dictionary                                                                    |

- **Authorization is enforced server-side**, by Postgres RLS **and** explicit grants (`auto_expose_new_tables = false`). Client checks only shape the UI.
- RLS reads the role and status from `profiles` through `private.is_active()`, `is_mod()` and `is_admin()`, never from JWT claims. That way a suspension or role change takes effect immediately.
- Privileged columns (`role`, `status`, `mod_state`, counters) are excluded from column grants, so users can't write them even on their own rows.

## 3. Secrets

- Never hard-code credentials or commit secrets. `.env*` files are gitignored, except `.env.example`, which holds no real values.
- **The service-role / secret key never reaches the client.** It's used only by Edge Functions and server scripts. `scripts/check-no-secrets.mjs` runs in CI and fails if the frontend source or build mentions it, or if committed files contain anything that looks like a key, JWT or private key.
- Server-specific config (hostnames, compose overrides, real env files) lives in `deploy/local/`, which is gitignored.
- If a credential is ever exposed, rotate it immediately: the JWT secret means regenerating keys, then the SMTP password, Google secret and Turnstile secret. Record the incident in the CHANGELOG without the secret itself.
- The Supabase CLI's local dev keys are public, well-known demo values. They're only valid against a local stack.

## 4. Environment variables

| Public (shipped to browsers, `VITE_` prefix)                                                     | Private (server only)                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`, `VITE_TURNSTILE_SITE_KEY` | `SITE_URL`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`, `SMTP_*`, `TURNSTILE_SECRET_KEY`, plus the self-host compose secrets (`JWT_SECRET`, `POSTGRES_PASSWORD`, `SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`, `DASHBOARD_*`) |

Every variable is documented in [`.env.example`](../.env.example).

## 5. API security

| Area              | Rule                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Input validation  | Zod schemas from `packages/core` on the client and in every Edge Function. Postgres CHECK constraints and enum types are the final word. Text lengths are capped everywhere.                                                                                                                                                                                                         |
| Rate limiting     | Per IP at Traefik (keyed on `CF-Connecting-IP`, trusted only from the tunnel). Per user in Postgres triggers, with stricter limits for accounts in their first 7 days. Auth endpoints use GoTrue's own limits.                                                                                                                                                                       |
| CORS              | Single origin (decision D2), so no cross-origin API access is needed. Edge Functions allow only `SITE_URL`.                                                                                                                                                                                                                                                                          |
| Authentication    | `apikey` plus the user JWT. Edge Functions use `verify_jwt = true` unless a function is explicitly public (`health`, `share-page`, `share-card`).                                                                                                                                                                                                                                    |
| Authorization     | RLS on every table, with a pgTAP test for every policy. Edge Functions re-check ownership before any service-role operation.                                                                                                                                                                                                                                                         |
| Exposure          | Only `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1` and `/functions/v1` are routed publicly. **Supabase Studio, `/pg` (meta) and other gateway paths are never public.** Studio is LAN-only or reached by SSH tunnel. It's off by default in local dev, because the CLI publishes ports on every interface.                                                                   |
| Outbound requests | `push` only posts to known push services: the same allowlist is a CHECK on `push_subscriptions.endpoint` and is re-checked in the function, so a user can't aim it at an internal address. `import-recipe` refuses private, loopback, link-local and metadata IP ranges, including after DNS resolution and redirects. It has a 5 s timeout and a 2 MB cap, and parses JSON-LD only. |

### Staging and local dev

- Staging runs on the Supabase CLI stack. Since v0.2 it is a **public preview** (no SSO) and sends `X-Robots-Tag: noindex`. It sends real email and holds early family accounts, so treat its database as real data.
- The Supabase CLI publishes its ports on all interfaces, including the database with its well-known default password. On a shared network, block them at the host firewall (for Docker, the `DOCKER-USER` chain) or only run the stack while needed. Because staging now holds real accounts, those ports must not be reachable from outside the server.

## 6. Data protection

- **Likes and saves are private.** Only counts are public, and only you can read your own rows.
- **Push notifications:** a device's subscription is removed when you sign out, so the next person on a shared phone doesn't get your notifications. The push service drops it when the app is uninstalled. Payloads hold only a name, a recipe title and a comment snippet, encrypted end to end (RFC 8291) to the device. The VAPID private key lives only in the server's `supabase/.env`.

|                |                                                                                                                                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sensitive data | Email address (in `auth.users` only, never in `profiles`), password hash (GoTrue), IP addresses (rate-limit logs only), photo metadata (stripped)                                                                                                                                                              |
| Encryption     | TLS from the browser to Cloudflare, and through the tunnel to the server. Passwords are hashed with bcrypt by GoTrue. Backups are encrypted (restic) in M8.                                                                                                                                                    |
| Public fields  | Handle, display name, avatar, bio, district and published content. The new-user trigger **never** derives a public field from the email address.                                                                                                                                                               |
| Retention      | Content stays until the user deletes it or a moderator removes it. `incoming` uploads are deleted after 24 hours. Rate-limit and auth logs follow container log rotation (7 days).                                                                                                                             |
| Deletion       | Deleting an account removes the auth user, which cascades to the profile, recipes, comments, cooked posts, likes, saves and reports filed. The `delete-account` function also deletes all storage objects. Others' variations remain, marked "original removed". Moderation log entries keep only a dead UUID. |

## 7. Logging

- **Never log** passwords, tokens, API keys, JWTs, email bodies, or uploaded file contents.
- **Do log** auth events (GoTrue), moderation actions (the `moderation_actions` table), Edge Function errors (without request bodies), and rate-limit rejections.

## 8. File uploads

|                 |                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed types   | `incoming`: JPEG, PNG, WebP and HEIC. `public-media`: **WebP only**.                                                                                                                                                                    |
| Maximum size    | 8 MB to `incoming`, 1 MB per processed image                                                                                                                                                                                            |
| Validation      | The client resizes to at most 1600 px and re-encodes to WebP, which drops EXIF and GPS. `process-image` then checks ownership and the rate limit, re-encodes through imgproxy (metadata stripped again), and writes 400/800/1600 sizes. |
| Storage         | Users can write **only** to their own `incoming/{uid}/` folder. Only the service role can write to `public-media`. So every public image has passed through the server pipeline.                                                        |
| Known trade-off | Draft photos are public-by-URL at unguessable UUID paths. Moderators can hard-delete media.                                                                                                                                             |

## 9. Security checklist (per milestone)

- [ ] Authentication flows tested (M1: done for email + verification, and the token hook; Google sign-in pending OAuth credentials)
- [ ] Authorization tested: a pgTAP policy test for every table, plus `01_rls_coverage` (no table without RLS)
- [ ] Server-side validation (CHECK constraints and Zod in functions)
- [ ] Secrets protected (`check-no-secrets` in CI)
- [ ] Sensitive data protected (no email in public tables)
- [ ] Rate limiting in place (M6)
- [ ] File uploads validated (M2)
- [ ] Errors don't expose sensitive details. The UI shows i18n messages only.
- [ ] Dependencies reviewed (`pnpm audit --prod` in CI, versions pinned exactly, GitHub Actions pinned by SHA)

## 10. Reporting a vulnerability

Please don't open a public issue. Use GitHub's **private vulnerability reporting** on this repository (Security → Report a vulnerability). We aim to reply within 7 days.
