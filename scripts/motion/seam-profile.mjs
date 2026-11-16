// Row-by-row brightness across a section join, from a screenshot: the mean luminance of each pixel row (outer
// columns, away from the centred dish) and the largest row-to-row jumps. A rendering seam shows up as a spike.
// usage: [STEP_AT=<join row>] node scripts/motion/seam-profile.mjs <screenshot.png> <fromY> <toY> [x0,x1 as fractions, default 0,0.22]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [file, from, to, cols = '0,0.22'] = process.argv.slice(2);
const [c0, c1] = cols.split(',').map(Number);
const b = await chromium.launch(); const p = await b.newPage();
const res = await p.evaluate(async ({data, from, to, c0, c1, stepAt}) => {
  globalThis.STEP_AT = stepAt;
  const img = new Image(); img.src = data; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const x0 = Math.round(img.width * c0), x1 = Math.round(img.width * c1); const rows = [];
  for (let y = +from; y < Math.min(+to, img.height); y++) {
    const d = g.getImageData(x0, y, x1 - x0, 1).data; let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    rows.push(sum / (d.length / 4));
  }
  const jumps = rows.slice(1).map((v, i) => ({y: +from + i + 1, d: +(v - rows[i]).toFixed(2)})).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 5);
  const at = +(globalThis.STEP_AT ?? NaN); const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const i = at - +from; const step = Number.isFinite(at) ? +(mean(rows.slice(i, i + 8)) - mean(rows.slice(i - 8, i))).toFixed(2) : null;
  return {rows: rows.filter((_, i) => i % 20 === 0).map(v => +v.toFixed(1)), jumps, step};
}, {data: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`, from, to, c0, c1, stepAt: process.env.STEP_AT});
console.log('every 20 rows:', res.rows.join(' '), '\nlargest row-to-row jumps:', JSON.stringify(res.jumps), res.step === null ? '' : `\n8-row step at the join: ${res.step}`);
await b.close();
