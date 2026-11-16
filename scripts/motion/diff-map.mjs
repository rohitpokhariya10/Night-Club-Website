// Difference map of two same-size PNGs: the second image dimmed, with differing pixels (any channel > tolerance)
// painted red, plus the bounding boxes of differing regions. usage: node diff-map.mjs a.png b.png out.png [tolerance]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [a, b, out, tol = '3'] = process.argv.slice(2);
const browser = await chromium.launch(); const page = await browser.newPage();
const data = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const png = await page.evaluate(async ({a, b, tol}) => {
  const load = src => new Promise(ok => {const i = new Image(); i.onload = () => ok(i); i.src = src;});
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const c = document.createElement('canvas'); c.width = ib.width; c.height = ib.height; const x = c.getContext('2d');
  x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
  x.drawImage(ib, 0, 0); const img = x.getImageData(0, 0, c.width, c.height); const db = img.data;
  for (let i = 0; i < db.length; i += 4) {
    const diff = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > tol;
    if (diff) {db[i] = 255; db[i + 1] = 30; db[i + 2] = 30;} else {db[i] *= .35; db[i + 1] *= .35; db[i + 2] *= .35;}
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL('image/png').split(',')[1];
}, {a: data(a), b: data(b), tol: Number(tol)});
fs.writeFileSync(out, Buffer.from(png, 'base64'));
await browser.close();
