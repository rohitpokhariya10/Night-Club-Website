// Luminance profile of a still image (decoded in Chromium): column-edge positions along chosen rows (sharp
// horizontal luminance jumps), the brightest point, and average brightness per tenth of the width/height.
// usage: node scripts/motion/image-profile.mjs <image> [rows as fractions, e.g. 0.3,0.5,0.7]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [file, rows = '0.25,0.45,0.65'] = process.argv.slice(2);
const browser = await chromium.launch(); const page = await browser.newPage();
const src = `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
const result = await page.evaluate(async ({src, rows}) => {
  const img = await new Promise(ok => {const i = new Image(); i.onload = () => ok(i); i.src = src;});
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const lum = (px, py) => {const i = (py * c.width + px) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];};
  const edges = rows.map(f => {
    const y = Math.round(c.height * f); const found = [];
    for (let px = 3; px < c.width - 3; px++) {
      const jump = Math.abs(lum(px + 2, y) - lum(px - 2, y));
      if (jump > 9 && (!found.length || px - found.at(-1).x > 12)) found.push({x: px, pct: +(px / c.width * 100).toFixed(1), jump: Math.round(jump)});
    }
    return {row: f, edges: found.map(e => e.pct)};
  });
  let best = {v: 0};
  for (let py = 0; py < c.height; py += 4) for (let px = 0; px < c.width; px += 4) {const v = lum(px, py); if (v > best.v) best = {v: Math.round(v), x: +(px / c.width * 100).toFixed(1), y: +(py / c.height * 100).toFixed(1)};}
  const band = (axis) => Array.from({length: 10}, (_, k) => {let s = 0, n = 0; for (let py = 0; py < c.height; py += 6) for (let px = 0; px < c.width; px += 6) { const t = axis === 'x' ? px / c.width : py / c.height; if (Math.floor(t * 10) === k) {s += lum(px, py); n++;} } return Math.round(s / n);});
  const color = (fx, fy) => {const i = (Math.round(fy * c.height) * c.width + Math.round(fx * c.width)) * 4; return `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`;};
  return {size: [c.width, c.height], edges, brightest: best, byTenthX: band('x'), byTenthY: band('y'), samples: {glow: color(0.9, 0.42), mid: color(0.6, 0.6), dark: color(0.25, 0.35), topLeft: color(0.02, 0.15)}};
}, {src, rows: rows.split(',').map(Number)});
console.log(JSON.stringify(result, null, 1));
await browser.close();
