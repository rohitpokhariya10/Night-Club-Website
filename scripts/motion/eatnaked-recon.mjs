// Reference study of https://eatnaked.co/ (analysis only; nothing is copied into the project).
// Waits for the site's percentage preloader, then studies the "Designed for Your Taste" carousel (autoplay,
// clicking a side card, dragging, arrow keys) and the "Ingredients that matter" showcase (next/previous with
// rapid frame capture, hover), records the scroll entrance of both, and saves a video of the session.
// It never clicks navigation links. usage: node scripts/motion/eatnaked-recon.mjs <outDir> [width]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; const width = Number(process.argv[3] || 1440);
fs.mkdirSync(out, {recursive: true});
const mobile = width <= 700;
const viewport = {width, height: mobile ? 844 : 900};
const browser = await chromium.launch();
const context = await browser.newContext({viewport, locale: 'en-US', recordVideo: {dir: out, size: viewport}, ...(mobile ? {hasTouch: true, isMobile: true} : {})});
const page = await context.newPage();
const log = (...a) => {console.log(...a); fs.appendFileSync(`${out}/log.txt`, a.join(' ') + '\n');};
const shot = name => page.screenshot({path: `${out}/${name}.png`});
await page.goto('https://eatnaked.co/', {waitUntil: 'domcontentloaded', timeout: 90000});
const t0 = Date.now();
await page.waitForFunction(() => {const l = document.querySelector('.loader'); return !l || getComputedStyle(l).visibility === 'hidden' || Number(getComputedStyle(l).opacity) === 0;}, null, {timeout: 150000, polling: 500});
log('preloader hidden after', Date.now() - t0, 'ms');
await page.waitForTimeout(2500);
await shot('00-top');

/** Scroll with the wheel (the site may smooth-scroll) until the section's top sits at `offset` px. */
async function bring(selector, offset = 0) {
  for (let i = 0; i < 80; i++) {
    const top = await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().top);
    if (Math.abs(top - offset) < 6) break;
    const step = Math.max(-1200, Math.min(1200, top - offset));
    if (mobile) await page.evaluate(d => window.scrollBy(0, d), step); else await page.mouse.wheel(0, step);
    await page.waitForTimeout(Math.abs(step) > 400 ? 450 : 250);
  }
  await page.waitForTimeout(900);
}
async function burst(prefix, count = 24, gap = 0) {
  const start = Date.now();
  for (let f = 0; f < count; f++) {
    await page.screenshot({path: `${out}/${prefix}-f${String(f).padStart(2, '0')}-${Date.now() - start}ms.png`});
    if (gap) await page.waitForTimeout(gap);
  }
}
const describe = selector => page.locator(selector).first().evaluate(section => {
  const box = el => (r => [r.x, r.y, r.width, r.height].map(Math.round))(el.getBoundingClientRect());
  const style = el => {const s = getComputedStyle(el); return {t: s.transform.slice(0, 60), o: s.opacity, z: s.zIndex, f: s.filter.slice(0, 30)};};
  return {
    images: [...section.querySelectorAll('img')].filter(i => i.getClientRects().length).map(i => ({src: i.src.split('/').pop(), box: box(i), ...style(i), parent: style(i.parentElement)})),
    texts: [...section.querySelectorAll('h2,h3,h4,p,span,a,button')].filter(e => e.children.length === 0 && e.textContent.trim() && e.getClientRects().length).slice(0, 40).map(e => ({tag: e.tagName, text: e.textContent.trim().slice(0, 50), box: box(e), ...style(e)})),
  };
});

// ---- Carousel ("design") ----
const carousel = 'section.design, .design';
if (await page.locator(carousel).count()) {
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await page.waitForTimeout(600);
  // Entrance: approach from one viewport above in 12 wheel steps.
  await bring(carousel, viewport.height);
  for (let k = 0; k < 12; k++) {
    if (mobile) await page.evaluate(d => window.scrollBy(0, d), viewport.height / 12); else await page.mouse.wheel(0, viewport.height / 12);
    await page.waitForTimeout(160); await shot(`carousel-enter-${String(k).padStart(2, '0')}`);
  }
  await bring(carousel, 0);
  await shot('carousel-rest');
  fs.writeFileSync(`${out}/carousel-state-0.json`, JSON.stringify(await describe(carousel), null, 1));
  log('carousel autoplay check');
  await burst('carousel-auto', 12, 500);
  // Click the right-hand card's image area (not its link).
  const right = await page.locator(carousel).first().evaluate(section => {
    const imgs = [...section.querySelectorAll('img')].filter(i => i.getClientRects().length).map(i => i.getBoundingClientRect());
    const r = imgs.sort((a, b) => b.x - a.x)[0];
    return r ? {x: r.x + r.width * 0.5, y: r.y + r.height * 0.22} : null;
  });
  if (right) {
    await page.mouse.move(right.x, right.y); await page.waitForTimeout(500); await shot('carousel-hover-right');
    await page.mouse.click(right.x, right.y);
    await burst('carousel-click-right', 26);
    await page.waitForTimeout(1500); await shot('carousel-click-right-settled');
    log('url after click', page.url());
    if (!page.url().replace(/\/$/, '').endsWith('eatnaked.co')) {await page.goBack(); await page.waitForTimeout(3000); await bring(carousel, 0);}
    fs.writeFileSync(`${out}/carousel-state-1.json`, JSON.stringify(await describe(carousel), null, 1));
  }
  // Drag from right to left across the centre.
  const mid = {x: viewport.width / 2, y: await page.locator(carousel).first().evaluate(s => s.getBoundingClientRect().top + s.getBoundingClientRect().height * 0.45)};
  await page.mouse.move(mid.x + 220, mid.y); await page.mouse.down();
  for (let k = 0; k < 10; k++) { await page.mouse.move(mid.x + 220 - k * 45, mid.y); await page.waitForTimeout(30); }
  await page.mouse.up();
  await burst('carousel-drag', 20);
  log('url after drag', page.url());
  await page.keyboard.press('ArrowRight'); await burst('carousel-key', 10, 120);
}

// ---- Showcase ("bowl") ----
const showcase = 'section.bowl, .bowl';
if (await page.locator(showcase).count()) {
  await bring(showcase, viewport.height);
  for (let k = 0; k < 12; k++) {
    if (mobile) await page.evaluate(d => window.scrollBy(0, d), viewport.height / 12); else await page.mouse.wheel(0, viewport.height / 12);
    await page.waitForTimeout(160); await shot(`showcase-enter-${String(k).padStart(2, '0')}`);
  }
  await bring(showcase, 0);
  await shot('showcase-rest');
  fs.writeFileSync(`${out}/showcase-state-0.json`, JSON.stringify(await describe(showcase), null, 1));
  const next = page.locator(`${showcase} .bowl-navigation__button.is--next`).first();
  const prev = page.locator(`${showcase} .bowl-navigation__button.is--prev`).first();
  await next.hover(); await page.waitForTimeout(600); await shot('showcase-hover-next');
  await next.click(); await burst('showcase-next1', 30);
  await page.waitForTimeout(1200); await shot('showcase-next1-settled');
  fs.writeFileSync(`${out}/showcase-state-1.json`, JSON.stringify(await describe(showcase), null, 1));
  await next.click(); await burst('showcase-next2', 16);
  await page.waitForTimeout(1200); await shot('showcase-next2-settled');
  await prev.click(); await burst('showcase-prev', 30);
  await page.waitForTimeout(1200); await shot('showcase-prev-settled');
  // Rapid double click.
  await next.click(); await page.waitForTimeout(120); await next.click(); await burst('showcase-rapid', 16);
  await page.waitForTimeout(1500); await shot('showcase-rapid-settled');
  // Keyboard: focus the next button and press Enter.
  await next.focus(); await shot('showcase-focus-next'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500); await shot('showcase-key-enter');
}
const video = page.video();
await context.close();
if (video) fs.renameSync(await video.path(), `${out}/eatnaked-${width}.webm`);
await browser.close();
log('done');
