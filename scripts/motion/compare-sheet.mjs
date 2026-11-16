// Side-by-side before/after sheet: one row per pair, each image scaled to the same column width.
// usage: node scripts/motion/compare-sheet.mjs <out.png> <columnWidth> "<label>|<before.png>|<after.png>" …
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [out, column, ...pairs] = process.argv.slice(2);
const img = p => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
const rows = pairs.map(pair => {
  const [label, before, after] = pair.split('|');
  return `<h2>${label}</h2><div class="row"><figure><img src="${img(before)}"><figcaption>Before</figcaption></figure><figure><img src="${img(after)}"><figcaption>After</figcaption></figure></div>`;
}).join('');
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: +column * 2 + 36, height: 400}});
await p.setContent(`<style>body{margin:0;padding:12px;background:#151515;color:#ddd;font:13px/1.4 ui-monospace,monospace}h2{font-size:13px;margin:10px 0 6px}.row{display:grid;grid-template-columns:${column}px ${column}px;gap:12px}figure{margin:0}img{width:${column}px;display:block;border:1px solid #333}figcaption{padding:4px 0}</style>${rows}`);
await p.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
await p.screenshot({path: out, fullPage: true});
await b.close();
console.log(out);
