import {test, expect, type Page} from '@playwright/test';

type Player = {
  getSnapshot(): {status: string; index: number; muted: boolean; boardInView: boolean};
  created: {elements: number; contexts: number}; outputLevel(): number;
  audio: HTMLAudioElement; currentTime: number;
};
const state = (page: Page) => page.evaluate(() => {
  const p = (window as unknown as {__jimmyOsMusic: Player}).__jimmyOsMusic;
  return {...p.getSnapshot(), created: p.created, time: p.currentTime};
});
const level = (page: Page) => page.evaluate(async () => {
  const p = (window as unknown as {__jimmyOsMusic: Player}).__jimmyOsMusic;
  let peak = 0;
  for (let i = 0; i < 20; i++) {peak = Math.max(peak, p.outputLevel()); await new Promise(r => setTimeout(r, 25));}
  return peak;
});
async function ready(page: Page) {
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.mb-stage')).toHaveAttribute('data-ready', 'true');
  await page.locator('.mb-board').scrollIntoViewIfNeeded();
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1100});
  const list: string[] = []; errors.set(page, list);
  page.on('pageerror', e => list.push(e.message));
  page.on('console', m => {if (m.type() === 'error') list.push(m.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

test('replaces strings; selection moves a photo and curves, plays audible audio, switches, loops, pauses, mutes and resets', async ({page}) => {
  await ready(page);
  await expect(page.locator('.ns-stage,.ns-card,.ns-svg')).toHaveCount(0);
  await expect(page.locator('.mb-photo')).toHaveCount(12);
  expect((await state(page)).created.elements).toBe(0);
  const photo = page.locator('.mb-photo').first();
  const before = await photo.boundingBox();
  const path = await page.locator('.mb-threads path').first().getAttribute('d');
  await photo.click();
  await expect(photo).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await expect.poll(() => level(page)).toBeGreaterThan(.0001);
  await expect.poll(() => page.locator('.mb-threads path').first().getAttribute('d')).not.toBe(path);
  await page.waitForTimeout(850);
  const box = (await photo.boundingBox())!;
  const target = (await page.locator('.mb-target').boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - target.x - target.width / 2)).toBeLessThan(3);
  expect(box.width).toBeGreaterThan(before!.width);
  await expect(page.getByRole('region', {name: 'Music player', exact: true})).toBeHidden();
  await page.getByRole('button', {name: 'Mute photo music', exact: true}).click();
  await expect.poll(() => level(page)).toBeLessThan(.00001);
  await page.getByRole('button', {name: 'Unmute photo music', exact: true}).click();
  await expect.poll(() => level(page)).toBeGreaterThan(.0001);
  await page.getByRole('button', {name: 'Pause photo music', exact: true}).click();
  await expect.poll(async () => (await state(page)).status).toBe('paused');
  await page.getByRole('button', {name: 'Play photo music', exact: true}).click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.locator('.mb-photo').nth(1).click();
  await expect.poll(async () => (await state(page)).index).toBe(1);
  await expect(photo).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  // Exercise the real media end event, not just a fake toggle; the same track must restart.
  await page.evaluate(() => {const p = (window as unknown as {__jimmyOsMusic: Player}).__jimmyOsMusic; p.audio.currentTime = p.audio.duration - .15;});
  await expect.poll(async () => (await state(page)).time).toBeLessThan(2);
  expect((await state(page)).index).toBe(1);
  expect((await state(page)).created).toEqual({elements: 1, contexts: 1});
  await page.getByRole('button', {name: 'Reset photo board'}).click();
  await expect(page.locator('.mb-photo[aria-pressed=true]')).toHaveCount(0);
  await expect.poll(async () => (await state(page)).status).toBe('paused');
});

test('free drags persist independently, strings stay attached and settle, click still plays, reset restores all', async ({page}) => {
  await ready(page);
  const cards = page.locator('.mb-photo');
  const original = await cards.evaluateAll(es => es.map(e => (e as HTMLElement).style.transform));
  const move = async (i: number, dx: number, dy: number) => {
    const card = cards.nth(i), b = (await card.boundingBox())!;
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, {steps: 10});
    await expect(card).toHaveAttribute('data-dragging', 'true');
    await expect(card).toHaveCSS('z-index', '100');
    await page.mouse.up();
    return card.evaluate(e => (e as HTMLElement).style.transform);
  };
  const a = await move(0, 70, 55);
  expect(a).not.toBe(original[0]);
  const afterRelease = await page.locator('.mb-threads path').first().getAttribute('d');
  await page.waitForTimeout(80);
  expect(await page.locator('.mb-threads path').first().getAttribute('d')).not.toBe(afterRelease);
  expect(await cards.first().evaluate(e => (e as HTMLElement).style.transform)).toBe(a);
  const b = await move(3, -60, 65);
  await page.waitForTimeout(1300);
  expect(await cards.nth(0).evaluate(e => (e as HTMLElement).style.transform)).toBe(a);
  expect(await cards.nth(3).evaluate(e => (e as HTMLElement).style.transform)).toBe(b);
  expect(await cards.nth(1).evaluate(e => (e as HTMLElement).style.transform)).toBe(original[1]);
  expect((await state(page)).created.elements).toBe(0);
  await expect(page.locator('.mb-photo[aria-pressed=true]')).toHaveCount(0);
  const attached = await page.locator('.mb-stage').evaluate(stage => {
    const r = stage.getBoundingClientRect();
    const poses = Array.from(stage.querySelectorAll('.mb-photo')).map(el => {const b = el.getBoundingClientRect(); return [b.x + b.width / 2 - r.x, b.y + b.height / 2 - r.y];});
    return Array.from(stage.querySelectorAll('.mb-threads path')).every((p, i) => {
      const n = p.getAttribute('d')!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number);
      const a = poses[i], b = poses[(i + 1) % poses.length];
      return Math.hypot(n[0] - a[0], n[1] - a[1]) < .1 && Math.hypot(n[6] - b[0], n[7] - b[1]) < .1;
    });
  });
  expect(attached).toBe(true);
  const settled = await page.locator('.mb-threads path').first().getAttribute('d');
  await page.waitForTimeout(250);
  expect(await page.locator('.mb-threads path').first().getAttribute('d')).toBe(settled);
  await cards.first().click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.getByRole('button', {name: 'Close selected photo'}).click();
  await page.waitForTimeout(900);
  expect(await cards.first().evaluate(e => (e as HTMLElement).style.transform)).toBe(a);
  expect(await cards.nth(3).evaluate(e => (e as HTMLElement).style.transform)).toBe(b);
  await page.getByRole('button', {name: 'Reset photo board'}).click();
  await page.waitForTimeout(900);
  expect(await cards.evaluateAll(es => es.map(e => (e as HTMLElement).style.transform))).toEqual(original);
  await expect.poll(async () => (await state(page)).status).toBe('paused');
});

test('center drops do not select; selected photos also move freely; resize and boundaries preserve valid positions', async ({page}) => {
  await ready(page);
  const card = page.locator('.mb-photo').nth(4);
  const bounds = (await card.boundingBox())!, target = (await page.locator('.mb-target').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2 + 23, target.y + target.height / 2 + 17, {steps: 15}); await page.mouse.up();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  expect((await state(page)).created.elements).toBe(0);
  const dropped = (await card.boundingBox())!;
  expect(Math.abs(dropped.x + dropped.width / 2 - target.x - target.width / 2 - 23)).toBeLessThan(1);
  await card.click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.waitForTimeout(900);
  const focused = (await card.boundingBox())!;
  await page.mouse.move(focused.x + focused.width / 2, focused.y + focused.height / 2); await page.mouse.down();
  await page.mouse.move(0, 100, {steps: 12}); await page.mouse.up();
  const retained = await card.evaluate(e => (e as HTMLElement).style.transform);
  await page.waitForTimeout(900);
  expect(await card.evaluate(e => (e as HTMLElement).style.transform)).toBe(retained);
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.setViewportSize({width: 1024, height: 1100});
  await page.waitForTimeout(200);
  const b = (await card.boundingBox())!, board = (await page.locator('.mb-stage').boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(board.x);
  expect(b.y).toBeGreaterThanOrEqual(board.y);
  expect(b.x + b.width).toBeLessThanOrEqual(board.x + board.width);
  expect(b.x + b.width / 2).toBeLessThan(board.x + board.width * .3);
});

test('keyboard and reduced motion select and close; leaving the board stops its audio', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await ready(page);
  const card = page.locator('.mb-photo').nth(2);
  await card.focus(); await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await expect(page.locator('.mb-equalizer i').first()).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await state(page)).status).toBe('paused');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.locator('footer').last().scrollIntoViewIfNeeded();
  await expect.poll(async () => (await state(page)).status).toBe('paused');
});

for (const width of [320, 390, 600, 768, 1024, 1440]) test(`responsive ${width}: photos and active controls stay inside the board without overlap`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
  await ready(page);
  const layout = await page.locator('.mb-board').evaluate(board => {
    const r = board.getBoundingClientRect();
    const photos = Array.from(board.querySelectorAll('.mb-photo')).map(el => el.getBoundingClientRect());
    return {fits: photos.every(p => p.left >= r.left && p.right <= r.right && p.top >= r.top && p.bottom <= r.bottom),
      overlap: photos.some((p, i) => photos.slice(i + 1).some(q => p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top)),
      pageFits: document.documentElement.scrollWidth <= innerWidth};
  });
  expect(layout).toEqual({fits: true, overlap: false, pageFits: true});
  await page.locator('.mb-photo').nth(5).click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.waitForTimeout(1000);
  await expect(page.getByRole('button', {name: 'Close selected photo'})).toBeInViewport();
  const overlap = await page.locator('.mb-focus-meta').evaluate(meta => {
    const a = meta.getBoundingClientRect();
    return Array.from(document.querySelectorAll('.mb-photo')).some(p => {
      const b = p.getBoundingClientRect(); return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
  });
  expect(overlap).toBe(false);
  await page.getByRole('button', {name: 'Close selected photo'}).click();
  await expect.poll(async () => (await state(page)).status).toBe('paused');
});

test('touch tap plays; touch drag persists without selection; cancellation restores the last drop', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  await ready(page);
  await page.locator('.mb-photo').nth(2).tap();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.getByRole('button', {name: 'Close selected photo'}).tap();
  await page.locator('.mb-target').scrollIntoViewIfNeeded();
  const card = page.locator('.mb-photo').nth(5);
  const box = (await card.boundingBox())!, target = (await page.locator('.mb-target').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const tx = target.x + target.width / 2 + 35, ty = target.y + target.height / 2 + 45;
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + (tx - x) * i / 10, y: y + (ty - y) * i / 10}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await state(page)).status).toBe('paused');
  const retained = await card.evaluate(e => (e as HTMLElement).style.transform);
  await page.waitForTimeout(900);
  expect(await card.evaluate(e => (e as HTMLElement).style.transform)).toBe(retained);
  const start = (await card.boundingBox())!;
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: start.x + start.width / 2, y: start.y + start.height / 2}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: start.x + start.width / 2 + 25, y: start.y + start.height / 2 + 30}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchCancel', touchPoints: []});
  await expect(card).not.toHaveAttribute('data-dragging', 'true');
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(500);
  expect(await card.evaluate(e => (e as HTMLElement).style.transform)).toBe(retained);
  const stage = (await page.locator('.mb-stage').boundingBox())!;
  const scrollBefore = await page.evaluate(() => scrollY);
  const gutterX = stage.x + 3;
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: gutterX, y: 600}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: gutterX, y: 420}]});
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore + 30);
  await context.close();
});

test('DJ takeover survives leaving the board and navigation, while board-owned audio stops on navigation', async ({page}) => {
  await ready(page);
  await page.locator('.mb-photo').first().click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  const dj = page.getByRole('region', {name: 'DJ console', exact: true});
  await dj.getByRole('button', {name: 'Next track', exact: true}).click();
  if ((await state(page)).status === 'paused') await dj.getByRole('button', {name: 'Play', exact: true}).click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.locator('footer').last().scrollIntoViewIfNeeded();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.locator('.mb-photo').first().click();
  await expect.poll(async () => (await state(page)).status).toBe('playing');
  await page.locator('header').first().getByRole('link', {name: 'Book a Table', exact: false}).click();
  await expect.poll(async () => (await state(page)).status).toBe('paused');
});
