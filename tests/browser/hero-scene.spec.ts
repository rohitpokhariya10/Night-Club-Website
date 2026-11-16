import {test, expect, type Page} from '@playwright/test';

/** The nightclub hero scene: crowd, beams, scroll lighting (HERO-NIGHTCLUB-REBUILD-REPORT.md). */
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({page}) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', error => list.push(error.message));
  page.on('console', message => {if (message.type() === 'error') list.push(message.text());});
});
test.afterEach(async ({page}) => expect(errors.get(page)).toEqual([]));

/** A cheap fingerprint of what the crowd canvases show right now (sampled alpha and colour). */
const crowdPrint = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLCanvasElement>('.hero-crowd canvas')].map(c => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, painted = 0;
  for (let i = 0; i < d.length; i += 4 * 61) {sum += d[i] * 3 + d[i + 3]; if (d[i + 3] > 0) painted++;}
  return {sum, painted};
}));
const rotations = (page: Page) => page.locator('.hero-beam').evaluateAll(els => els.map(el => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 10) / 10;
}));

test('the crowd is drawn behind the headline area’s foot and moves to the music; the lights sit above it', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  await expect(page.locator('.hero-beam')).toHaveCount(5);
  await expect(page.locator('.hero-crowd canvas')).toHaveCount(2);
  const a = await crowdPrint(page);
  for (const layer of a) expect(layer.painted, 'people are drawn on both depth layers').toBeGreaterThan(50);
  await page.waitForTimeout(300);
  const b = await crowdPrint(page);
  expect(b.map(l => l.sum), 'the crowd moves').not.toEqual(a.map(l => l.sum));
  // Decorative: hidden from assistive technology, never in the way of a click.
  for (const selector of ['.hero-beams', '.hero-crowd', '.hero-sweep', '.hero-wash']) {
    await expect(page.locator(selector)).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator(selector).evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  }
  // Even the highest raised hand stays clear of the copy and its booking action.
  const copyBottom = await page.locator('.cinema-copy .hero-cta').evaluate(el => el.getBoundingClientRect().bottom);
  const crowdTop = await page.evaluate(() => Math.min(...[...document.querySelectorAll<HTMLCanvasElement>('.hero-crowd canvas')].map(c => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x += 3) if (d[(y * c.width + x) * 4 + 3] > 40) return c.getBoundingClientRect().top + (y * c.clientHeight) / c.height;
    return Infinity;
  })));
  expect(crowdTop).toBeGreaterThan(copyBottom + 24);
});

test('scroll lighting: the rigs swing and the room changes as the page rises, exactly in reverse on the way back; covered, the scene sleeps', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  await page.keyboard.press('Shift');
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
  const jump = (y: number) => page.evaluate(v => window.scrollTo({top: v, behavior: 'instant'}), y);
  expect((await rotations(page)).every(r => Math.abs(r) < 0.5)).toBe(true);
  await jump(450);
  await expect.poll(async () => Math.max(...(await rotations(page)).map(Math.abs))).toBeGreaterThan(8);
  const mid = await rotations(page);
  expect(Number(await page.locator('.hero-wash').evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0.3);
  // Converging: rigs left of centre turn one way, rigs right of centre the other.
  expect(mid[0]).toBeLessThan(0);
  expect(mid[4]).toBeGreaterThan(0);
  // Covered: the hero sleeps (no ambient light, no crowd drawing).
  await jump(1100);
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'paused');
  const covered = await crowdPrint(page);
  await page.waitForTimeout(300);
  expect((await crowdPrint(page)).map(l => l.sum)).toEqual(covered.map(l => l.sum));
  // Back to the top: the same resting lighting as before.
  await jump(0);
  await expect.poll(async () => Math.max(...(await rotations(page)).map(Math.abs))).toBeLessThan(0.5);
  await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
});

test('reduced motion: the scene is complete and still (the crowd standing, the lights at rest)', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.waitForTimeout(600);
    const a = await crowdPrint(page);
    for (const layer of a) expect(layer.painted, `${width}px: the crowd is drawn`).toBeGreaterThan(20);
    await page.waitForTimeout(400);
    expect((await crowdPrint(page)).map(l => l.sum), `${width}px: and does not move`).toEqual(a.map(l => l.sum));
    expect((await rotations(page)).every(r => Math.abs(r) < 0.5)).toBe(true);
  }
});

for (const [width, height] of [[1440, 900], [390, 844]]) test(`no layout shift from the hero scene while it loads, plays its intro and settles at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height});
  await page.addInitScript(() => {
    const w = window as unknown as {__cls: number};
    w.__cls = 0;
    new PerformanceObserver(list => {for (const e of list.getEntries() as (PerformanceEntry & {value: number; hadRecentInput: boolean})[]) if (!e.hadRecentInput) w.__cls += e.value;}).observe({type: 'layout-shift', buffered: true});
  });
  await page.goto('/');
  await page.waitForTimeout(4200);
  expect(await page.evaluate(() => (window as unknown as {__cls: number}).__cls)).toBeLessThan(0.01);
});
