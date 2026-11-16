// Full-resolution interaction recordings: real entrance, swing, slide, string pluck and sound toggle.
// BASE_URL=http://localhost:3202 node scripts/motion/kinetic-capture.mjs
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out = 'artifacts/kinetic-photos/recordings';
await mkdir(out, {recursive: true});
const browser = await chromium.launch();
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const mobile = width < 500;
    const context = await browser.newContext({viewport: {width, height}, hasTouch: mobile, isMobile: mobile, recordVideo: {dir: `${out}/raw`, size: {width, height}}});
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(process.env.BASE_URL || 'http://localhost:3000');
      await page.locator('.cinema-hero[data-ambient="running"]').waitFor();
      await page.locator('#experience[data-instrument]').waitFor();
      await page.locator('#experience').evaluate(el => scrollTo({top: scrollY + el.getBoundingClientRect().top - 115, behavior: 'instant'}));
      await page.waitForTimeout(4200);
      await page.screenshot({path: `artifacts/kinetic-photos/entrance-${width}.png`});
      const card = page.locator('.ns-card[data-index="0"]');
      const cdp = mobile ? await context.newCDPSession(page) : null;
      const drag = async (selector, dx, reverse = false) => {
        const target = card.locator(selector); await target.scrollIntoViewIfNeeded();
        const b = await target.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
        if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
        else {await page.mouse.move(x, y); await page.mouse.down();}
        const moves = reverse ? [dx, -dx] : [dx]; let from = 0;
        for (const to of moves) {
          for (let k = 1; k <= 20; k++) {
            const position = {x: x + from + (to - from) * k / 20, y};
            if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [position]});
            else await page.mouse.move(position.x, position.y);
            await page.waitForTimeout(25);
          }
          from = to;
        }
        if (cdp) await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        else {await page.mouse.up(); await page.mouse.move(15, 140);}
        await page.waitForTimeout(3500);
      };
      await drag('.ns-photo', mobile ? 40 : 75, true);
      await drag('.ns-mount', mobile ? 45 : 220);
      await page.locator('.ns-sound').click();
      await page.locator('.ns-stage').evaluate(el => scrollTo({top: scrollY + el.getBoundingClientRect().top - 200, behavior: 'instant'}));
      const point = await page.evaluate(() => {
        const key = document.querySelector('#experience').dataset.instrument;
        const hit = document.querySelector(`.ns-svg[data-layout="${key}"] .ns-hit`);
        const matrix = hit.getScreenCTM(), length = hit.getTotalLength();
        for (let t = 0.12; t < 0.9; t += 0.04) {
          const p = hit.getPointAtLength(length * t).matrixTransform(matrix);
          if (p.y > 110 && p.y < innerHeight - 30 && document.elementFromPoint(p.x, p.y) === hit) return {x: p.x, y: p.y};
        }
        throw new Error('No visible string point for the capture');
      });
      if (mobile) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(2200);
      await page.locator('.ns-sound').click();
      await page.emulateMedia({reducedMotion: 'reduce'});
      await drag('.ns-mount', mobile ? -35 : -80);
      await card.locator('.ns-link').click();
      await page.waitForURL('**/nightlife');
      if (errors.length) throw new Error(errors.join('\n'));
      const video = page.video(); await page.close();
      await video.saveAs(`${out}/complete-${width}.webm`);
      console.log(`${width}px: entrance, swing, slide, pluck, opt-in sound, reduced motion and link recorded; no page errors`);
    } finally {await context.close();}
  }
} finally {await browser.close();}
