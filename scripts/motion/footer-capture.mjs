// The site footer: an inventory of its text and link destinations, screenshots at every test width (footer
// element and the final viewport) and recordings of scrolling into it and back up (desktop wheel, phone steps).
// usage: [BASE_URL=…] [ROUTE=/] node scripts/motion/footer-capture.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3100';
const route = process.env.ROUTE || '/';
const browser = await chromium.launch();
const frames = page => page.evaluate(() => new Promise(done => {let n = 0; const step = () => (++n > 3 ? done() : requestAnimationFrame(step)); requestAnimationFrame(step);}));
let inventory = null;
for (const width of [360, 390, 768, 1024, 1440, 1920]) {
  const height = width <= 700 ? 844 : width <= 1024 ? 1024 : width >= 1920 ? 1080 : 900;
  const page = await browser.newPage({viewport: {width, height}});
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + route); await page.keyboard.press('Shift'); // finish the hero intro
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
  await frames(page); await page.waitForTimeout(2600); // time-based entrances finish
  await page.screenshot({path: `${out}/viewport-${width}.png`, style: 'nextjs-portal{display:none!important}'});
  await page.locator('footer').screenshot({path: `${out}/footer-${width}.png`, style: 'nextjs-portal{display:none!important}'});
  const facts = await page.locator('footer').evaluate(el => ({
    height: Math.round(el.getBoundingClientRect().height),
    overflow: document.documentElement.scrollWidth > innerWidth,
    links: [...el.querySelectorAll('a')].map(a => ({text: a.innerText.replace(/\s+/g, ' ').trim() || a.getAttribute('aria-label'), href: a.getAttribute('href'), visible: !!a.offsetParent && getComputedStyle(a).visibility !== 'hidden'})),
    text: el.innerText.replace(/\n+/g, ' | ').trim(),
  }));
  inventory ??= facts;
  console.log(width, 'footer height', facts.height, 'overflow', facts.overflow, 'hidden links', facts.links.filter(l => !l.visible).map(l => l.text).join(', ') || 'none', 'errors', errors.length);
  await page.close();
}
fs.writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 1));
// Recordings: from the section above the footer, scroll down into it, pause, then scroll back up a little.
for (const [name, viewport, touch] of [['desktop', {width: 1440, height: 900}, false], ['mobile', {width: 390, height: 844}, true]]) {
  const context = await browser.newContext({viewport, ...(touch ? {hasTouch: true, isMobile: true} : {}), recordVideo: {dir: out, size: viewport}});
  const page = await context.newPage();
  await page.goto(base + route); await page.keyboard.press('Shift');
  await page.evaluate(() => document.fonts.ready);
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const footer = await page.locator('footer').evaluate(el => el.getBoundingClientRect().height);
  await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(max - footer - viewport.height * 0.6));
  await page.waitForTimeout(900);
  if (!touch) await page.mouse.move(viewport.width * 0.3, viewport.height * 0.5);
  const step = async dy => { if (touch) await page.evaluate(d => window.scrollBy(0, d), dy); else await page.mouse.wheel(0, dy); };
  for (let moved = 0; moved < footer + viewport.height; moved += 14) { await step(14); await page.waitForTimeout(28); }
  if (!touch) for (let x = 0.3; x <= 0.8; x += 0.02) { await page.mouse.move(viewport.width * x, viewport.height * 0.45); await page.waitForTimeout(30); }
  await page.waitForTimeout(1800);
  for (let moved = 0; moved < footer * 0.7; moved += 20) { await step(-20); await page.waitForTimeout(28); }
  await page.waitForTimeout(500);
  for (let moved = 0; moved < footer; moved += 20) { await step(20); await page.waitForTimeout(28); }
  await page.waitForTimeout(1500);
  const video = page.video();
  await context.close();
  if (video) fs.renameSync(await video.path(), `${out}/footer-scroll-${name}.webm`);
}
await browser.close();
