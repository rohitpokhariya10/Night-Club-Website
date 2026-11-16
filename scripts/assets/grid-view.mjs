// Renders an image with a 5% coordinate grid for measuring plate rims. usage: node grid-view.mjs <image> <out.png>
import {chromium} from '@playwright/test'; import fs from 'node:fs';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 1000, height: 800}});
const src = `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
await p.setContent(`<style>body{margin:0;background:#222}div{position:relative;width:1000px}img{width:1000px;display:block}i{position:absolute;background:rgba(0,255,255,.45)}b{position:absolute;font:10px monospace;color:#0ff}</style><div id=d><img src="${src}"></div>`);
await p.evaluate(() => { const d = document.getElementById('d'); const h = d.querySelector('img').height; for (let k = 0; k <= 20; k++) { const x = document.createElement('i'); x.style.cssText = `left:${k * 50}px;top:0;width:1px;height:${h}px`; d.append(x); const y = document.createElement('i'); y.style.cssText = `top:${k * 5 * h / 100}px;left:0;height:1px;width:1000px`; d.append(y); const l = document.createElement('b'); l.textContent = k * 5; l.style.cssText = `left:${k * 50 + 2}px;top:2px`; d.append(l); const m = document.createElement('b'); m.textContent = k * 5; m.style.cssText = `top:${k * 5 * h / 100 + 2}px;left:2px`; d.append(m); } });
await p.locator('#d').screenshot({path: out}); await b.close();
