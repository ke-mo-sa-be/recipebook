import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Creates a confirmed user through the auth admin API, then drives the whole add-recipe wizard.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.E2E_SERVICE_KEY ?? '';
const here = dirname(fileURLToPath(import.meta.url));
const stamp = Date.now().toString(36);
const email = `wizard-${stamp}@example.com`;
const password = 'curry-leaf-42';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE_KEY, 'E2E_SERVICE_KEY is needed to create the test cook');
  const res = await request.post(`${API}/auth/v1/admin/users`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    data: {
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Wizard Cook', lang: 'en' },
    },
  });
  expect(res.status(), await res.text()).toBe(200);
});

async function signIn(page: Page) {
  await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
  await page.goto('/auth/sign-in?next=/add');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  const onboarding = page.getByRole('dialog', { name: /Welcome/ });
  await expect(onboarding).toBeVisible();
  await onboarding.getByRole('button', { name: 'Done' }).click();
  await expect(onboarding).toBeHidden();
}

const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 10_000 });

test('create, photograph, fill and publish a recipe; scaler, measures and a clean photo', async ({
  page,
  request,
}) => {
  await signIn(page);
  await expect(page.getByRole('heading', { name: /What are you cooking/ })).toBeVisible();

  // Name first, in English.
  await page.getByRole('radio', { name: 'English' }).check({ force: true });
  await page.getByLabel('Recipe name').fill('Wizard Fish Curry');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/edit\/[0-9a-f-]+\/basics$/);
  const recipeId = page.url().split('/edit/')[1]!.split('/')[0]!;

  // Basics: category, diet, servings 4.
  await page.getByRole('button', { name: 'Seafood' }).click();
  await page.getByRole('button', { name: /Non-veg/ }).click();
  const serves = page.getByRole('group', { name: 'Serves' });
  for (let i = 0; i < 4; i++) await serves.getByRole('button', { name: 'More Serves' }).click();
  await expect(serves.locator('output')).toHaveText('4');
  await saved(page);
  await page.getByRole('button', { name: 'Next: Photo' }).click();

  // Photo: a JPEG carrying GPS coordinates and a camera model.
  await page.getByLabel('Take or choose a photo').setInputFiles(join(here, 'fixtures/photo-with-gps.jpg'));
  const cover = page.locator('img[src*="public-media/recipes/"]').first();
  await expect(cover).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Next: Ingredients' }).click();

  // Ingredients: Manglish search finds the dictionary entries.
  const search = page.getByPlaceholder(/Search… jeerakam/);
  await search.fill('jeeragam');
  await page.getByRole('button', { name: /ജീരകം · Cumin/ }).click();
  await search.fill('kudampuli');
  await page.getByRole('button', { name: /Malabar tamarind/ }).click();
  await expect(page.locator('ol > li')).toHaveCount(2);
  await saved(page);
  await page.getByRole('button', { name: 'Next: Steps' }).click();

  // Steps: the timer is found in the text.
  await page.getByRole('button', { name: 'Add a step' }).click();
  await page.getByLabel('Step 1', { exact: true }).fill('Simmer the curry for 10 minutes.');
  await expect(page.getByText('Timer: 10 min')).toBeVisible();
  await saved(page);

  // Closing the browser mid-way loses nothing: reload and everything is still there.
  await page.reload();
  await expect(page.getByLabel('Step 1', { exact: true })).toHaveValue('Simmer the curry for 10 minutes.');
  await page.getByRole('button', { name: 'Next: Review' }).click();

  // Review and publish.
  await expect(page.getByText('2 ingredients')).toBeVisible();
  await expect(page.getByText('1 step')).toBeVisible();
  await page.getByRole('button', { name: 'Publish recipe' }).click();
  await expect(page).toHaveURL(new RegExp(`/r/${recipeId}`));
  await expect(page.getByRole('heading', { name: /Wizard Fish Curry/ })).toBeVisible();

  // Scaler: 4 → 8 doubles numbers. Measures: tsp shows its metric equivalent.
  const cumin = page.locator('li').filter({ hasText: 'Cumin' });
  await expect(cumin).toContainText('1 tsp');
  const servings = page.getByRole('group', { name: 'Servings' });
  for (let i = 0; i < 4; i++) await servings.getByRole('button', { name: 'More Servings' }).click();
  await expect(cumin).toContainText('2 tsp');
  await page.getByRole('radio', { name: 'Metric' }).click();
  await expect(cumin).toContainText('≈ 10 ml');

  // The public photo is WebP with no EXIF/XMP and none of the original's camera or GPS data.
  const src = await page.locator('img[src*="public-media/recipes/"]').first().getAttribute('src');
  const bytes = Buffer.from(await (await request.get(src!)).body());
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
  const text = bytes.toString('latin1');
  expect(text).not.toContain('EXIF');
  expect(text).not.toContain('XMP ');
  expect(text).not.toContain('GPS-Leaker');
  expect(text).not.toContain('TestPhone');
});

test('a signed-out visitor sees the published recipe but not the edit button', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
  await page.goto('/');
  await page
    .getByRole('link', { name: /Wizard Fish Curry/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Wizard Fish Curry/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
});
