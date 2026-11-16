// Records the reference site in a real (headed) Chromium: slow wheel scroll with per-step screenshots
// and a computed-style log, then reverse and fast scroll passes. Real wheel input so Lenis behaves as for a user.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/delta-reference';
const step = Number(process.env.STEP || 120);
fs.mkdirSync(`${out}/desktop`, {recursive: true});
const browser = await chromium.launch({headless: false});
const context = await browser.newContext({viewport: {width: 1440, height: 900}, recordVideo: {dir: `${out}/video`, size: {width: 1440, height: 900}}});
const page = await context.newPage();
await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
await page.waitForTimeout(6500);
const deny = page.getByRole('button', {name: /Rejeitar todos|Deny|Reject/i}).first();
if (await deny.isVisible().catch(() => false)) await deny.click();
await page.waitForTimeout(1500);
await page.mouse.move(720, 450);
const probe = () => page.evaluate(() => {
  const vh = innerHeight;
  const sections = [...document.querySelectorAll('main section, footer, .pre-footer')].map((s, i) => {const r = s.getBoundingClientRect(); return {i, tag: s.tagName, top: Math.round(r.top), h: Math.round(r.height)};});
  const moving = [];
  for (const el of document.querySelectorAll('main *, footer *, .pre-footer *')) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh || r.width < 40 || r.height < 20) continue;
    const cs = getComputedStyle(el);
    const t = cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)';
    const c = cs.clipPath !== 'none';
    const o = Number(cs.opacity) < 1;
    if (!t && !c && !o) continue;
    moving.push({tag: el.tagName, cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 40), text: el.children.length ? '' : (el.textContent || '').trim().slice(0, 30),
      box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], transform: t ? cs.transform.slice(0, 70) : undefined, clip: c ? cs.clipPath.slice(0, 60) : undefined, opacity: o ? cs.opacity : undefined});
    if (moving.length > 30) break;
  }
  return {y: Math.round(scrollY), sections, moving};
});
const log = [];
let n = 0;
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
while (true) {
  const s = await probe();
  log.push(s);
  await page.screenshot({path: `${out}/desktop/f${String(n).padStart(3, '0')}-y${String(s.y).padStart(5, '0')}.png`});
  if (s.y >= max - 2 || n > 140) break;
  await page.mouse.wheel(0, step);
  await page.waitForTimeout(700);
  n++;
  const newMax = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (log.length > 3 && log.at(-1).y === log.at(-3).y && s.y > max - 400) break;
  void newMax;
}
fs.writeFileSync(`${out}/desktop-scroll-log.json`, JSON.stringify(log, null, 1));
// Reverse pass: upward wheel, sampled.
fs.mkdirSync(`${out}/reverse`, {recursive: true});
for (let i = 0; i < 40; i++) {
  await page.mouse.wheel(0, -280);
  await page.waitForTimeout(260);
  if (i % 3 === 0) { const y = await page.evaluate(() => Math.round(scrollY)); await page.screenshot({path: `${out}/reverse/r${String(i).padStart(2, '0')}-y${y}.png`}); }
}
// Fast pass: large flicks from the top; sample immediately and after settling.
await page.mouse.wheel(0, -20000); await page.waitForTimeout(2500);
fs.mkdirSync(`${out}/fast`, {recursive: true});
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(120);
  let y = await page.evaluate(() => Math.round(scrollY));
  await page.screenshot({path: `${out}/fast/flick${i}-a-mid-y${y}.png`});
  await page.waitForTimeout(1300);
  y = await page.evaluate(() => Math.round(scrollY));
  await page.screenshot({path: `${out}/fast/flick${i}-b-settled-y${y}.png`});
}
await context.close();
await browser.close();
console.log('frames', n + 1, 'max', max);
