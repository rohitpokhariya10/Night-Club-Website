import {test, expect, type Page, type Locator} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

// Pending real Chromium execution. Videos are intentionally retained for manual interaction review.
test.use({video: 'on'});
const output = 'artifacts/kinetic-photos';
test.beforeEach(async () => {await mkdir(output, {recursive: true});});
const card = (page: Page, index = 0) => page.locator(`#experience .ns-card[data-index="${index}"]`);
const angle = (el: Locator) => el.locator('.ns-swing').evaluate(node => {
  const m = new DOMMatrix(getComputedStyle(node).transform);
  return Math.atan2(m.b, m.a) * 180 / Math.PI;
});
const pivot = (el: Locator) => el.locator('.ns-bead').evaluate(node => {
  const b = node.getBoundingClientRect(); return {x: b.x + b.width / 2, y: b.y + b.height / 2};
});
async function ready(page: Page, reduced = false) {
  if (reduced) await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('#experience')).toHaveAttribute('data-instrument', /desktop|tablet|mobile/);
  await page.locator('#experience .ns-sound').focus(); // accessible reveal completes the entrance
  await page.locator('.ns-stage').evaluate(el => window.scrollTo({top: scrollY + el.getBoundingClientRect().top - 180, behavior: 'instant'}));
  await expect.poll(() => page.locator('.ns-svg:visible .ns-core').evaluateAll(els => els.every(el => el.getAttribute('d')?.includes('C'))), {timeout: 12000}).toBe(true);
}
async function drag(page: Page, target: Locator, dx: number, dy = 0) {
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  const start = {x: b.x + b.width / 2, y: b.y + b.height / 2};
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let k = 1; k <= 16; k++) {
    await page.mouse.move(start.x + dx * k / 16, start.y + dy * k / 16);
    await page.waitForTimeout(16);
  }
  return start;
}
async function attached(page: Page, index: number) {
  return card(page, index).evaluate(el => {
    const box = el.querySelector('.ns-bead')!.getBoundingClientRect();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const string = Number(getComputedStyle(el).getPropertyValue('--s'));
    const root = el.closest('section')!;
    const path = root.querySelector<SVGPathElement>(`.ns-svg[data-layout="${root.getAttribute('data-instrument')}"] .ns-string[data-string="${string}"] .ns-core`)!;
    const length = path.getTotalLength(), matrix = path.getScreenCTM()!;
    let distance = Infinity;
    for (let k = 0; k <= 2000; k++) {
      const p = path.getPointAtLength(length * k / 2000).matrixTransform(matrix);
      distance = Math.min(distance, Math.hypot(p.x - x, p.y - y));
    }
    return distance;
  });
}

for (const width of [1440, 1920, 768, 1024, 375, 390]) {
  test(`composition and curve-bound mount at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width < 500 ? 844 : 1000});
    await ready(page, true);
    await expect(page.locator('#ns-title')).toHaveText('Every night has a rhythm.');
    await expect(page.locator('.ns-link')).toHaveCount(7);
    await expect(page.locator('.ns-mount')).toHaveCount(7);
    const before = await pivot(card(page));
    await drag(page, card(page).locator('.ns-mount'), width < 500 ? 45 : 160);
    await expect(card(page)).toHaveAttribute('data-dragging', 'slide');
    expect(await attached(page, 0)).toBeLessThan(1.5);
    await page.mouse.up();
    const after = await pivot(card(page));
    expect(after.x - before.x).toBeGreaterThan(width < 500 ? 25 : 100);
    await page.waitForTimeout(500);
    expect(Math.abs((await pivot(card(page))).x - after.x)).toBeLessThan(0.5);
    expect(await angle(card(page))).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expect(page).toHaveURL('/');
    const bounds = await page.locator('.ns-plate').evaluateAll(els => els.map(el => {
      const b = el.getBoundingClientRect(); return {left: b.left, right: b.right, top: b.top, bottom: b.bottom};
    }));
    for (let i = 0; i < bounds.length; i++) {
      expect(bounds[i].left).toBeGreaterThanOrEqual(10);
      expect(bounds[i].right).toBeLessThanOrEqual(width - 10);
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i], b = bounds[j];
        expect(Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom)).toBeGreaterThan(4);
      }
    }
    await mkdir(output, {recursive: true});
    // Hide the fixed header only for this full-section capture; viewport recordings retain the real header.
    await page.locator('#experience').screenshot({path: `${output}/composition-${width}.png`, style: '.header,nextjs-portal{visibility:hidden}'});
  });
}

test('real pointer swing, momentum, settling, sliding, silent photo gestures, then a normal link click', async ({page}) => {
  test.setTimeout(60000);
  await page.setViewportSize({width: 1440, height: 1000});
  await page.addInitScript(() => {
    const w = window as unknown as {__notes: number}; w.__notes = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {w.__notes++; return start.apply(this, args);};
  });
  await ready(page);
  await page.locator('.ns-sound').click();
  await expect(page.locator('.ns-sound')).toHaveAttribute('aria-pressed', 'true');
  const c = card(page, 1);
  const original = await pivot(c);
  await drag(page, c.locator('.ns-photo'), 90);
  expect(await angle(c)).toBeLessThan(-4);
  expect(await attached(page, 1)).toBeLessThan(1.5);
  await page.screenshot({path: `${output}/held-swing.png`});
  await page.mouse.up();
  await page.mouse.move(20, 150);
  await expect.poll(() => angle(c), {intervals: [40], timeout: 3000}).toBeGreaterThan(0.3);
  await expect.poll(async () => Math.abs(await angle(c)), {timeout: 9000}).toBeLessThan(0.03);
  expect(Math.abs((await pivot(c)).x - original.x)).toBeLessThan(1);
  await drag(page, c.locator('.ns-mount'), 400);
  await page.mouse.up();
  await page.mouse.move(20, 150);
  await expect.poll(async () => Math.abs(await angle(c)), {timeout: 9000}).toBeLessThan(0.03);
  const slid = await pivot(c);
  expect(slid.x - original.x).toBeGreaterThan(250);
  expect(await attached(page, 1)).toBeLessThan(1.5);
  expect(await page.evaluate(() => (window as unknown as {__notes: number}).__notes)).toBe(0);
  await expect(page).toHaveURL('/');
  await page.locator('.ns-peg').first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {__notes: number}).__notes)).toBe(1);
  await page.locator('.ns-sound').click();
  await expect(page.locator('.ns-sound')).toHaveAttribute('aria-pressed', 'false');
  await c.locator('.ns-link').click();
  await expect(page).toHaveURL('/drink-menu');
});

test('keyboard, bounded neighbours, offscreen persistence, live reduced motion and route teardown', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000});
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page, true);
  const c = card(page);
  await c.locator('.ns-mount').focus();
  await page.keyboard.press('End');
  await expect(page.locator('.ns-status')).toContainText('Nightlife photograph at');
  const end = await pivot(c);
  await page.keyboard.press('ArrowRight');
  expect((await pivot(c)).x).toBeCloseTo(end.x, 1);
  await page.keyboard.press('ArrowLeft');
  expect((await pivot(c)).x).toBeLessThan(end.x - 10);
  await page.keyboard.press('Tab');
  await expect(c.locator('.ns-link')).toBeFocused();
  const position = await c.locator('.ns-swing').getAttribute('style');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await c.scrollIntoViewIfNeeded();
  expect(await c.locator('.ns-swing').getAttribute('style')).toBe(position);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(await c.locator('.ns-swing').getAttribute('style')).toBe(position);
  for (let i = 0; i < 3; i++) {
    await c.locator('.ns-link').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/nightlife');
    await page.goBack();
    await expect(page.locator('.ns-mount')).toHaveCount(7);
    await card(page).locator('.ns-mount').focus();
    const before = await pivot(card(page));
    await page.keyboard.press('ArrowRight');
    expect((await pivot(card(page))).x - before.x).toBeCloseTo(16, 0);
  }
  expect(errors).toEqual([]);
});

test('pointer cancellation and capture loss release a photo without navigation', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await ready(page);
  for (const type of ['pointercancel', 'lostpointercapture']) {
    const c = card(page);
    await drag(page, c.locator('.ns-mount'), 50);
    await expect(c).toHaveAttribute('data-dragging', 'slide');
    await c.evaluate((el, type) => {
      if (type === 'lostpointercapture') el.releasePointerCapture(1);
      else el.dispatchEvent(new PointerEvent(type, {pointerId: 1, bubbles: true}));
    }, type);
    await expect(c).not.toHaveAttribute('data-dragging');
    await page.mouse.up();
    await expect(page).toHaveURL('/');
  }
});

for (const width of [375, 390]) {
  test(`touch capture transfers, sliding and vertical scrolling at ${width}px`, async ({browser}) => {
    const context = await browser.newContext({viewport: {width, height: 844}, isMobile: true, hasTouch: true, recordVideo: {dir: `${output}/touch-videos`}});
    const page = await context.newPage();
    try {
      await ready(page, true);
      const c = card(page), mount = c.locator('.ns-mount');
      await mount.scrollIntoViewIfNeeded();
      const start = await pivot(c), cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [start]});
      for (let k = 1; k <= 12; k++) {
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: start.x + k * 4, y: start.y}]});
        await page.waitForTimeout(20);
      }
      await expect(c).toHaveAttribute('data-dragging', 'slide');
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      expect((await pivot(c)).x - start.x).toBeGreaterThan(25);
      await expect(c).not.toHaveAttribute('data-dragging');
      const photo = (await c.locator('.ns-photo').boundingBox())!;
      const before = await page.evaluate(() => scrollY);
      const x = photo.x + photo.width / 2, y = photo.y + photo.height / 2;
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
      for (let k = 1; k <= 12; k++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y: y - k * 12}]});
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 40);
      await expect(page).toHaveURL('/');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally {await context.close();}
  });
}
