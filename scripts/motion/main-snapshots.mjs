// Reduced-motion (settled, deterministic) screenshots of each page's <main> and header, to prove that a change
// elsewhere (e.g. the footer) leaves page content untouched. Compare two runs with compare-images.mjs.
// usage: [BASE_URL=…] node scripts/motion/main-snapshots.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3100';
const browser = await chromium.launch();
for (const [name, viewport] of [['desktop', {width: 1440, height: 900}], ['mobile', {width: 390, height: 844}]]) {
  const page = await browser.newPage({viewport, reducedMotion: 'reduce'});
  for (const route of ['/', '/contact', '/gallery', '/food-menu', '/private-parties']) {
    await page.goto(base + route); await page.evaluate(() => document.fonts.ready);
    console.log(name, route);
    // Load every lazy image, then return to the top.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    // Each image gets at most 3 s to decode (a lazy image that never loads must not stall the run).
    await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? null : Promise.race([i.decode().catch(() => null), new Promise(r => setTimeout(r, 3000))]))));
    await page.waitForTimeout(500);
    const slug = route === '/' ? 'home' : route.slice(1);
    await page.locator('main').screenshot({path: `${out}/${name}-${slug}-main.png`, animations: 'disabled', style: 'video{visibility:hidden!important}'});
    await page.locator('.header').screenshot({path: `${out}/${name}-${slug}-header.png`, animations: 'disabled'});
  }
  await page.close();
}
await browser.close();
console.log(fs.readdirSync(out).length, 'files');
