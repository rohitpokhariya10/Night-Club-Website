// Quick footer look at chosen widths (end of page, after entrances), plus geometry and console errors.
// usage: [BASE_URL=…] [W=1440,390] [ROUTE=/] [CSS=…] node scripts/motion/footer-probe.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
for (const size of (process.env.W || '1440,390').split(',')) {
  const [width, h] = size.split('x').map(Number);
  const height = h || (width <= 700 ? 844 : width <= 1024 ? 1024 : width >= 1920 ? 1080 : 900);
  const page = await browser.newPage({viewport: {width, height}});
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + (process.env.ROUTE || '/')); await page.keyboard.press('Shift');
  if (process.env.CSS) await page.addStyleTag({content: process.env.CSS});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
  await page.waitForTimeout(2800);
  await page.screenshot({path: `${out}/end-${size}.png`, style: 'nextjs-portal{display:none!important}'});
  await page.locator('footer').screenshot({path: `${out}/footer-${size}.png`, style: 'nextjs-portal,.header,.skip-link{display:none!important}'});
  const info = await page.locator('footer').evaluate(el => {
    const r = s => {const e = el.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width), Math.round(b.height)];};
    const clipped = [...el.querySelectorAll('a, p, address, dt, dd, span.nw')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.textContent.trim().slice(0, 24));
    return {h: Math.round(el.getBoundingClientRect().height), main: r('.ft-main'), legal: r('.ft-legal'), overflow: document.documentElement.scrollWidth > innerWidth, clipped};
  });
  console.log(size, JSON.stringify(info), 'errors', errors);
  await page.close();
}
await browser.close();
