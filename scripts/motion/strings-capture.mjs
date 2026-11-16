// The strings section (#experience) at rest after its entrance, at desktop, tablet and phone widths: one screenshot of
// the whole section per width, plus the page's console errors.
// usage: [BASE_URL=…] [WIDTHS=1440x900,768x1024,390x844] node scripts/motion/strings-capture.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const sizes = (process.env.WIDTHS || '1440x900,768x1024,390x844').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
for (const [width, height] of sizes) {
  const mobile = width <= 700;
  const context = await browser.newContext({viewport: {width, height}, ...(mobile ? {hasTouch: true, isMobile: true} : {})});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base); await page.keyboard.press('Shift');
  await page.waitForSelector('.cinema-hero[data-ambient="running"]', {timeout: 20000});
  const top = await page.locator('#experience').evaluate(el => el.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top));
  await page.waitForTimeout(4200); // entrance and shimmer finish
  await page.locator('#experience').screenshot({path: `${out}/section-${width}.png`});
  console.log(width, 'instrument', await page.locator('#experience').getAttribute('data-instrument'), 'errors', JSON.stringify(errors));
  await context.close();
}
await browser.close();
