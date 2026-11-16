// The handoff from "More than a night out" (#discover) into the next homepage section, at each required size:
// a screenshot with the film's lower edge in view, plus the measured gap and any overlap between the two.
// usage: [BASE_URL=…] node scripts/motion/transition-boundary.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const SIZES = [[360, 800], [390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [1280, 640], [1440, 700]];
const browser = await chromium.launch();
const rows = [];
for (const [width, height] of SIZES) {
  const touch = width < 700;
  const context = await browser.newContext({viewport: {width, height}, ...(touch ? {hasTouch: true, isMobile: true} : {})});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base); await page.keyboard.press('Shift');
  await page.waitForSelector('.cinema-hero[data-ambient="running"]', {timeout: 20000});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const frameBottom = await page.locator('.night-out-frame').evaluate(el => el.getBoundingClientRect().bottom + scrollY);
  // The film's lower edge at 40% of the viewport: the exit is under way and the next section is in view.
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(frameBottom - height * 0.4));
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => {
    const section = document.querySelector('#discover');
    const next = section.nextElementSibling;
    const r = el => el.getBoundingClientRect();
    const frame = r(document.querySelector('.night-out-frame'));
    const round = r(document.querySelector('.night-out-round'));
    const first = next.querySelector('.script, h2, .stacked-photo');
    const firstContent = Math.min(...[...next.querySelectorAll('.script, h2, .stacked-photo')].map(el => r(el).top));
    const leftovers = [...section.querySelectorAll('.night-out-copy, .night-out-lede, .night-out-aside, .night-out-ghost')].length + document.querySelectorAll('main[data-home] .experience-strip').length;
    return {
      next: next.className, sectionBottom: Math.round(r(section).bottom), nextTop: Math.round(r(next).top),
      overlap: Math.round(r(section).bottom - r(next).top), frameBottom: Math.round(frame.bottom), roundBottom: Math.round(round.bottom),
      gapRoundToContent: Math.round(firstContent - round.bottom), gapFilmToContent: Math.round(firstContent - frame.bottom),
      clip: getComputedStyle(document.querySelector('.night-out-frame')).clipPath, leftovers, hasFirst: !!first,
      scrollWidth: document.documentElement.scrollWidth, innerWidth,
    };
  });
  await page.screenshot({path: `${out}/boundary-${width}x${height}.png`});
  rows.push({size: `${width}×${height}`, ...m, errors: errors.length});
  await context.close();
}
await browser.close();
console.table(rows.map(({size, overlap, roundBottom, gapRoundToContent, gapFilmToContent, leftovers, scrollWidth, innerWidth, clip, errors}) => ({size, overlap, roundBottom, gapRoundToContent, gapFilmToContent, leftovers, hscroll: scrollWidth > innerWidth, clip: clip.slice(0, 40), errors})));
fs.writeFileSync(`${out}/boundary.json`, JSON.stringify(rows, null, 2));
