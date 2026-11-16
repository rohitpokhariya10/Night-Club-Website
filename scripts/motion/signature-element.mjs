// Whole-section screenshots of Signature Selections (resting, first and third dish) at given sizes.
// usage: [BASE_URL=…] node scripts/motion/signature-element.mjs <outDir> 1024x768 768x1024 390x844 …
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [out, ...sizes] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
for (const size of sizes) {
  const [width, height] = size.split('x').map(Number);
  const page = await browser.newPage({viewport: {width, height}, ...(width <= 700 ? {hasTouch: true, isMobile: true} : {})});
  await page.goto(base + '/'); await page.keyboard.press('Shift'); await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('.sig[data-motion="ready"]', {state: 'attached'});
  await page.locator('.sig').evaluate(el => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - 80, behavior: 'instant'}));
  await page.waitForTimeout(700);
  await page.evaluate(() => Promise.all([...document.querySelectorAll('.sig img')].map(i => i.complete ? null : Promise.race([i.decode().catch(() => null), new Promise(r => setTimeout(r, 4000))]))));
  await page.waitForTimeout(1800);
  await page.locator('.sig').screenshot({path: `${out}/${size}-section-0.png`, style: '.header,.skip-link,nextjs-portal{display:none!important}'});
  await page.locator('.sig-next').click(); await page.waitForTimeout(1500);
  await page.locator('.sig-next').click(); await page.waitForTimeout(1600);
  await page.locator('.sig').screenshot({path: `${out}/${size}-section-2.png`, style: '.header,.skip-link,nextjs-portal{display:none!important}'});
  console.log(size, Math.round(await page.locator('.sig').evaluate(el => el.getBoundingClientRect().height)), 'px tall');
  await page.close();
}
await browser.close();
