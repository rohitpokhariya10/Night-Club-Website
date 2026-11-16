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
/** Orb centre as a fraction of hero height, headline opacity and blur. */
const snapshot = (page: Page) => page.evaluate(() => {
  const h = document.querySelector('.cinema-hero')!.getBoundingClientRect();
  const o = document.querySelector('.hero-orb')!.getBoundingClientRect();
  const h1 = getComputedStyle(document.querySelector('.cinema-copy h1')!);
  return {orbY: (o.top + o.height / 2 - h.top) / h.height, h1: Number(h1.opacity), blur: h1.filter};
});

test('intro follows the reference order: light and centred orb, ghost headline, orb falls, UI arrives, ambient flow', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await expect(hero(page)).toHaveClass(/is-intro/);
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeVisible();
  // Opening frame: light only, orb at the centre, headline a blurred ghost.
  const start = await snapshot(page);
  expect(start.orbY).toBeGreaterThan(0.45);
  expect(start.orbY).toBeLessThan(0.62);
  expect(start.h1).toBeLessThan(0.6);
  expect(start.blur).toContain('blur');
  expect(await page.locator('.lf-band').first().evaluate(el => getComputedStyle(el).getPropertyValue('--y'))).not.toBe('');
  // End: orb at rest in the lower centre, sharp headline, nav visible, ambient flow running.
  await expect(hero(page)).not.toHaveClass(/is-intro/, {timeout: 6000});
  const end = await snapshot(page);
  expect(end.orbY).toBeCloseTo(0.82, 1);
  expect(end.h1).toBe(1);
  await expect(page.locator('.header')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeHidden();
  await expect(hero(page)).toHaveAttribute('data-ambient', 'running');
  // The light keeps flowing after the intro.
  const band = page.locator('.lf-band').nth(3);
  const y1 = await band.evaluate(el => el.style.getPropertyValue('--y'));
  await page.waitForTimeout(700);
  expect(await band.evaluate(el => el.style.getPropertyValue('--y'))).not.toBe(y1);
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
  expect(s.orbY).toBeCloseTo(0.82, 1);
  expect(s.h1).toBe(1);
  await expect(hero(page)).not.toHaveAttribute('data-ambient');
  await expect(page.locator('video')).toHaveCount(0);
});

test('without JavaScript the finished composition and light are server-rendered', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 1440, height: 900}});
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.lf-slat:visible')).toHaveCount(11);
  expect(await page.locator('.lf-band').first().evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
  const s = await snapshot(page);
  expect(s.orbY).toBeCloseTo(0.82, 1);
  expect(s.h1).toBe(1);
  await expect(page.getByRole('button', {name: 'Skip intro'})).toBeHidden();
  await expect(page.locator('.cinema-copy .actions a')).toHaveCount(2);
  await context.close();
});

test('pointer-reactive light (desktop) brightens the slat under the pointer', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.getByRole('button', {name: 'Skip intro'}).click();
  const slat = page.locator('.lf-band').first();
  await page.mouse.move(1400, 450);
  await page.waitForTimeout(400);
  const away = Number(await slat.evaluate(el => el.style.getPropertyValue('--t')));
  await page.mouse.move(40, 450);
  await expect.poll(async () => Number(await slat.evaluate(el => el.style.getPropertyValue('--t')))).toBeGreaterThan(away);
});
