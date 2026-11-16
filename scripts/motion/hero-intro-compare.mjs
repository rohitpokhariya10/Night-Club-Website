// Frame-exact comparison: seeks the (dev-build) hero intro to the same offsets sampled from the
// Pinterest reference (T0 = 2.8 s in the clip) and builds a reference-vs-Jimmy O's sheet.
// usage: node scripts/motion/hero-intro-compare.mjs <outDir> [desktop|mobile]
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const [outDir, mode = 'desktop'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const vp = mode === 'mobile' ? {width: 390, height: 844} : {width: 1440, height: 900};
const offsets = [0, 0.3, 0.6, 0.9, 1.1, 1.3, 1.6, 1.9, 2.1, 2.4];
const browser = await chromium.launch();
const context = await browser.newContext(mode === 'mobile' ? {...devices['iPhone 13'], viewport: vp} : {viewport: vp});
const page = await context.newPage();
await page.goto(process.env.BASE_URL || 'http://localhost:3000');
await page.waitForFunction(() => Boolean(document.querySelector('.cinema-hero')?.heroIntro));
await page.evaluate(() => document.fonts.ready);
const ours = [];
for (const t of offsets) {
  await page.evaluate(t => { const tl = document.querySelector('.cinema-hero').heroIntro; tl.pause(); tl.seek(t, false); }, t);
  await page.waitForTimeout(120); // two+ frames: the light engine renders the seeked state
  const f = `${outDir}/ours-${t.toFixed(1)}s.png`; await page.screenshot({path: f}); ours.push(f);
}
await browser.close();
const ref = offsets.map(t => `artifacts/pinterest-reference/primary-frames-intro/t${(2.8 + t).toFixed(2).padStart(6, '0')}.png`);
const files = []; offsets.forEach((t, i) => files.push(ref[i], ours[i]));
execFileSync('node', ['scripts/motion/contact-sheet.mjs', `${outDir}/compare.png`, '4', mode === 'mobile' ? '220' : '400', ...files]);
console.log(`${outDir}/compare.png`);
