// Frame timing while scrolling through the homepage gallery: requestAnimationFrame intervals during a steady
// wheel scroll (desktop) and touch-style steps under 4× CPU throttling (phone). Run against a production build.
// usage: BASE_URL=http://localhost:3100 node scripts/motion/gallery-frames.mjs [label]
import {chromium} from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3100';
const label = process.argv[2] || '';
const browser = await chromium.launch();
for (const [name, viewport, touch, throttle] of [['desktop', {width: 1440, height: 900}, false, 1], ['mobile-4x', {width: 390, height: 844}, true, 4]]) {
  const results = [];
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({viewport, ...(touch ? {hasTouch: true, isMobile: true} : {})});
    const page = await context.newPage();
    await page.goto(base); await page.keyboard.press('Shift');
    await page.waitForSelector('.home-gallery[data-motion="ready"]', {state: 'attached'});
    await page.evaluate(() => document.fonts.ready);
    const section = await page.locator('.home-gallery').evaluate(el => ({top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight}));
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(section.top - viewport.height));
    await page.waitForTimeout(800);
    const cdp = await context.newCDPSession(page);
    if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});
    if (!touch) await page.mouse.move(viewport.width / 2, 40);
    await page.evaluate(() => {
      const w = window; w.__frames = []; let last = performance.now();
      const tick = now => {w.__frames.push(now - last); last = now; if (!w.__stop) requestAnimationFrame(tick);};
      requestAnimationFrame(tick);
    });
    const travel = section.height + viewport.height;
    for (let moved = 0; moved < travel; moved += 12) {
      if (touch) await page.evaluate(d => window.scrollBy(0, d), 12); else await page.mouse.wheel(0, 12);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(600);
    const frames = await page.evaluate(() => {window.__stop = true; return window.__frames.slice(2);});
    frames.sort((a, b) => a - b);
    const pct = p => frames[Math.min(frames.length - 1, Math.floor(frames.length * p))];
    results.push({frames: frames.length, mean: frames.reduce((a, b) => a + b, 0) / frames.length, p95: pct(.95), max: frames.at(-1), over34: frames.filter(f => f > 34).length});
    await context.close();
  }
  const avg = key => (results.reduce((a, r) => a + r[key], 0) / results.length).toFixed(1);
  console.log(label, name, `frames ${avg('frames')} mean ${avg('mean')}ms p95 ${avg('p95')}ms max ${avg('max')}ms long(>34ms) ${avg('over34')}`, JSON.stringify(results.map(r => [r.p95.toFixed(1), r.over34])));
}
await browser.close();
