import { test } from '@playwright/test';
import { expectNoClipping } from './layout-helpers.ts';

// Malayalam labels are long and people use large text: every combination must fit a small phone.
for (const lang of ['ml', 'en'] as const) {
  for (const size of ['normal', 'large', 'xl'] as const) {
    test(`no clipping: ${lang}, ${size} text`, async ({ page }) => {
      await page.addInitScript(
        ([l, s]) => {
          localStorage.setItem('rb-lang', l);
          localStorage.setItem('rb-text-size', s);
        },
        [lang, size],
      );
      for (const path of [
        '/',
        '/settings',
        '/auth/sign-in',
        '/auth/sign-up',
        '/me',
        '/u/ammini',
        '/search?q=curry&diet=veg&time=60',
        '/search?with=coconut,onion,herb',
        '/c/sweets',
        '/whats-new',
      ]) {
        await page.goto(path);
        await page.locator('main h1, main h2').first().waitFor();
        await page.waitForLoadState('networkidle'); // results and Home rows have arrived
        await expectNoClipping(page);
      }
      // A seeded recipe page: long bilingual titles, ingredient rows, the scaler and step timers.
      await page.goto('/');
      await page.locator('main a[href^="/r/"]').first().click();
      await page.locator('main h1').first().waitFor();
      await expectNoClipping(page);
      // The filters sheet: every chip label in both languages.
      await page.goto('/search');
      await page.locator('main h1').first().waitFor();
      await page.getByRole('button', { name: /Filters|ഫിൽട്ടറുകൾ/ }).click();
      await page.getByRole('dialog').waitFor();
      await expectNoClipping(page);
    });
  }
}
