// Builds a labelled contact sheet from PNG/JPEG frames using the browser itself (no ffmpeg/ImageMagick needed).
// usage: node contact-sheet.mjs out.png cols thumbWidth file1 file2 ...
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const [out, cols, width, ...files] = process.argv.slice(2);
const mime = f => (/\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/png');
const cells = files.map(f => `<figure><img src="data:${mime(f)};base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f).replace(/\.\w+$/, '')}</figcaption></figure>`).join('');
const html = `<style>body{margin:0;background:#222;font:12px monospace;color:#fff}main{display:grid;grid-template-columns:repeat(${cols},${width}px);gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 0}</style><main>${cells}</main>`;
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: Number(cols) * (Number(width) + 6) + 6, height: 400}});
await p.setContent(html);
await p.screenshot({path: out, fullPage: true});
await b.close();
