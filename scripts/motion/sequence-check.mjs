// Screenshots each homepage scene at 0/25/50/75/100% of its own scroll range (from its trigger
// geometry), plus a reverse pass, so intermediate motion is verified rather than only end states.
// usage: node scripts/motion/sequence-check.mjs <outDir> [desktop|tablet|mobile]
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const [outDir, mode = 'desktop'] = process.argv.slice(2);
const vp = {desktop: {width: 1440, height: 900}, tablet: {width: 768, height: 1024}, mobile: {width: 390, height: 844}}[mode];
fs.mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch({headless: !!process.env.HEADLESS});
const ctx = await browser.newContext(mode === 'mobile' ? {...devices['iPhone 13'], viewport: vp} : {viewport: vp});
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text().slice(0, 240)}`); });
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
await page.goto(process.env.BASE_URL || 'http://localhost:3000', {waitUntil: 'networkidle'});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
// Scene ranges in document pixels, mirroring the ScrollTrigger start/end values in HomeMotion/HomeGalleryMotion.
const ranges = await page.evaluate(() => {
  const vh = innerHeight; const abs = s => {const el = document.querySelector(s); const r = el.getBoundingClientRect(); return {top: r.top + scrollY, h: r.height};};
  const mobile = innerWidth <= 700;
  const hero = abs('.cinema-hero'), stage = abs('.night-out-stage'), stack = abs('.stacked-photo'), pair = abs('.editorial-link'), special = abs('.special-feature'),
    grid = abs('.event-tiles'), celeb = abs('.celebration-image .photo'), gallery = abs('.gallery-preview'), footer = abs('.footer');
  return {
    A_hero: [hero.top, hero.top + hero.h],
    B_venue: [stage.top - vh, stage.top + stage.h / 2 - vh / 2],
    B_nightlife: [stack.top - vh, stack.top + stack.h / 2 - vh * 0.45],
    C_food: [pair.top - vh, pair.top - vh * 0.3],
    D_specials: [special.top - vh, special.top + special.h / 2 - vh / 2],
    D_events: [grid.top - vh, grid.top - vh * (mobile ? 0.55 : 0.4)],
    E_celebration: [celeb.top - vh, mobile ? celeb.top - vh * 0.35 : celeb.top + celeb.h / 2 - vh * 0.55],
    E_gallery: [gallery.top - vh * 0.92, gallery.top - vh * (mobile ? 0.4 : 0.3)],
    F_footer: [footer.top - vh, footer.top + footer.h - vh],
  };
});
const go = async y => { await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(y)); await page.waitForTimeout(450); };
const shots = {};
for (const [name, [a, b]] of Object.entries(ranges)) {
  shots[name] = [];
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    await go(a + (b - a) * p);
    const file = `${outDir}/${name}-${String(p * 100).padStart(3, '0')}.png`;
    await page.screenshot({path: file}); shots[name].push(file);
  }
  // Reverse: go back to 25% from the end state and confirm the scene returns (scrubbed, not replayed).
  await go(a + (b - a) * 0.25);
  const rev = `${outDir}/${name}-rev025.png`; await page.screenshot({path: rev}); shots[name].push(rev);
}
// Fast jump to the bottom and back to the top: nothing may remain hidden.
await go(1e6); await go(0); await go(1e6);
const hidden = await page.evaluate(() => [...document.querySelectorAll('main h2, main h3, main p, main img, main .button')].filter(el => {
  let e = el; while (e && e !== document.body) { if (Number(getComputedStyle(e).opacity) < 0.05) return true; e = e.parentElement; } return false;
}).map(el => el.outerHTML.slice(0, 80)));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
fs.writeFileSync(`${outDir}/check.json`, JSON.stringify({mode, ranges, errors, hiddenAfterJump: hidden, overflow}, null, 1));
console.log(JSON.stringify({errors, hidden: hidden.length, overflow}));
await browser.close();
