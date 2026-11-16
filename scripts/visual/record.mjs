// A scroll recording of the whole homepage: the hero intro as a first-time visitor sees it, then a steady scroll to the
// footer (mouse wheel through Lenis on desktop; touch-style stepped scrolling on phones). THEME=<file.css> as in capture.mjs.
// usage: [BASE_URL=…] [THEME=…] [SIZE=1440x900] node scripts/visual/record.mjs <outFile.webm>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const outFile = process.argv[2];
const dir = path.dirname(outFile); fs.mkdirSync(dir, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const theme = process.env.THEME ? fs.readFileSync(process.env.THEME, 'utf8') : '';
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const mobile = width <= 700;
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width, height}, recordVideo: {dir, size: {width, height}}, ...(mobile ? {hasTouch: true, isMobile: true} : {})});
const page = await context.newPage();
await page.goto(base);
if (theme) await page.addStyleTag({content: theme});
await page.waitForTimeout(3200); // the intro, as a first visit shows it
if (!mobile) await page.mouse.move(width / 2, height / 2);
const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
for (let y = 0; y < total; y += mobile ? 18 : 24) {
  if (mobile) await page.evaluate(d => window.scrollBy(0, d), 18); else await page.mouse.wheel(0, 24);
  await page.waitForTimeout(16);
}
await page.waitForTimeout(1200);
const video = page.video();
await context.close();
if (video) fs.renameSync(await video.path(), outFile);
await browser.close();
console.log('recorded', outFile);
