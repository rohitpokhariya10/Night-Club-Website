// A recording of the headline catching the spotlights: the intro, two full beam-sweep cycles at rest (about 25 s),
// a slow scroll through the hold and back to the top, then a few seconds at rest. While at rest it logs each line's
// strongest glint every 100 ms (seconds into the video) to <out>.glints.json, so frames can be checked at the moments
// the letters catch the light. usage: [BASE_URL] [SIZE=1440x900] [IDLE=25000] node scripts/visual/headline-record.mjs <out.webm>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const outFile = process.argv[2]; const dir = path.dirname(outFile); fs.mkdirSync(dir, {recursive: true});
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const mobile = width <= 700;
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width, height}, recordVideo: {dir, size: {width, height}}, ...(mobile ? {hasTouch: true, isMobile: true} : {})});
const page = await context.newPage();
const t0 = Date.now();
await page.goto(process.env.BASE_URL || 'http://localhost:3000');
await page.waitForTimeout(3500);
const glints = [], idleEnd = Date.now() + Number(process.env.IDLE || 25000);
while (Date.now() < idleEnd) {
  const lines = await page.evaluate(() => [...document.querySelectorAll('.hero-reflection')].map(o => Math.max(...[0, 1, 2].map(k => Number(o.style.getPropertyValue(`--rg${k}`)) || 0))));
  glints.push({t: +((Date.now() - t0) / 1000).toFixed(2), lines});
  await page.waitForTimeout(100);
}
fs.writeFileSync(outFile.replace(/\.webm$/, '.glints.json'), JSON.stringify(glints));
const travel = Math.round(height * 0.9), step = 10;
const move = async dy => mobile ? page.evaluate(d => window.scrollBy(0, d), dy) : page.mouse.wheel(0, dy);
if (!mobile) await page.mouse.move(width - 40, height - 40);
for (let y = 0; y < travel; y += step) {await move(step); await page.waitForTimeout(20);}
await page.waitForTimeout(800);
for (let y = 0; y < travel; y += step) {await move(-step); await page.waitForTimeout(20);}
await page.waitForTimeout(4000);
const video = page.video(); await context.close();
if (video) fs.renameSync(await video.path(), outFile);
await browser.close();
console.log('recorded', outFile);
