// Repeated client navigation between two routes with forced GC: does DOM/listener count grow?
// usage: ROUTES=/,/gallery node scripts/motion/nav-heap.mjs   (REDUCED=1 to disable motion)
import {chromium} from '@playwright/test';
const [a, b] = (process.env.ROUTES || '/,/gallery').split(',');
const browser = await chromium.launch(); const page = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference'});
const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const m = await cdp.send('Performance.getMetrics'); const g = k => m.metrics.find(x => x.name === k).value; return {heapMB: +(g('JSHeapUsedSize') / 1048576).toFixed(2), nodes: g('Nodes'), listeners: g('JSEventListeners')}; };
await page.goto((process.env.BASE_URL || 'http://localhost:3100') + a); await page.waitForTimeout(1500);
const go = async path => { await page.locator(`header a[href="${path}"]`).first().click(); await page.waitForURL(u => new URL(u).pathname === path); await page.waitForTimeout(600); };
// Optionally bring a section on screen (e.g. SCROLL=.night-out-stage to start the film) before leaving.
const visit = async () => { if (!process.env.SCROLL) return; await page.evaluate(sel => { const el = document.querySelector(sel); if (el) scrollTo({top: el.getBoundingClientRect().top + scrollY - 200, behavior: 'instant'}); }, process.env.SCROLL); await page.waitForTimeout(900); await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'})); await page.waitForTimeout(200); };
const cycle = async () => { await visit(); await go(b); await go(a); };
await cycle(); const first = await heap();
for (let i = 0; i < 10; i++) await cycle();
const last = await heap();
// A viewport change makes Blink re-evaluate responsive-image listeners (lazily releases detached <img>).
await page.setViewportSize({width: 1439, height: 900}); await page.waitForTimeout(300); await page.setViewportSize({width: 1440, height: 900}); await page.waitForTimeout(300);
const afterViewportChange = await heap();
console.log(`${a} ⇄ ${b}${process.env.REDUCED ? ' (reduced)' : ''}`, JSON.stringify({first, last, afterViewportChange}));
await browser.close();
