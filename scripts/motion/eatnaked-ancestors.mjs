// Completes the showcase analysis: which ancestors of the bowls and labels change (opacity, transform, clip,
// z-index, visibility) during one "next" transition, sampled every animation frame. Analysis only.
// usage: node scripts/motion/eatnaked-ancestors.mjs <outFile.json>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto('https://eatnaked.co/', {waitUntil: 'domcontentloaded', timeout: 90000});
await page.waitForFunction(() => {const l = document.querySelector('.loader'); return !l || getComputedStyle(l).visibility === 'hidden';}, null, {timeout: 150000, polling: 500});
await page.waitForTimeout(2000);
for (let i = 0; i < 80; i++) { const top = await page.locator('.bowl').first().evaluate(el => el.getBoundingClientRect().top); if (Math.abs(top) < 6) break; await page.mouse.wheel(0, Math.max(-1200, Math.min(1200, top))); await page.waitForTimeout(400); }
await page.waitForTimeout(1200);
const result = page.evaluate(() => new Promise(done => {
  const chain = el => {const list = []; for (let n = el, k = 0; n && k < 5 && !n.classList?.contains('bowl'); n = n.parentElement, k++) list.push(n); return list;};
  const nodes = new Map();
  const add = (el, tag) => chain(el).forEach((n, depth) => {if (!nodes.has(n)) nodes.set(n, `${tag}^${depth}:${n.tagName.toLowerCase()}.${String(n.className).split(' ').slice(0, 2).join('.')}`);});
  document.querySelectorAll('.bowl img[src$=".avif"]').forEach((el, i) => add(el, `bowl${i}`));
  document.querySelectorAll('.bowl span').forEach((el, i) => add(el, `label${i}`));
  document.querySelectorAll('.bowl h2').forEach((el, i) => add(el, `title${i}`));
  const read = n => {const s = getComputedStyle(n); return [s.opacity, s.transform, s.clipPath, s.zIndex, s.visibility, s.maskImage || s.webkitMaskImage].join(' | ');};
  const first = new Map([...nodes.keys()].map(n => [n, read(n)]));
  const changes = new Map();
  const t0 = performance.now();
  const tick = now => {
    for (const n of nodes.keys()) { const v = read(n); if (v !== first.get(n)) { const c = changes.get(n) || []; if (!c.length || c.at(-1)[1] !== v) c.push([Math.round(now - t0), v]); changes.set(n, c); } }
    if (now - t0 < 1600) requestAnimationFrame(tick); else done({nodes: [...nodes.values()], changed: [...changes].map(([n, c]) => ({node: nodes.get(n), initial: first.get(n), samples: c.filter((_, i) => i % 6 === 0 || i === c.length - 1)}))});
  };
  requestAnimationFrame(tick);
}));
await page.locator('.bowl-navigation__button.is--next').first().click();
const data = await result;
fs.writeFileSync(out, JSON.stringify(data, null, 1));
console.log('nodes', data.nodes.length, 'changed', data.changed.length);
for (const c of data.changed) console.log(c.node, '\n   from', c.initial.slice(0, 150), '\n   ', c.samples.map(([t, v]) => `${t}ms ${v.slice(0, 120)}`).join('\n    '));
await browser.close();
