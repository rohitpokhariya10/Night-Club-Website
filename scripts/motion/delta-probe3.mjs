// Third pass: hover states, a route transition, and a mobile pass (touch device emulation).
import {chromium, devices} from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/delta-reference';
fs.mkdirSync(`${out}/interact`, {recursive: true}); fs.mkdirSync(`${out}/mobile`, {recursive: true});
const browser = await chromium.launch({headless: false});
const deny = async p => { const d = p.getByRole('button', {name: /Rejeitar todos|Deny|Reject/i}).first(); if (await d.isVisible().catch(() => false)) await d.click(); };
{
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForTimeout(6500); await deny(page); await page.waitForTimeout(800);
  // Nav hover
  const nav = page.locator('header a, header button, nav a, nav button').filter({hasText: /coffee culture/i}).first();
  if (await nav.count()) { await nav.hover(); for (const t of [0, 200, 600]) { await page.waitForTimeout(t ? 200 : 0); await page.screenshot({path: `${out}/interact/nav-hover-${t}.png`, clip: {x: 0, y: 0, width: 1440, height: 600}}); } }
  await page.mouse.move(720, 880); await page.waitForTimeout(600);
  // Collage photo hover
  await page.mouse.wheel(0, 500); await page.waitForTimeout(1200);
  const item = page.locator('main li.item').nth(2);
  const b = await item.boundingBox();
  if (b) { await page.screenshot({path: `${out}/interact/collage-before.png`}); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(250); await page.screenshot({path: `${out}/interact/collage-hover-250.png`}); await page.waitForTimeout(600); await page.screenshot({path: `${out}/interact/collage-hover-850.png`}); }
  // Route transition: follow the first in-content button link and sample frames.
  const link = page.locator('main a[href*="/en/"]').first();
  const href = await link.getAttribute('href');
  await link.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  await link.click({noWaitAfter: true});
  for (let i = 0; i < 14; i++) { await page.screenshot({path: `${out}/interact/route-${String(i * 120).padStart(4, '0')}ms.png`}); await page.waitForTimeout(120); }
  console.log('route', href, '->', page.url());
  await page.close();
}
{
  const ctx = await browser.newContext({...devices['iPhone 13'], viewport: {width: 390, height: 844}, recordVideo: {dir: `${out}/video-mobile`, size: {width: 390, height: 844}}});
  const page = await ctx.newPage();
  await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForTimeout(6500); await deny(page); await page.waitForTimeout(800);
  const info = await page.evaluate(() => ({h: document.documentElement.scrollHeight, lenis: document.documentElement.className}));
  for (let y = 0, i = 0; y < info.h; y += 520, i++) {
    await page.evaluate(yy => window.scrollTo(0, yy), y); await page.waitForTimeout(500);
    await page.screenshot({path: `${out}/mobile/m${String(i).padStart(2, '0')}-y${y}.png`});
  }
  console.log('mobile', info);
  await ctx.close();
}
await browser.close();
