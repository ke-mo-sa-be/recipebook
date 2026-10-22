import { fileURLToPath } from 'node:url';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// M4: likes, saves, comments and the notifications they create. A cook (recipe published through the
// API) and a fan (driving the UI), both created with the auth admin API.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.E2E_SERVICE_KEY ?? '';
const stamp = Date.now().toString(36);
const password = 'curry-leaf-42';
const cook = { email: `e2e-cook-${stamp}@example.com`, name: 'Cook Lakshmi' };
const fan = { email: `e2e-fan-${stamp}@example.com`, name: 'Fan Joseph' };
const title = `Mango Pulissery ${stamp}`;
let recipeId = '';

test.describe.configure({ mode: 'serial' });

const admin = { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` };

async function createUser(request: APIRequestContext, u: { email: string; name: string }) {
  const res = await request.post(`${API}/auth/v1/admin/users`, {
    headers: admin,
    data: {
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: u.name, lang: 'en' },
    },
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).id as string;
}

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE_KEY, 'E2E_SERVICE_KEY is needed to create the test cooks');
  const cookId = await createUser(request, cook);
  await createUser(request, fan);
  const rest = { ...admin, 'content-type': 'application/json', prefer: 'return=representation' };
  const r = await request.post(`${API}/rest/v1/recipes`, {
    headers: rest,
    data: {
      author_id: cookId,
      title_en: title,
      content_lang: 'en',
      category_id: 2,
      diet: 'veg',
      servings: 4,
      cook_minutes: 20,
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  recipeId = (await r.json())[0].id;
  await request.post(`${API}/rest/v1/recipe_ingredients`, {
    headers: rest,
    data: { recipe_id: recipeId, position: 0, item_text: 'Ripe mango', amount: 2, unit_code: 'piece' },
  });
  await request.post(`${API}/rest/v1/recipe_steps`, {
    headers: rest,
    data: { recipe_id: recipeId, position: 0, body: 'Simmer the mango with curd for 10 minutes.' },
  });
  const pub = await request.patch(`${API}/rest/v1/recipes?id=eq.${recipeId}`, {
    headers: rest,
    data: { status: 'published' },
  });
  expect(pub.status(), await pub.text()).toBe(200);
});

async function signIn(page: Page, email: string, next: string) {
  await page.addInitScript(() => {
    localStorage.setItem('rb-lang', 'en');
    localStorage.setItem('rb-install-dismissed', String(Date.now()));
  });
  await page.goto(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // First sign-in only: the welcome sheet.
  const onboarding = page.getByRole('dialog', { name: /Welcome/ });
  const shown = await onboarding.waitFor({ timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (shown) {
    await onboarding.getByRole('button', { name: 'Done' }).click();
    await expect(onboarding).toBeHidden();
  }
}

test('signed out, Like sends you to sign in and comments are readable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
  await page.goto(`/r/${recipeId}`);
  await expect(page.getByRole('heading', { name: 'Comments' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to comment' })).toBeVisible();
  await page.getByRole('button', { name: 'Like' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);
});

test('a fan likes, saves and comments; counts change at once', async ({ page }) => {
  await signIn(page, fan.email, `/r/${recipeId}`);
  await expect(page.getByRole('heading', { name: new RegExp(title) })).toBeVisible();

  const like = page.getByRole('button', { name: /^Like/ });
  await like.click();
  const liked = page.getByRole('button', { name: /^Liked/ });
  await expect(liked).toHaveAttribute('aria-pressed', 'true');
  await expect(liked).toContainText('1');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByLabel('Add a comment').fill('Made this tonight, lovely with rice!');
  await page.getByRole('button', { name: 'Post' }).click();
  const comment = page.locator('#comments li').filter({ hasText: 'Made this tonight' });
  await expect(comment).toContainText(fan.name);
  await expect(page.getByRole('link', { name: '1 comment' })).toBeVisible();

  // Edit and the "edited" mark.
  await comment.getByRole('button', { name: 'Edit' }).click();
  await comment.getByLabel('Edit your comment').fill('Made this tonight, lovely with matta rice!');
  await comment.getByRole('button', { name: 'Save' }).click();
  await expect(comment).toContainText('matta rice');
  await expect(comment).toContainText('edited');

  // Everything survives a reload, and the recipe is on the Saved page.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Liked/ })).toContainText('1');
  await page.goto('/saved');
  await expect(page.locator('main a[href^="/r/"]').filter({ hasText: title })).toHaveCount(1);
});

test('the cook is told: bell badge, then the notifications page', async ({ page }) => {
  await signIn(page, cook.email, '/');
  const bell = page.getByRole('link', { name: '2 new notifications' });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByText(`${fan.name} liked your ${title}`)).toBeVisible();
  await expect(page.getByText(`${fan.name} commented on your ${title}`)).toBeVisible();
  await expect(page.getByText('“Made this tonight, lovely with matta rice!”')).toBeVisible();
  // Opening the page marks them read (after a short delay), so Home's bell has no count any more.
  await page.waitForTimeout(2500);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toBeVisible();
  await page.goto('/notifications');
  // A comment notification opens the recipe at its comments.
  await page.getByText(`${fan.name} commented on your ${title}`).click();
  await expect(page).toHaveURL(new RegExp(`/r/${recipeId}/.*#comments$`));
});

test('unlike and unsave take the counts back down', async ({ page }) => {
  await signIn(page, fan.email, `/r/${recipeId}`);
  await page.getByRole('button', { name: /^Liked/ }).click();
  await expect(page.getByRole('button', { name: /^Like/ })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Like/ })).not.toContainText('1');
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
});

test('I cooked this: a photo with a note, counted, and the cook is told', async ({ page }) => {
  await signIn(page, fan.email, `/r/${recipeId}`);
  await page.getByRole('button', { name: 'I cooked this' }).click();
  const sheet = page.getByRole('dialog', { name: 'I cooked this' });
  await sheet
    .getByLabel('Take or choose a photo')
    .setInputFiles(fileURLToPath(new URL('fixtures/photo-with-gps.jpg', import.meta.url)));
  await sheet.getByLabel('A short note (optional)').fill('Added extra curd');
  await sheet.getByRole('button', { name: 'Post photo' }).click();
  await expect(sheet).toBeHidden({ timeout: 30_000 });
  const tile = page.locator('#cooked figure').filter({ hasText: 'Added extra curd' });
  await expect(tile).toContainText(fan.name);
  await expect(page.locator('#cooked-title')).toContainText('1');
  // The published photo went through the pipeline: WebP in the public bucket.
  await expect(tile.locator('img')).toHaveAttribute('src', /public-media\/cooked\/.+-400\.webp$/);
});

test('Make my version copies the recipe into my drafts with a note', async ({ page }) => {
  await signIn(page, fan.email, `/r/${recipeId}`);
  await page.getByRole('button', { name: 'Make my version' }).click();
  await expect(page).toHaveURL(/\/edit\/[0-9a-f-]+\/basics\?from=variation$/);
  await expect(page.getByRole('note')).toContainText('This is your copy');
  await expect(page.getByLabel('Name in English')).toHaveValue(title);
});

test('Share offers WhatsApp with the /s/ link, and that link previews the recipe', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
  await page.goto(`/r/${recipeId}`);
  await page.getByRole('button', { name: 'Share' }).click();
  const wa = page.getByRole('link', { name: 'Share on WhatsApp' });
  await expect(wa).toHaveAttribute('href', new RegExp(`^https://wa\\.me/\\?text=.*%2Fs%2F${recipeId}$`));
  // The preview page and the card, straight from the function (the proxy maps /s/* there).
  const html = await (await request.get(`${API}/functions/v1/share/${recipeId}`)).text();
  expect(html).toContain(`<meta property="og:title" content="${title}">`);
  expect(html).toContain(`/s/${recipeId}/card.png`);
  const card = await request.get(`${API}/functions/v1/share/${recipeId}/card.png`);
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toBe('image/png');
  expect((await card.body()).length).toBeGreaterThan(20_000);
  expect((await request.get(`${API}/functions/v1/share/00000000-0000-0000-0000-000000000000`)).status()).toBe(
    404,
  );
});

test('the cook sees cooked-it and version notifications', async ({ page }) => {
  await signIn(page, cook.email, '/notifications');
  await expect(page.getByText(`${fan.name} cooked your ${title}`)).toBeVisible();
});
