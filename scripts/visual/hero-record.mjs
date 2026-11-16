// A recording of the hero alone: the first-visit intro, a few seconds at rest (with the pointer crossing on desktop),
// a slow scroll through the hold into the next section, and back. usage: [BASE_URL] [SIZE] node scripts/visual/hero-record.mjs <out.webm>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const outFile = process.argv[2]; const dir = path.dirname(outFile); fs.mkdirSync(dir, {recursive: true});
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const mobile = width <= 700;
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width, height}, recordVideo: {dir, size: {width, height}}, ...(mobile ? {hasTouch: true, isMobile: true} : {})});
const page = await context.newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:3000');
await page.waitForTimeout(3800);
if (!mobile) for (let i = 0; i <= 40; i++) {await page.mouse.move(width * (0.15 + 0.7 * i / 40), height * 0.55); await page.waitForTimeout(40);}
else await page.waitForTimeout(1600);
await page.waitForTimeout(1500);
const travel = Math.round(height * 1.3), step = mobile ? 12 : 16;
const move = async dy => mobile ? page.evaluate(d => window.scrollBy(0, d), dy) : page.mouse.wheel(0, dy);
for (let y = 0; y < travel; y += step) {await move(step); await page.waitForTimeout(16);}
await page.waitForTimeout(1200);
for (let y = 0; y < travel; y += step * 1.5) {await move(-step * 1.5); await page.waitForTimeout(16);}
await page.waitForTimeout(1500);
const video = page.video(); await context.close();
if (video) fs.renameSync(await video.path(), outFile);
await browser.close();
console.log('recorded', outFile);
