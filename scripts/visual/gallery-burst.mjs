// How far do the gallery ring's cards reach outside the gallery section while the burst settles? The ring is brought
// through its settle range (ring top at 96% of the viewport → ring centre at 58%) and, at each step, the topmost card
// edge is compared with the section's top and the lowest card edge with the section's bottom (px; positive = outside).
// usage: [BASE_URL=…] [WIDTHS=1440x900,768x1024,390x844] node scripts/visual/gallery-burst.mjs
import {chromium} from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3000';
const sizes = (process.env.WIDTHS || '1440x900,1920x1080,1024x768,768x1024,390x844,360x800').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
let worst = 0;
for (const [width, height] of sizes) {
  const page = await browser.newPage({viewport: {width, height}});
  await page.goto(base); await page.keyboard.press('Shift');
  await page.locator('.home-gallery[data-motion="ready"]').waitFor({timeout: 20000});
  const ringTop = await page.locator('.lens-ring').evaluate(el => el.getBoundingClientRect().top + scrollY);
  const ringH = await page.locator('.lens-ring').evaluate(el => el.getBoundingClientRect().height);
  let above = -Infinity, below = -Infinity;
  for (let k = 0; k <= 12; k++) {
    // From ring top at 100% of the viewport to ring centre at 50%.
    const f = k / 12, y = ringTop - height + f * (height * 0.5 + ringH / 2);
    await page.evaluate(v => window.scrollTo({top: v, behavior: 'instant'}), Math.round(y));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const s = document.querySelector('.home-gallery').getBoundingClientRect();
      const cards = [...document.querySelectorAll('.lens-card-inner')].map(el => el.getBoundingClientRect());
      return {above: s.top - Math.min(...cards.map(c => c.top)), below: Math.max(...cards.map(c => c.bottom)) - s.bottom};
    });
    above = Math.max(above, m.above); below = Math.max(below, m.below);
  }
  worst = Math.max(worst, above, below);
  console.log(`${width}x${height}: cards reach ${Math.round(above)} px above the section top, ${Math.round(below)} px below its bottom (positive = outside)`);
  await page.close();
}
await browser.close();
process.exitCode = worst > 0 ? 1 : 0;
