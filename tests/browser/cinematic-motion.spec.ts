import {test, expect, type Page} from '@playwright/test';

/** Regression checks for the homepage scroll choreography (DELTA-CINEMATIC-MOTION-IMPLEMENTATION.md). */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {if (message.type() === 'error') list.push(message.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const jump = (page: Page, top: number) => page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), top);
const matrix = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => {const m = new DOMMatrix(getComputedStyle(el).transform); return {scale: Math.hypot(m.a, m.b), y: m.f};});

test('desktop hero holds (CSS sticky) and recedes under the rising page, then scrolls away; its light sleeps when covered', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/lenis/);
  expect(await page.locator('.cinema-hero').evaluate(el => getComputedStyle(el).position)).toBe('sticky');
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  // 0% — the hero is untouched and readable.
  expect((await matrix(page, '.cinema-media')).scale).toBeCloseTo(1, 2);
  await expect(page.locator('.cinema-copy')).toHaveCSS('opacity', '1');
  // 50% — the next panel covers half the viewport; the hero stays put and recedes.
  await jump(page, 450);
  await expect.poll(async () => (await matrix(page, '.cinema-media')).scale).toBeLessThan(.97);
  await expect.poll(() => page.locator('.cinema-hero').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(0);
  await expect.poll(() => page.locator('.scene-cover').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBe(450);
  expect(Number(await page.locator('.cinema-copy').evaluate(el => getComputedStyle(el).opacity))).toBeLessThan(.2);
  // 100%+ — the hold has ended (no stuck section), the light sleeps while covered, page scrolls on normally.
  await jump(page, 1100);
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'paused');
  await expect.poll(() => page.locator('.cinema-hero').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThan(0);
  await expect.poll(() => page.locator('#discover').evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThan(0);
  // Reverse — the scene scrubs back and playback resumes.
  await jump(page, 0);
  await expect.poll(async () => (await matrix(page, '.cinema-media')).scale).toBeCloseTo(1, 2);
  await expect(page.locator('.cinema-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
});

test('fast jumps never leave content hidden, and every scene ends at rest', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const top of [3000, 9999999, 1200, 9999999]) await jump(page, top);
  await page.waitForTimeout(1600); // time-based typography reveals finish
  // Decorative aria-hidden script lines are translucent by design and excluded.
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-home] .scene-cover :is(h2, h3, p, img, .button, blockquote, address)')].filter(el => !el.closest('[aria-hidden="true"]')).filter(el => {
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < .99) return true;
    return false;
  }).map(el => el.outerHTML.slice(0, 80)));
  expect(hidden).toEqual([]);
  await expect(page.locator('[data-home] .mline')).toHaveCount(0);
  for (const selector of ['.night-out-frame', '.special-feature > .photo .photo-media', '.event-tile', '.celebration-image .photo']) {
    await page.locator(selector).first().scrollIntoViewIfNeeded();
  }
  await jump(page, 9999999);
  await expect.poll(async () => (await matrix(page, '.special-feature > .photo .photo-media')).scale).toBeCloseTo(1, 2);
  await expect.poll(async () => (await matrix(page, '.event-tile')).y).toBeCloseTo(0, 0);
  await expect(page.locator('.celebration-image .photo')).toHaveCSS('clip-path', 'inset(0%)');
});

test('scenes are scrubbed by scroll position (intermediate states), not replayed fades', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  const top = await page.locator('.special-feature').evaluate(el => el.getBoundingClientRect().top + scrollY);
  const scaleAt = async (y: number) => {await jump(page, y); await page.waitForTimeout(250); return (await matrix(page, '.special-feature > .photo .photo-media')).scale;};
  const a = await scaleAt(top - 900), b = await scaleAt(top - 600), c = await scaleAt(top - 300), back = await scaleAt(top - 600);
  expect(a).toBeGreaterThan(b);
  expect(b).toBeGreaterThan(c);
  expect(back).toBeCloseTo(b, 2);
});

test('in-page anchors scroll smoothly and move focus like a native jump', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  // The hero intro must finish first (its Skip control sits where this link appears afterwards).
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  // Keyboard activation: Playwright's own scroll-into-view misjudges links inside the sticky hero.
  await page.getByRole('link', {name: /Discover Jimmy O’s/}).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(700);
  await expect(page.locator('#discover')).toBeFocused();
  await expect(page).toHaveURL(/#discover$/);
});

test('reduced motion: native scrolling, no hold, no split text, everything visible', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/lenis/);
  expect(await page.locator('.cinema-hero').evaluate(el => getComputedStyle(el).position)).not.toBe('sticky');
  await expect(page.locator('.mline')).toHaveCount(0);
  await jump(page, 4000);
  for (const selector of ['.cinema-media', '.night-out-frame', '.night-out-media', '.stacked-photo', '.fd-card-in', '.sig-plate', '.sig-dish', '.event-tile', '.lens-card-inner', '.lens-card-pop']) {
    for (const el of await page.locator(selector).all()) await expect(el).toHaveCSS('transform', 'none');
  }
  await expect(page.locator('.celebration-image .photo')).toHaveCSS('clip-path', 'none');
});

test('mobile keeps native scrolling with no hold and no horizontal overflow', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  const page = await context.newPage();
  await page.goto('/');
  expect(await page.locator('.cinema-hero').evaluate(el => getComputedStyle(el).position)).not.toBe('sticky');
  for (const top of [400, 2000, 6000, 9999999]) {
    await jump(page, top);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await context.close();
});

test('repeated client navigation does not duplicate the hero or leave the page locked', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  for (let i = 0; i < 3; i++) {
    await page.locator('.header nav').getByRole('link', {name: 'Gallery'}).click();
    await expect(page).toHaveURL('/gallery');
    await expect(page.locator('.hero-hold')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('.cinema-copy')).toBeVisible();
    await expect(page.locator('.hero-hold')).toHaveCount(1);
    await expect(page.locator('.cinema-hero')).toHaveCount(1);
    await expect(page.locator('.lf')).toHaveCount(1);
    await expect(page.locator('.cinema-hero video')).toHaveCount(0);
  }
  await jump(page, 3000);
  await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(3000);
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).overflow)).not.toBe('hidden');
});

for (const width of [390, 768, 1024, 1440, 1920]) test(`no horizontal overflow through the whole journey at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await page.goto('/');
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await jump(page, y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `y=${y}`).toBe(true);
  }
});
