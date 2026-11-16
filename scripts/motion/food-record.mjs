// Records the Food & Drinks sections on desktop and mobile: scrolling into the carousel (entrance), changing
// categories with the arrow, a tab and a drag or swipe, scrolling into Signature Selections (the plate is set
// down), changing dishes with next, previous and the index or a swipe, then scrolling on to the next section.
// Also saves stills at fixed points of each change. usage: [BASE_URL=…] node scripts/motion/food-record.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3100';
const browser = await chromium.launch();
for (const [name, viewport, touch] of [['desktop', {width: 1440, height: 900}, false], ['mobile', {width: 390, height: 844}, true]]) {
  const context = await browser.newContext({viewport, ...(touch ? {hasTouch: true, isMobile: true} : {}), recordVideo: {dir: out, size: viewport}});
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + '/'); await page.keyboard.press('Shift');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('.fd[data-motion="ready"]', {state: 'attached'});
  const cdp = touch ? await context.newCDPSession(page) : null;
  const scroll = async dy => { if (touch) await page.evaluate(d => window.scrollBy(0, d), dy); else await page.mouse.wheel(0, dy); };
  const glide = async (distance, step = 14) => { for (let m = 0; m < Math.abs(distance); m += step) { await scroll(Math.sign(distance) * step); await page.waitForTimeout(24); } await page.waitForTimeout(500); };
  const topOf = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top);
  const swipe = async (x0, x1, y) => {
    if (touch) {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y}]});
      for (let k = 1; k <= 10; k++) await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + (x1 - x0) * k / 10, y: y + k}]});
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    } else {
      await page.mouse.move(x0, y); await page.mouse.down();
      for (let k = 1; k <= 12; k++) { await page.mouse.move(x0 + (x1 - x0) * k / 12, y); await page.waitForTimeout(16); }
      await page.mouse.up();
    }
  };
  const still = async (label, delays) => { let t = 0; for (const d of delays) { await page.waitForTimeout(d - t); t = d; await page.screenshot({path: `${out}/${name}-${label}-${d}ms.png`}); } };
  // Approach the carousel from one viewport above.
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), await page.locator('.fd').evaluate((el, h) => el.getBoundingClientRect().top + scrollY - h, viewport.height));
  await page.waitForTimeout(700);
  if (!touch) await page.mouse.move(viewport.width / 2, viewport.height * 0.3);
  await glide(viewport.height + (await topOf('.fd')) - viewport.height - 30);
  await page.waitForTimeout(1600);
  await page.locator('.fd .fd-arrow').last().click(); await still('carousel-next', [0, 120, 240, 400, 700, 1200]);
  await page.locator('.fd [role="tab"]').nth(2).click(); await page.waitForTimeout(1400);
  const stage = await page.locator('.fd-stage').boundingBox();
  await swipe(viewport.width * 0.78, viewport.width * 0.2, stage.y + stage.height * 0.4); await page.waitForTimeout(1400);
  // On to Signature Selections.
  await glide((await topOf('.sig')) - 20, 16);
  await page.waitForTimeout(1800);
  await page.locator('.sig-next').click(); await still('signature-next', [0, 200, 400, 550, 750, 1200]);
  await page.locator('.sig-next').click(); await page.waitForTimeout(1500);
  await page.locator('.sig-prev').click(); await page.waitForTimeout(1500);
  if (touch) {
    const plate = await page.locator('.sig-plate').boundingBox();
    await glide(Math.round(plate.y - 60), 16);
    const box = await page.locator('.sig-plate').boundingBox();
    await swipe(box.x + box.width * 0.85, box.x + box.width * 0.15, box.y + box.height / 2); await page.waitForTimeout(1600);
  } else {
    await page.locator('.sig-index button').nth(3).click(); await page.waitForTimeout(1600);
  }
  // Continue to the next section (the plate eases back), then return upward a little.
  await glide(viewport.height * 0.9, 16);
  await glide(-viewport.height * 0.6, 20);
  await page.waitForTimeout(800);
  const video = page.video();
  await context.close();
  if (video) fs.renameSync(await video.path(), `${out}/food-drinks-${name}.webm`);
  console.log(name, 'errors', errors.length, errors.slice(0, 2));
}
await browser.close();
