// Numbered contact sheet from a candidates JSON with local thumbnails. usage: node local-sheet.mjs <commons.json> <thumbsDir> <out.png> [from] [to]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [file, dir, out, from = 0, to = 999] = process.argv.slice(2);
const items = JSON.parse(fs.readFileSync(file, 'utf8')).filter(c => c.n >= +from && c.n <= +to);
const cells = items.map(c => {const p = `${dir}/${String(c.n).padStart(3, '0')}.jpg`; return fs.existsSync(p) ? `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}"><figcaption>#${c.n} ${c.license} ${c.width}×${c.height}<br>${c.title.slice(5, 52)}</figcaption></figure>` : '';}).join('');
const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 1350, height: 400}});
await p.setContent(`<style>body{margin:0;background:#1a1a1a;color:#eee;font:10px monospace}main{display:grid;grid-template-columns:repeat(6,220px);gap:4px;padding:4px}img{width:220px;height:165px;object-fit:cover;display:block}figure{margin:0}</style><main>${cells}</main>`);
await p.screenshot({path: out, fullPage: true}); await b.close();
