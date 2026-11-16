// Signature Selections at rest on every dish (and mid-change), at a given viewport, for visual review.
// usage: [BASE_URL=…] [SIZE=1440x900] node scripts/motion/signature-states.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width, height}, ...(width <= 700 ? {hasTouch: true, isMobile: true} : {})});
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
await page.goto(base + '/'); await page.keyboard.press('Shift'); await page.evaluate(() => document.fonts.ready);
await page.waitForSelector('.sig[data-motion="ready"]', {state: 'attached'});
await page.locator('.sig').evaluate(el => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - (innerWidth > 1100 ? 0 : 60), behavior: 'instant'}));
await page.waitForTimeout(800);
await page.evaluate(() => Promise.all([...document.querySelectorAll('.sig img')].map(i => i.complete ? null : Promise.race([i.decode().catch(() => null), new Promise(r => setTimeout(r, 4000))]))));
await page.waitForTimeout(1800);
const tag = `${width}x${height}`;
for (let i = 0; i < 4; i++) {
  await page.screenshot({path: `${out}/${tag}-rest-${i}.png`, style: 'nextjs-portal{display:none!important}'});
  if (i === 3) break;
  await page.locator('.sig-next').click();
  await page.waitForTimeout(470); await page.screenshot({path: `${out}/${tag}-mid-${i}to${i + 1}.png`, style: 'nextjs-portal{display:none!important}'});
  await page.waitForTimeout(1100);
}
console.log(tag, 'errors', errors);
await browser.close();
