# Design System

Status: **v2, approved 2026-10-17** and implemented in the app. v1 (warm spice palette, approved 2026-10-17) was built in M1, and the project owner then asked for a calmer, sticker-led direction. Hi-fi mockups for mobile and desktop are in [`docs/design/hifi.src.html`](design/hifi.src.html) (build with `node scripts/build-mockups.mjs`).

Tokens live in [`apps/web/src/theme/tokens.json`](../apps/web/src/theme/tokens.json), which is the source of truth: `pnpm tokens` regenerates the CSS and `pnpm tokens:check` verifies contrast. If this doc and the JSON disagree, the JSON wins, and this doc gets fixed.

## 1. Design direction

**Style:** calm, airy and tactile. A neutral canvas, white cards, one black action per screen. **The colour comes from food:** every ingredient appears as a die-cut sticker.

**Mood:** a clean kitchen counter with a sticker sheet of ingredients on it. Friendly, never cluttered.

**Who we design for first:** home cooks with low tech confidence, often using a mid-range Android phone on a counter, with wet or greasy hands. They're comfortable with WhatsApp and YouTube.

**Principles**

1. **Kitchen-proof.** Big targets (48 px minimum, 54–56 px for primary actions), 17 px base text, readable from arm's length. No long-press, no swipe-only actions.
2. **Words beside every icon.** No icon appears without a text label, apart from universally known close, back and share circles, and those still get an `aria-label`.
3. **Stickers carry meaning.** Ingredients, dishes and empty states use sticker art, so a recipe without a photo still looks rich, and a cook can recognise an ingredient before reading it.
4. **One black action.** Each screen has exactly one primary (black) button. Everything else is white or grey.
5. **Malayalam is first-class.** Every component is tested with Malayalam strings, which are often 30–60% longer than English and need taller line-height and no letter-spacing.
6. **Friendly, never scolding.** Errors explain what happened and what to do next.
7. **Fast is a feature.** Stickers are tiny WebP files (≈4 KB each, outline baked in). Skeletons instead of spinners. Motion ≤ 200 ms.

## 2. Brand

|                  |                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand name       | Placeholder **Recipebook / പാചകപ്പുസ്തകം**, defined only in `apps/web/src/brand/brand.ts`.                                                                            |
| Logo             | Placeholder: the "cooking" pan sticker plus the wordmark in Inter Semibold. To be replaced when the final name is chosen.                                             |
| Voice            | Like a kind neighbour who cooks well. Short sentences. Uses "you". Never says "invalid", "error occurred" or "failed to".                                             |
| Headline pattern | **Two-tone:** a statement in black, then a soft-grey continuation. "Good evening, Ammini. / What's cooking today?" · "Ammini's cookbook. / 12 recipes, 3 variations." |

## 3. Colour

The canvas stays neutral so the stickers and the cooks' photos do the talking. Dark mode is a real design: near-black canvas, white primary buttons, and stickers that keep their white border (like real stickers).

| Role                                    | Light                             | Dark                  | Use                                                                      |
| --------------------------------------- | --------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `bg`                                    | `#F2F1EF`                         | `#0F0F0E`             | Page canvas                                                              |
| `surface`                               | `#FFFFFF`                         | `#1A1A19`             | Cards, composer, nav, inputs                                             |
| `surface-sunken`                        | `#ECEAE7`                         | `#252523`             | Inactive chips, segmented controls, secondary buttons                    |
| `border` / `border-strong`              | `#E4E2DE` / `#8C8882`             | `#2E2D2B` / `#7B7771` | Hairlines / input borders (≥ 3:1)                                        |
| `text`                                  | `#151413`                         | `#F5F4F2`             | Body and headlines                                                       |
| `text-muted`                            | `#6B6862`                         | `#AAA6A0`             | Meta (time, servings), captions. ≥ 4.5:1.                                |
| `text-soft`                             | `#88847E`                         | `#86827C`             | **Large text only** (≥ 24 px): the grey second line of headlines. ≥ 3:1. |
| `primary` / `on-primary`                | `#151413` / `#FFFFFF`             | `#F5F4F2` / `#151413` | The one primary action per screen, active chips, send buttons            |
| `accent` + `accent-soft`                | `#BF3717` + `#FCE9E3`             | `#FF7A55` + `#3A1D14` | Sparingly: "Soon" badges, tips, likes. Chilli, a nod to the v1 palette.  |
| `leaf`, `warning`, `danger` (+ `-soft`) |                                   |                       | Success / veg, offline and unsaved, destructive actions and errors       |
| `diet-veg` / `diet-egg` / `diet-nonveg` | `#2E7D32` / `#A86F00` / `#8B2E16` |                       | Diet markers: shape plus word, never colour alone                        |
| `focus`                                 | `#2457C5`                         | `#8DB4FF`             | Focus ring, 3 px                                                         |

**Contrast:** `pnpm tokens:check` tests 33 pairs per theme, and **all pass** as of 2026-10-17. CI fails if any pair drops below its minimum.

## 4. Typography

|           |                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------- |
| Latin     | **Inter** (variable, OFL). Neutral and very legible, with slightly tight tracking on headlines. |
| Malayalam | **Noto Sans Malayalam** (variable, OFL)                                                         |
| Stack     | `Inter, Noto Sans Malayalam, system-ui, …`. Mixed strings pick the right font per glyph.        |
| Loading   | Self-hosted subset `woff2`, `font-display: swap`. No third-party font requests.                 |

The base is **17 px at "normal"**. The text-size setting gives 17 / 19 / 21 px, and every size is in `rem`.

| Token       | Size      | Line-height (Latin / **Malayalam**) | Weight | Tracking (Latin; Malayalam 0) | Use                            |
| ----------- | --------- | ----------------------------------- | ------ | ----------------------------- | ------------------------------ |
| `display`   | 2.375rem  | 1.08 / **1.4**                      | 500    | −0.035em                      | Desktop hero and recipe title  |
| `h1`        | 1.875rem  | 1.15 / **1.45**                     | 500    | −0.03em                       | Two-tone page headlines        |
| `h2`        | 1.375rem  | 1.25 / **1.5**                      | 600    | −0.02em                       | Section titles                 |
| `h3`        | 1.125rem  | 1.3 / **1.55**                      | 600    | −0.015em                      | Card titles                    |
| `lead`      | 1.0625rem | 1.5 / **1.7**                       | 400    | −0.01em                       | Intros                         |
| `body`      | 1rem      | 1.5 / **1.7**                       | 400    | −0.005em                      | Everything else                |
| `small`     | 0.875rem  | 1.45 / **1.65**                     | 500    | 0                             | Meta, captions. Never smaller. |
| `cook-step` | 1.75rem   | 1.35 / **1.6**                      | 500    | −0.02em                       | Cooking-mode step text         |

Headlines are **medium weight (500)**, not bold. The calm look comes from size and tracking rather than weight. Line-height and tracking switch automatically by the nearest `lang` attribute, and Malayalam never gets letter-spacing.

## 5. Stickers (new)

The signature element. Every ingredient, dish, empty state and decorative moment uses a die-cut sticker.

- **Source:** [Microsoft Fluent Emoji 3D](https://github.com/microsoft/fluentui-emoji) (MIT, compatible with AGPL), listed in `scripts/stickers.json`. `pnpm stickers` downloads them, resizes to 192 px, **bakes in a 4 px white die-cut outline** and writes WebP to `apps/web/public/stickers/<slug>.webp` (≈4 KB each). Credits are in `public/stickers/LICENSE`.
- **In the UI:** `<img class="sticker">`, with a single soft `drop-shadow(0 5px 7px rgb(21 20 19 / 16%))`. Decorative stickers get `alt=""`. When a sticker stands for an ingredient, the visible label next to it carries the meaning.
- **Sizes:** `sticker-sm` 40 px (chips, lists), `sticker-md` 56 px (cards, ingredient strip), `sticker-lg` 88 px (hero clusters, empty states). Any size up to 96 px stays crisp on 2× screens.
- **Placement:** stickers in a row alternate a slight tilt (−6° / +5°). Clusters tilt and overlap like a sticker sheet. Never more than about 7 in one row: show "+3" after that.
- **Mapping:** each dictionary ingredient gets a `sticker` slug (M2). Ingredients without a close match fall back to their category sticker (spice → herb, vegetable → leafy green). New stickers come only from licensed sets, never copied art.
- **Photos as stickers:** a cook's photo is shown as a tilted white "polaroid" (7 px white frame, 22 px radius, large shadow). With no photo, the main dish sticker sits on a soft warm gradient in the same frame.

## 6. Spacing

Base unit 4 px. Phone gutter 20 px, desktop 40 px. 22–32 px between sections, 12–16 px inside cards. Tap targets ≥ 48 px with ≥ 8 px between them.

## 7. Border radius and shadows

| `sm` 12 px  | `md` 18 px    | `lg` 24 px      | `xl` 32 px         | `pill`                            |
| ----------- | ------------- | --------------- | ------------------ | --------------------------------- |
| Small tiles | Inputs, notes | Cards, composer | Hero cards, sheets | Buttons, chips, nav, icon buttons |

The shadows are very soft. `sm` is for resting cards and icon buttons. `md` is for the composer and raised chips. `lg` is for the floating nav, the action bar and polaroids. In dark mode, elevation comes mostly from lighter surfaces.

## 8. Components

- **Icon button:** 44 px white circle, `sm` shadow, 20 px Lucide icon. Used for back, close, share and save in top bars.
- **Primary button (CTA):** black pill, 54 px tall, semibold 16 px, white text. Optional leading icon (▶ Start cooking). One per screen.
- **Secondary button:** `surface-sunken` pill (white in action bars), with text colour.
- **Chip:** 36 px pill, white with a hairline border. **Active chip = black** with white text. Optional count badge ("Recipes 12") or a small sticker on the left.
- **Segmented control:** `surface-sunken` track with a white raised thumb (Traditional | Metric, the − 4 + servings stepper).
- **Composer:** the search and describe field. A white `lg` card with placeholder text, and a bottom row with a grey action pill on the left (e.g. "Scan a recipe · Soon") and a black round send button on the right. Used on Home, Search, the kitchen picker and the wizard's ingredient search.
- **Recipe card:** a white `lg` card, top row with meta (time · diet) or (age · N ingredients), a **sticker row** of the main ingredients, then a centred title with the other-language title or category underneath. The photo variant uses a polaroid.
- **Ingredient strip / grid:** a sticker with the name (semibold 13 px) and amount underneath. The metric equivalent is in soft grey ("1 glass ≈200 ml").
- **Step:** a numbered white circle, text, and an optional time pill (tap to start a timer).
- **Action bar:** a floating white pill at the bottom with one black CTA plus up to two round buttons (Like).
- **Floating nav (mobile):** a white pill, 70 px tall, `lg` shadow, floating 14 px from the edges. Home · Search · **+** · Saved · Profile, every item labelled (11–13 px, px-capped as in v1), and the centre **+** is a raised 54 px black circle.
- **Top bar (desktop):** brand · search composer (centre, max 560 px) · Home / Saved · black "Add recipe" · avatar.
- **Inputs:** label above, 54 px, white, 1.5 px border, `md` radius. The error state has a `danger` border, an icon and a message.

All components keep the v1 state rules: loading as a skeleton, empty as a sticker cluster plus one sentence plus one action, plain-language errors with Try again, an offline banner, success toasts and disabled-with-reason.

## 9. Navigation and layout

| Range                  | Layout                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phone** < 768 px     | Single column, floating pill nav, 20 px gutters, a floating action bar on the recipe and wizard screens                                                             |
| **Tablet** 768–1023 px | 2-column card grids, floating nav. The recipe page goes side by side in landscape.                                                                                  |
| **Desktop** ≥ 1024 px  | Top bar, max width 1200 px, 3–4 column card grids. Two-column recipe page: ingredients and meta on the left, steps on the right, with Start cooking always visible. |

We design at 360 × 800 first, and `e2e/layout.spec.ts` checks for no clipping at 360 and 412 px in both languages and all text sizes.

## 10. Icons

Lucide (outline, 2 px stroke, ISC licence). 20 px in buttons, 23 px in the nav. Always with visible text, except the universal circles (back, close, share, save), which get `aria-label`s. Food and decoration use **stickers**, never icons.

## 11. Accessibility

The v1 rules are unchanged:

- semantic HTML,
- WCAG AA contrast (enforced in CI), with soft grey only for large text,
- full keyboard support with a visible focus ring,
- `lang` on mixed-language content,
- never colour alone (diet uses a shape and a word),
- reduced motion respected,
- a text-size setting up to 21 px with no horizontal scrolling at 360 px.

## 12. Motion

120 ms press (scale 0.98) and 200 ms sheets and toasts, with `ease-out`. Stickers get a 150 ms "lift" (shadow grows and they tilt back to 0°) when picked. Everything switches off under reduced motion.
