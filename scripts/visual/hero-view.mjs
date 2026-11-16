// The hero exactly as a visitor sees it at normal size: full-viewport screenshots of the homepage at rest, one at the
// cleanest moment and one at the strongest headline glint found within WINDOW ms, plus the served stylesheet check.
// usage: [BASE_URL] [SIZE=1440x900] [WINDOW=14000] node scripts/visual/hero-view.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const [width, height] = (process.env.SIZE || '1440x900').split('x').map(Number);
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width, height}, ...(width <= 700 ? {isMobile: true, hasTouch: true} : {})})).newPage();
await page.goto(base); await page.keyboard.press('Shift');
await page.locator('.cinema-hero[data-ambient="running"]').waitFor(); await page.waitForTimeout(600);
const glint = () => page.evaluate(() => Math.max(...[...document.querySelectorAll('.hero-reflection')].flatMap(o => [0, 1, 2].map(k => Number(o.style.getPropertyValue(`--rg${k}`)) || 0))));
let best = {g: -1}, clean = {g: 2};
const end = Date.now() + Number(process.env.WINDOW || 14000);
while (Date.now() < end) {
  const g = await glint();
  if (g > best.g) best = {g, shot: await page.screenshot()};
  if (g < clean.g) clean = {g, shot: await page.screenshot()};
  await page.waitForTimeout(150);
}
fs.writeFileSync(`${out}/hero-${width}-clean.png`, clean.shot); fs.writeFileSync(`${out}/hero-${width}-glint.png`, best.shot);
console.log(width, 'clean glint', clean.g.toFixed(2), '| strongest glint', best.g.toFixed(2));
await browser.close();
