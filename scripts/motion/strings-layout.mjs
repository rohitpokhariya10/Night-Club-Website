// Composition check for the strings section (#experience) at many widths, at rest (reduced motion: no entrance, no
// physics): every visible print must keep clear of every other print, stay inside the viewport with a side margin,
// and the section must not cause horizontal scrolling. Prints the tightest gaps per width.
// usage: [BASE_URL=…] [WIDTHS=320,390,…] node scripts/motion/strings-layout.mjs
import {chromium} from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3000';
const widths = (process.env.WIDTHS || '320,360,390,430,600,700,701,768,834,1024,1025,1180,1280,1440,1680,1920').split(',').map(Number);
const browser = await chromium.launch();
const context = await browser.newContext({reducedMotion: 'reduce'});
const page = await context.newPage();
let failures = 0;
for (const width of widths) {
  await page.setViewportSize({width, height: 900});
  await page.goto(base);
  await page.locator('#experience .ns-card').first().waitFor();
  const r = await page.evaluate(() => {
    const plates = [...document.querySelectorAll('#experience .ns-card')].filter(c => getComputedStyle(c).display !== 'none').map(c => ({i: c.dataset.index, box: c.querySelector('.ns-plate').getBoundingClientRect()}));
    const head = document.querySelector('#experience .ns-head').getBoundingClientRect();
    let minGap = Infinity, worst = '';
    for (let a = 0; a < plates.length; a++) for (let b = a + 1; b < plates.length; b++) {
      const A = plates[a].box, B = plates[b].box;
      const gap = Math.max(B.left - A.right, A.left - B.right, B.top - A.bottom, A.top - B.bottom);
      if (gap < minGap) {minGap = gap; worst = `${plates[a].i}/${plates[b].i}`;}
    }
    const edge = Math.min(...plates.map(p => Math.min(p.box.left, innerWidth - p.box.right)));
    const headGap = Math.min(...plates.map(p => p.box.top)) - head.bottom;
    return {cards: plates.length, minGap: Math.round(minGap), worst, edge: Math.round(edge), headGap: Math.round(headGap), overflow: document.documentElement.scrollWidth > innerWidth, height: Math.round(document.querySelector('#experience').getBoundingClientRect().height)};
  });
  const ok = r.minGap >= 8 && r.edge >= 12 && !r.overflow && r.headGap > 0;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(width).padStart(4)}px  cards ${r.cards}  closest prints ${r.minGap}px (${r.worst})  side margin ${r.edge}px  head→first print ${r.headGap}px  section ${r.height}px${r.overflow ? '  HORIZONTAL OVERFLOW' : ''}`);
}
await browser.close();
process.exitCode = failures ? 1 : 0;
