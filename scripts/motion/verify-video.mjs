// Proves a recording is playable by decoding it in Chromium: metadata, real playback progress, and
// frames grabbed at chapter timestamps (written as PNGs next to the report directory).
// usage: node scripts/motion/verify-video.mjs <video.webm> <framesOutDir> [chapters.json]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const [file, outDir, chaptersFile] = process.argv.slice(2);
const abs = path.resolve(file); fs.mkdirSync(outDir, {recursive: true});
const chapters = chaptersFile ? JSON.parse(fs.readFileSync(chaptersFile, 'utf8')) : [];
const html = path.resolve(outDir, '_player.html');
fs.writeFileSync(html, `<!doctype html><body style="margin:0;background:#000"><video id="v" muted playsinline preload="auto" src="file://${abs}" style="display:block;max-width:100vw;max-height:100vh"></video>`);
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto('file://' + html);
const meta = await page.evaluate(() => new Promise((resolve, reject) => {
  const v = document.getElementById('v'); const fail = setTimeout(() => reject(new Error('metadata timeout')), 20000);
  v.onerror = () => reject(new Error('media error ' + v.error?.code));
  const ready = async () => {
    // WebM from screen recorders can report Infinity until the end has been seeked once.
    if (!isFinite(v.duration)) { v.currentTime = 1e9; await new Promise(r => { v.ondurationchange = r; setTimeout(r, 8000); }); v.currentTime = 0; }
    clearTimeout(fail); resolve({duration: v.duration, width: v.videoWidth, height: v.videoHeight, readyState: v.readyState});
  };
  // Metadata may already be loaded before this script runs (preload="auto").
  if (v.readyState >= 1) ready(); else v.onloadedmetadata = ready;
}));
const playback = await page.evaluate(() => new Promise(async resolve => {
  const v = document.getElementById('v'); v.currentTime = 1; await new Promise(r => v.onseeked = r);
  const before = v.currentTime; await v.play(); setTimeout(() => { const after = v.currentTime; v.pause(); resolve({before, after, advanced: after - before, readyState: v.readyState}); }, 1500);
}));
const frames = [];
const times = chapters.length ? chapters.map(c => ({t: Math.min(c.seconds + 1.5, meta.duration - 0.2), label: c.label})) : [0.25, 0.5, 0.75].map(p => ({t: meta.duration * p, label: `${p * 100}%`}));
for (const [i, {t, label}] of times.entries()) {
  await page.evaluate(t => new Promise(r => { const v = document.getElementById('v'); v.onseeked = () => requestAnimationFrame(() => r()); v.currentTime = t; }), t);
  const f = path.join(outDir, `${String(i).padStart(2, '0')}-${t.toFixed(1)}s-${label.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.png`);
  await page.locator('#v').screenshot({path: f}); frames.push(f);
}
fs.rmSync(html);
const ok = meta.width > 0 && isFinite(meta.duration) && meta.duration > 1 && playback.advanced > 1;
console.log(JSON.stringify({file, bytes: fs.statSync(abs).size, ...meta, duration: +meta.duration.toFixed(1), playbackAdvanced: +playback.advanced.toFixed(2), playable: ok, frames: frames.length}));
await browser.close();
if (!ok) process.exit(1);
