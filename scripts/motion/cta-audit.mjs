// Audits every clickable element that carries a directional arrow (a lucide arrow icon, a `.arw` arrow or an arrow
// glyph) across the site: its label, destination, the arrow's direction, and how the arrow actually moves when the
// element is hovered: the icon's on-screen box relative to the element's (so rotations, transforms and `translate`
// all count, and the element's own hover lift does not).
// usage: [BASE_URL=…] node scripts/motion/cta-audit.mjs <out.json>
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const out = process.argv[2]; fs.mkdirSync(path.dirname(out), {recursive: true});
const base = process.env.BASE_URL || 'http://localhost:3000';
const PAGES = ['/', '/about', '/nightlife', '/events', '/gallery', '/food-menu', '/drink-menu', '/specials', '/reservations', '/private-parties', '/catering', '/jobs', '/contact', '/privacy', '/this-page-does-not-exist'];
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
// The first upcoming event's detail page, if there is one.
await page.goto(base + '/events');
const eventHref = await page.locator('main a[href^="/events/"]').first().getAttribute('href').catch(() => null);
if (eventHref) PAGES.splice(4, 0, eventHref);
const rows = [];
async function auditHere(path, scope) {
  const handles = await page.evaluateHandle(scope => {
    const root = scope ? document.querySelector(scope) : document;
    const glyph = /[←→↑↓↗]/;
    return [...root.querySelectorAll('a[href], button')].filter(el => el.querySelector('svg[class*="lucide-arrow"], .arw') || [...el.childNodes].some(n => n.nodeType === 3 && glyph.test(n.textContent)));
  }, scope);
  const count = await handles.evaluate(list => list.length);
  for (let i = 0; i < count; i++) {
    const el = await handles.evaluateHandle((list, i) => list[i], i);
    const info = await el.evaluate(el => {
      const icon = el.querySelector('.arw, svg[class*="lucide-arrow"]');
      const cls = icon?.getAttribute('class') || '';
      const dir = icon?.dataset.arrow || (cls.match(/lucide-arrow-(up-right|right|left|up|down)\b/) || [])[1] || (el.textContent.match(/[←→↑↓↗]/) || [''])[0];
      const r = el.getBoundingClientRect();
      const header = el.closest('header, .mobile-menu');
      return {
        label: (el.getAttribute('aria-label') || el.textContent).replace(/\s+/g, ' ').trim().slice(0, 60), href: el.getAttribute('href'), tag: el.tagName.toLowerCase(),
        className: (el.getAttribute('class') || '').trim(), dir, hasIcon: !!icon, disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
        visible: r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden', inHeader: !!header,
      };
    });
    let move = null;
    if (info.visible && info.hasIcon) {
      await el.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
      await page.mouse.move(2, 2); await page.waitForTimeout(450);
      const rest = await el.evaluate(el => {const b = el.querySelector('.arw, svg[class*="lucide-arrow"]').getBoundingClientRect(); const r = el.getBoundingClientRect(); return {x: b.x - r.x, y: b.y - r.y, w: b.width, h: b.height};});
      const box = await el.boundingBox();
      if (box) {
        // Hover the element away from its icon (its left or centre), so the whole element is the trigger.
        await page.mouse.move(box.x + Math.min(12, box.width / 4), box.y + box.height / 2);
        await page.waitForTimeout(600);
        const hovered = await el.evaluate(el => {
          const icon = el.querySelector('.arw, svg[class*="lucide-arrow"]'); const b = icon.getBoundingClientRect(); const c = getComputedStyle(icon); const r = el.getBoundingClientRect();
          return {x: b.x - r.x, y: b.y - r.y, w: b.width, h: b.height, translate: c.translate, transform: c.transform, rotate: c.rotate, inside: b.left >= r.left - 0.5 && b.right <= r.right + 0.5 && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5};
        });
        await page.mouse.move(2, 2); await page.waitForTimeout(600);
        const back = await el.evaluate(el => {const b = el.querySelector('.arw, svg[class*="lucide-arrow"]').getBoundingClientRect(); const r = el.getBoundingClientRect(); return {x: b.x - r.x, y: b.y - r.y};});
        move = {dx: +(hovered.x - rest.x).toFixed(1), dy: +(hovered.y - rest.y).toFixed(1), dw: +(hovered.w - rest.w).toFixed(1), translate: hovered.translate, transform: hovered.transform, rotate: hovered.rotate, insideWhenHovered: hovered.inside, returned: Math.abs(back.x - rest.x) < 0.5 && Math.abs(back.y - rest.y) < 0.5};
      }
    }
    rows.push({page: path, ...info, move});
  }
}
for (const path of PAGES) {
  await page.goto(base + path); await page.keyboard.press('Shift').catch(() => {});
  await page.waitForTimeout(path === '/' ? 1800 : 700);
  await auditHere(path, 'main');
  if (path === '/' || path === '/contact') await auditHere(path, 'footer');
  if (path === '/') {
    await auditHere(path, 'header');
    await page.locator('.menu-toggle').click(); await page.waitForTimeout(700);
    await auditHere(path + ' (menu)', '.mobile-menu');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  }
}
await browser.close();
fs.writeFileSync(out, JSON.stringify({rows, errors}, null, 2));
const fmt = r => `${r.page.padEnd(22)} ${(r.dir || '').padEnd(8)} ${(r.move ? `${r.move.dx},${r.move.dy}${r.move.rotate !== 'none' ? ' rot ' + r.move.rotate : ''}` : r.visible ? 'no icon' : 'hidden').padEnd(16)} ${r.move ? (r.move.insideWhenHovered ? 'in ' : 'OUT') : '   '} ${r.className.slice(0, 22).padEnd(22)} ${r.label.slice(0, 34).padEnd(34)} ${r.href ?? '(button)'}`;
console.log(rows.map(fmt).join('\n'));
console.log('elements', rows.length, 'page errors', errors.length);
