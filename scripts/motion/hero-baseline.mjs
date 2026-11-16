// Frame-exact hero intro capture (dev build): seeks the intro timeline with CSS animations frozen, so two runs
// can be compared pixel by pixel. usage: node scripts/motion/hero-baseline.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto(process.env.BASE_URL || 'http://localhost:3000');
await page.waitForFunction(() => Boolean(document.querySelector('.cinema-hero')?.heroIntro));
await page.evaluate(() => document.fonts.ready);
for (const t of [0, 0.6, 1.1, 1.6, 2.1, 2.7]) {
  await page.evaluate(t => { document.getAnimations().forEach(a => {a.pause(); a.currentTime = 0;}); const tl = document.querySelector('.cinema-hero').heroIntro; tl.pause(); tl.seek(t, false); }, t);
  await page.waitForTimeout(200);
  await page.screenshot({path: `${out}/intro-${t.toFixed(1)}s.png`});
}
await browser.close();
console.log(fs.readdirSync(out).join(' '));
