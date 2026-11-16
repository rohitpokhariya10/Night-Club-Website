// Typography audit: which font family each kind of text actually renders with, per route, plus full-page
// screenshots (reduced motion = settled layout). usage: node scripts/motion/type-audit.mjs <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3100';
const routes = ['/', '/food-menu', '/drink-menu', '/events', '/specials', '/nightlife', '/gallery', '/about', '/private-parties', '/reservations', '/contact'];
const browser = await chromium.launch();
const report = {};
for (const [name, vp] of [['desktop', {width: 1440, height: 900}], ['mobile', {width: 390, height: 844}]]) {
  const page = await browser.newPage({viewport: vp, reducedMotion: 'reduce'});
  for (const route of routes) {
    await page.goto(base + route); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
    if (name === 'desktop') report[route] = await page.evaluate(() => {
      const fam = el => getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').replace(/^__|_[0-9a-f]{6,}.*$/g, '').replace(/_Fallback.*/, '');
      const sel = {h1: 'h1', h2: 'h2', h3: 'h3', script: '.script', eyebrow: '.eyebrow, .hero-eyebrow, .night-out-eyebrow', body: 'main p', nav: '.header nav a', button: '.button', footer: '.footer a, .footer p'};
      const res = {};
      for (const [k, s] of Object.entries(sel)) { const counts = {}; document.querySelectorAll(s).forEach(el => { if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return; const f = fam(el) + ' ' + getComputedStyle(el).fontWeight; counts[f] = (counts[f] || 0) + 1; }); if (Object.keys(counts).length) res[k] = counts; }
      return res;
    });
    await page.screenshot({path: `${out}/${name}${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`, fullPage: route === '/' || name === 'mobile' ? route === '/' : false});
  }
  await page.close();
}
fs.writeFileSync(`${out}/type-audit.json`, JSON.stringify(report, null, 1));
const all = {}; for (const r of Object.values(report)) for (const [k, v] of Object.entries(r)) for (const [f, n] of Object.entries(v)) { all[k] ??= {}; all[k][f] = (all[k][f] || 0) + n; }
console.log(JSON.stringify(all, null, 1));
await browser.close();
