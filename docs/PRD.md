# Product Requirements Document

## 1. Product overview

|                          |                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **Product name**         | Recipebook (working name; final name TBD, changed only in `apps/web/src/brand/brand.ts`)      |
| **One-line description** | A free, ad-free community recipe app, built for Kerala home cooks first and open to everyone. |
| **Product type**         | Community web app / installable PWA                                                           |
| **Primary platform**     | Mobile web (mid-range Android, 4G). Desktop is supported.                                     |
| **Licence**              | AGPL-3.0, self-hostable                                                                       |

## 2. Problem

- **What's wrong today:** recipe sites bury the recipe under ads, pop-ups and life stories. They're English-first and hard to use with greasy hands on a small phone. Kerala's home recipes are passed around as WhatsApp forwards and voice notes and get lost.
- **Why it matters:** the audience is often non-technical. Many are women of all ages who would happily share and cook family recipes, if the tool were as easy as WhatsApp.
- **What people do now:** YouTube cooking channels, WhatsApp forwards, handwritten notebooks, ad-heavy blogs.

## 3. Goals

- **Primary:** Kerala home cooks can find, cook and share recipes in Malayalam or English, on a phone, with no learning curve.
- **Secondary:**
  - be kitchen-proof: one step at a time, huge text, the screen stays on, timers;
  - users own their data: export it, or delete everything;
  - a trustworthy public space, with moderation from day one;
  - free forever, with no ads, tracking or paywalls.

## 4. Target users

### Home cook (primary)

Low to medium tech confidence. Uses WhatsApp and YouTube daily. Malayalam or English. Cooks for family.

- **Needs:** big readable text, Malayalam UI, quick search by ingredient (including local names), step-by-step cooking.
- **Pain points:** ads, tiny text, English-only ingredient names, losing family recipes.

### Contributor

A confident cook who wants to share recipes and show off "cooked it" results.

- **Needs:** an easy add flow that works on a phone, drafts that save themselves, and credit when someone makes a variation.
- **Pain points:** long forms, losing work, photos that don't upload on a slow connection.

### Moderator / admin

A trusted volunteer.

- **Needs:** a clear report queue, one-tap actions, an audit trail.

## 5. User stories

- As a cook, I want to search "jeerakam" and find recipes that use cumin, so that I can cook with what I have.
- As a cook, I want to follow one big step at a time while the screen stays on, so that I don't touch my phone with messy hands.
- As a cook, I want to scale servings and see traditional measures (glass, pidi) with metric equivalents.
- As a contributor, I want to add a recipe step by step, with my draft saved automatically, so that I never lose work.
- As a contributor, I want to share a recipe to WhatsApp with a nice preview card.
- As a cook, I want to post a "cooked it" photo and make my own variation of a recipe.
- As a cook, I want to save recipes and open them offline.
- As anyone, I want to report harmful content. As a moderator, I want to hide it quickly.
- As a user, I want to export my recipes and delete my account and data.

## 6. Core features (v1)

Detailed acceptance criteria are in [`../ROADMAP.md` → Milestone acceptance criteria](../ROADMAP.md#milestone-acceptance-criteria) and [`UX_FLOWS.md`](UX_FLOWS.md).

1. **Accounts and profiles:**
   - email + password (with verification and reset) and Google sign-in,
   - a profile with display name, avatar, short bio, optional district and preferred language,
   - a public profile page listing their recipes, variations and cooked-it posts.
2. **Recipes:**
   - create, edit and delete your own recipes, with draft and published states,
   - fields:
     - title in Malayalam and/or English,
     - cover photo and optional step photos,
     - short description, category, region, diet,
     - prep and cook time, servings,
     - ingredients (amount, unit, dictionary link, note),
     - numbered steps (with optional photo and timer),
     - tips.
3. **Recipe page:** servings scaler, traditional ↔ metric toggle, Start cooking, save, share, cooked-it, variations and comments.
4. **Kerala kitchen measures:** glass, cup, tea cup, ladle, pidi, pinch, tsp, tbsp, to taste, g, kg, ml, l and pieces, with approximate metric equivalents. Non-numeric amounts never scale.
5. **Bilingual ingredient dictionary:** about 150 starter ingredients with Malayalam, English and Manglish names. Search works across all three.
6. **Discovery:**
   - Home: featured (admin-set), popular this week, latest, categories,
   - search with Postgres FTS + trigram + the dictionary,
   - filters for category, diet, total time and region.
7. **Cooking mode:**
   - one step per screen, huge text, screen wake lock,
   - auto-detected timers you tap to start, an ingredient checklist,
   - voice "next" / "back" in English and Malayalam (adutthathu, thirike / munpathe) where the browser supports it, with big buttons always available.
8. **Community:** flat comments, likes, saves (available offline), cooked-it posts with a counter, and variations ("Make my version" copies a recipe linked to the original).
9. **Sharing:** a WhatsApp button first, the native share sheet second, a server-rendered Open Graph share card.
10. **Trust and safety:**
    - roles (user / moderator / admin), reports on any content or profile, auto-hide at 3 reports,
    - an admin panel,
    - rate limits, Turnstile, upload validation (WebP re-encode, EXIF/GPS stripped),
    - legal pages in both languages.
11. **Data ownership:** export your recipes (JSON + schema.org Recipe). Deleting your account deletes your data.
12. **URL import:** schema.org Recipe JSON-LD. Only the structured ingredients and steps plus the source link are kept.
13. **PWA:** installable, app-shell caching, offline saved recipes.

## 7. Non-goals (v1)

These are not in v1 and are tracked in [`../ROADMAP.md`](../ROADMAP.md):

- voice recipe entry and heritage card scan (v1.5),
- festival collections and the Onam sadya planner (v1.5),
- pantry "what can I cook", meal planner and diet tags (v2),
- followers, notifications and native apps,
- machine translation of recipe content,
- ads, subscriptions, paywalls and tracking/analytics SDKs, ever.

## 8. MVP scope

- **Must have:** everything in §6 except URL import.
- **Nice to have:** realtime comment updates, and URL import (planned in M7).
- **Future:** see the roadmap.

## 9. Success metrics

Privacy-preserving and server-side only. No analytics SDKs.

- **Primary:**
  - recipes published per week,
  - share of visits that start cooking mode (counted server-side, anonymously),
  - median time to publish a first recipe.
- **Secondary:**
  - cooked-it posts per recipe,
  - the share of reports handled within 24 hours,
  - Lighthouse mobile ≥ 90.

## 10. Constraints

| Area      | Constraint                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Technical | Self-hosted Supabase on one home server, total RAM ≤ 3 GB for the stack. Must also run on Supabase Cloud by changing env vars only. |
| Business  | Free forever, no revenue. Run costs must stay near zero (free-tier email, free Cloudflare).                                         |
| Design    | Malayalam-first, kitchen-proof, WCAG AA, 17 px base text, 48 px targets.                                                            |
| Legal     | AGPL-3.0. Imports keep facts plus the source link only. Plain-language terms and privacy policy in both languages.                  |

## 11. Assumptions

- Most users browse without an account. A minority contribute.
- Android Chrome is the main browser. Web Speech recognition for Malayalam is only available online, through the browser vendor's service.
- Kerala measures vary by household, so metric equivalents are always shown as approximate ("≈").

## 12. Open questions

- The final product name and logo.
- The exact values for Kerala measures. A draft goes to family review in M2.
- Who the first moderators are, beyond the admin.

## 13. Milestones and Definition of Done

| Milestone | Scope                                     |
| --------- | ----------------------------------------- |
| M0        | Design gate: design system and wireframes |
| M1        | Foundation                                |
| M2        | Recipes                                   |
| M3        | Discovery                                 |
| M4        | Community                                 |
| M5        | Cooking mode                              |
| M6        | Trust                                     |
| M7        | Polish                                    |
| M8        | Go-live                                   |

A milestone is complete when:

- [ ] its acceptance criteria are met and checked on a real phone (the checklist goes in the CHANGELOG entry),
- [ ] `pnpm check`, `pnpm test:db` and `pnpm build` pass, and CI is green,
- [ ] the security rules in [`SECURITY.md`](SECURITY.md) are satisfied, with an RLS test for every table,
- [ ] the docs and CHANGELOG are updated, and the release is tagged `v0.<milestone>.0`.
