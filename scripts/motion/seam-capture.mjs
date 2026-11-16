// The join between Signature Selections and the specials section: settled screenshots with the join at 80%, 55% and
// 30% of the viewport (forward), the same after scrolling back up (reverse) and after reloading mid-join, at each
// size; geometry of the join; and (RECORD=1) a video of a slow scroll through it and back.
// usage: [BASE_URL=…] [SIZES=1440x900,…] [RECORD=1] node scripts/motion/seam-capture.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const SIZES = (process.env.SIZES || '1440x900,1440x700,1920x1080,1024x768,768x1024,390x844,360x800').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
const still = page => page.waitForFunction(() => new Promise(done => {const y = scrollY; setTimeout(() => done(scrollY === y), 300);}), null, {timeout: 15000}).catch(() => {});
const join = page => page.evaluate(() => {const s = document.querySelector('.sig'); return s.getBoundingClientRect().bottom + scrollY;});
for (const [width, height] of SIZES) {
  const touch = width <= 700;
  const context = await browser.newContext({viewport: {width, height}, ...(touch ? {hasTouch: true, isMobile: true} : {}), ...(process.env.RECORD ? {recordVideo: {dir: out, size: {width, height}}} : {})});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base); await page.keyboard.press('Shift').catch(() => {});
  await page.waitForSelector('.sig[data-motion="ready"]', {state: 'attached', timeout: 20000});
  await page.evaluate(() => document.fonts.ready);
  const tag = `${width}x${height}`;
  const shoot = async (label, at) => {
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round((await join(page)) - height * at));
    await still(page); await page.waitForTimeout(1600);
    await page.screenshot({path: `${out}/${tag}-${label}.png`, style: 'nextjs-portal{display:none!important}'});
  };
  // Reach the section first so its entrance has played, as for a visitor.
  await page.evaluate(() => document.querySelector('.sig').scrollIntoView({behavior: 'instant'})); await page.waitForTimeout(1800);
  for (const at of [0.8, 0.55, 0.3]) await shoot(`forward-${Math.round(at * 100)}`, at);
  await page.evaluate(() => window.scrollBy(0, 900)); await page.waitForTimeout(600);
  await shoot('reverse-55', 0.55);
  const geometry = await page.evaluate(() => {
    const sig = document.querySelector('.sig'), next = sig.nextElementSibling;
    const s = sig.getBoundingClientRect(), n = next.getBoundingClientRect();
    const copy = next.querySelector('.special-copy > *').getBoundingClientRect();
    const controls = [...sig.querySelectorAll('.sig-arrow, .sig-counter, .sig-index, .sig-item[data-active] .sig-cta')].filter(el => el.getClientRects().length && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
    const lowest = Math.max(...controls.map(el => el.getBoundingClientRect().bottom));
    const hit = controls.map(el => {const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return y > 0 && y < innerHeight ? !!top && (el === top || el.contains(top)) : null;});
    const orbit = sig.querySelector('.sig-orbit').getBoundingClientRect(), stage = sig.querySelector('.sig-stage').getBoundingClientRect();
    return {gap: Math.round(n.top - s.bottom), air: Math.round(s.bottom - Math.max(stage.bottom, lowest)), orbitInside: orbit.bottom <= s.bottom + 0.5, nextMargin: getComputedStyle(next).marginTop, copyBelowJoin: Math.round(copy.top - s.bottom), lowestControlAboveJoin: Math.round(s.bottom - lowest), controlsOnTop: hit.filter(h => h !== null).every(Boolean), nextTransform: getComputedStyle(next).transform, hscroll: document.documentElement.scrollWidth > innerWidth};
  });
  // Reload mid-join: the restored scroll position must render the same blend.
  await page.reload(); await page.keyboard.press('Shift').catch(() => {}); await page.waitForSelector('.sig[data-motion="ready"]', {state: 'attached', timeout: 20000});
  await still(page); await page.waitForTimeout(1600);
  await page.screenshot({path: `${out}/${tag}-reload.png`, style: 'nextjs-portal{display:none!important}'});
  if (process.env.RECORD) {
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round((await join(page)) - height * 1.25));
    await page.waitForTimeout(900); if (!touch) await page.mouse.move(width / 2, height / 2);
    const step = async dy => (touch ? page.evaluate(d => window.scrollBy(0, d), dy) : page.mouse.wheel(0, dy));
    for (let moved = 0; moved < height * 1.6; moved += 12) {await step(12); await page.waitForTimeout(30);}
    await page.waitForTimeout(700);
    for (let moved = 0; moved < height * 1.2; moved += 16) {await step(-16); await page.waitForTimeout(30);}
    await page.waitForTimeout(700);
    // A fast flick down through the join, then settle.
    await step(touch ? 1400 : 1400); await page.waitForTimeout(1200);
  }
  const video = page.video();
  await context.close();
  if (video) fs.renameSync(await video.path(), `${out}/join-${tag}.webm`);
  console.log(tag, JSON.stringify(geometry), 'errors', errors.length, errors.slice(0, 2));
}
await browser.close();
