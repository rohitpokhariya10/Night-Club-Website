// Second pass: canvases, header behaviour, and time-series bursts right after a section enters (time-based vs scrubbed).
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/delta-reference/bursts';
fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch({headless: false});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
await page.waitForTimeout(6500);
const deny = page.getByRole('button', {name: /Rejeitar todos|Deny|Reject/i}).first();
if (await deny.isVisible().catch(() => false)) await deny.click();
await page.waitForTimeout(1200);
const canv = await page.evaluate(() => [...document.querySelectorAll('canvas')].map(c => {const r = c.getBoundingClientRect(); let p = c.parentElement, chain = []; for (let i = 0; i < 4 && p; i++, p = p.parentElement) chain.push(p.tagName + '.' + (p.className?.toString() || '').slice(0, 30)); return {w: c.width, h: c.height, box: [r.left, r.top + scrollY, r.width, r.height].map(Math.round), ctx: c.getContext('webgl2') ? 'webgl2?' : '', chain, pos: getComputedStyle(c).position};}));
const hero = await page.evaluate(() => {
  const h = document.querySelector('main')?.firstElementChild; const r = h?.getBoundingClientRect();
  const media = [...document.querySelectorAll('main video, main img')].slice(0, 6).map(m => {const b = m.getBoundingClientRect(); return {tag: m.tagName, src: (m.currentSrc || '').split('/').pop()?.slice(0, 50), box: [b.left, b.top, b.width, b.height].map(Math.round)};});
  return {firstChild: h?.tagName + '.' + h?.className, box: r && [r.top, r.height], media};
});
console.log(JSON.stringify({canv, hero}, null, 1));
// Hero exit at fine resolution: 60px steps for the first viewport, tracking hero media transforms.
const trace = [];
for (let i = 0; i < 16; i++) {
  const s = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')].filter(v => {const r = v.getBoundingClientRect(); return r.width > 600;}).map(v => {let e = v, list = []; for (let k = 0; k < 4 && e; k++, e = e.parentElement) {const cs = getComputedStyle(e); list.push([e.tagName, cs.transform.slice(0, 50), cs.clipPath.slice(0, 40), cs.opacity, Math.round(e.getBoundingClientRect().top), Math.round(e.getBoundingClientRect().height)].join('|'));} return list;});
    const header = document.querySelector('header, nav'); const hcs = header && getComputedStyle(header);
    return {y: Math.round(scrollY), vids, header: hcs && [hcs.transform, hcs.backgroundColor, hcs.opacity].join('|')};
  });
  trace.push(s);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 30);
  await page.waitForTimeout(450);
}
fs.writeFileSync(`${out}/hero-trace.json`, JSON.stringify(trace, null, 1));
// Bursts: jump near a section, then a single wheel tick and 10 frames over 1.5s.
const targets = {since1961: 800, journey: 2150, ddelta: 2800, culture: 3950, quiz: 5150, journal: 6700, impact: 7650, azores: 8950, footer: 9700};
for (const [name, y] of Object.entries(targets)) {
  await page.mouse.wheel(0, -30000); await page.waitForTimeout(1600);
  // Arrive with real wheel input in chunks so the reveal triggers fire as for a visitor.
  let cur = 0; while (cur < y - 400) { await page.mouse.wheel(0, 200); cur += 400; await page.waitForTimeout(40); }
  await page.waitForTimeout(2200);
  await page.mouse.wheel(0, 120);
  for (let f = 0; f < 10; f++) {
    const yy = await page.evaluate(() => Math.round(scrollY));
    await page.screenshot({path: `${out}/${name}-t${String(f * 150).padStart(4, '0')}-y${yy}.png`});
    await page.waitForTimeout(150);
  }
}
await browser.close();
