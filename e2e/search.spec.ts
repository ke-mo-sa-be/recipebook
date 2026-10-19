import { expect, test, type Page } from '@playwright/test';

// M3 acceptance against the dev seed: spelling-proof search, filters that combine, the kitchen picker
// and category pages. Signed out, in English.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rb-lang', 'en');
    localStorage.setItem('rb-install-dismissed', String(Date.now()));
  });
});

const results = (page: Page) => page.locator('main a[href^="/r/"]');

for (const q of ['jeerakam', 'jeeragam', 'ജീരകം', 'cumin']) {
  test(`"${q}" finds the seed recipes that use cumin`, async ({ page }) => {
    await page.goto(`/search?q=${encodeURIComponent(q)}`);
    // Other tests may publish recipes into the same seed, so check for the seed recipes, not a count.
    await expect(page.getByRole('heading', { name: /^\d+ recipes?$/ })).toBeVisible();
    await expect(results(page).filter({ hasText: 'Dal Tadka' })).toHaveCount(1);
    await expect(results(page).filter({ hasText: 'Avial' })).toHaveCount(1);
  });
}

test('"kudampuli" finds the fish curry, and a typed search goes through the URL', async ({ page }) => {
  await page.goto('/search');
  await page
    .locator('main')
    .getByRole('searchbox', { name: /Search recipes/ })
    .fill('kudampuli');
  await page.locator('main').getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/search\?q=kudampuli$/);
  // Featured, so it comes first among equally good matches.
  await expect(results(page).first()).toContainText('Kerala Fish Curry');
});

test('filters combine, show as removable chips and survive a reload', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('button', { name: /Filters/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Filters' });
  await sheet.getByRole('button', { name: 'Veg', exact: true }).click();
  await sheet.getByRole('button', { name: 'Under 30 min' }).click();
  await sheet.getByRole('button', { name: 'Show recipes' }).click();
  await expect(page).toHaveURL(/diet=veg/);
  await expect(page).toHaveURL(/time=30/);
  // Veg includes vegan: the three seed recipes of 30 minutes or less (other tests may add more).
  await expect(page.getByRole('heading', { name: /^\d+ recipes$/ })).toBeVisible();
  await expect(results(page).filter({ hasText: 'Kerala Fish Curry' })).toHaveCount(0);
  for (const name of ['Sulaimani', 'Pazham Pori', 'Puttu']) {
    await expect(results(page).filter({ hasText: name })).toHaveCount(1);
  }
  await page.reload();
  await expect(results(page).filter({ hasText: 'Pazham Pori' })).toHaveCount(1);
  // Removing the time chip widens the results.
  await page.getByRole('button', { name: /Under 30 min/ }).click();
  await expect(page).not.toHaveURL(/time=/);
  await expect(results(page).filter({ hasText: 'Avial' })).toHaveCount(1); // 45 minutes
});

test('nothing found explains why and can clear the filters', async ({ page }) => {
  await page.goto('/search?q=curry&cat=sweets');
  await expect(page.getByRole('heading', { name: 'Nothing matches yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page).toHaveURL(/\/search\?q=curry$/);
  await expect(results(page).first()).toBeVisible();
});

test('the kitchen picker finds recipes using what you have, most matches first', async ({ page }) => {
  await page.goto('/');
  const picker = page.getByRole('region', { name: /in your kitchen/ });
  await picker.getByRole('button', { name: 'Coconut' }).click();
  await picker.getByRole('button', { name: 'Shallots' }).click();
  await picker.getByRole('button', { name: 'Find recipes' }).click();
  await expect(page).toHaveURL(/\/search\?with=coconut%2Conion|\/search\?with=coconut,onion/);
  await expect(page.getByRole('button', { name: /Coconut/ })).toBeVisible();
  await expect(results(page).first()).toBeVisible();
  expect(await results(page).count()).toBeGreaterThan(3);
});

test('Home links into category pages with counts, and category chips filter', async ({ page }) => {
  await page.goto('/');
  const cats = page.getByRole('region', { name: /Browse by category/ });
  await cats.getByRole('link', { name: /Curry/ }).click();
  await expect(page).toHaveURL(/\/c\/curry$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Curry');
  await expect(page.getByRole('heading', { name: /^\d+ recipes$/ })).toBeVisible();
  await expect(results(page).filter({ hasText: 'Kadala Curry' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Non-veg' }).click();
  await expect(page).toHaveURL(/\/c\/curry\?diet=nonveg/);
  await expect(results(page).filter({ hasText: 'Kadala Curry' })).toHaveCount(0);
  await page.goto('/c/not-a-category');
  await expect(page.getByRole('heading', { name: "We couldn't find that page" })).toBeVisible();
});

test('Home shows featured picks and quick recipes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: /Picked for you/ }).locator('a[href^="/r/"]')).toHaveCount(3);
  const quick = page.getByRole('region', { name: /Ready in 30 minutes/ });
  await expect(quick.locator('a[href^="/r/"]').first()).toBeVisible();
  await quick.getByRole('link', { name: /See all/ }).click();
  await expect(page).toHaveURL(/\/search\?time=30$/);
});
