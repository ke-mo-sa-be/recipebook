# UX Flows

The low-fi wireframes are in [`wireframes/index.html`](wireframes/index.html), and the visual rules are in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Every flow below must handle its loading, empty, error and offline states.

## Route and screen map

Bottom nav (mobile): **Home · Search · ➕ Add · Saved · Profile**, always with text labels. On desktop: top nav and a wider grid.

| Route                                                                                 | Screen                                                                                         | Access                     |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------- |
| `/`                                                                                   | Home: featured row, popular this week, latest, category tiles                                  | public                     |
| `/search?q=&cat=&diet=&time=&region=`                                                 | Search with filter sheet                                                                       | public                     |
| `/c/:category`                                                                        | Category feed                                                                                  | public                     |
| `/r/:id/:slug?`                                                                       | Recipe: scaler, unit toggle, Start cooking, save, share, cooked-it strip, variations, comments | public*                    |
| `/r/:id/cooked` · `/r/:id/variations`                                                 | Cooked-it gallery · Variations list                                                            | public                     |
| `/cook/:id`                                                                           | Cooking mode (also works offline for saved recipes)                                            | public*                    |
| `/u/:handle`                                                                          | Public profile with tabs: Recipes · Variations · Cooked it                                     | public                     |
| `/auth/sign-in` · `/auth/sign-up` · `/auth/forgot` · `/auth/reset` · `/auth/callback` | Auth                                                                                           | public                     |
| `/about` · `/guidelines` · `/terms` · `/privacy` · `/contact`                         | Legal pages (ml/en)                                                                            | public                     |
| `/saved`                                                                              | My Saved (available offline)                                                                   | signed in                  |
| `/add` → `/edit/:id/basics · photo · ingredients · steps · review`                    | Add-recipe wizard with autosave. The same wizard is used for editing.                          | signed in                  |
| `/add/import`                                                                         | Import from URL (M7)                                                                           | signed in                  |
| `/me` → `/u/:handle` · `/me/drafts`                                                   | My profile · My drafts                                                                         | signed in                  |
| `/settings`                                                                           | Language, text size, theme, profile edit, export my data, delete account                       | signed in                  |
| `/admin` · `/admin/reports/:id` · `/admin/content` · `/admin/log`                     | Report queue, review, hidden content, audit log                                                | moderator                  |
| `/admin/users` · `/admin/featured` · `/admin/dictionary`                              | Suspend and roles · Featured row · Ingredient dictionary                                       | admin (suspend: moderator) |
| `/s/:id` (served by `share-page`, not the SPA)                                        | Open Graph HTML for WhatsApp, then a redirect to `/r/:id`                                      | public                     |
| `/s/:id/card.png` (served by `share-card`)                                            | 1200×630 share image                                                                           | public                     |

\* Visible to the public only if the recipe is published and visible. The owner and moderators can always see it.

**Traefik routing (single host):**

- `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1`, `/functions/v1` → gateway
- `/s/*` → gateway, rewritten to `/functions/v1/share-page/*`
- everything else → nginx (SPA)

Share links always use `/s/:id`, so WhatsApp's crawler (which doesn't run JavaScript) gets real meta tags, and nothing has to guess the user agent.

## Flow 1: First visit and language

1. A first-time visitor opens any page.
2. A one-time sheet asks them to pick a language, with two big buttons: **മലയാളം** and **English**. Malayalam is preselected (decision D8).
3. The choice is stored on the device. Once they sign in, it's stored in `profiles.preferred_lang` too.

- **Success:** the whole UI is in the chosen language, and `<html lang>` is updated.
- **Failure:** if storage is blocked, the language applies for this visit only, and the sheet shows again next time.

## Flow 2: Sign up (email)

1. The person taps **Profile** (or any action that needs an account), then **Create account**.
2. They enter their name, email and a password (8+ characters, shown with a reveal toggle). Turnstile runs invisibly (M6).
3. The account is created and a verification email is sent in their chosen language. The screen says "Check your email" and offers a resend button with a 60-second cooldown.
4. They tap the link in the email, land back in the app signed in, and go to Flow 4.

- **Failure:**
  - email already used: "This email already has an account. Sign in instead?"
  - weak password: friendly rule text
  - email can't be sent: "Try again in a few minutes"
  - signing in before verifying: "Please confirm your email first" with a resend option

## Flow 3: Sign in with Google

1. On sign-in, they tap **Continue with Google**.
2. They go to Google's consent screen, come back to `/auth/callback`, and the PKCE exchange completes.
3. A new user goes to Flow 4. A returning user goes back to the page they came from.

- **Failure:** they cancel or there's an error, and they're returned to sign-in with "Google sign-in didn't finish. Try again."

## Flow 4: First sign-in (onboarding)

1. A sheet shows their suggested **handle** (e.g. `@ammini`) and display name, both editable.
2. Optionally they pick a district.
3. They tap **Done**. This sets `onboarded_at`.

- **Failure:** handle already taken shows an inline error with a suggestion. A bad format shows the rule: "3–30 letters, numbers or _".

## Flow 5: Add a recipe (M2)

1. They tap **Add**. If not signed in, they go to Flow 2 or 3, then come back.
2. The wizard has five steps: Basics → Photo → Ingredients → Steps → Review. Each step autosaves the draft ("Saved ✓").
3. They tap **Publish**. This gets a posting pass, sets the status to published, and shows the recipe page with a "Published!" toast and a share prompt.

- **Loading:** the progress bar stays put, and the Next button shows its loading state.
- **Error:** the field-level message is shown, and the draft is never lost. If offline, it says "Saved on this phone. We'll upload when you're back online."
- **Empty:** a recipe with no photo uses the category placeholder art.

## Flow 6: Cook (M5)

1. On a recipe, they tap **Start cooking**. The screen wake lock turns on.
2. They move with Back / Next, or by voice. Timers start with a tap and keep running across steps.
3. At the last step they see "Enjoy your meal", with prompts to post a cooked-it photo or save the recipe.

- **Failure:** if wake lock isn't supported, a notice says "Keep your screen on in phone settings." If voice isn't supported, the mic button is hidden.

## Flow 7: Share (M4)

1. They tap **Share**, then **WhatsApp**. This opens `wa.me` with the title and the `/s/:id` link. **More options…** opens the native share sheet.
2. WhatsApp's crawler fetches `/s/:id` and gets the Open Graph tags plus the card image.

## Flow 8: Report and moderate (M6)

1. They tap **⋯ → Report**, choose a reason and add an optional detail, then see "Thanks, a moderator will look at this."
2. Three reports from different people auto-hide the item. A moderator then hides, restores or deletes it, or suspends the user, and every action is logged.
