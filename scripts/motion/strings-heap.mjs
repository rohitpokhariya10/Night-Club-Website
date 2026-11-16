// Does the strings section leak? Ten round trips home ⇄ gallery, each time playing the instrument (sound on, a peg,
// a pull on a string) before leaving. Garbage is collected with a full heap snapshot (the plain collectGarbage call
// leaves Blink's DOM garbage for later, so its node/listener counters drift up without any leak); then live DOM size,
// heap, listeners and the number of detached DOM nodes still retained are compared.
// usage: [BASE_URL=…] node scripts/motion/strings-heap.mjs
import {chromium} from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
await cdp.send('HeapProfiler.enable');
/** Full GC by snapshot; returns the number of detached DOM nodes that survived it. */
const snapshot = async () => {
  let chunks = [];
  const take = e => chunks.push(e.chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', take);
  await cdp.send('HeapProfiler.takeHeapSnapshot', {reportProgress: false});
  cdp.off('HeapProfiler.addHeapSnapshotChunk', take);
  const snap = JSON.parse(chunks.join('')); chunks = null;
  const {node_fields: nf, node_types: [types]} = snap.snapshot.meta;
  const N = nf.length, iDet = nf.indexOf('detachedness'), iType = nf.indexOf('type');
  let detached = 0;
  for (let i = 0; i < snap.nodes.length; i += N) if (snap.nodes[i + iDet] === 2 && types[snap.nodes[i + iType]] === 'native') detached++;
  return detached;
};
const heap = async () => {
  const detached = await snapshot();
  const m = await cdp.send('Performance.getMetrics');
  const g = k => m.metrics.find(x => x.name === k).value;
  const elements = await page.evaluate(() => document.querySelectorAll('*').length);
  return {heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2), elements, detached, listeners: g('JSEventListeners')};
};
const go = async path => {await page.locator(`header a[href="${path}"]`).first().click(); await page.waitForURL(u => new URL(u).pathname === path); await page.waitForTimeout(600);};
const play = async () => {
  // A locator wait, not waitForSelector: an undisposed ElementHandle would itself pin the old page in memory.
  await page.locator('#experience[data-instrument]').waitFor();
  await page.evaluate(() => {const el = document.querySelector('#experience .ns-stage'); scrollTo({top: el.getBoundingClientRect().top + scrollY - 140, behavior: 'instant'});});
  await page.waitForTimeout(900);
  await page.locator('#experience .ns-sound').click();
  await page.getByRole('button', {name: /Pluck the first string/}).click();
  const p = await page.evaluate(() => {
    const hit = document.querySelector('.ns-svg[data-layout="desktop"] .ns-string[data-string="3"] .ns-hit');
    const m = hit.ownerSVGElement.getScreenCTM(); const q = hit.getPointAtLength(hit.getTotalLength() * 0.8);
    return {x: q.x * m.a + m.e, y: q.y * m.d + m.f};
  });
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x, p.y + 50, {steps: 5}); await page.mouse.up();
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await page.waitForTimeout(200);
};
await page.goto(base);
await page.keyboard.press('Shift');
const cycle = async () => {await play(); await go('/gallery'); await go('/');};
await cycle();
const first = await heap();
for (let i = 0; i < 10; i++) await cycle();
const last = await heap();
console.log('/ ⇄ /gallery, playing the strings each visit', JSON.stringify({first, last}));
await browser.close();
