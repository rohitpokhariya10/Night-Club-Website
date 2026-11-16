// The homepage ring's choreography states, for side-by-side comparison with the reference frames:
// burst, settling, settled ring, ripple (mid-wave), orbit and hover (desktop) at desktop and phone sizes.
// usage: [BASE_URL=…] node scripts/motion/gallery-states.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
const frames = page => page.evaluate(() => new Promise(done => {let n = 0; const step = () => (++n > 3 ? done() : requestAnimationFrame(step)); requestAnimationFrame(step);}));
for (const [name, viewport, touch] of [['desktop', {width: 1440, height: 900}, false], ['mobile', {width: 390, height: 844}, true]]) {
  const context = await browser.newContext({viewport, ...(touch ? {hasTouch: true, isMobile: true} : {})});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base); await page.keyboard.press('Shift'); // finish the hero intro
  await page.waitForSelector('.home-gallery[data-motion="ready"]', {state: 'attached'});
  await page.evaluate(() => document.fonts.ready);
  if (!touch) await page.mouse.move(2, 2);
  // Ring centre (the stage centre on phones) at `fraction` of the viewport height.
  const ringAt = async fraction => {
    await page.locator('.lens-ring').evaluate((ring, fraction) => {
      const box = ring.getBoundingClientRect();
      const stage = parseFloat(getComputedStyle(ring).paddingBottom) || box.height;
      window.scrollTo({top: scrollY + box.bottom - stage / 2 - innerHeight * fraction, behavior: 'instant'});
    }, fraction);
    await frames(page);
  };
  const shot = async label => page.screenshot({path: `${out}/${name}-${label}.png`, style: 'nextjs-portal{display:none!important}'});
  // The photos are lazy-loaded: bring the ring into view so they load, then decode them before capturing.
  await ringAt(0.5);
  for (const img of await page.locator('.lens-card img').all()) await img.evaluate(img => img.decode());
  await ringAt(1.25); await page.waitForTimeout(300); await shot('1-burst');
  await ringAt(0.85); await page.waitForTimeout(300); await shot('2-settling');
  await ringAt(0.5); await page.waitForTimeout(2600); await shot('3-settled');
  // Ripple: on desktop the pointer enters the ring; on phones the settle replays it (scroll back, then down).
  if (!touch) {
    await page.mouse.move(viewport.width / 2, viewport.height / 2 - 40);
  } else {
    await ringAt(0.75); await page.waitForTimeout(400); await ringAt(0.5);
  }
  await page.waitForTimeout(520); await shot('4-ripple');
  await page.waitForTimeout(2200);
  if (!touch) await page.mouse.move(2, 2);
  await ringAt(0.2); await page.waitForTimeout(400); await shot('5-orbit');
  if (!touch) {
    await ringAt(0.5); await page.waitForTimeout(300);
    await page.getByRole('button', {name: 'View Loaded nachos to share', exact: true}).hover();
    await page.waitForTimeout(2400); await shot('6-hover');
  }
  console.log(name, 'errors', errors.length, errors.slice(0, 3));
  await context.close();
}
await browser.close();
