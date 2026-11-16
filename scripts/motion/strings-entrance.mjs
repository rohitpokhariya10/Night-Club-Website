// The strings section's entrance, frame by frame (desktop): the section is brought to where its entrance starts,
// then frames are taken every STEP ms and combined into one contact sheet.
// usage: [BASE_URL=…] [STEP=300] [FRAMES=12] node scripts/motion/strings-entrance.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const step = Number(process.env.STEP || 300), count = Number(process.env.FRAMES || 12);
const browser = await chromium.launch();
const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
await page.goto(base); await page.keyboard.press('Shift');
await page.waitForSelector('.cinema-hero[data-ambient="running"]');
await page.waitForSelector('#experience[data-instrument]');
const top = await page.locator('#experience').evaluate(el => el.getBoundingClientRect().top + scrollY);
// Put the section's top at 60% of the viewport (its trigger is at 72%), then let the head scroll into view.
await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top - 900 * 0.6));
await page.waitForTimeout(60);
await page.evaluate(y => window.scrollTo({top: y, behavior: 'instant'}), Math.round(top + 380));
const frames = [];
for (let i = 0; i < count; i++) {
  const file = `${out}/frame-${String(i).padStart(2, '0')}.png`;
  await page.screenshot({path: file});
  frames.push(file);
  await page.waitForTimeout(step);
}
const w = 480, h = 300, cols = 4, rows = Math.ceil(frames.length / cols);
const tiles = await Promise.all(frames.map(f => sharp(f).resize(w, h).toBuffer()));
await sharp({create: {width: cols * w, height: rows * h, channels: 3, background: '#000'}})
  .composite(tiles.map((input, i) => ({input, left: (i % cols) * w, top: Math.floor(i / cols) * h}))).png().toFile(`${out}/entrance-sheet.png`);
console.log('frames', frames.length, `${out}/entrance-sheet.png`);
await browser.close();
