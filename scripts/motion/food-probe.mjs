// Food & Drinks sections at rest and after interactions (carousel next, showcase next), with geometry,
// overflow and console errors. usage: [BASE_URL=…] [W=1440,390] node scripts/motion/food-probe.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
for (const size of (process.env.W || '1440,390').split(',')) {
  const [width, h] = size.split('x').map(Number);
  const height = h || (width <= 700 ? 844 : 900);
  const page = await browser.newPage({viewport: {width, height}, ...(width <= 700 ? {hasTouch: true, isMobile: true} : {})});
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + '/'); await page.keyboard.press('Shift');
  await page.evaluate(() => document.fonts.ready);
  const at = async (selector, offset = 0) => {
    await page.locator(selector).evaluate((el, o) => window.scrollTo({top: el.getBoundingClientRect().top + scrollY - o, behavior: 'instant'}), offset);
    await page.waitForTimeout(400);
    await page.evaluate(async () => Promise.all([...document.querySelectorAll('.fd img, .sig img')].map(i => i.complete ? null : Promise.race([i.decode().catch(() => null), new Promise(r => setTimeout(r, 3000))]))));
  };
  await at('.fd', 0); await page.waitForTimeout(2200);
  await page.screenshot({path: `${out}/${size}-a-rest.png`, style: 'nextjs-portal{display:none!important}'});
  await page.locator('.fd .fd-arrow').last().click(); await page.waitForTimeout(260);
  await page.screenshot({path: `${out}/${size}-a-mid.png`, style: 'nextjs-portal{display:none!important}'});
  await page.waitForTimeout(1200);
  await page.screenshot({path: `${out}/${size}-a-next.png`, style: 'nextjs-portal{display:none!important}'});
  await at('.sig', 0); await page.waitForTimeout(2400);
  await page.screenshot({path: `${out}/${size}-b-rest.png`, style: 'nextjs-portal{display:none!important}'});
  await page.locator('.sig-next').click(); await page.waitForTimeout(480);
  await page.screenshot({path: `${out}/${size}-b-mid.png`, style: 'nextjs-portal{display:none!important}'});
  await page.waitForTimeout(1300);
  await page.screenshot({path: `${out}/${size}-b-next.png`, style: 'nextjs-portal{display:none!important}'});
  const info = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    fd: Math.round(document.querySelector('.fd').getBoundingClientRect().height),
    sig: Math.round(document.querySelector('.sig').getBoundingClientRect().height),
    chipsOut: [...document.querySelectorAll('.sig-group[data-active] .sig-chip')].filter(c => {const b = c.getBoundingClientRect(); return b.left < 0 || b.right > innerWidth;}).map(c => c.textContent),
  }));
  console.log(size, JSON.stringify(info), 'errors', errors);
  await page.close();
}
await browser.close();
