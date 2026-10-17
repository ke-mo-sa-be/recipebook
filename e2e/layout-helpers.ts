import { expect, type Page } from '@playwright/test';

/** Nothing runs off the screen: page width, nav labels, headings and choice chips all fit. */
export async function expectNoClipping(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    if (document.documentElement.scrollWidth > window.innerWidth) out.push('page scrolls sideways');
    const vw = window.innerWidth;
    for (const el of document.querySelectorAll<HTMLElement>('nav a, h1, h2, fieldset label, button')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.left < -1 || r.right > vw + 1) out.push(`off-screen: ${el.tagName} "${el.textContent?.trim()}"`);
      if (el.scrollWidth > el.clientWidth + 1) out.push(`clipped: ${el.tagName} "${el.textContent?.trim()}"`);
    }
    return out;
  });
  expect(problems).toEqual([]);
}
