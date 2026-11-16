// Seeks a local video in Chromium and saves frames at exact timestamps (precise reference analysis).
// usage: node scripts/motion/video-frames.mjs <video> <outDir> <start> <end> <step> [width]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const [file, outDir, start = '0', end = '999', step = '0.5', width = '720'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const html = path.resolve(outDir, '_player.html');
fs.writeFileSync(html, `<!doctype html><body style="margin:0;background:#000"><video id="v" muted preload="auto" src="file://${path.resolve(file)}" style="display:block;width:${width}px"></video>`);
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: Number(width), height: 1400}});
await page.goto('file://' + html);
const meta = await page.evaluate(() => new Promise((res, rej) => { const v = document.getElementById('v'); const go = () => res({d: v.duration, w: v.videoWidth, h: v.videoHeight}); if (v.readyState >= 1) go(); else { v.onloadedmetadata = go; v.onerror = () => rej(new Error('media error ' + v.error?.code)); } setTimeout(() => rej(new Error('timeout')), 15000); }));
const stop = Math.min(Number(end), meta.d - 0.02);
for (let t = Number(start); t <= stop + 1e-6; t += Number(step)) {
  await page.evaluate(t => new Promise(r => { const v = document.getElementById('v'); v.onseeked = () => requestAnimationFrame(() => requestAnimationFrame(r)); v.currentTime = t; }), t);
  await page.locator('#v').screenshot({path: path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`)});
}
fs.rmSync(html);
console.log(JSON.stringify(meta));
await browser.close();
