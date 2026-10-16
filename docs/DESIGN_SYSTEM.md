# Design System

Status: **M0 — awaiting approval**. Tokens live in [`apps/web/src/theme/tokens.json`](../apps/web/src/theme/tokens.json). That file is the source of truth: `pnpm tokens` regenerates the CSS and `pnpm tokens:check` verifies contrast. If this doc and the JSON disagree, the JSON wins, and this doc gets fixed.

## 1. Design direction

**Style:** warm, colourful and friendly, but never cluttered. Food photos are the hero, and the interface stays quiet around them.

**Mood:** a well-lit Kerala kitchen. Coconut-cream walls, a turmeric tin, red chillies drying, a sprig of curry leaves.

**Who we design for first:** home cooks with low tech confidence, often using a mid-range Android phone propped on a counter, with wet or greasy hands. They're comfortable with WhatsApp and YouTube.

**Principles**

1. **Kitchen-proof.** Big targets (48 px minimum, 56 px for primary actions), big text (17 px base), readable from arm's length. No precise gestures. Nothing is hidden behind a long-press or a swipe.
2. **Words beside every icon.** No icon appears without a text label, apart from universally known close and back arrows, and those still get an `aria-label`.
3. **One thing per screen when hands are busy.** That means the wizard and cooking mode.
4. **Malayalam is first-class.** Every component is tested with Malayalam strings, which are often 30–60% longer than English and need taller line-height.
5. **Friendly, never scolding.** Errors explain what happened and what to do next, in plain words.
6. **Fast is a feature.** Skeletons instead of spinners. Images lazy-load with a blurred placeholder colour. Nothing animates for longer than 200 ms.

## 2. Brand

|            |                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand name | Placeholder **Recipebook / പാചകപ്പുസ്തകം**. It is defined only in `apps/web/src/brand/brand.ts`.                                                                                               |
| Logo       | Placeholder wordmark: the name set in the display style, with a small turmeric-coloured leaf mark. To be replaced when the final name is chosen, again in `brand.ts` and `public/icons/` only. |
| Voice      | Like a kind neighbour who cooks well. Short sentences. Uses "you". Never says "invalid", "error occurred" or "failed to".                                                                      |

**Microcopy examples**

| Situation     | English                                                                       | Malayalam                                                                                                  |
| ------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Empty Saved   | Nothing saved yet. Tap **Save** on any recipe to keep it here — even offline. | ഇതുവരെ ഒന്നും സേവ് ചെയ്തിട്ടില്ല. ഏത് റെസിപ്പിയിലും **സേവ്** അമർത്തൂ — ഇന്റർനെറ്റ് ഇല്ലാതെയും ഇവിടെ കാണാം. |
| Network error | Couldn't reach the kitchen. Check your internet and try again.                | കണക്ഷൻ കിട്ടിയില്ല. ഇന്റർനെറ്റ് നോക്കിയിട്ട് വീണ്ടും ശ്രമിക്കൂ.                                            |
| Form field    | Please add a name for your recipe.                                            | റെസിപ്പിക്ക് ഒരു പേര് നൽകൂ.                                                                                |
| Rate limit    | You're posting fast! Take a short break and try again in a few minutes.       | കുറച്ച് വേഗത്തിലാണല്ലോ! അൽപ്പം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കൂ.                                                  |

_The Malayalam copy is a first draft. It goes to family review in M7._

## 3. Colour palette

There are two themes, light and dark, and both are real designs. Dark is not a simple inversion: it uses warm roasted browns, not grey. The theme follows the system setting by default and can be overridden in Settings.

| Role                                    | Light                             | Dark                              | Use                                                                                                                       |
| --------------------------------------- | --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `bg`                                    | `#FFF7EA` coconut cream           | `#17110C` roasted                 | Page background                                                                                                           |
| `surface`                               | `#FFFFFF`                         | `#221A13`                         | Cards, sheets, inputs                                                                                                     |
| `surface-sunken`                        | `#F7EBD6`                         | `#120D09`                         | Wells, skeletons, inactive chips                                                                                          |
| `border`                                | `#EADBC2`                         | `#3B2E23`                         | Decorative dividers only                                                                                                  |
| `border-strong`                         | `#8C7660`                         | `#8E7A66`                         | Input borders and checkboxes (≥ 3:1)                                                                                      |
| `text`                                  | `#2B1B10`                         | `#FBF1E3`                         | Body text                                                                                                                 |
| `text-muted`                            | `#6A5443`                         | `#CDB9A2`                         | Meta: time, servings, captions (still ≥ 4.5:1)                                                                            |
| `primary`                               | `#C2361C` chilli                  | `#FF7A55`                         | Primary buttons, links, the Add button                                                                                    |
| `primary-soft` / `on-primary-soft`      | `#FDE3DA` / `#8F2410`             | `#3D1E14` / `#FFB49C`             | Selected chips, highlights                                                                                                |
| `accent`                                | `#F4B728` turmeric                | `#F6C445`                         | Featured badges, timers, stars. Always with dark text.                                                                    |
| `accent-soft` / `on-accent-soft`        | `#FDF0C7` / `#6B4700`             | `#3A2E10` / `#F8D676`             | Tip boxes, "Cooked it" strip                                                                                              |
| `leaf`                                  | `#2E7D32` curry-leaf              | `#79C77B`                         | Success, checked ingredients, veg marker                                                                                  |
| `leaf-soft` / `on-leaf-soft`            | `#E1F1DC` / `#1F5A23`             | `#1D3320` / `#A5DCA6`             | Success banners                                                                                                           |
| `warning` / `warning-soft`              | `#9A5B00` / `#FDEBCF`             | `#F0A847` / `#3A2A12`             | Unsaved changes, offline notice                                                                                           |
| `danger` / `danger-soft`                | `#A8122E` / `#FBE0E4`             | `#FF7A8E` / `#3D1219`             | Destructive actions, form errors. Deliberately crimson rather than chilli, so an error never looks like a call to action. |
| `focus`                                 | `#2457C5`                         | `#8DB4FF`                         | Focus ring. Blue, because it must stand out against every warm colour.                                                    |
| `diet-veg` / `diet-egg` / `diet-nonveg` | `#2E7D32` / `#A86F00` / `#8B2E16` | `#79C77B` / `#F6C445` / `#E08A6C` | Diet markers. Always shown with a shape and a word.                                                                       |

**Contrast:** `pnpm tokens:check` tests 30 pairs per theme. As of 2026-10-16 **all 60 pass**. The lowest are `border-strong on bg`, light (4.05, needs 3) and `leaf on bg`, light (4.82, needs 4.5). CI fails if any pair drops below its minimum.

**Never rely on colour alone.** Diet uses the Indian food-label shapes (a square with a dot for veg, a triangle for non-veg) plus a word. Errors use an icon and a message. Checked ingredients get a strikethrough and a tick.

## 4. Typography

|           |                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Latin     | **Figtree** (variable, OFL): friendly, open, very legible at small sizes                                                      |
| Malayalam | **Noto Sans Malayalam** (variable, OFL): modern unicode shaping, wide glyph coverage                                          |
| Stack     | `Figtree, Noto Sans Malayalam, system-ui, …`. Mixed strings like "2 cup അരി" pick the right font per glyph automatically.     |
| Loading   | Both fonts are self-hosted as subset `woff2` files with `font-display: swap`. No Google Fonts CDN, so no third-party request. |

The base size is **17 px at "normal"**. Settings → Text size scales the whole UI: normal 17 px, large 19 px, extra large 21 px. Every size below is in `rem`, so everything scales together.

| Token       | Size             | Line-height (Latin / **Malayalam**) | Weight | Use                                         |
| ----------- | ---------------- | ----------------------------------- | ------ | ------------------------------------------- |
| `display`   | 2.25rem (38 px)  | 1.1 / **1.4**                       | 800    | Recipe title on hero                        |
| `h1`        | 1.875rem (32 px) | 1.15 / **1.45**                     | 800    | Page titles                                 |
| `h2`        | 1.5rem (25.5 px) | 1.25 / **1.5**                      | 750    | Section titles                              |
| `h3`        | 1.25rem (21 px)  | 1.3 / **1.55**                      | 700    | Card titles                                 |
| `lead`      | 1.125rem (19 px) | 1.5 / **1.7**                       | 500    | Intro text, ingredient lines                |
| `body`      | 1rem (17 px)     | 1.5 / **1.7**                       | 400    | Everything else                             |
| `small`     | 0.875rem (15 px) | 1.45 / **1.65**                     | 500    | Meta and captions. Never smaller than this. |
| `cook-step` | 1.75rem (30 px)  | 1.4 / **1.6**                       | 600    | Cooking-mode step text                      |

**Malayalam rules**

- Malayalam line-heights apply through `:lang(ml)`. Every element whose content language is known carries a `lang` attribute: UI strings, recipe content (`recipes.content_lang`) and user names.
- Malayalam has stacked conjuncts and tall vowel signs, so it is never clipped. No fixed heights on text containers, no `line-clamp` without `padding-block` slack, and no `overflow: hidden` on single-line labels.
- Buttons must fit their Malayalam label, which is often the longer one. They wrap to two lines rather than truncating.
- No letter-spacing on Malayalam text, and no all-caps styling. Latin labels are sentence case too.

## 5. Spacing

The base unit is 4 px. The scale runs 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96.

- Page side gutter is 16 px on phones and 24 px on tablets and desktop.
- There are 32 px between sections and 12–16 px inside cards.
- Tap targets are **≥ 48 px** (`--rb-size-tap`). Primary actions and cooking-mode controls are **≥ 56 px** (`tap-lg`). There's at least 8 px between adjacent targets.

## 6. Border radius

| `sm` 8 px          | `md` 14 px                 | `lg` 20 px    | `xl` 28 px          | `pill`                     |
| ------------------ | -------------------------- | ------------- | ------------------- | -------------------------- |
| Inputs, checkboxes | Buttons, chips' containers | Cards, images | Bottom sheets, hero | Chips, Add button, toggles |

## 7. Shadows

These are warm-tinted (brown, not black) in light mode. In dark mode, elevation comes mostly from lighter surfaces, with shadows as support.

- `sm`: resting cards
- `md`: raised cards, sticky bars
- `lg`: sheets, dialogs, the floating Add button

## 8. Buttons

| Variant       | Look                                                                   | When                                             |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| **Primary**   | `primary` fill, `on-primary` text, `md` radius, 56 px tall, weight 700 | One per screen: Publish, Start cooking, Next     |
| **Secondary** | `surface` fill, 2 px `border-strong` outline, `text` colour            | Back, Cancel, alternatives                       |
| **Soft**      | `primary-soft` fill, `on-primary-soft` text                            | Save, Like, Share and other "toggle-ish" actions |
| **Danger**    | `danger` fill, `on-danger` text                                        | Delete, always after a confirm sheet             |
| **Ghost**     | No fill, `primary` text, underline on hover                            | Inline links like "See all"                      |

- Icon buttons are icon plus label. A label only goes under the icon in the bottom nav and the recipe action bar.
- **Disabled:** 45% opacity, `cursor: not-allowed`, and a reason shown nearby ("Add at least one ingredient").
- **Loading:** the label stays and a 16 px spinner appears inside. The button keeps its width and is not clickable twice.
- **Pressed:** scales to 0.98. **Focus:** 3 px `focus` ring with a 2 px offset, always visible on keyboard focus (`:focus-visible`).

## 9. Inputs

- **Default:** `surface` fill, 2 px `border-strong` border, `sm` radius, 52 px tall, 17 px text. The label always sits _above_ the field. We never rely on placeholder-only labels.
- **Focus:** 2 px border in `focus` colour plus a 3 px focus ring.
- **Error:** `danger` border, an error icon, and the message below in `danger`. The field gets `aria-invalid` and `aria-describedby`.
- **Disabled:** `surface-sunken` fill and muted text.
- **Placeholder:** `text-muted`, an example only ("e.g. Kerala fish curry"), never instructions.
- **Number and amount fields:** big −/+ steppers (56 px) beside the field, `inputmode="decimal"`, and fraction quick-picks (½ ¼ ¾).

## 10. Cards

**Recipe card** layout:

- 4:3 photo (`lg` radius, or the category placeholder art when there's no photo),
- title in `h3`, up to 2 lines with Malayalam slack,
- a meta row: time · servings · diet marker,
- a counter row: ❤ likes · 🍳 cooked-it.

Cards use `surface`, `sm` shadow, 12 px padding and no border. On phones, Home shows horizontal rails of 160 px cards, and grids run 2 columns on phones, 3 on tablets and 4 on desktop.

## 11. Navigation

- **Mobile bottom nav** (< 768 px), 68 px tall, always visible except in cooking mode and the wizard:
  - **Home · Search · Add · Saved · Profile**,
  - every item has an icon and a label, and the active item gets a `primary` colour pill behind its icon,
  - **Add** is a raised 56 px chilli-red circle in the centre.
- **Desktop top nav** (≥ 1024 px): logo on the left, search field in the centre, then Add (primary button), Saved, and an avatar menu.
- **Header** on inner pages: a back button (labelled), the title, and at most one action on the right.

## 12. States

Every screen and component specifies all of these:

| State        | Rule                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**  | Skeleton blocks in `surface-sunken` with a gentle shimmer, which is disabled under `prefers-reduced-motion`. No full-page spinners. |
| **Empty**    | A friendly illustration slot, one sentence saying what will appear here, and one action ("Add your first recipe").                  |
| **Error**    | Plain-language cause plus a **Try again** button. The technical detail stays in the console and is never shown to the user.         |
| **Offline**  | A slim `warning-soft` banner: "You're offline — saved recipes still work." Online-only actions are disabled with the reason given.  |
| **Success**  | A toast at the bottom (above the nav) for 4 s in `leaf-soft`, announced through `aria-live="polite"`.                               |
| **Disabled** | See buttons. A reason is always given.                                                                                              |

## 13. Icons

- **Library:** Lucide (outline, tree-shaken, ISC licence).
- **Sizes:** 24 px default, 28 px in the bottom nav and cooking mode, 2 px stroke.
- **Style:** outline, with rounded caps and joins.
- **Labels:** always paired with visible text (see Principle 2). Decorative icons get `aria-hidden="true"`.
- **Diet markers** are custom SVGs (square with a dot, triangle), not Lucide icons.

## 14. Responsive design

| Range                  | Layout                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Phone** < 768 px     | Single column, bottom nav, 16 px gutters, sticky action bar on the recipe page                                                       |
| **Tablet** 768–1023 px | 2–3 column grids. Bottom nav stays (tablets often sit on counters). Recipe page has ingredients and steps side by side in landscape. |
| **Desktop** ≥ 1024 px  | Top nav. Content max 1200 px. Reading max 680 px. 4-column grids.                                                                    |

We design and test at 360 × 800 first (the most common mid-range Android size), then scale up.

## 15. Accessibility

- Semantic HTML: landmarks, real `<button>` and `<a>` elements, and labelled form controls.
- WCAG AA contrast, enforced in CI (§3).
- Full keyboard navigation with a visible `:focus-visible` ring, and a skip link.
- Accessible names for every control, plus `lang` attributes on mixed-language content so screen readers pronounce it correctly.
- Never rely on colour alone (§3).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Text-size setting up to 21 px base, with no horizontal scrolling at 360 px wide.
- Tested with axe (CI) and a TalkBack spot check (M7).

## 16. Motion

The motion tokens are 120 ms (press), 200 ms (sheets, toasts) and `ease-out`. Nothing bounces. Cooking-mode step changes slide horizontally so you know which way you went. All of this switches off under reduced motion.

## 17. Imagery

- Photos are always `object-fit: cover` with a dominant-colour placeholder while loading.
- Sizes are 400 / 800 / 1600 WebP chosen with `srcset`.
- **Placeholder art for no-photo recipes:** a flat illustration per category (a banana leaf for rice, a clay pot for curry, a tumbler for drinks, and so on) on a soft palette background. Original artwork is drawn in M2 as simple SVGs. No stock images, and nothing copied from Dribbble.

## 18. Component inventory

Each component gets states for default, hover, pressed, focus, disabled, loading and error where they apply, plus a Malayalam-label check:

- **Inputs and controls:** Button, IconButton, Input, Textarea, Select (as a bottom sheet on mobile), Stepper, Checkbox, Toggle, Chip (filter / choice)
- **Content:** RecipeCard, RecipeRail, CategoryTile, DietMarker, Avatar, ProfileHeader, CommentItem, CookedPhoto
- **Navigation and overlays:** Sheet, Dialog (confirm), Toast, BottomNav, TopNav, PageHeader, WizardProgress
- **States:** Skeleton, EmptyState, ErrorState, OfflineBanner
- **Cooking:** TimerChip (idle / running / done), StepView (cooking mode)
- **Admin:** ReportCard
