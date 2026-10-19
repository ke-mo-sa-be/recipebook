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
