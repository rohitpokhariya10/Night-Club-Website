// Does the desktop header bar fit comfortably? At each width: whether the link bar shows, its type size, and the free
// space between the logo and the first link and between the last link and Book a Table (px).
// usage: [BASE_URL=…] [WIDTHS=…] node scripts/visual/header-fit.mjs
import {chromium} from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3000';
const widths = (process.env.WIDTHS || '1001,1024,1100,1180,1200,1201,1280,1366,1440,1536,1728,1920').split(',').map(Number);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const width of widths) {
  await page.setViewportSize({width, height: 900});
  await page.goto(base + '/gallery');
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const nav = document.querySelector('.header nav'), logo = document.querySelector('.header .logo'), book = document.querySelector('.header-book');
    if (getComputedStyle(nav).display === 'none') return {shown: false};
    const links = [...nav.querySelectorAll('a')].map(a => a.getBoundingClientRect());
    const n = nav.getBoundingClientRect(), l = logo.getBoundingClientRect(), b = book.getBoundingClientRect();
    const gaps = links.slice(1).map((r, i) => Math.round(r.left - links[i].right));
    return {shown: true, links: links.length, font: getComputedStyle(nav.querySelector('a')).fontSize, left: Math.round(n.left - l.right), right: Math.round(b.left - n.right), minGap: Math.min(...gaps), oneLine: links.every(r => Math.abs(r.top - links[0].top) < 2)};
  });
  console.log(String(width).padStart(5), m.shown ? `${m.links} links @ ${m.font} | logo→nav ${m.left}px | nav→Book ${m.right}px | between links ≥${m.minGap}px | one line: ${m.oneLine}` : 'link bar hidden (menu button)');
}
await browser.close();
