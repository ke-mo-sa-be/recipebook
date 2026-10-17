import { expect, type Page } from '@playwright/test';

/** Nothing runs off the screen: page width, nav labels, headings and choice chips all fit. */
export async function expectNoClipping(page: Page) {
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    // clientWidth, not innerWidth: mobile Chrome widens innerWidth to fit overflowing content, which
    // would hide exactly the bug this check is for.
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw) out.push('page scrolls sideways');
    for (const el of document.querySelectorAll<HTMLElement>('nav a, h1, h2, fieldset label, button')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0) continue;
      if (box.left < -1 || box.right > vw + 1)
        out.push(`off-screen: ${el.tagName} "${el.textContent?.trim()}"`);
      // Clipped text: any text inside reaching outside the element's box (decorative tilted stickers
      // may overflow; text must not).
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        if (r.left < box.left - 1 || r.right > box.right + 1 || r.right > vw + 1) {
          out.push(`clipped: ${el.tagName} "${el.textContent?.trim()}"`);
          break;
        }
      }
    }
    return out;
  });
  expect(problems).toEqual([]);
}
