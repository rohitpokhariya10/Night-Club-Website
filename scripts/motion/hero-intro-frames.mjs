// Captures the homepage hero intro at timed points from navigation (fresh session each run).
// usage: node scripts/motion/hero-intro-frames.mjs <outDir> [desktop|mobile]
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const [outDir, mode = 'desktop'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const vp = mode === 'mobile' ? {width: 390, height: 844} : {width: 1440, height: 900};
const browser = await chromium.launch({headless: !!process.env.HEADLESS});
const context = await browser.newContext(mode === 'mobile' ? {...devices['iPhone 13'], viewport: vp} : {viewport: vp});
const page = await context.newPage();
const errors = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.BASE_URL || 'http://localhost:3000', {waitUntil: 'commit'});
// Measure time from the intro's start (when the hero becomes .is-intro) for accurate comparison with the reference.
await page.waitForSelector('.cinema-hero.is-intro', {timeout: 15000});
const t0 = Date.now();
const marks = (process.env.MARKS || '0,0.3,0.6,0.9,1.1,1.3,1.6,1.9,2.2,2.6,4,6').split(',').map(Number);
const states = [];
for (const m of marks) {
  const wait = m * 1000 - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
  const at = (Date.now() - t0) / 1000;
  const file = `${outDir}/i${at.toFixed(2).padStart(5, '0')}s.png`;
  await page.screenshot({path: file});
  states.push(await page.evaluate(at => { const h = document.querySelector('.cinema-hero'); const orb = document.querySelector('.hero-orb').getBoundingClientRect(); const hr = h.getBoundingClientRect(); const h1 = getComputedStyle(document.querySelector('.cinema-copy h1')); return {at, orbY: +((orb.top + orb.height / 2 - hr.top) / hr.height).toFixed(3), h1: {opacity: h1.opacity, filter: h1.filter}, header: getComputedStyle(document.querySelector('.header')).opacity, intro: h.classList.contains('is-intro'), ambient: h.dataset.ambient, video: document.querySelectorAll('video').length}; }, at));
}
fs.writeFileSync(`${outDir}/states.json`, JSON.stringify({errors, states}, null, 1));
console.log(JSON.stringify({errors, states: states.map(s => `${s.at.toFixed(2)}s orbY=${s.orbY} h1=${s.h1.opacity}/${s.h1.filter} header=${s.header} intro=${s.intro} ambient=${s.ambient} video=${s.video}`)}, null, 1));
await browser.close();
