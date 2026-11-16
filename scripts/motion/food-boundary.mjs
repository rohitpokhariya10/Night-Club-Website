// The seam between Signature Selections and the next section (specials): geometry at several scroll positions
// (forward, reverse, after a fast jump), anything of .sig painting below its own box, the next section's
// transforms, and a screenshot of the seam. usage: [BASE_URL=…] [W=1440,1024,768,390,360] node food-boundary.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
const frames = page => page.evaluate(() => new Promise(done => {let n = 0; const step = () => (++n > 3 ? done() : requestAnimationFrame(step)); requestAnimationFrame(step);}));
let problems = 0;
for (const width of (process.env.W || '1440,1024,768,390,360').split(',').map(Number)) {
  const height = width <= 700 ? 844 : width <= 1024 ? 1024 : 900;
  const page = await browser.newPage({viewport: {width, height}, ...(width <= 700 ? {hasTouch: true, isMobile: true} : {})});
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + '/'); await page.keyboard.press('Shift'); await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('.sig[data-motion="ready"]', {state: 'attached'});
  const measure = () => page.evaluate(() => {
    const sig = document.querySelector('.sig'); const next = sig.nextElementSibling;
    const s = sig.getBoundingClientRect(); const n = next.getBoundingClientRect();
    // Anything inside .sig whose box reaches below the section (it is clipped, but it shows how much the scene needs).
    const below = [...sig.querySelectorAll('.sig-dish[data-active], .sig-orbit, .sig-labels, .sig-nav, .sig-counter, .sig-items')].map(el => ({cls: el.className.toString().split(' ')[0], over: Math.round(el.getBoundingClientRect().bottom - s.bottom)})).filter(x => x.over > 0);
    const cs = getComputedStyle(sig);
    return {sigBottom: Math.round(s.bottom), nextTop: Math.round(n.top), gap: Math.round(n.top - s.bottom), nextClass: next.className, nextTransform: getComputedStyle(next).transform, overflow: cs.overflow, below};
  });
  const seam = async () => (await page.locator('.sig').evaluate(el => el.getBoundingClientRect().bottom + scrollY));
  const results = [];
  for (const [label, offset] of [['forward-seam-mid', 0.5], ['forward-seam-high', 0.2], ['reverse-seam-mid', 0.5]]) {
    const y = await seam();
    if (label.startsWith('reverse')) { await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'})); await frames(page); }
    await page.evaluate(t => window.scrollTo({top: t, behavior: 'instant'}), Math.round(y - height * offset));
    await frames(page); await page.waitForTimeout(500);
    const m = await measure(); results.push({label, ...m});
    await page.screenshot({path: `${out}/${width}-${label}.png`, style: 'nextjs-portal{display:none!important}'});
    if (m.gap !== 0) problems++; // the next section starts exactly at this one's edge: no gap, no overlap
  }
  // Fast jump straight to the seam from the top.
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'})); await frames(page);
  const y = await seam();
  await page.evaluate(t => window.scrollTo({top: t, behavior: 'instant'}), Math.round(y - height * 0.5)); await frames(page);
  const fast = await measure(); results.push({label: 'fast-jump', ...fast}); if (fast.gap !== 0) problems++;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(width, JSON.stringify(results.map(r => ({l: r.label, gap: r.gap, next: r.nextClass, nt: r.nextTransform.slice(0, 40), ov: r.overflow, below: r.below}))), 'hOverflow', overflow, 'errors', errors.length);
  await page.close();
}
await browser.close();
console.log('gaps or overlaps:', problems);
