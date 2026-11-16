// Reference only (screenshots for visual comparison; nothing is reused): how eatnaked.co ends its "Ingredients
// That Matter" showcase — the dish's lower fade, the space beneath, and where the next section begins.
// usage: node scripts/motion/eatnaked-section-bottom.mjs <outDir> [width] [height]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [out, w = 1440, h = 900] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: +w, height: +h}, ...(+w <= 700 ? {isMobile: true, hasTouch: true} : {})});
await p.goto('https://eatnaked.co/', {waitUntil: 'domcontentloaded', timeout: 60000});
// The site's percentage preloader (as in eatnaked-recon.mjs), then its showcase section (`.bowl`).
await p.waitForFunction(() => {const l = document.querySelector('.loader'); return !l || getComputedStyle(l).visibility === 'hidden' || Number(getComputedStyle(l).opacity) === 0;}, null, {timeout: 150000, polling: 500});
await p.waitForTimeout(2500);
const info = await p.locator('section.bowl, .bowl').first().evaluate(s => {
  const r = s.getBoundingClientRect(); const next = s.nextElementSibling?.getBoundingClientRect();
  return {top: r.top + scrollY, bottom: r.bottom + scrollY, height: Math.round(r.height), tag: s.tagName + '.' + s.className.toString().slice(0, 40), nextTop: next ? Math.round(next.top + scrollY) : null};
});
console.log(JSON.stringify(info));
for (const [label, at] of [['bottom-at-85', 0.85], ['bottom-at-60', 0.6], ['bottom-at-35', 0.35]]) {
  for (let i = 0; i < 6; i++) { // the site smooth-scrolls; step until the section bottom sits where we want it
    const cur = await p.evaluate(() => scrollY); const target = info.bottom - +h * at;
    if (Math.abs(cur - target) < 4) break;
    if (+w <= 700) await p.evaluate(y => window.scrollTo(0, y), target); else await p.mouse.wheel(0, target - cur);
    await p.waitForTimeout(900);
  }
  await p.waitForTimeout(1200);
  await p.screenshot({path: `${out}/${w}-${label}.png`});
}
await b.close();
