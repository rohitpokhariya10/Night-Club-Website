import {test, expect} from '@playwright/test';

const errors = new WeakMap<object, string[]>();
test.beforeEach(async ({page}) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => {if (message.type() === 'error') messages.push(message.text());});
});
test.afterEach(async ({page}) => {expect(errors.get(page), 'Browser console/runtime errors').toEqual([]);});

async function settleImages(page: import('@playwright/test').Page) {
  for (const tile of await page.locator('.gallery-tile').all()) {
    await tile.scrollIntoViewIfNeeded();
    await expect.poll(() => tile.locator('img').evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(tile).toHaveCSS('opacity', '1');
  }
}

for (const width of [390, 768, 1024, 1440]) test(`hero and gallery at ${width}px`, async ({page}) => {
  test.setTimeout(60000);
  await page.setViewportSize({width, height: width === 390 ? 844 : 950});
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero-frame')).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
  await expect(page.locator('.cinema-copy .hero-eyebrow')).toHaveText('DEL MAR, CALIFORNIA — GOOD TIMES LIVE HERE');
  await expect(page.locator('.cinema-copy .hero-description')).toHaveText('Come for the drinks. Stay for the music. Leave with a story.');
  await expect(page.locator('.cinema-copy').getByRole('link', {name: 'EXPLORE NIGHTLIFE'})).toHaveAttribute('href', '/nightlife');
  await expect(page.locator('.cinema-copy').getByRole('link', {name: 'BOOK A TABLE'})).toHaveAttribute('href', '/reservations');
  // The animated light hero replaces the old background video.
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('.lf-slat:visible')).toHaveCount(width <= 700 ? 6 : width <= 1024 ? 8 : 11);
  await expect(page.locator('.hero-orb img')).toBeVisible();
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  await expect(page.locator('.cinema-copy h1')).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of ['.cinema-copy h1', '.cinema-copy .actions']) {
    const box = await page.locator(selector).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(width === 390 ? 844 : 950);
  }
  await page.screenshot({path: `artifacts/hero-gallery/hero-${width}.png`});
  await page.goto('/gallery');
  await expect(page.locator('.gallery-tile')).toHaveCount(9);
  await settleImages(page);
  await page.locator('.gallery-heading').scrollIntoViewIfNeeded();
  await expect(page.locator('.gallery-title-text')).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const columns = await page.locator('.masonry').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width <= 1000 ? 2 : 3);
  await page.locator('.gallery-page').screenshot({path: `artifacts/hero-gallery/gallery-${width}.png`});
  await page.getByRole('button', {name: 'View Under the disco ball'}).click();
  await expect(page.getByRole('dialog', {name: 'Photo viewer'})).toBeVisible();
  await expect(page.locator('.lightbox')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.locator('.lightbox-image img').evaluate(img => (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await expect(page.locator('.lightbox-image img')).toHaveCSS('object-fit', 'contain');
  await page.screenshot({path: `artifacts/hero-gallery/viewer-${width}.png`});
  await page.keyboard.press('Escape');
  await expect(page.locator('.lightbox')).not.toBeVisible();
});

test('viewer handles rapid navigation, focus trapping, scroll lock and repeated reopening', async ({page}) => {
  await page.goto('/gallery');
  const first = page.getByRole('button', {name: 'View Under the disco ball'});
  const dialog = page.getByRole('dialog', {name: 'Photo viewer'});
  await first.click();
  await expect(dialog.getByRole('button', {name: 'Close photo'})).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  for (let i = 0; i < 11; i++) await page.keyboard.press('ArrowRight');
  await expect(dialog).toContainText('3 / 9');
  await page.keyboard.press('ArrowLeft');
  await expect(dialog).toContainText('2 / 9');
  await dialog.getByRole('button', {name: 'Previous photo'}).click({clickCount: 2, delay: 10});
  await expect(dialog).toContainText('9 / 9');
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(first).toBeFocused();
  expect(await page.locator('body').evaluate(el => el.style.overflow)).toBe('');
  for (let i = 0; i < 3; i++) {
    await first.click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(first).toBeFocused();
  }
});

test('hover is smooth and leaves adjacent tiles stable', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 950});
  await page.goto('/gallery');
  const tile = page.locator('.gallery-tile').first();
  await tile.scrollIntoViewIfNeeded();
  await expect(tile).toHaveCSS('opacity', '1');
  const neighbor = page.locator('.gallery-tile').nth(1);
  await expect(neighbor).toHaveCSS('opacity', '1');
  const before = await neighbor.boundingBox();
  await tile.hover();
  await expect.poll(() => tile.locator('img').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBeCloseTo(1.055, 2);
  await expect(tile.locator('.gallery-caption svg')).toHaveCSS('opacity', '1');
  expect(await neighbor.boundingBox()).toEqual(before);
  await page.mouse.move(5, 5);
  await expect(tile.locator('img')).toHaveCSS('transform', 'none');
});

test('reduced motion reveals everything and viewer stays functional, including preference changes', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await page.waitForTimeout(600);
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('.lf')).toBeVisible();
  await expect(page.locator('.hero-orb img')).toBeVisible();
  await expect(page.locator('.hero-skip')).toBeHidden();
  await expect(page.locator('.hero-line-text').first()).toHaveCSS('opacity', '1');
  await page.goto('/gallery');
  for (const tile of await page.locator('.gallery-tile').all()) {
    await expect(tile).toHaveCSS('opacity', '1');
    await expect(tile).toHaveCSS('transform', 'none');
  }
  const first = page.locator('.gallery-tile').first();
  await first.click();
  await expect(page.locator('.lightbox')).toHaveCSS('opacity', '1');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lightbox')).toContainText('2 / 9');
  await page.keyboard.press('Escape');
  await expect(first).toBeFocused();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await first.click();
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('.lightbox')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Escape');
  await expect(first).toBeFocused();
});

test('Save-Data loads no video and keeps usable CTAs', async ({page}) => {
  const videos: string[] = [];
  page.on('request', request => {if (request.url().endsWith('.mp4')) videos.push(request.url());});
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', {value: Object.assign(new EventTarget(), {saveData: true})}));
  await page.goto('/');
  await page.waitForTimeout(600);
  await expect(page.locator('video')).toHaveCount(0);
  expect(videos).toEqual([]);
  await expect(page.locator('.hero-orb img')).toBeVisible();
  await page.locator('.cinema-copy').getByRole('link', {name: 'EXPLORE NIGHTLIFE'}).click();
  await expect(page).toHaveURL('/nightlife');
  await page.goBack();
  await page.locator('.cinema-copy').getByRole('link', {name: 'BOOK A TABLE'}).click();
  await expect(page).toHaveURL('/reservations');
});

test('server-rendered hero and gallery remain visible without JavaScript', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lf-slat:visible')).toHaveCount(6);
  await expect(page.locator('.hero-orb img')).toBeVisible();
  await expect(page.locator('.hero-skip')).toBeHidden();
  await expect(page.locator('.cinema-copy .actions a')).toHaveCount(2);
  await page.goto('/gallery');
  await expect(page.locator('.gallery-tile')).toHaveCount(9);
  await settleImages(page);
  for (const tile of await page.locator('.gallery-tile').all()) await expect(tile).toHaveCSS('opacity', '1');
  await context.close();
});

test('touch swipe navigates the viewer and touch close restores focus', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});
  const page = await context.newPage();
  await page.goto('/gallery');
  const tile = page.locator('.gallery-tile').first();
  await tile.tap();
  await expect(page.locator('.lightbox')).toHaveCSS('opacity', '1');
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 300, y: 400}]});
  await client.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 180, y: 405}]});
  await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await expect(page.locator('.lightbox')).toContainText('2 / 9');
  await page.getByRole('button', {name: 'Close photo'}).tap();
  await expect(page.locator('.lightbox')).not.toBeVisible();
  await expect(tile).toBeFocused();
  await context.close();
});

test('hero pauses outside the viewport and gallery cleans up across client navigation', async ({page}) => {
  await page.goto('/');
  const hero = page.locator('.cinema-hero');
  await expect(hero).toHaveAttribute('data-ambient', 'running');
  await page.locator('#discover').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo({top: innerHeight * 2 + 100, behavior: 'instant'}));
  await expect(hero).toHaveAttribute('data-ambient', 'paused');
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await expect(hero).toHaveAttribute('data-ambient', 'running');
  for (let i = 0; i < 2; i++) {
    await page.locator('.home-gallery').getByRole('link', {name: 'Enter the Gallery'}).click();
    await page.locator('.gallery-tile').first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox')).not.toBeVisible();
    await page.goBack();
    await expect(page.locator('.cinema-copy')).toBeVisible();
    expect(await page.locator('body').evaluate(el => el.style.overflow)).toBe('');
  }
});

test('the animated hero replaces the background video; no video loads until the film section is on screen', async ({page}) => {
  const videos: string[] = [];
  page.on('request', request => {if (/\.(mp4|webm|m3u8)(\?|$)/.test(request.url())) videos.push(request.url());});
  await page.goto('/');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  await page.waitForTimeout(800);
  await expect(page.locator('.cinema-hero video')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
  expect(videos).toEqual([]);
  await expect(page.locator('.hero-description')).toBeVisible();
  await page.locator('.cinema-copy').getByRole('link', {name: 'EXPLORE NIGHTLIFE'}).click();
  await expect(page).toHaveURL('/nightlife');
});

test('gallery scroll entrances complete progressively with stable card geometry', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 950});
  await page.goto('/gallery');
  const last = page.locator('.gallery-tile').last();
  await expect(last).toHaveCSS('opacity', '0');
  const before = await last.evaluate(el => ({width: el.offsetWidth, height: el.offsetHeight, top: el.offsetTop}));
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveCSS('opacity', '1');
  const after = await last.evaluate(el => ({width: el.offsetWidth, height: el.offsetHeight, top: el.offsetTop}));
  expect(after).toEqual(before);
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await expect(last).toHaveCSS('opacity', '1');
});
