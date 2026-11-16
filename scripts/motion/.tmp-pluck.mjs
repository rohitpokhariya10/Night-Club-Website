import {chromium} from '@playwright/test';
const out = process.argv[2];
const b = await chromium.launch(); const ctx = await b.newContext({viewport: {width: 1440, height: 900}}); const p = await ctx.newPage();
const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => m.type() === 'error' && errors.push(m.text()));
await p.goto('http://localhost:3000/'); await p.keyboard.press('Shift');
await p.waitForSelector('.cinema-hero[data-ambient="running"]');
const top = await p.locator('#experience .ns-stage').evaluate(el => el.getBoundingClientRect().top + scrollY);
await p.evaluate(y => scrollTo({top: y - 60, behavior: 'instant'}), Math.round(top));
await p.waitForTimeout(4500);
const svg = p.locator('.ns-svg[data-layout=desktop]');
const box = await svg.boundingBox();
// A point on string 0 at x = 480 units: read it from the rest path.
const pt = await p.evaluate(() => {const path = document.querySelector('.ns-svg[data-layout=desktop] .ns-string[data-string="0"] .ns-hit'); const svg = path.ownerSVGElement; const len = path.getTotalLength(); let best; for (let i = 0; i <= 400; i++) {const q = path.getPointAtLength(len * i / 400); if (!best || Math.abs(q.x - 470) < Math.abs(best.x - 470)) best = q;} const m = svg.getScreenCTM(); return {x: best.x * m.a + m.e, y: best.y * m.d + m.f};});
const d0 = await p.locator('.ns-svg[data-layout=desktop] .ns-string[data-string="0"] .ns-core').getAttribute('d');
await p.mouse.move(pt.x, pt.y); await p.waitForTimeout(300);
await p.screenshot({path: `${out}/0-hover.png`});
await p.mouse.down();
for (let i = 1; i <= 12; i++) {await p.mouse.move(pt.x + i * 2, pt.y + i * 7); await p.waitForTimeout(16);}
await p.waitForTimeout(200);
const dHeld = await p.locator('.ns-svg[data-layout=desktop] .ns-string[data-string="0"] .ns-core').getAttribute('d');
await p.screenshot({path: `${out}/1-held.png`});
await p.mouse.up();
for (const [label, wait] of [['2-release-60ms', 60], ['3-release-200ms', 140], ['4-release-600ms', 400]]) {await p.waitForTimeout(wait); await p.screenshot({path: `${out}/${label}.png`});}
const cardT = await p.locator('.ns-card[data-index="0"] .ns-swing').evaluate(el => el.style.transform);
await p.waitForTimeout(4000);
const dEnd = await p.locator('.ns-svg[data-layout=desktop] .ns-string[data-string="0"] .ns-core').getAttribute('d');
const cardEnd = await p.locator('.ns-card[data-index="0"] .ns-swing').evaluate(el => el.style.transform);
console.log(JSON.stringify({restIsCurve: d0.startsWith('M') && d0.includes('C'), heldChanged: dHeld !== d0, heldSample: dHeld.slice(0, 80), cardDuringRing: cardT, settledBackToRest: dEnd === d0, cardEnd, errors}));
await b.close();
