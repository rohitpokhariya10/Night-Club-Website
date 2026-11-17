import {test, expect, type Page} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import sharp from 'sharp';

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
    await expect(page.getByRole('heading', {level: 1, name: 'DEL MAR. TURN IT UP.', exact: true})).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('DEL MAR. TURN IT UP.');
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
    await expect(staticPage.locator('h1')).toHaveText('DEL MAR. TURN IT UP.');
    await expect(staticPage.locator('h1')).toHaveCSS('opacity', '1');
  } finally {await context.close();}
  await page.goto('/'); await page.keyboard.press('Shift');
  await page.addStyleTag({content: '.hero-reflection{display:none!important}'});
  await expect(page.locator('.hero-line-text').first()).toHaveCSS('color', 'rgb(246, 243, 238)');
  await expect(page.locator('h1')).toBeVisible();
});

/**
 * One headline line as rendered: the glyph pixels' luminance (median, darkest 5%), the share of pure-white pixels (a
 * flare would raise it), and the WCAG contrast of the darkest 5% of the letters against the room behind them.
 */
async function glyphs(page: Page, line: number) {
  const {data} = await sharp(await page.locator('.hero-line-text').nth(line).screenshot()).removeAlpha().raw().toBuffer({resolveWithObject: true});
  const glyph: number[] = [], room: number[] = [];
  for (let i = 0; i < data.length; i += 3) {const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; (l > 110 ? glyph : room).push(l);}
  glyph.sort((a, b) => a - b); room.sort((a, b) => a - b);
  const at = (values: number[], q: number) => values[Math.floor((values.length - 1) * q)];
  const relative = (l: number) => {const c = l / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;};
  return {p5: at(glyph, 0.05), median: at(glyph, 0.5), white: glyph.filter(l => l >= 252).length / glyph.length,
    contrast: (relative(at(glyph, 0.05)) + 0.05) / (relative(at(room, 0.5)) + 0.05)};
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`the headline catches the light occasionally, in step with the beams, and stays readable at ${width}px`, async ({page}) => {
    test.setTimeout(60000);
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.keyboard.press('Shift');
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    // Sixteen seconds of the room at rest (more than one sweep of each beam), every 120 ms: each beam's glint on the
    // brighter line, and each beam's total angle (resting + rig + sway), read the same way as the sync test above.
    const samples = await page.evaluate(async () => {
      const overlay = document.querySelectorAll<HTMLElement>('.hero-reflection')[1];
      const rigs = [...document.querySelectorAll<HTMLElement>('.hero-beam')].slice(1, 4);
      const angle = (el: Element) => {const m = new DOMMatrix(getComputedStyle(el).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI;};
      const data: {glint: number[]; angle: number[]}[] = [], start = performance.now();
      while (performance.now() - start < 16000) {
        data.push({glint: [0, 1, 2].map(i => Number(overlay.style.getPropertyValue(`--rg${i}`)) || 0),
          angle: rigs.map(el => parseFloat(getComputedStyle(el).getPropertyValue('--br')) + angle(el) + angle(el.querySelector('i')!))});
        await new Promise(resolve => setTimeout(resolve, 120));
      }
      return data;
    });
    const strong = width < 500 ? 0.25 : 0.4;
    // The centre key light washes the letters but never glints.
    expect(samples.every(s => s.glint[1] === 0)).toBe(true);
    // Occasional: visible glints happen, and so do long clean stretches.
    const lit = samples.filter(s => Math.max(s.glint[0], s.glint[2]) > 0.3).length / samples.length;
    expect(Math.max(...samples.map(s => Math.max(s.glint[0], s.glint[2])))).toBeGreaterThan(strong);
    expect(samples.filter(s => Math.max(s.glint[0], s.glint[2]) < 0.05).length / samples.length).toBeGreaterThan(0.25);
    expect(lit).toBeLessThan(0.6);
    // In step with the light: every strong glint of a beam happens at the same orientation of that beam.
    for (const beam of [0, 2]) {
      const peaks = samples.filter(s => s.glint[beam] > strong * 1.1).map(s => s.angle[beam]);
      if (peaks.length > 1) expect(Math.max(...peaks) - Math.min(...peaks), `beam ${beam} glints at one orientation`).toBeLessThan(width < 500 ? 3 : 4);
    }
    // Readable throughout, glints included: solid ivory letters (median ≥ 190 of 255; the plain base is about 242), even
    // their darkest 5% at least 4.5:1 against the room (WCAG, large text), and pure white only on a sliver (no flare).
    for (let k = 0; k < 6; k++) {
      for (const line of [0, 1]) {
        const g = await glyphs(page, line);
        expect(g.median, `line ${line}`).toBeGreaterThanOrEqual(190);
        expect(g.contrast, `line ${line}`).toBeGreaterThanOrEqual(4.5);
        expect(g.white, `line ${line}`).toBeLessThan(0.05);
      }
      await page.waitForTimeout(700);
    }
    expect(errors).toEqual([]);
  });
}

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`between passes the lettering is one continuous polished surface, with no band across it, at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.goto('/');
    await page.keyboard.press('Shift');
    await expect(page.locator('.cinema-hero')).toHaveAttribute('data-ambient', 'running');
    // Wait for a moment with no glint on either line, so only the surface itself is measured.
    await expect.poll(() => page.evaluate(() => Math.max(...[...document.querySelectorAll<HTMLElement>('.hero-reflection')]
      .flatMap(o => [0, 1, 2].map(k => Number(o.style.getPropertyValue(`--rg${k}`)) || 0)))), {timeout: 20000, intervals: [100]}).toBeLessThan(0.02);
    for (const line of [0, 1]) {
      const {data, info} = await sharp(await page.locator('.hero-line-text').nth(line).screenshot()).removeAlpha().raw().toBuffer({resolveWithObject: true});
      // Median tone of the letter pixels in each row (rows with enough glyph to measure).
      const rows: number[] = [];
      for (let y = 0; y < info.height; y++) {
        const row: number[] = [];
        for (let x = 0; x < info.width; x++) {const i = (y * info.width + x) * 3; const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; if (l > 150) row.push(l);}
        if (row.length >= info.width * 0.12) rows.push(row.sort((a, b) => a - b)[row.length >> 1]);
      }
      expect(rows.length, `line ${line}`).toBeGreaterThan(info.height * 0.3);
      rows.splice(0, 2); rows.splice(-2); // the glyphs' antialiased top and bottom edge rows
      // A smooth tonal curve: never a step between neighbouring rows (the old horizon jumped ~30 levels per row) …
      const steps = rows.slice(1).map((v, i) => Math.abs(v - rows[i]));
      expect(Math.max(...steps), `line ${line}: largest row-to-row step`).toBeLessThan(7);
      // … predominantly ivory (the crown to the foot stays within a gentle range), yet visibly not flat.
      const range = Math.max(...rows) - Math.min(...rows);
      expect(range, `line ${line}: tonal range`).toBeLessThan(width < 500 ? 55 : 60);
      expect(range, `line ${line}: tonal range`).toBeGreaterThan(line === 1 ? 14 : 8);
    }
  });
}
