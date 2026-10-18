import { expect, test } from '@playwright/test';

// The welcome animation plays once per session on Home, ends by itself, and a tap skips it.
test.use({ reducedMotion: 'no-preference' });

test('plays on Home, lands on the name and gets out of the way', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rb-lang', 'en');
    // Each word shows for ~150 ms, too quick to poll for, so record every caption the intro renders.
    const seen: string[] = [];
    (window as unknown as { introSeen: string[] }).introSeen = seen;
    new MutationObserver(() => {
      document.querySelectorAll('[data-testid="intro"] [aria-hidden="true"] .text-small').forEach((el) => {
        const text = el.textContent ?? '';
        if (text && seen.at(-1) !== text) seen.push(text);
      });
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto('/');
  const intro = page.getByTestId('intro');
  await expect(intro).toBeVisible();
  await expect(intro.getByText('Paachakam')).toBeVisible({ timeout: 3_000 });
  await expect(intro).toBeHidden({ timeout: 3_000 });
  const seen = await page.evaluate(() => (window as unknown as { introSeen: string[] }).introSeen);
  expect(seen).toEqual([
    'Tamil · samaiyal',
    'Telugu · vanta',
    'Kannada · aduge',
    'Hindi · rasoi',
    'Bengali · ranna',
    'Marathi · swayampak',
    'Gujarati · raandhan',
    'Odia · roshei',
  ]);
  // Once per session: a reload goes straight to Home.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(intro).toHaveCount(0);
});

test('Skip ends it at once, and a shared recipe link never shows it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByTestId('intro')).toHaveCount(0);

  const fresh = await page.context().browser()!.newContext({ reducedMotion: 'no-preference' });
  const other = await fresh.newPage();
  await other.goto(`${test.info().project.use.baseURL}/u/ammini`);
  await expect(other.locator('main h1').first()).toBeVisible();
  await expect(other.getByTestId('intro')).toHaveCount(0);
  await fresh.close();
});
