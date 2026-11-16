// Rest / hovered / keyboard-focused crops of each kind of directional control, as one sheet for visual review.
// usage: [BASE_URL=…] node scripts/motion/button-states.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const CONTROLS = [
  ['/', '.header-book', 'Book a Table (header)'], ['/', '.cinema-copy .button >> nth=0', 'Hero primary'], ['/', '.cinema-copy .button >> nth=1', 'Hero outline'],
  ['/', '.cinema-foot a[href="#discover"]', 'Discover ↓'], ['/', '.fd-cta >> nth=0', 'Food & Drinks CTA'], ['/', '.fd-arrow >> nth=1', 'Carousel next'],
  ['/', '.sig-cta >> nth=0', 'Signature CTA'], ['/', '.sig-prev', 'Signature previous'], ['/', '.home-events .event-tile >> nth=0', 'Event card'],
  ['/', '.text-link', 'Explore Catering'], ['/', '.home-gallery .button', 'Enter the Gallery'], ['/', '.ft-link[href*="maps"]', 'Footer address'],
  ['/', '.ft-top', 'Back to top'], ['/this-page-does-not-exist', 'main .button', '404 button'], ['/privacy', '.back-link', 'Privacy back link'],
];
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}, deviceScaleFactor: 2});
const shots = [];
let current = '';
for (const [path, selector, name] of CONTROLS) {
  if (path !== current) {await page.goto(base + path); await page.keyboard.press('Shift').catch(() => {}); await page.waitForTimeout(path === '/' ? 1800 : 600); current = path;}
  const el = page.locator(selector);
  // The hero is sticky and the page rises over it, so its controls are captured at the top of the page.
  if (selector.startsWith('.cinema-')) await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  else await el.evaluate(e => e.scrollIntoView({block: 'center', behavior: 'instant'}));
  await page.waitForTimeout(700);
  await page.mouse.move(1, 1); await page.waitForTimeout(450);
  const box = await el.boundingBox();
  const clip = {x: Math.max(0, box.x - 18), y: Math.max(0, box.y - 18), width: Math.min(box.width + 36, 520), height: box.height + 36};
  const file = n => `${out}/${shots.length}-${n}.png`;
  await page.screenshot({path: file('rest'), clip, style: 'nextjs-portal{display:none!important}'});
  await page.mouse.move(box.x - 40, box.y + box.height / 2); await page.mouse.move(box.x + Math.min(10, box.width / 4), box.y + box.height / 2, {steps: 5}); await page.waitForTimeout(500);
  await page.screenshot({path: file('hover'), clip, style: 'nextjs-portal{display:none!important}'});
  await page.mouse.move(1, 1); await page.waitForTimeout(450);
  await page.keyboard.press('Shift'); await el.focus(); await page.waitForTimeout(450);
  await page.screenshot({path: file('focus'), clip, style: 'nextjs-portal{display:none!important}'});
  await el.evaluate(e => e.blur());
  shots.push([name, file('rest'), file('hover'), file('focus')]);
}
const img = p => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
await page.setViewportSize({width: 1500, height: 600});
await page.setContent(`<style>body{margin:0;padding:12px;background:#151515;color:#ccc;font:12px ui-monospace,monospace}.r{display:grid;grid-template-columns:150px repeat(3,1fr);gap:10px;align-items:center;margin-bottom:8px}img{max-width:100%;max-height:150px;display:block;border:1px solid #333}h3{margin:0 0 8px;font-size:12px}</style><div class="r"><b></b><b>Rest</b><b>Hovered</b><b>Keyboard focus</b></div>${shots.map(([n, a, b, c]) => `<div class="r"><span>${n}</span><img src="${img(a)}"><img src="${img(b)}"><img src="${img(c)}"></div>`).join('')}`);
await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
await page.screenshot({path: `${out}/sheet.png`, fullPage: true});
await browser.close();
console.log(`${out}/sheet.png`, shots.length);
