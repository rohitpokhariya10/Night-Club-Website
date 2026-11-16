// Full-viewport hero captures at the review sizes: a settled frame plus two later frames (motion check).
// usage: [BASE_URL] [SIZES=1920x1080,1440x900,...] node scripts/visual/hero-sizes.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const sizes = (process.env.SIZES || '1920x1080,1440x900,1024x768,768x1024,390x844,375x812').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
for (const [width, height] of sizes) {
  const page = await (await browser.newContext({viewport: {width, height}, ...(width <= 700 ? {isMobile: true, hasTouch: true} : {})})).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.keyboard.press('Shift');
  await page.locator('.cinema-hero[data-ambient="running"]').waitFor(); await page.waitForTimeout(1500);
  for (const k of [0, 1, 2]) {await page.screenshot({path: `${out}/${width}x${height}-${k}.png`}); await page.waitForTimeout(1700);}
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(`${width}x${height}`, 'overflow', overflow, errors.length ? errors : '');
  await page.close();
}
await browser.close();
