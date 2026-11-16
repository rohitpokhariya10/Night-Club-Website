// Continuous, paced demonstration recording (video) of the homepage journey and reverse scroll.
// usage: node scripts/motion/demo-record.mjs <outDir> [desktop|mobile]
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const [outDir, mode = 'desktop'] = process.argv.slice(2);
const base = process.env.BASE_URL || 'http://localhost:3000';
const vp = mode === 'mobile' ? {width: 390, height: 844} : {width: 1440, height: 900};
fs.mkdirSync(outDir, {recursive: true});
const browser = await chromium.launch({headless: !!process.env.HEADLESS});
const context = await browser.newContext({...(mode === 'mobile' ? {...devices['iPhone 13'], viewport: vp} : {viewport: vp}), recordVideo: {dir: outDir, size: vp}});
const page = await context.newPage();
const marks = []; const t0 = Date.now(); const mark = label => marks.push({label, seconds: +((Date.now() - t0) / 1000).toFixed(1)});
await page.goto(base, {waitUntil: 'domcontentloaded'});
mark('hero intro: light, orb, headline, UI'); await page.waitForSelector('.cinema-hero[data-ambient="running"]', {timeout: 15000}); await page.waitForTimeout(1500);
await page.mouse.move(vp.width / 2, vp.height / 2);
const at = sel => page.evaluate(s => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().top + scrollY : 0; }, sel);
const y = () => page.evaluate(() => scrollY);
// Desktop: real wheel input through Lenis. Mobile: small native steps, like a touch drag.
async function travel(to, pxPerSecond) {
  const step = mode === 'mobile' ? 22 : 10; const interval = 1000 * (mode === 'mobile' ? step : step * 2) / pxPerSecond;
  for (let guard = 0; guard < 4000; guard++) {
    const cur = await y(); const dir = Math.sign(to - cur); if (Math.abs(to - cur) < 12) break;
    if (mode === 'mobile') await page.evaluate(([d, s]) => window.scrollBy(0, d * s), [dir, step]); else await page.mouse.wheel(0, dir * step);
    await page.waitForTimeout(interval);
    if ((dir > 0 && (await y()) >= (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) - 2)) break;
  }
  await page.waitForTimeout(500);
}
const vh = vp.height;
mark('A hero → panel rises over the receding hero'); await travel(vh + 50, 260);
mark('B night-out film opens / headline rises'); await travel(await at('.night-out-stage') + 100, 380);
mark('B nightlife layers'); await travel(await at('.split-feature') + 250, 380);
mark('C food & drink counter-move'); await travel(await at('.home-food') + 450, 380);
mark('D specials media settle'); await travel(await at('.special-feature') + 100, 380);
mark('D events rise'); await travel(await at('.home-events') + 250, 380);
mark('E celebration unmask'); await travel(await at('.celebrations') + 150, 380);
mark('E gallery assembles'); await travel(await at('.gallery-preview') - vh * 0.25, 300); await page.waitForTimeout(1200);
mark('F reviews / visit / footer settle'); await travel(1e6, 520); await page.waitForTimeout(1200);
mark('reverse scroll to top'); await travel(0, 900); await page.waitForTimeout(1000);
mark('end');
const video = page.video();
await context.close(); await browser.close();
const file = await video.path(); const named = `${outDir}/jimmy-os-${mode}-journey.webm`; fs.renameSync(file, named);
fs.writeFileSync(`${outDir}/jimmy-os-${mode}-journey-chapters.json`, JSON.stringify(marks, null, 1));
console.log(named, marks.at(-1));
