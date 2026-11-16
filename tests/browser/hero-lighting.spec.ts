import {test, expect, type Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

const output = 'artifacts/hero-lighting';
test.use({video: {mode: 'on', size: {width: 1440, height: 900}}});
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

const angles = (page: Page, selector = '.hero-beam > i') => page.locator(selector).evaluateAll(elements => elements.map(el => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return Math.atan2(m.b, m.a) * 180 / Math.PI;
}));
const jump = (page: Page, top: number) => page.evaluate(y => scrollTo({top: y, behavior: 'instant'}), top);

for (const [width, height] of [[1440, 900], [1920, 1080], [768, 1024], [1024, 900], [375, 812], [390, 844]]) {
  test(`continuous lighting and readable composition at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.goto('/');
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    await expect(page.locator('.lf, .lf-slat, .lf-band, .lf-haze')).toHaveCount(0);
    await expect(page.locator('.hero-atmosphere')).toHaveCount(1);
    await expect(page.locator('.hero-atmosphere')).toHaveCSS('opacity', '1');
    await expect(page.locator('.hero-beam:visible')).toHaveCount(width <= 700 ? 4 : 5);
    await expect(page.locator('.hero-crowd canvas')).toHaveCount(2);
    await expect(page.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
    await expect(page.locator('.cinema-copy .button').first()).toHaveAttribute('href', '/nightlife');
    await expect(page.locator('.cinema-copy .button').last()).toHaveAttribute('href', '/reservations');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const copy = await page.locator('.cinema-copy').boundingBox();
    expect(copy!.x).toBeGreaterThanOrEqual(0);
    expect(copy!.x + copy!.width).toBeLessThanOrEqual(width);
    expect(copy!.y + copy!.height).toBeLessThan(height);
    const before = await angles(page);
    await page.waitForTimeout(700);
    expect((await angles(page)).filter((angle, i) => Math.abs(angle - before[i]) > 0.05).length).toBeGreaterThanOrEqual(4);
    // Idle transforms never reach the outer, scroll-owned rigs.
    expect((await angles(page, '.hero-beam')).every(angle => Math.abs(angle) < 0.01)).toBe(true);
    await page.screenshot({path: `${output}/after/${width}.png`});
  });
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test.describe(`recorded spotlight lifecycle at ${width}px`, () => {
    test.use({viewport: {width, height}});
    test('two complete cycles, scroll ownership, pause/resume and reduced-motion changes', async ({page}) => {
      test.setTimeout(65000);
      await mkdir(`${output}/recordings`, {recursive: true});
      await mkdir(`${output}/measurements`, {recursive: true});
      await page.goto('/');
      await page.screenshot({path: `${output}/after/intro-${width}.png`});
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
      // 28 seconds covers two full cycles of the slowest 12-second sweep plus its 3-second entry.
      const samples = await page.evaluate(async () => {
        const lights = [...document.querySelectorAll('.hero-beam > i')].filter(el => getComputedStyle(el.parentElement!).display !== 'none');
        const started = performance.now();
        const samples: {time: number; angles: number[]}[] = [];
        while (performance.now() - started < 28000) {
          samples.push({time: (performance.now() - started) / 1000, angles: lights.map(el => {
            const m = new DOMMatrix(getComputedStyle(el).transform);
            return Math.atan2(m.b, m.a) * 180 / Math.PI;
          })});
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return samples;
      });
      await writeFile(`${output}/measurements/idle-${width}.json`, JSON.stringify(samples, null, 2));
      const cap = width <= 700 ? 5.21 : 8.01;
      for (let beam = 0; beam < samples[0].angles.length; beam++) {
        const values = samples.map(sample => sample.angles[beam]);
        expect(Math.min(...values)).toBeLessThan(-3);
        expect(Math.max(...values)).toBeGreaterThan(3);
        expect(values.every(angle => Math.abs(angle) <= cap)).toBe(true);
        // Bounded angular speed catches snapping, including at reversals and cycle boundaries.
        for (let i = 1; i < samples.length; i++) {
          const speed = Math.abs(values[i] - values[i - 1]) / (samples[i].time - samples[i - 1].time);
          expect(speed).toBeLessThan(7);
        }
      }
      expect(samples.some(s => s.angles[0] * s.angles[1] < 0)).toBe(true);
      await page.screenshot({path: `${output}/after/idle-${width}.png`});
      const heroHeight = await page.locator('.cinema-hero').evaluate(el => el.clientHeight);
      for (const fraction of [0.25, 0.5, 0.75]) {
        await jump(page, heroHeight * fraction);
        await page.waitForTimeout(450);
        expect(Math.max(...(await angles(page, '.hero-beam')).map(Math.abs))).toBeGreaterThan(2);
        await page.screenshot({path: `${output}/after/scroll-${fraction * 100}-${width}.png`});
      }
      await jump(page, heroHeight * 2.2);
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'paused');
      const paused = await angles(page);
      await page.waitForTimeout(600);
      expect(await angles(page)).toEqual(paused);
      await jump(page, 0);
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
      await expect(page.locator('.cinema-hero')).not.toHaveClass(/is-intro/);
      const resumed = await angles(page);
      expect(resumed.every((angle, i) => Math.abs(angle - paused[i]) < 2)).toBe(true);
      await page.waitForTimeout(650);
      expect(await angles(page)).not.toEqual(resumed);
      expect((await angles(page, '.hero-beam')).every(angle => Math.abs(angle) < 0.01)).toBe(true);
      await page.screenshot({path: `${output}/after/return-${width}.png`});

      await page.emulateMedia({reducedMotion: 'reduce'});
      await expect(page.locator('.cinema-hero')).not.toHaveAttribute('data-ambient');
      const still = await angles(page);
      expect(still.every(angle => Math.abs(angle) < 0.01)).toBe(true);
      await page.waitForTimeout(650);
      expect(await angles(page)).toEqual(still);
      await expect(page.locator('.hero-atmosphere')).toHaveCSS('opacity', '1');
      await expect(page.locator('h1')).toHaveCSS('opacity', '1');
      await page.screenshot({path: `${output}/after/reduced-${width}.png`});
      await page.emulateMedia({reducedMotion: 'no-preference'});
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
      await expect(page.locator('.cinema-hero')).not.toHaveClass(/is-intro/);
      await page.waitForTimeout(650);
      expect(await angles(page)).not.toEqual(still);
      // Route teardown and remount keep one scene and one set of lights, without replaying the intro.
      await page.locator('.cinema-copy .button').first().click();
      await expect(page).toHaveURL('/nightlife');
      await expect(page.locator('.hero-beam')).toHaveCount(0);
      await page.getByRole('link', {name: 'Jimmy O’s home', exact: true}).click();
      await expect(page.locator('.hero-beam')).toHaveCount(5);
      await expect(page.locator('.hero-atmosphere')).toHaveCount(1);
      await expect(page.locator('.cinema-hero')).not.toHaveClass(/is-intro/);
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
      const video = page.video();
      await page.close();
      await video?.saveAs(`${output}/recordings/after-${width}.webm`);
    });
  });
}
