// Records the local Jimmy O's homepage the same way the reference was recorded: headed Chromium, real wheel
// input, per-step screenshots + computed transform log, then reverse and fast-flick passes, plus a video.
// usage: node scripts/motion/site-capture.mjs <outDir> [desktop|tablet|mobile] [stepPx]
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const [outDir, mode = 'desktop', stepArg] = process.argv.slice(2);
const base = process.env.BASE_URL || 'http://localhost:3000';
const vp = {desktop: {width: 1440, height: 900}, tablet: {width: 768, height: 1024}, mobile: {width: 390, height: 844}}[mode];
const step = Number(stepArg || (mode === 'desktop' ? 120 : 160));
fs.mkdirSync(`${outDir}/frames`, {recursive: true});
const browser = await chromium.launch({headless: !!process.env.HEADLESS});
const ctxOpts = mode === 'mobile' ? {...devices['iPhone 13'], viewport: vp} : {viewport: vp};
const context = await browser.newContext({...ctxOpts, recordVideo: {dir: `${outDir}/video`, size: vp}});
const page = await context.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
const t0 = Date.now();
await page.goto(base, {waitUntil: 'domcontentloaded'});
// Entrance timeline (time-based) sampled during the first 1.6s.
for (const t of [100, 400, 800, 1600]) { await page.waitForTimeout(Math.max(0, t - (Date.now() - t0))); await page.screenshot({path: `${outDir}/frames/load-${t}ms.png`}); }
await page.waitForTimeout(1200);
await page.mouse.move(vp.width / 2, vp.height / 2);
const probe = () => page.evaluate(() => {
  const vh = innerHeight; const moving = [];
  for (const el of document.querySelectorAll('main *')) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh || r.width < 40 || r.height < 18) continue;
    const cs = getComputedStyle(el);
    const t = cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)';
    const c = cs.clipPath !== 'none'; const o = Number(cs.opacity) < 1;
    if (!t && !c && !o) continue;
    moving.push({cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 34), box: [r.left, r.top, r.width, r.height].map(Math.round), transform: t ? cs.transform.slice(0, 60) : undefined, clip: c ? cs.clipPath.slice(0, 50) : undefined, opacity: o ? cs.opacity : undefined});
    if (moving.length > 24) break;
  }
  const sections = [...document.querySelectorAll('main > *')].map(s => {const r = s.getBoundingClientRect(); return {cls: s.className.toString().slice(0, 30), top: Math.round(r.top), h: Math.round(r.height)};});
  const overflow = document.documentElement.scrollWidth > innerWidth + 1;
  return {y: Math.round(scrollY), sections, moving, overflow};
});
const scrollBy = async dy => { if (mode === 'mobile') await page.evaluate(d => window.scrollBy(0, d), dy); else await page.mouse.wheel(0, dy); };
const log = []; let n = 0;
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
while (n < 220) {
  const s = await probe(); log.push(s);
  await page.screenshot({path: `${outDir}/frames/f${String(n).padStart(3, '0')}-y${String(s.y).padStart(5, '0')}.png`});
  if (s.y >= max - 2) break;
  await scrollBy(step); await page.waitForTimeout(mode === 'desktop' ? 420 : 300); n++;
  if (log.length > 3 && log.at(-1).y === log.at(-2).y && log.at(-2).y === log.at(-3).y) break;
}
fs.writeFileSync(`${outDir}/scroll-log.json`, JSON.stringify(log, null, 1));
fs.mkdirSync(`${outDir}/reverse`, {recursive: true});
for (let i = 0; i < 60; i++) { await scrollBy(-step * 2); await page.waitForTimeout(140); if (i % 4 === 0) { const y = await page.evaluate(() => Math.round(scrollY)); await page.screenshot({path: `${outDir}/reverse/r${String(i).padStart(2, '0')}-y${y}.png`}); if (y === 0) break; } }
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(900);
fs.mkdirSync(`${outDir}/fast`, {recursive: true});
for (let i = 0; i < 8; i++) {
  await scrollBy(1600); await page.waitForTimeout(90);
  let y = await page.evaluate(() => Math.round(scrollY)); await page.screenshot({path: `${outDir}/fast/flick${i}-a-mid-y${y}.png`});
  await page.waitForTimeout(1200);
  y = await page.evaluate(() => Math.round(scrollY)); await page.screenshot({path: `${outDir}/fast/flick${i}-b-settled-y${y}.png`});
}
// After fast flicks: is any main content still hidden (opacity ~0 or clipped fully) above the current viewport?
const hidden = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main p, main img, main a')].filter(el => {const r = el.getBoundingClientRect(); if (r.bottom > 0 || r.height < 2) return false; let e = el; while (e && e !== document.body) {if (Number(getComputedStyle(e).opacity) < 0.05) return true; e = e.parentElement;} return false;}).map(el => el.outerHTML.slice(0, 90)));
fs.writeFileSync(`${outDir}/summary.json`, JSON.stringify({mode, step, frames: n + 1, max, errors, hiddenAfterFastScroll: hidden, overflowFrames: log.filter(l => l.overflow).map(l => l.y)}, null, 1));
await context.close(); await browser.close();
console.log(JSON.stringify({frames: n + 1, max, errors: errors.length, hidden: hidden.length, overflow: log.filter(l => l.overflow).length}));
