// The headline's reflection over time: crops of the H1 every STEP ms (default 600) while the spotlights sway, each
// compared with the same crop with the reflection layer hidden a moment later (how much the reflection changes the
// letters: mean and peak luminance difference inside the glyphs), with each line's strongest wash and glint.
// usage: [BASE_URL] [SIZE=1440x900] [FRAMES=22] [STEP=600] node scripts/visual/headline-review.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const frames = Number(process.env.FRAMES || 22), step = Number(process.env.STEP || 600);
const mobile = width <= 700;
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width, height}, ...(mobile ? {isMobile: true, hasTouch: true} : {})})).newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:3000');
await page.keyboard.press('Shift');
await page.locator('.cinema-hero[data-ambient="running"]').waitFor();
await page.waitForTimeout(1200);
const box = await page.locator('h1').boundingBox();
const clip = {x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 12), width: Math.min(width - Math.max(0, box.x - 20), box.width + 40), height: box.height + 24};
const lum = async buf => {const {data, info} = await sharp(buf).removeAlpha().raw().toBuffer({resolveWithObject: true}); return {data, info};};
const rows = [], tiles = [];
for (let i = 0; i < frames; i++) {
  // Freeze one moment: pause GSAP's clock so both captures show the same lighting.
  const state = await page.evaluate(() => [...document.querySelectorAll('.hero-reflection')].map(o => Math.max(...[0, 1, 2].map(k => Number(o.style.getPropertyValue(`--ri${k}`)) || 0))));
  const glint = await page.evaluate(() => [...document.querySelectorAll('.hero-reflection')].map(o => Math.max(...[0, 1, 2].map(k => Number(o.style.getPropertyValue(`--rg${k}`)) || 0))));
  const on = await page.screenshot({clip});
  await page.evaluate(() => document.querySelectorAll('.hero-reflection').forEach(o => {o.dataset.v = o.style.visibility; o.style.visibility = 'hidden';}));
  const off = await page.screenshot({clip});
  await page.evaluate(() => document.querySelectorAll('.hero-reflection').forEach(o => {o.style.visibility = o.dataset.v || '';}));
  const a = await lum(on), b = await lum(off);
  let sum = 0, peak = 0, n = 0;
  for (let p = 0; p < a.data.length; p += 3) {
    const la = 0.2126 * a.data[p] + 0.7152 * a.data[p + 1] + 0.0722 * a.data[p + 2];
    const lb = 0.2126 * b.data[p] + 0.7152 * b.data[p + 1] + 0.0722 * b.data[p + 2];
    if (lb < 120) continue; // only pixels inside the ivory letters
    const d = Math.abs(la - lb); sum += d; peak = Math.max(peak, d); n++;
  }
  rows.push({t: (i * step / 1000).toFixed(1), lineIntensity: state.map(v => v.toFixed(2)), glint: glint.map(v => v.toFixed(2)), meanChange: (sum / Math.max(1, n)).toFixed(2), peakChange: peak.toFixed(0)});
  tiles.push(on);
  fs.writeFileSync(`${out}/frame-${width}-${String(i).padStart(2, '0')}.png`, on);
  await page.waitForTimeout(step);
}
const tw = mobile ? 360 : 720, th = Math.round(tw * clip.height / clip.width);
const resized = await Promise.all(tiles.map(t => sharp(t).resize(tw, th).toBuffer()));
const cols = 2;
await sharp({create: {width: tw * cols, height: Math.ceil(resized.length / cols) * th, channels: 3, background: '#000'}})
  .composite(resized.map((input, i) => ({input, left: (i % cols) * tw, top: Math.floor(i / cols) * th}))).jpeg({quality: 88}).toFile(`${out}/headline-${width}.jpg`);
fs.writeFileSync(`${out}/headline-${width}.json`, JSON.stringify(rows, null, 1));
console.table(rows);
await browser.close();
