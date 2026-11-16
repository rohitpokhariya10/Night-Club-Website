import {test, expect, type Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

const output = 'artifacts/headline-reflection';
const state = (page: Page) => page.locator('.hero-reflection').evaluateAll(els => els.map(el => {
  const s = (el as HTMLElement).style;
  return Array.from({length: 3}, (_, i) => ({x: parseFloat(s.getPropertyValue(`--rx${i}`)), angle: parseFloat(s.getPropertyValue(`--ra${i}`)), intensity: parseFloat(s.getPropertyValue(`--ri${i}`))}));
}));
test.beforeEach(async () => {await mkdir(output, {recursive: true});});

for (const [width, height] of [[1440, 900], [1920, 1080], [768, 1024], [1024, 900], [375, 812], [390, 844]]) {
  test(`one readable H1, aligned reflection and unchanged typography at ${width}px`, async ({page}) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({width, height});
    await page.goto('/');
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    await expect(page.getByRole('heading', {level: 1, name: 'DEL MAR AFTER DARK.', exact: true})).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
    await expect(page.locator('.hero-reflection[aria-hidden="true"]')).toHaveCount(2);
    const geometry = await page.locator('.hero-line-text').evaluateAll(lines => lines.map(line => {
      const overlay = line.querySelector<HTMLElement>('.hero-reflection')!;
      const b = line.getBoundingClientRect(), o = overlay.getBoundingClientRect();
      const base = getComputedStyle(line), reflection = getComputedStyle(overlay, '::before');
      overlay.style.display = 'none';
      const without = line.getBoundingClientRect(); overlay.style.removeProperty('display');
      return {x: b.x, right: b.right, width: b.width, height: b.height, delta: Math.max(Math.abs(b.x - o.x), Math.abs(b.y - o.y), Math.abs(b.width - o.width), Math.abs(b.height - o.height)),
        unchanged: without.width === b.width && without.height === b.height, color: base.color, font: base.font, reflectedFont: reflection.font,
        fill: base.webkitTextFillColor, animation: getComputedStyle(overlay).animationName, text: overlay.textContent};
    }));
    for (const g of geometry) {
      expect(g.delta).toBeLessThan(0.1);
      expect(g.unchanged).toBe(true);
      expect(g.color).toBe('rgb(246, 243, 238)');
      expect(g.fill).not.toBe('rgba(0, 0, 0, 0)');
      expect(g.font).toBe(g.reflectedFont);
      expect(g.animation).toBe('none');
      expect(g.text).toBe('');
      expect(g.x).toBeGreaterThanOrEqual(0); expect(g.right).toBeLessThanOrEqual(width);
    }
    const before = await state(page);
    await page.waitForTimeout(850);
    const after = await state(page);
    expect(after.flat().every(p => Number.isFinite(p.x) && p.intensity >= 0 && p.intensity <= 1)).toBe(true);
    expect(after.some((line, i) => line.some((light, j) => Math.abs(light.x - before[i][j].x) > 0.2))).toBe(true);
    await page.screenshot({path: `${output}/hero-${width}.png`});
    await page.locator('h1').screenshot({path: `${output}/lettering-${width}.png`});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect(page.locator('.hero-reflection').first()).toHaveCSS('display', 'none');
    await expect(page.locator('h1')).toHaveCSS('opacity', '1');
    await expect.poll(() => page.locator('.hero-reflection').evaluateAll(els => els.every(el => !(el as HTMLElement).style.getPropertyValue('--rx0')))).toBe(true);
    await page.screenshot({path: `${output}/reduced-${width}.png`});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`recorded reflection follows the beam over two cycles, scroll and return at ${width}px`, async ({browser}) => {
    test.setTimeout(60000);
    const context = await browser.newContext({viewport: {width, height}, recordVideo: {dir: `${output}/raw`, size: {width, height}}});
    const page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
      const samples = await page.evaluate(async () => {
        const overlays = [...document.querySelectorAll<HTMLElement>('.hero-reflection')];
        const rigs = [...document.querySelectorAll<HTMLElement>('.hero-beam')].slice(1, 4);
        const angle = (el: Element) => {const m = new DOMMatrix(getComputedStyle(el).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI;};
        const data: {time: number; reflection: number[][]; expected: number[]}[] = [], start = performance.now();
        while (performance.now() - start < 28000) {
          data.push({time: performance.now() - start,
            reflection: overlays.map(el => Array.from({length: 3}, (_, i) => parseFloat(el.style.getPropertyValue(`--ra${i}`)))),
            expected: rigs.map(el => 90 + parseFloat(getComputedStyle(el).getPropertyValue('--br')) + angle(el) + angle(el.querySelector('i')!))});
          await new Promise(resolve => setTimeout(resolve, 180));
        }
        return data;
      });
      for (const sample of samples) for (const line of sample.reflection) line.forEach((angle, i) => expect(Math.abs(angle - sample.expected[i])).toBeLessThan(0.15));
      expect(Math.max(...samples.map(s => s.expected[0])) - Math.min(...samples.map(s => s.expected[0]))).toBeGreaterThan(width < 500 ? 9 : 14);
      await writeFile(`${output}/beam-sync-${width}.json`, JSON.stringify(samples, null, 2));
      for (const fraction of [0.2, 0.5, 1.8, 0]) {
        await page.evaluate(y => scrollTo({top: y, behavior: 'instant'}), height * fraction);
        await page.waitForTimeout(500);
      }
      await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
      await expect(page.locator('.cinema-hero')).not.toHaveClass(/is-intro/);
      await expect(page.locator('h1')).toHaveCSS('opacity', '1');
      await page.emulateMedia({reducedMotion: 'reduce'});
      await page.waitForTimeout(800);
      await expect(page.locator('.hero-reflection').first()).toBeHidden();
      expect(errors).toEqual([]);
      const video = page.video(); await page.close();
      await video?.saveAs(`${output}/two-cycles-${width}.webm`);
    } finally {await context.close();}
  });
}

test('the solid headline survives disabled JavaScript and a decorative masking fallback', async ({browser, page}) => {
  const context = await browser.newContext({javaScriptEnabled: false});
  try {
    const staticPage = await context.newPage();
    await staticPage.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
    await expect(staticPage.locator('h1')).toHaveText('DEL MAR AFTER DARK.');
    await expect(staticPage.locator('h1')).toHaveCSS('opacity', '1');
  } finally {await context.close();}
  await page.goto('/'); await page.keyboard.press('Shift');
  await page.addStyleTag({content: '.hero-reflection{display:none!important}'});
  await expect(page.locator('.hero-line-text').first()).toHaveCSS('color', 'rgb(246, 243, 238)');
  await expect(page.locator('h1')).toBeVisible();
});
