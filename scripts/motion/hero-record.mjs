// Real-time recordings of the animated hero (headless Chromium): the full intro and ambient light,
// a pointer sweep on desktop, and a separate Skip-intro clip. Logs the intro start offset in the video.
// usage: node scripts/motion/hero-record.mjs <outDir> [desktop|mobile]
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const [outDir, mode = 'desktop'] = process.argv.slice(2);
const base = process.env.BASE_URL || 'http://localhost:3100';
const vp = mode === 'mobile' ? {width: 390, height: 844} : {width: 1440, height: 900};
fs.mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch({headless: !process.env.HEADED});
async function clip(name, script) {
  const context = await browser.newContext({...(mode === 'mobile' ? {...devices['iPhone 13'], viewport: vp} : {viewport: vp}), recordVideo: {dir: outDir, size: vp}});
  const t0 = Date.now();
  const page = await context.newPage();
  const meta = await script(page, t0);
  const video = page.video();
  await context.close();
  const file = `${outDir}/jimmy-os-hero-${name}-${mode}.webm`;
  fs.renameSync(await video.path(), file);
  return {file, ...meta};
}
const intro = await clip('intro', async (page, t0) => {
  await page.goto(base, {waitUntil: 'commit'});
  await page.waitForSelector('.cinema-hero.is-intro');
  const introStart = (Date.now() - t0) / 1000;
  await page.waitForSelector('.cinema-hero[data-ambient="running"]', {timeout: 15000});
  const introEnd = (Date.now() - t0) / 1000;
  await page.waitForTimeout(3500); // ambient flow
  if (mode === 'desktop') { // secondary reference: the brightest light follows the pointer
    for (let x = 1350; x >= 90; x -= 30) { await page.mouse.move(x, 430); await page.waitForTimeout(25); }
    await page.waitForTimeout(800);
  }
  return {introStart: +introStart.toFixed(2), introEnd: +introEnd.toFixed(2), videoSeconds: +((Date.now() - t0) / 1000).toFixed(1)};
});
const skip = await clip('skip', async (page, t0) => {
  await page.goto(base, {waitUntil: 'commit'});
  await page.waitForSelector('.cinema-hero.is-intro');
  await page.waitForTimeout(700);
  const at = (Date.now() - t0) / 1000;
  await page.getByRole('button', {name: 'Skip intro'}).click();
  await page.waitForTimeout(2000);
  return {skipClickedAt: +at.toFixed(2)};
});
fs.writeFileSync(`${outDir}/recordings-${mode}.json`, JSON.stringify({mode, base, intro, skip}, null, 1));
console.log(JSON.stringify({intro, skip}));
await browser.close();
