// Opens a Pinterest pin in Chromium, finds its <video>, and records the public media URLs the page itself loads.
// usage: node scripts/motion/pinterest-recon.mjs <pinUrl> <outPrefix>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const [url, prefix] = process.argv.slice(2);
const browser = await chromium.launch({headless: !!process.env.HEADLESS});
const page = await browser.newPage({viewport: {width: 1440, height: 900}, locale: 'en-US'});
const media = new Set();
page.on('response', r => { const u = r.url(); if (/pinimg\.com\/videos|\.m3u8|\.mp4|\.cmfv|\.ts(\?|$)/.test(u)) media.add(`${r.status()} ${r.headers()['content-type'] || ''} ${u}`); });
await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
await page.waitForTimeout(6000);
await page.screenshot({path: `${prefix}-page.png`});
const info = await page.evaluate(() => {
  const vids = [...document.querySelectorAll('video')].map(v => ({src: v.currentSrc || v.src, poster: v.poster, w: v.videoWidth, h: v.videoHeight, dur: v.duration, paused: v.paused, box: (r => [r.x, r.y, r.width, r.height].map(Math.round))(v.getBoundingClientRect())}));
  const html = document.documentElement.innerHTML;
  const lists = [...new Set((html.match(/https:\\?\/\\?\/v1\.pinimg\.com\\?\/videos[^"\\ ]+/g) || []).map(s => s.replace(/\\\//g, '/')))].slice(0, 20);
  const title = document.title; const desc = document.querySelector('meta[name="description"], meta[property="og:description"]')?.content;
  const ogVideo = document.querySelector('meta[property="og:video"], meta[property="og:video:url"], meta[name="twitter:player:stream"]')?.content;
  return {title, desc, ogVideo, vids, lists, loginWall: /log in|sign up/i.test(document.body.innerText.slice(0, 3000))};
});
fs.writeFileSync(`${prefix}-recon.json`, JSON.stringify({url, info, media: [...media]}, null, 1));
console.log(JSON.stringify({title: info.title, desc: info.desc?.slice(0, 200), ogVideo: info.ogVideo, vids: info.vids, lists: info.lists, loginWall: info.loginWall, media: [...media].slice(0, 12)}, null, 1));
await browser.close();
