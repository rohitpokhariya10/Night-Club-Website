// Records a pin's public image URLs (og:image and the main <img> srcset) without logging in, and saves the
// largest one for analysis. usage: node scripts/motion/pin-image.mjs <pinUrl> <outDir>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [url, out] = process.argv.slice(2); fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}, locale: 'en-US'});
await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
await page.waitForTimeout(5000);
const info = await page.evaluate(() => {
  const og = document.querySelector('meta[property="og:image"]')?.content;
  const imgs = [...document.querySelectorAll('img')].map(i => ({src: i.currentSrc || i.src, srcset: i.srcset, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight, box: Math.round(i.getBoundingClientRect().width)})).filter(i => /pinimg/.test(i.src)).sort((a, b) => b.box - a.box).slice(0, 3);
  const video = document.querySelectorAll('video').length;
  return {og, imgs, video, title: document.title};
});
// The pin's own image is og:image; request the same file at original size, falling back to the 736px rendition.
const own = info.og || info.imgs[0]?.src;
let best = own.replace(/\/\d+x\//, '/originals/');
let response = await page.request.get(best);
if (!response.ok()) {best = own; response = await page.request.get(best);}
fs.writeFileSync(`${out}/reference${best.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg'}`, await response.body());
fs.writeFileSync(`${out}/pin-image.json`, JSON.stringify({url, info, saved: best, status: response.status(), type: response.headers()['content-type']}, null, 1));
console.log(JSON.stringify({title: info.title, video: info.video, og: info.og, main: info.imgs[0], saved: best, status: response.status()}, null, 1));
await browser.close();
