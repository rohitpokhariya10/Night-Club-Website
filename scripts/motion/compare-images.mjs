// Pixel comparison of same-named PNGs in two folders (decoded in Chromium). Reports differing-pixel share
// (any channel differing by more than `tolerance`) and the maximum channel difference.
// usage: node scripts/motion/compare-images.mjs <dirA> <dirB> [tolerance]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const [a, b, tol = '2'] = process.argv.slice(2);
const browser = await chromium.launch(); const page = await browser.newPage();
const results = [];
for (const name of fs.readdirSync(a).filter(f => f.endsWith('.png'))) {
  const load = f => 'data:image/png;base64,' + fs.readFileSync(path.join(f)).toString('base64');
  results.push({name, ...await page.evaluate(async ([x, y, tol]) => {
    const img = src => new Promise(ok => {const i = new Image(); i.onload = () => ok(i); i.src = src;});
    const [p, q] = await Promise.all([img(x), img(y)]);
    if (p.width !== q.width || p.height !== q.height) return {sizeMismatch: true};
    const data = i => {const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data;};
    const d1 = data(p), d2 = data(q); let diff = 0, max = 0;
    for (let k = 0; k < d1.length; k += 4) { const m = Math.max(Math.abs(d1[k] - d2[k]), Math.abs(d1[k + 1] - d2[k + 1]), Math.abs(d1[k + 2] - d2[k + 2])); if (m > tol) diff++; if (m > max) max = m; }
    return {differingPixels: +(diff / (d1.length / 4) * 100).toFixed(4) + '%', maxChannelDiff: max};
  }, [load(path.join(a, name)), load(path.join(b, name)), Number(tol)])});
}
console.log(JSON.stringify(results, null, 1));
await browser.close();
