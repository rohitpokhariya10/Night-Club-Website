import {test, expect, type Page} from '@playwright/test';

/** Animated light hero (PINTEREST-HERO-REFERENCE.md): intro choreography, skip, session, fallbacks. */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {if (message.type() === 'error') list.push(message.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

const hero = (page: Page) => page.locator('.cinema-hero');
/** Headline opacity and blur, without the removed logo badge. */
const snapshot = (page: Page) => page.evaluate(() => {
  const h1 = getComputedStyle(document.querySelector('.cinema-copy h1')!);
  return {h1: Number(h1.opacity), blur: h1.filter};
});

test('intro preserves the light, ghost headline, UI arrival and ambient flow without decorative badges', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect(hero(page)).toHaveClass(/is-intro/);
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeVisible();
  // Opening frame: light and a blurred ghost headline, with no logo badge.
  const start = await snapshot(page);
  await expect(page.locator('.hero-orb, .hero-eyebrow')).toHaveCount(0);
  expect(start.h1).toBeLessThan(0.6);
  expect(start.blur).toContain('blur');
  await expect(page.locator('.lf, .lf-slat, .lf-band')).toHaveCount(0);
  await expect(page.locator('.hero-atmosphere')).toBeAttached();
  // End: sharp headline, nav visible, ambient flow running.
  await expect(hero(page)).not.toHaveClass(/is-intro/, {timeout: 6000});
  const end = await snapshot(page);
  expect(end.h1).toBe(1);
  await expect(page.locator('.header')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeHidden();
  await expect(hero(page)).toHaveAttribute('data-ambient', 'running');
  // The light keeps flowing after the intro.
  const beam = page.locator('.hero-beam > i').nth(3);
  const initial = await beam.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(700);
  expect(await beam.evaluate(el => getComputedStyle(el).transform)).not.toBe(initial);
  expect(await page.evaluate(() => sessionStorage.getItem('jo-hero-intro'))).toBe('1');
});

test('Skip intro finishes immediately and keeps keyboard focus in the hero', async ({page}) => {
  await page.goto('/');
  const skip = page.getByRole('button', {name: 'Skip intro'});
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(hero(page)).not.toHaveClass(/is-intro/);
  expect((await snapshot(page)).h1).toBe(1);
  await expect(page.locator('.cinema-copy').getByRole('link', {name: 'EXPLORE NIGHTLIFE'})).toBeFocused();
  await expect(skip).toBeHidden();
});

test('any key, wheel or touch also skips; the intro plays once per session', async ({page}) => {
  await page.goto('/');
  await expect(hero(page)).toHaveClass(/is-intro/);
  await page.mouse.wheel(0, 10);
  await expect(hero(page)).not.toHaveClass(/is-intro/);
  await page.goto('/gallery');
  await page.goto('/');
  await expect(hero(page)).not.toHaveClass(/is-intro/);
  await expect(page.locator('html')).not.toHaveClass(/hero-intro/);
  expect((await snapshot(page)).h1).toBe(1);
  await expect(hero(page)).toHaveAttribute('data-ambient', 'running');
});

test('reduced motion shows the finished hero at once, with no intro and no animation', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/hero-intro/);
  await expect(hero(page)).not.toHaveClass(/is-intro/);
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeHidden();
  const s = await snapshot(page);
  await expect(page.locator('.hero-orb')).toHaveCount(0);
  expect(s.h1).toBe(1);
  await expect(hero(page)).not.toHaveAttribute('data-ambient');
  await expect(page.locator('video')).toHaveCount(0);
});

test('without JavaScript the finished composition and light are server-rendered', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.hero-beam:visible')).toHaveCount(5);
  await expect(page.locator('.hero-atmosphere')).toHaveCSS('opacity', '1');
  expect(await page.locator('.hero-atmosphere').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('radial-gradient');
  const s = await snapshot(page);
  await expect(page.locator('.hero-orb')).toHaveCount(0);
  expect(s.h1).toBe(1);
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeHidden();
  await expect(page.locator('.cinema-copy .actions a')).toHaveCount(2);
  await context.close();
});

test('spotlights sweep independently of pointer movement without recreating light panels', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  const beam = page.locator('.hero-beam > i').first();
  const before = await beam.evaluate(el => getComputedStyle(el).transform);
  await page.mouse.move(1400, 450);
  await page.waitForTimeout(500);
  await page.mouse.move(40, 450);
  await expect.poll(() => beam.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  await expect(page.locator('.lf, .lf-band')).toHaveCount(0);
});
