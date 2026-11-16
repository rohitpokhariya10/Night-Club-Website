// Contact sheet of evenly spaced frames from a local video (decoded in Chromium; no ffmpeg needed).
// usage: node scripts/motion/video-sheet.mjs <video.webm> <out.png> [frames=24] [fromSec] [toSec]
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const [file, out, n = 24, from, to] = process.argv.slice(2);
const server = http.createServer((req, res) => {res.writeHead(200, {'Content-Type': 'video/webm'}); fs.createReadStream(path.resolve(file)).pipe(res);}).listen(0);
const port = server.address().port;
const b = await chromium.launch(); const p = await b.newPage({viewport: {width: 1500, height: 900}});
await p.setContent(`<video id=v src="http://127.0.0.1:${port}/v.webm" muted preload=auto></video><div id=g style="display:grid;grid-template-columns:repeat(4,360px);gap:6px;background:#111;color:#ccc;font:11px monospace"></div>`);
const result = await p.evaluate(async ({n, from, to}) => {
  const v = document.getElementById('v');
  await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, {once: true}));
  if (!isFinite(v.duration)) {v.currentTime = 1e9; await new Promise(r => v.addEventListener('seeked', r, {once: true}));}
  const duration = v.duration, a = +(from ?? 0), z = +(to ?? duration);
  for (let i = 0; i < n; i++) {
    const t = a + (z - a) * i / (n - 1);
    v.currentTime = Math.min(t, duration - 0.05); await new Promise(r => v.addEventListener('seeked', r, {once: true}));
    const c = document.createElement('canvas'); c.width = 360; c.height = Math.round(360 * v.videoHeight / v.videoWidth);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const f = document.createElement('figure'); f.style.margin = 0; f.append(c, Object.assign(document.createElement('figcaption'), {textContent: t.toFixed(1) + 's'}));
    document.getElementById('g').append(f);
  }
  return duration;
}, {n: +n, from, to});
await p.locator('#g').screenshot({path: out});
await b.close(); server.close();
console.log(out, 'duration', result);
