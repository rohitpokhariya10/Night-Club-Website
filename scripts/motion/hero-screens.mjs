// Final-state screenshots of the hero (after the intro) at each width, plus reduced motion.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3100';
const browser = await chromium.launch();
for (const [w, h] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  const page = await browser.newPage({viewport: {width: w, height: h}});
  await page.goto(base);
  await page.waitForSelector('.cinema-hero[data-ambient="running"]', {timeout: 15000});
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await page.screenshot({path: `${out}/hero-${w}.png`});
  await page.close();
}
const reduced = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
await reduced.goto(base); await reduced.waitForTimeout(800);
await reduced.screenshot({path: `${out}/hero-1440-reduced-motion.png`});
await browser.close();
console.log(fs.readdirSync(out).join(' '));
