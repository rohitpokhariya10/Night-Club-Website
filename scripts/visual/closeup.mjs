// A close-up of part of a screen recording, made without re-encoding tools: the recording is played in Chromium,
// framed on CROP (fractions x,y,w,h) and scaled by SCALE, and that playback is recorded. Unedited: the same frames,
// only enlarged. usage: CROP=x,y,w,h [SCALE=1.5] [FROM=3] [SECONDS=45] node scripts/visual/closeup.mjs <in.webm> <out.webm>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const [input, output] = process.argv.slice(2).map(p => path.resolve(p));
const [cx, cy, cw, ch] = (process.env.CROP || '0,0,1,1').split(',').map(Number);
const scale = Number(process.env.SCALE || 1.5), from = Number(process.env.FROM || 3), seconds = Number(process.env.SECONDS || 45);
const dir = path.dirname(output); fs.mkdirSync(dir, {recursive: true});
const probe = await chromium.launch(); const pp = await probe.newPage();
await pp.goto('file://' + input);
const [vw, vh] = await pp.evaluate(async () => {const v = document.querySelector('video'); await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, {once: true})); return [v.videoWidth, v.videoHeight];});
await probe.close();
const width = Math.round(vw * cw * scale / 2) * 2, height = Math.round(vh * ch * scale / 2) * 2;
const html = path.join(dir, '.closeup.html');
fs.writeFileSync(html, `<!doctype html><style>html,body{margin:0;background:#000;overflow:hidden}div{width:${width}px;height:${height}px;overflow:hidden;position:relative}video{position:absolute;left:${-cx * vw * scale}px;top:${-cy * vh * scale}px;width:${vw * scale}px;height:${vh * scale}px}</style><div><video src="${path.basename(input)}" muted playsinline></video></div>`);
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width, height}, recordVideo: {dir, size: {width, height}}});
const page = await context.newPage();
await page.goto('file://' + html);
await page.evaluate(async start => {const v = document.querySelector('video'); await new Promise(r => v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, {once: true})); v.currentTime = start; await new Promise(r => v.addEventListener('seeked', r, {once: true})); await v.play();}, from);
await page.waitForTimeout(seconds * 1000);
const video = page.video(); await context.close(); await browser.close();
if (video) fs.renameSync(await video.path(), output);
fs.unlinkSync(html);
console.log('wrote', output, `${width}x${height}`);
