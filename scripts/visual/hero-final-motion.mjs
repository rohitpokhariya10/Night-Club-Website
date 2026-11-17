// Motion review: samples beam angles and the headline glint over a window, and checks the header Book a Table
// hover/press for a stationary hit area. usage: [BASE_URL] [SIZE] [WINDOW=30000] node scripts/visual/hero-final-motion.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width, height}, ...(width <= 700 ? {isMobile: true, hasTouch: true} : {})})).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(process.env.BASE_URL || 'http://localhost:3000'); await page.keyboard.press('Shift');
await page.locator('.cinema-hero[data-ambient="running"]').waitFor();
const samples = await page.evaluate(async windowMs => {
  const lights = [...document.querySelectorAll('.hero-beam > i')];
  const overlays = [...document.querySelectorAll('.hero-reflection')];
  const angle = el => {const m = new DOMMatrix(getComputedStyle(el).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI;};
  const data = [], start = performance.now();
  while (performance.now() - start < windowMs) {
    data.push({t: (performance.now() - start) / 1000, angles: lights.map(angle),
      glint: Math.max(...overlays.flatMap(o => [0, 1, 2].map(k => Number(o.style.getPropertyValue(`--rg${k}`)) || 0)))});
    await new Promise(r => setTimeout(r, 100));
  }
  return data;
}, Number(process.env.WINDOW || 30000));
const speeds = samples[0].angles.map((_, b) => Math.max(...samples.slice(1).map((s, i) => Math.abs(s.angles[b] - samples[i].angles[b]) / (s.t - samples[i].t))));
const ranges = samples[0].angles.map((_, b) => [Math.min(...samples.map(s => s.angles[b])), Math.max(...samples.map(s => s.angles[b]))].map(v => +v.toFixed(1)));
console.log(JSON.stringify({width, speeds: speeds.map(v => +v.toFixed(2)), ranges,
  glintPeak: +Math.max(...samples.map(s => s.glint)).toFixed(2), glintLitShare: +(samples.filter(s => s.glint > 0.3).length / samples.length).toFixed(2)}));
fs.writeFileSync(`${out}/motion-${width}.json`, JSON.stringify(samples));
// Book a Table: the hit box must not move or resize on hover or press.
const cta = page.locator('.header-book');
const rest = await cta.boundingBox();
await cta.hover(); await page.waitForTimeout(700);
const hover = await cta.boundingBox();
await page.screenshot({path: `${out}/book-hover-${width}.png`, clip: {x: rest.x - 60, y: rest.y - 40, width: rest.width + 120, height: rest.height + 80}});
await page.mouse.down(); const pressed = await cta.boundingBox(); await page.mouse.up();
console.log('book box', JSON.stringify(rest), 'moved on hover', Math.abs(hover.x - rest.x) + Math.abs(hover.y - rest.y) + Math.abs(hover.width - rest.width), 'on press', Math.abs(pressed.y - rest.y));
console.log('errors', errors);
await browser.close();
