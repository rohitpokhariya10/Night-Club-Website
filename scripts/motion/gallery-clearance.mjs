// Checks that no ring card covers the gallery title (eyebrow, heading, call to action) at any point of the
// settled orbit, including the breathing peak, at each width. Cards are placed exactly as the motion does.
// Eight evenly spaced cards repeat every 45°, so turning 0 → −45° covers every settled state. The round
// phone button is measured as a circle.
// usage: [BASE_URL=…] [CSS='…candidate overrides…'] [W=360,1024] node scripts/motion/gallery-clearance.mjs
import {chromium} from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch();
const context = await browser.newContext({reducedMotion: 'reduce'}); // static ring, so placement is under our control
let failures = 0;
for (const size of (process.env.W || '360,390,768,1024,1180x820,1280x720,1280x800,1366x768,1440x700,1440,1920x1080').split(',')) {
  const [width, height = width <= 700 ? 800 : 900] = size.split('x').map(Number);
  const page = await context.newPage();
  await page.setViewportSize({width, height});
  await page.goto(base + '/');
  if (process.env.CSS) await page.addStyleTag({content: process.env.CSS});
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => {
    const ring = document.querySelector('.lens-ring');
    const cards = [...document.querySelectorAll('.lens-card')];
    const parts = ['.lens-eyebrow', '.lens-heading', '.lens-title .button'].map(s => document.querySelector(s));
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    let worst = {area: 0};
    let minGap = Infinity;
    for (const breath of [1, 1.06]) {
      ring.style.setProperty('--breath', breath);
      for (let turn = 0; turn >= -45; turn -= 1.5) {
        cards.forEach((card, i) => {
          const a = (i / cards.length) * Math.PI * 2 + (turn * Math.PI) / 180;
          card.style.setProperty('--cx', Math.sin(a).toFixed(4)); card.style.setProperty('--cy', (-Math.cos(a)).toFixed(4));
        });
        for (const card of cards) {
          // Rotated cards are not in play once settled; bounding boxes are exact here.
          const c = card.getBoundingClientRect();
          for (const part of parts) {
            const p = part.getBoundingClientRect();
            let area = overlap(c, p);
            const round = getComputedStyle(part).borderRadius === '50%';
            if (round) {
              const r = p.width / 2, cx = p.left + r, cy = p.top + r;
              const dx = Math.max(c.left - cx, 0, cx - c.right), dy = Math.max(c.top - cy, 0, cy - c.bottom);
              area = Math.hypot(dx, dy) < r ? area : 0;
              minGap = Math.min(minGap, Math.hypot(dx, dy) - r);
              if (area > worst.area) worst = {area: Math.round(area), turn, breath, part: 'round button'};
              continue;
            }
            if (area > worst.area) worst = {area: Math.round(area), turn, breath, part: part.className.split(' ')[0]};
            const gx = Math.max(p.left - c.right, c.left - p.right), gy = Math.max(p.top - c.bottom, c.top - p.bottom);
            minGap = Math.min(minGap, Math.max(gx, gy));
          }
        }
      }
    }
    const sw = document.documentElement.scrollWidth;
    const size = el => {const b = el.getBoundingClientRect(); return `${Math.round(b.width)}x${Math.round(b.height)}`;};
    // Fit: the settled ring (at rest) below the fixed header; and the same with the call to action under it.
    const extentAt = (breath, withCta) => {
      ring.style.setProperty('--breath', breath);
      cards.forEach((card, i) => {
        const a = (i / cards.length) * Math.PI * 2;
        card.style.setProperty('--cx', Math.sin(a).toFixed(4)); card.style.setProperty('--cy', (-Math.cos(a)).toFixed(4));
      });
      const boxes = cards.map(c => c.getBoundingClientRect());
      const bottoms = boxes.map(b => b.bottom);
      if (withCta) bottoms.push(parts[2].getBoundingClientRect().bottom);
      return Math.round(Math.max(...bottoms) - Math.min(...boxes.map(b => b.top)));
    };
    const header = Math.round(document.querySelector('.header')?.getBoundingClientRect().height || 0);
    const ringOnly = extentAt(1, false), withCta = extentAt(1, true);
    return {fits: innerWidth <= 700 ? 'n/a' : `ring ${ringOnly}+${header}<=${innerHeight}: ${ringOnly + header <= innerHeight}; with CTA ${withCta + header <= innerHeight}`, worst, minGap: Math.round(minGap), overflow: sw > innerWidth, ringH: Math.round(ring.getBoundingClientRect().height), parts: parts.map(size).join(' ')};
  });
  if (result.worst.area > 0 || result.overflow) failures++;
    console.log(size, JSON.stringify(result));
  await page.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
