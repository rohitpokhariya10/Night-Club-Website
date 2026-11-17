import {test, expect, type Page} from '@playwright/test';

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /GSAP target.*not found/.test(message.text())) messages.push(message.text());
  });
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

for (const [width, height] of [[1440, 900], [1024, 900], [768, 1024], [390, 844], [375, 812]]) {
  test(`clean hero composition and crowd separation at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.goto('/');
    // This captures before hydration: don't let Playwright inject caret styles into server-rendered inputs.
    if (width === 1440) await page.screenshot({path: 'artifacts/hero-cleanup/after-initial-1440.png', caret: 'initial'});
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    await expect(page.locator('.hero-orb, .hero-orb-ring, .hero-orb-logo, .hero-eyebrow')).toHaveCount(0);
    await expect(page.locator('.cinema-hero')).not.toContainText('COASTAL SOUL. LATE-NIGHT ENERGY.');
    await expect(page.locator('.cinema-hero')).not.toContainText('DEL MAR, CALIFORNIA — GOOD TIMES LIVE HERE');
    await expect(page.locator('h1')).toHaveText('DEL MAR. TURN IT UP.');
    await expect(page.locator('.hero-description')).toHaveText('Come for the drinks. Stay for the music. Make the night yours.');
    await expect(page.locator('.cinema-copy .actions, .cinema-copy .button')).toHaveCount(0);
    await expect(page.locator('.cinema-hero a[href="/reservations"]')).toHaveCount(0);
    await expect(page.locator('.header-book')).toHaveAttribute('href', '/reservations');
    await expect(page.locator('.header .logo')).toBeVisible();
    await expect(page.getByRole('link', {name: 'Jimmy O’s home', exact: true})).toHaveAttribute('href', '/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const selector of ['.cinema-copy h1', '.cinema-copy .hero-description']) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y).toBeGreaterThan(85);
      expect(box!.y + box!.height).toBeLessThan(height);
    }
    // Measure painted silhouettes, including raised hands, rather than the full transparent canvas box.
    const crowdTop = await page.locator('.hero-crowd canvas').evaluateAll(canvases => Math.min(...canvases.map(element => {
      const canvas = element as HTMLCanvasElement;
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x += 3) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 40) return canvas.getBoundingClientRect().top + y * canvas.clientHeight / canvas.height;
      }
      return Infinity;
    })));
    const description = await page.locator('.cinema-copy .hero-description').boundingBox();
    expect(crowdTop).toBeGreaterThan(description!.y + description!.height + 24);
    expect(crowdTop).toBeLessThan(height);
    await page.screenshot({path: `artifacts/hero-cleanup/after-${width}.png`});
    if (width === 1440) {
      await page.evaluate(() => window.scrollTo({top: 450, behavior: 'instant'}));
      await expect.poll(() => page.locator('.hero-wash').evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.3);
      await page.screenshot({path: 'artifacts/hero-cleanup/after-scroll-1440.png'});
    }
  });
}

for (const width of [1440, 390]) for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`keyboard skip link at ${width}px with ${reducedMotion} motion`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 900});
    await page.emulateMedia({reducedMotion});
    await page.goto('/');
    const skip = page.getByRole('link', {name: 'Skip to content', exact: true});
    await expect(skip).not.toBeFocused();
    await expect(skip).toHaveCSS('clip-path', 'inset(50%)');
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveCSS('clip-path', 'none');
    await expect(skip).toHaveCSS('outline-style', 'solid');
    const linkBox = await skip.boundingBox();
    const logoBox = await page.locator('.header .logo').boundingBox();
    expect(linkBox!.y).toBeGreaterThan(logoBox!.y + logoBox!.height);
    expect(linkBox!.x + linkBox!.width).toBeLessThan(width);
    if (reducedMotion === 'no-preference') await page.screenshot({path: `artifacts/hero-cleanup/skip-focused-${width}.png`});
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
    await expect(page).toHaveURL(/\/#main$/);
    await expect(skip).toHaveCSS('clip-path', 'inset(50%)');
    await page.keyboard.press('Tab');
    await expect(page.locator('.cinema-foot a')).toBeFocused();
    if (reducedMotion === 'reduce') {
      await expect(page.locator('.hero-skip')).toBeHidden();
      await expect(page.locator('.cinema-hero')).not.toHaveAttribute('data-ambient');
      await page.screenshot({path: `artifacts/hero-cleanup/reduced-${width}.png`});
    }
  });
}
