// One homepage section (default "More than a night out", #discover) at rest and through its scroll range, at
// three widths, each also recorded as video while scrolling through it (wheel on desktop/tablet, steps on touch).
// usage: [SECTION=.home-gallery] [BASE_URL=…] node scripts/motion/section-capture.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const section = process.env.SECTION || '#discover';
const browser = await chromium.launch();
for (const [name, vp] of [['desktop', {width: 1440, height: 900}], ['tablet', {width: 768, height: 1024}], ['mobile', {width: 390, height: 844}]]) {
  const context = await browser.newContext({viewport: vp, ...(name === 'mobile' ? {hasTouch: true, isMobile: true} : {}), recordVideo: {dir: out, size: vp}});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base); await page.keyboard.press('Shift'); // finish the hero intro
  await page.waitForSelector('.cinema-hero[data-ambient="running"]', {timeout: 15000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // idle-time scenes are built
  const top = await page.locator(section).evaluate(el => el.getBoundingClientRect().top + scrollY);
  const height = await page.locator(section).evaluate(el => el.offsetHeight);
  // Section top at 100% (entering) … 0% of the viewport, then partly exited.
  for (const [label, y] of [['enter-100', top - vp.height], ['enter-75', top - vp.height * 0.75], ['enter-50', top - vp.height * 0.5], ['enter-25', top - vp.height * 0.25], ['top-0', top], ['mid', top + height * 0.35], ['exit', top + height - vp.height * 0.4]]) {
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.max(0, Math.round(y)));
    await page.waitForTimeout(label === 'enter-50' ? 1400 : 500);
    await page.screenshot({path: `${out}/${name}-${label}.png`});
  }
  // Continuous scroll through the section and back up (wheel through Lenis; native steps on touch).
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.max(0, Math.round(top - vp.height)));
  await page.waitForTimeout(600); if (name !== 'mobile') await page.mouse.move(vp.width / 2, vp.height / 2);
  const travel = height + vp.height * 1.1;
  const step = async dy => { if (name === 'mobile') await page.evaluate(d => window.scrollBy(0, d), dy); else await page.mouse.wheel(0, dy); };
  for (let moved = 0; moved < travel; moved += 14) { await step(14); await page.waitForTimeout(28); }
  await page.waitForTimeout(800);
  for (let moved = 0; moved < travel * 0.6; moved += 22) { await step(-22); await page.waitForTimeout(28); }
  await page.waitForTimeout(600);
  const video = page.video();
  await context.close();
  if (video) fs.renameSync(await video.path(), `${out}/section-scroll-${name}.webm`);
  console.log(name, 'section height', height, 'errors', errors.length);
}
await browser.close();
