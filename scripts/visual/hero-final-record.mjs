// Real-browser recordings of the hero for review (final hero refinement), one .webm per session:
//   <out>/session-<w>.webm   fresh load with the full intro, ~28 s of the room (two cycles of the slowest main sweep),
//                            CTA hover, keyboard focus, scroll through the hand-off and back up (reverse)
//   <out>/reduced-<w>.webm   the reduced-motion composition (still scene, no flashes)
// plus stills: intro frames, rest, hover, focus, 25/50/75% scroll, reverse. Logs page errors.
// usage: [BASE_URL] [SIZES=1440x900,390x844] node scripts/visual/hero-final-record.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const sizes = (process.env.SIZES || '1440x900,390x844').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
for (const [width, height] of sizes) {
  const phone = width <= 700;
  for (const reduced of [false, true]) {
    const context = await browser.newContext({viewport: {width, height}, ...(phone ? {isMobile: true, hasTouch: true} : {}),
      reducedMotion: reduced ? 'reduce' : 'no-preference', recordVideo: {dir: `${out}/raw`, size: {width, height}}});
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
    const shot = name => page.screenshot({path: `${out}/${name}-${width}.png`});
    await page.goto(base);
    if (!reduced) {
      let elapsed = 0;
      for (const t of [300, 900, 1600, 2400]) {await page.waitForTimeout(t - elapsed); elapsed = t; await shot(`intro-${t}ms`);}
      await page.locator('.cinema-hero[data-ambient="running"]').waitFor();
      await page.waitForTimeout(28000);
      await shot('rest');
      const cta = page.locator('.hero-cta');
      if (!phone) {await cta.hover(); await page.waitForTimeout(1200); await shot('cta-hover'); await page.mouse.move(40, height / 2); await page.waitForTimeout(600);}
      await page.locator('.header-book').focus();
      for (let i = 0; i < 40 && !(await cta.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
      await page.waitForTimeout(800); await shot('cta-focus');
      await page.locator('body').click({position: {x: 5, y: height - 5}}).catch(() => {});
      const heroHeight = await page.locator('.cinema-hero').evaluate(el => el.clientHeight);
      let scrolled = 0;
      for (const f of [0.25, 0.5, 0.75, 1.1]) {
        for (let k = 0; k < 10; k++) {await page.mouse.wheel(0, heroHeight * (f - scrolled) / 10); await page.waitForTimeout(60);}
        scrolled = f;
        await page.waitForTimeout(700); await shot(`scroll-${Math.round(f * 100)}`);
      }
      for (let k = 0; k < 24; k++) {await page.mouse.wheel(0, -heroHeight * 1.2 / 20); await page.waitForTimeout(70);}
      await page.waitForTimeout(1500); await shot('reverse');
      await page.waitForTimeout(3000);
    } else {
      await page.waitForTimeout(4000); await shot('reduced');
    }
    const video = page.video(); await context.close();
    await video?.saveAs(`${out}/${reduced ? 'reduced' : 'session'}-${width}.webm`);
    console.log(`${width}x${height}${reduced ? ' reduced' : ''}: errors`, errors);
  }
}
fs.rmSync(`${out}/raw`, {recursive: true, force: true});
await browser.close();
