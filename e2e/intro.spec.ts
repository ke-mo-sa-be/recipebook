import { expect, test } from '@playwright/test';

// The welcome animation plays once per session on Home, ends by itself, and a tap skips it.
test.use({ reducedMotion: 'no-preference' });

test('plays on Home, rolls three steady reels into the name and gets out of the way', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rb-lang', 'en');
    // Sample the reels' boxes on every frame while they spin: a steady stage is what keeps it smooth.
    const boxes = new Set<string>();
    (window as unknown as { reelBoxes: Set<string> }).reelBoxes = boxes;
    const sample = () => {
      const intro = document.querySelector('[data-testid="intro"]');
      if (intro?.getAttribute('data-phase') === 'spinning') {
        const rects = [...intro.querySelectorAll('.pk-reel')].map((el) => {
          const r = el.getBoundingClientRect();
          return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
        });
        boxes.add(rects.join('|'));
      }
      if (!intro || intro.getAttribute('data-phase') !== 'landed') requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto('/');
  const intro = page.getByTestId('intro');
  await expect(intro).toHaveAttribute('data-phase', 'spinning');
  // Each reel holds the syllable in eight scripts and ends on Malayalam.
  await expect(intro.locator('.pk-reel')).toHaveCount(3);
  await expect(intro.locator('.pk-reel').first().locator('.pk-cell')).toHaveCount(9);
  await expect(intro.locator('.pk-reel .pk-cell:last-child')).toHaveText(['പാ', 'ച', 'കം']);
  await expect(intro).toHaveAttribute('data-phase', 'landed', { timeout: 3_000 });
  await expect(intro.getByText('Paachakam')).toBeVisible();
  const boxes = await page.evaluate(() => [...(window as unknown as { reelBoxes: Set<string> }).reelBoxes]);
  expect(boxes.length, 'the reels never moved or resized while spinning').toBe(1);
  await expect(intro).toBeHidden({ timeout: 3_000 });
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
