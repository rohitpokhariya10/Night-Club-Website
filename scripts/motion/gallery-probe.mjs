// Homepage ring gallery at fixed points of its scroll range, with geometry and console errors.
// usage: [W=1440,390] [BASE_URL=…] node scripts/motion/gallery-probe.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true}); const widths = (process.env.W || '1440,390').split(',').map(Number);
const browser = await chromium.launch();
for (const width of widths) {
  const height = width <= 700 ? 844 : 900;
  const page = await browser.newPage({viewport: {width, height}});
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${process.env.BASE_URL || 'http://localhost:3000'}/`); await page.keyboard.press('Shift'); // finish the hero intro
  await page.waitForSelector('.cinema-hero[data-ambient="running"]'); await page.waitForSelector('.home-gallery[data-motion="ready"]', {state: 'attached'});
  await page.evaluate(() => document.fonts.ready);
  const top = await page.locator('.lens-ring').evaluate(el => el.getBoundingClientRect().top + scrollY);
  const rh = await page.locator('.lens-ring').evaluate(el => el.offsetHeight);
  const positions = [['a-enter', top - height * 0.9], ['b-mid', top - height * 0.55], ['c-late', top - height * 0.3], ['d-settled', top + rh / 2 - height * 0.5], ['e-orbit', top + rh / 2 - height * 0.15], ['f-exit', top + rh - height * 0.2]];
  for (const [label, y] of positions) {
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(y));
    await page.waitForTimeout(label === 'd-settled' ? 2600 : 700);
    await page.screenshot({path: `${out}/${width}-${label}.png`});
  }
  const info = await page.evaluate(() => {
    const r = el => {const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)];};
    const h = document.querySelector('.lens-heading'); const cs = getComputedStyle(h);
    return {heading: r(h), font: cs.fontFamily.slice(0, 30) + ' ' + cs.fontWeight + ' ' + cs.fontSize, title: r(document.querySelector('.lens-title')), button: r(document.querySelector('.lens-title .button')), cards: [...document.querySelectorAll('.lens-card')].map(r), ring: r(document.querySelector('.lens-ring')), sw: document.documentElement.scrollWidth, iw: innerWidth};
  });
  console.log(width, JSON.stringify(info), 'errors', errors);
  await page.close();
}
await browser.close();
