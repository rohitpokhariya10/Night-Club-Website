// Frame-accurate motion sampling on https://eatnaked.co/ (analysis only). After a carousel drag and after the
// showcase's next/previous clicks, a requestAnimationFrame loop inside the page records, every frame for 1.8 s,
// the geometry, transform, opacity and filter of the moving elements. Output: JSON timelines plus a summary.
// usage: node scripts/motion/eatnaked-sample.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const viewport = {width: 1440, height: 900};
const browser = await chromium.launch();
const page = await browser.newPage({viewport, locale: 'en-US'});
await page.goto('https://eatnaked.co/', {waitUntil: 'domcontentloaded', timeout: 90000});
await page.waitForFunction(() => {const l = document.querySelector('.loader'); return !l || getComputedStyle(l).visibility === 'hidden';}, null, {timeout: 150000, polling: 500});
await page.waitForTimeout(2500);
async function bring(selector) {
  for (let i = 0; i < 80; i++) {
    const top = await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().top);
    if (Math.abs(top) < 6) break;
    await page.mouse.wheel(0, Math.max(-1200, Math.min(1200, top)));
    await page.waitForTimeout(Math.abs(top) > 400 ? 450 : 250);
  }
  await page.waitForTimeout(1200);
}
/** Starts an in-page rAF sampler of the given element groups; resolves with the timeline after `ms`. */
const sample = (selectors, ms) => page.evaluate(({selectors, ms}) => new Promise(done => {
  const pick = sel => [...document.querySelectorAll(sel)];
  const read = el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el); const p = el.parentElement ? getComputedStyle(el.parentElement) : null;
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), +(+s.opacity).toFixed(3), s.transform === 'none' ? '' : s.transform.replace(/matrix(3d)?\(|\)/g, '').split(',').map(v => +(+v).toFixed(3)).join(' '), s.filter === 'none' ? '' : s.filter, p && p.transform !== 'none' ? p.transform.replace(/matrix(3d)?\(|\)/g, '').split(',').map(v => +(+v).toFixed(3)).join(' ') : '', s.clipPath === 'none' ? '' : s.clipPath];
  };
  const frames = []; const t0 = performance.now();
  const tick = now => {
    const frame = {t: Math.round(now - t0)};
    for (const [name, sel] of Object.entries(selectors)) frame[name] = pick(sel).map(read);
    frames.push(frame);
    if (now - t0 < ms) requestAnimationFrame(tick); else done(frames);
  };
  requestAnimationFrame(tick);
}), {selectors, ms});
const summary = {};

// Carousel: drag right-to-left across the centre (the reference changes slides by dragging).
await bring('.design');
const cy = await page.locator('.design').first().evaluate(s => s.getBoundingClientRect().top + s.getBoundingClientRect().height * 0.4);
const carouselSel = {imgs: '.design img', h3: '.design h3', h4: '.design h4', cta: '.design .cta-button'};
for (const [dir, label] of [[1, 'drag-next'], [-1, 'drag-prev']]) {
  await page.mouse.move(720 + dir * 240, cy); await page.mouse.down();
  for (let k = 1; k <= 8; k++) { await page.mouse.move(720 + dir * (240 - k * 60), cy); await page.waitForTimeout(16); }
  const timeline = sample(carouselSel, 1800);
  await page.mouse.up();
  const frames = await timeline;
  fs.writeFileSync(`${out}/carousel-${label}.json`, JSON.stringify(frames));
  summary[`carousel-${label}`] = {frames: frames.length, first: frames[0], last: frames.at(-1)};
  await page.waitForTimeout(1200);
}
await page.screenshot({path: `${out}/carousel-after.png`});

// Showcase: next, then previous.
await bring('.bowl');
const showSel = {bowls: '.bowl img[src*="bowl-"][src$=".avif"]', titles: '.bowl h2', labels: '.bowl span', icons: '.bowl img[src$=".png"]'};
for (const [button, label] of [['.bowl-navigation__button.is--next', 'next'], ['.bowl-navigation__button.is--prev', 'prev']]) {
  const timeline = sample(showSel, 2600);
  await page.locator(button).first().click();
  const frames = await timeline;
  fs.writeFileSync(`${out}/showcase-${label}.json`, JSON.stringify(frames));
  summary[`showcase-${label}`] = {frames: frames.length, first: frames[0], last: frames.at(-1)};
  await page.waitForTimeout(1000);
}
fs.writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1));
console.log(Object.entries(summary).map(([k, v]) => `${k}: ${v.frames} frames`).join('\n'));
await browser.close();
