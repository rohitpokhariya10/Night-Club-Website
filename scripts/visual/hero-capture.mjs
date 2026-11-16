// The hero as a visitor sees it: at rest after the intro, six frames 0.12 s apart (to judge the movement), and the
// scroll lighting at 25/50/75% of the hold; one sheet per size. THEME as in capture.mjs.
// usage: [BASE_URL=…] [SIZES=1440x900,390x844] node scripts/visual/hero-capture.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const sizes = (process.env.SIZES || '1440x900,390x844').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
for (const [width, height] of sizes) {
  const mobile = width <= 700;
  const page = await (await browser.newContext({viewport: {width, height}, ...(mobile ? {hasTouch: true, isMobile: true} : {})})).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base);
  await page.waitForTimeout(3600); // the intro, as a first visit plays it
  const files = [];
  for (let i = 0; i < 6; i++) {const f = `${out}/${width}-rest-${i}.png`; await page.screenshot({path: f}); files.push(f); await page.waitForTimeout(120);}
  for (const p of [0.25, 0.5, 0.75]) {
    await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(height * p));
    await page.waitForTimeout(700);
    const f = `${out}/${width}-scroll-${p * 100}.png`; await page.screenshot({path: f}); files.push(f);
  }
  const tw = mobile ? 300 : 640, th = Math.round(tw * height / width), cols = mobile ? 5 : 3;
  const tiles = await Promise.all(files.map(f => sharp(f).resize(tw, th).toBuffer()));
  await sharp({create: {width: cols * tw, height: Math.ceil(files.length / cols) * th, channels: 3, background: '#000'}})
    .composite(tiles.map((input, i) => ({input, left: (i % cols) * tw, top: Math.floor(i / cols) * th}))).jpeg({quality: 84}).toFile(`${out}/hero-sheet-${width}.jpg`);
  console.log(width, 'errors', JSON.stringify(errors));
  await page.context().close();
}
await browser.close();
