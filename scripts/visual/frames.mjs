// A frame sheet from a .webm recording: the video is opened in Chromium, seeked every STEP seconds and drawn to a sheet.
// usage: [STEP=3] [COLS=4] node scripts/visual/frames.mjs <video.webm> <sheet.jpg>
import {chromium} from '@playwright/test';
import path from 'node:path';
const [video, sheet] = process.argv.slice(2);
const step = Number(process.env.STEP || 3), cols = Number(process.env.COLS || 4);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.resolve(video));
const data = await page.evaluate(async ({step, cols}) => {
  const v = document.querySelector('video');
  v.muted = true; v.pause();
  await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, {once: true}));
  // WebM from Playwright has no duration until the end is read once.
  if (!isFinite(v.duration)) {v.currentTime = 1e9; await new Promise(r => v.addEventListener('seeked', r, {once: true}));}
  const duration = v.duration, w = 480, h = Math.round(w * v.videoHeight / v.videoWidth);
  const times = []; for (let t = 0.5; t < duration; t += step) times.push(t);
  const c = document.createElement('canvas'); c.width = cols * w; c.height = Math.ceil(times.length / cols) * h;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.font = '14px sans-serif';
  for (const [i, t] of times.entries()) {
    v.currentTime = t; await new Promise(r => v.addEventListener('seeked', r, {once: true}));
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    g.drawImage(v, x, y, w, h); g.fillStyle = '#fff'; g.fillText(`${t.toFixed(1)}s`, x + 8, y + 18);
  }
  // A file:// video taints the canvas, so the sheet is captured as a screenshot of the canvas instead of exported.
  document.body.replaceChildren(c); document.body.style.margin = '0';
  return [c.width, c.height];
}, {step, cols});
await page.setViewportSize({width: data[0], height: Math.min(data[1], 4000)});
await page.locator('canvas').screenshot({path: sheet, type: 'jpeg', quality: 82});
await browser.close();
console.log('wrote', sheet);
